/***
 * 
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2016 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 * 
 ***/

var util = require('util');
//Include the Base HDS Plugin for the application
var BaseHDSPlugin = require('../base_plugins/basehdsplugin');
var s3 = require('s3');
var winston = require('winston');

var path = require('path');
var fs = require('fs');


/*
 * Amazon S3 Upload HDS Chunk Plugin
 */
var AmazonHDSUpload = function() {};

//implement the BaseHDSPlugin
util.inherits(AmazonHDSUpload, BaseHDSPlugin);


/**
 * Initialize the settings for AmazonHDSUpload
 * @param array settings
 * @return boolean
 */
AmazonHDSUpload.prototype.init = function(settings) {

    winston.log("info", "[webservices] amazonhdsupload: init ");

    this.settings = settings;
    this.AmazonHDSUploadCtr = 0;

    //set the s3 client 
    this.client = s3.createClient({
        maxAsyncS3: 20, // this is the default 
        s3RetryCount: 3, // this is the default 
        s3RetryDelay: 1000, // this is the default 
        multipartUploadThreshold: 20971520, // this is the default (20 MB) 
        multipartUploadSize: 15728640, // this is the default (15 MB) 
        s3Options: {
            accessKeyId: settings.aws_access_key,
            secretAccessKey: settings.aws_secret_key,
            // any other options are passed to new AWS.S3() 
            // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property 
        },
        httpOptions: {
            timeout: 240000
        },
    });

};

/**
 * Execute process for AmazonHDSUpload
 * @param array event
 * @return boolean
 */
AmazonHDSUpload.prototype.processEvent = function(event) {
    winston.log("info", "[webservices] amazonhdsupload: processEvent ");

    var AmazonHDSUpload = this;

    var eventDataArray = [];
    eventDataArray.push(event);

    var async = require("async");
    async.mapSeries(eventDataArray,
        function (eventData, callback) {

            winston.log("info", "[webservices] amazonhdsupload: processEvent eventData " + JSON.stringify(eventData));

            //setup the file directory the the directory where the file would be uploaded
            var uploadDirectory = AmazonHDSUpload.getUploadDirectory(eventData.type, eventData.payload.file);

            //Check if chunk is for deletion
            if (eventData.type == 'hdsChunkDeleted') {

                var params = {
                    Bucket: AmazonHDSUpload.settings.default_bucket,
                    Delete: {
                        Objects: [
                            {
                                Key: uploadDirectory.main
                            }
                        ],
                    }
                };

                var deleter = AmazonHDSUpload.client.deleteObjects(params);
                deleter.on('error', function(err) {
                    console.error("[webservices] amazonhdsupload: unable to delete - ", err.stack);
                    winston.log("error", "[webservices] amazonhdsupload: unable to upload - "+ JSON.stringify(err));
                    winston.log("error", "[webservices] amazonhdsupload: unable to delete data - " +uploadDirectory.main);
                    callback(false);
                });
                deleter.on('end', function() {
                    winston.log("info", "[webservices] amazonhdsupload: done deleting file - " +uploadDirectory.main);
                    callback(true);
                });
            }else {

                //bootstrap configuration should be set
                if ((AmazonHDSUpload.settings.bootstrap === null) || (AmazonHDSUpload.settings.bootstrap === "")) {
                    winston.log("error", "[webservices] amazonhdsupload: bootstrap empty string. bootstrap should be set on the plugins.json ");
                    callback(false);
                }

                //3. Set the S3 bucket parameters
                var params = {
                    localFile: eventData.payload.file,

                    s3Params: {
                        Bucket: AmazonHDSUpload.settings.default_bucket,
                        Key: uploadDirectory['main'],
                        ACL: "public-read"
                        // other options supported by putObject, except Body and ContentLength.
                        // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
                    },
                };

                //4. Execute the file upload using s3
                var uploader = AmazonHDSUpload.client.uploadFile(params);
                uploader.on('error', function (err) {
                    console.error("[webservices] amazonhdsupload: unable to upload - ", err.stack);
                    winston.log("error", "[webservices] amazonhdsupload: unable to upload - "+ JSON.stringify(err));
                    winston.log("error", "[webservices] amazonhdsupload: unable to upload data - " +uploadDirectory.main);
                    callback(false);
                });
                uploader.on('end', function () {
                    winston.log("info", "[webservices] amazonhdsupload: done uploading file - " +uploadDirectory.main);

                    if (eventData.type == 'hdsMasterPlaylistUpdated') {

                        var params = {
                            localFile: uploadDirectory['mplaylist_v1File'],

                            s3Params: {
                                Bucket: AmazonHDSUpload.settings.default_bucket,
                                Key: uploadDirectory['mplaylist_v1'],
                                ACL: "public-read"
                                // other options supported by putObject, except Body and ContentLength.
                                // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
                            },
                        };

                        //4. Execute the file upload using s3
                        var uploader = AmazonHDSUpload.client.uploadFile(params);
                        uploader.on('error', function (err) {
                            console.error("[webservices] amazonhdsupload: unable to upload - ", err.stack);
                            winston.log("error", "[webservices] amazonhdsupload: unable to upload - "+ JSON.stringify(err));
                            winston.log("error", "[webservices] amazonhdsupload: unable to upload data - " +uploadDirectory['mplaylist_v1']);
                            callback(false);
                        });
                        uploader.on('end', function () {
                            winston.log("info", "[webservices] amazonhdsupload: done uploading file - " +uploadDirectory['mplaylist_v1']);
                            callback(true);
                        });

                    }else if (eventData.type == 'hdsChunkClosed') {

                        //5. Upload the bootstrap file
                        var boostrap = path.dirname(eventData.payload.file) + path.sep + AmazonHDSUpload.settings.bootstrap;

                        if (fs.statSync(boostrap).isFile()) {
                            //5.1 Set the S3 bucket parameters
                            var params = {
                                localFile: boostrap,
                                s3Params: {
                                    Bucket: AmazonHDSUpload.settings.default_bucket,
                                    Key: uploadDirectory['bootstrap_directory'],
                                    ACL: "public-read"
                                    // other options supported by putObject, except Body and ContentLength.
                                    // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
                                },
                            };

                            //5.2 Execute the file upload using s3
                            var uploader = AmazonHDSUpload.client.uploadFile(params);
                            uploader.on('error', function (err) {
                                console.error("[webservices] amazonhdsupload: unable to upload - ", err.stack);
                                winston.log("error", "[webservices] amazonhdsupload: unable to upload - "+ JSON.stringify(err));
                                winston.log("error", "[webservices] amazonhdsupload: unable to upload data - " +uploadDirectory['bootstrap_directory']);
                                callback(false);
                            });
                            uploader.on('end', function () {
                                winston.log("info", "[webservices] amazonhdsupload: done uploading file - " +uploadDirectory['bootstrap_directory']);
                                callback(true);
                            });
                        }
                    }

                });


            }
        },
        // 3rd param is the function to call when everything's done
        function (status) {
            winston.log("info", "[webservices] amazonhdsupload: all eventData done, status - " +status);
            return status;

        }
    );


};

/**
 * Get the upload directory based on the file location
 * @param string eventType
 * @param string file
 * @return array uploadDirectory
 */
AmazonHDSUpload.prototype.getUploadDirectory = function(eventType, file) {

    winston.log("info", "[webservices] amazonhdsupload: getUploadDirectory ");

    //1. Get the folder and file names from the file location
    var fileDirectory = file.split(path.sep);
    var uploadDirectory = new Object();

    //2. Set the uploading directory where the files would be uploaded
    if (eventType == 'hdsMasterPlaylistUpdated') {
        uploadDirectory['mplaylist'] = fileDirectory.pop();
        uploadDirectory['groupName'] = fileDirectory.pop();
        uploadDirectory['main'] = uploadDirectory['groupName'] + '/' + uploadDirectory['mplaylist'];

        //2.a upload manifest_v1.f4m 
        var mplaylist = uploadDirectory['mplaylist'].split(".");
        var manifestExt = mplaylist.pop();
        var manifestName = mplaylist.pop();
        uploadDirectory['mplaylist_v1'] = uploadDirectory['groupName'] + '/' + manifestName + '_v1.' + manifestExt;

        dirName = path.dirname(file);

        uploadDirectory['mplaylist_v1File'] = dirName + '/' + manifestName + '_v1.' + manifestExt;


    } else if (eventType == 'hdsChildPlaylistUpdated') {
        uploadDirectory['cplaylist'] = fileDirectory.pop();
        uploadDirectory['localStreamName'] = fileDirectory.pop();
        uploadDirectory['groupName'] = fileDirectory.pop();
        uploadDirectory['main'] = uploadDirectory['groupName'] + '/' + uploadDirectory['localStreamName'] + '/' + uploadDirectory['cplaylist'];


    } else {
        uploadDirectory['chunk'] = fileDirectory.pop();
        uploadDirectory['localStreamName'] = fileDirectory.pop();
        uploadDirectory['groupName'] = fileDirectory.pop();
        uploadDirectory['main'] = uploadDirectory['groupName'] + '/' + uploadDirectory['localStreamName'] + '/' + uploadDirectory['chunk'];


        //3. Get the bootstrap

        var boostrap = path.dirname(file) + path.sep + this.settings.bootstrap;

        //check if a bootstrap file exists
        if (fs.statSync(boostrap).isFile()) {

            //3.1 Setup the bootstrap file directory the the directory where the bootstrap would be uploaded
            uploadDirectory['bootstrap_file'] = path.dirname(file) + '/' + this.settings.bootstrap;
            uploadDirectory['bootstrap_directory'] = uploadDirectory['groupName'] + '/' + uploadDirectory['localStreamName'] + '/' + this.settings.bootstrap;
        }
    }

    winston.log("info", "[webservices] amazonhdsupload: getUploadDirectory data - "+JSON.stringify(uploadDirectory));
    return uploadDirectory;

};

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
AmazonHDSUpload.prototype.supportsEvent = function(eventType) {
    winston.log("info", "[webservices] amazonhdsupload: supportsEvent ");
    winston.log("verbose", "[webservices] amazonhdsupload: supportsEvent eventType "+eventType);

    //Validate that Plugin supports the Event for Master Playlist
    if (eventType == 'hdsMasterPlaylistUpdated') {
        return true;
    }

    //Validate that Plugin supports the Event for Child Playlist
    if (eventType == 'hdsChildPlaylistUpdated') {
        return true;
    }

    //Validate that Plugin supports the Event for Chunk
    if (eventType == 'hdsChunkClosed') {
        return true;
    }

    //Validate that Plugin supports the Event for Chunk
    if (eventType == 'hdsChunkDeleted') {
        return true;
    }

};

module.exports = AmazonHDSUpload;