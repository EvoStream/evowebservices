/***
 *
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2016 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 *
 ***/

var util = require('util');
//Include the Base HLS Plugin for the application
var BaseHLSPlugin = require('../base_plugins/basehlsplugin');
var s3 = require('s3');
var winston = require('winston');
var path = require('path');

/*
 * Amazon S3 Upload HLS Chunk Plugin
 */
var AmazonHLSUpload = function () {
};

//implement the BaseHLSPlugin
util.inherits(AmazonHLSUpload, BaseHLSPlugin);

/**
 * Initialize the settings for AmazonHLSUpload
 * @param array settings
 * @return boolean
 */
AmazonHLSUpload.prototype.init = function (settings) {
    winston.log("info", "[webservices] amazonhlsupload: init ");

    this.settings = settings;
    this.AmazonHLSUploadCtr = 0;

    //set the s3 client 
    this.client = s3.createClient({
        maxAsyncS3: 20, // this is the default 
        s3RetryCount: 3, // this is the default 
        s3RetryDelay: 1000, // this is the default 
        multipartUploadThreshold: 20971520, // this is the default (20 MB) 
        multipartUploadSize: 15728640, // this is the default (15 MB) 
        s3Options: {
            accessKeyId: this.settings.aws_access_key,
            secretAccessKey: this.settings.aws_secret_key,
            // any other options are passed to new AWS.S3() 
            // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property 
        },
        httpOptions: {
            timeout: 240000
        },
    });

};

/**
 * Execute process for AmazonHLSUpload
 * @param array event
 * @return boolean
 */
AmazonHLSUpload.prototype.processEvent = function (event) {
    winston.log("info", "[webservices] amazonhlsupload: processEvent ");

    var AmazonHLSUpload = this;

    var eventDataArray = [];
    eventDataArray.push(event);

    var async = require("async");
    async.mapSeries(eventDataArray,
        function (eventData, callback) {

            winston.log("info", "[webservices] amazonhlsupload: processEvent eventData " + JSON.stringify(eventData));

            //setup the file directory the the directory where the file would be uploaded
            var uploadDirectory = AmazonHLSUpload.getUploadDirectory(eventData.type, eventData.payload.file);

            //Check if chunk is for deletion
            if (eventData.type == 'hlsChunkDeleted') {

                var params = {
                    Bucket: AmazonHLSUpload.settings.default_bucket,
                    Delete: {
                        Objects: [
                            {
                                Key: uploadDirectory.main
                            }
                        ],
                    }
                };

                var deleter = AmazonHLSUpload.client.deleteObjects(params);
                deleter.on('error', function(err) {
                    console.error("[webservices] amazonhlsupload: unable to delete - ", err.stack);
                    winston.log("error", "[webservices] amazonhlsupload: unable to upload - "+ JSON.stringify(err));
                    winston.log("error", "[webservices] amazonhlsupload: unable to delete data - " +uploadDirectory.main);
                    callback(false);
                });
                deleter.on('end', function() {
                    winston.log("info", "[webservices] amazonhlsupload: done deleting file - " +uploadDirectory.main);
                    callback(true);
                });
            }else{
                //3. Set the S3 bucket parameters
                var params = {
                    localFile: eventData.payload.file,

                    s3Params: {
                        Bucket: AmazonHLSUpload.settings.default_bucket,
                        Key: uploadDirectory['main'],
                        ACL: "public-read"
                        // other options supported by putObject, except Body and ContentLength.
                        // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
                    },
                };

                //4. Execute the file upload using s3
                var uploader = AmazonHLSUpload.client.uploadFile(params);
                uploader.on('error', function (err) {
                    console.error("[webservices] amazonhlsupload: unable to delete - ", err.stack);
                    winston.log("error", "[webservices] amazonhlsupload: unable to upload - "+ JSON.stringify(err));
                    winston.log("error", "[webservices] amazonhlsupload: unable to delete data - " +uploadDirectory.main);
                    callback(false);
                });
                uploader.on('end', function () {
                    winston.log("info", "[webservices] amazonhlsupload: done uploading file - " +uploadDirectory.main);

                    if (eventData.type == 'hlsChunkClosed') {
                        //4. Upload the Child Playlist after the  HLS Chunk
                        var params = {
                            localFile: uploadDirectory['cplaylistDir'],

                            s3Params: {
                                Bucket: AmazonHLSUpload.settings.default_bucket,
                                Key: uploadDirectory['cplaylist'],
                                ACL: "public-read"
                                // other options supported by putObject, except Body and ContentLength.
                                // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
                            },
                        };

                        //4. Execute the file upload using s3
                        var uploader = AmazonHLSUpload.client.uploadFile(params);
                        uploader.on('error', function (err) {
                            console.error("[webservices] amazonhlsupload: unable to delete - ", err.stack);
                            winston.log("error", "[webservices] amazonhlsupload: unable to upload - "+ JSON.stringify(err));
                            winston.log("error", "[webservices] amazonhlsupload: unable to delete data - " +uploadDirectory.main);
                            callback(false);
                        });
                        uploader.on('end', function () {
                            winston.log("info", "[webservices] amazonhlsupload: done uploading file - " +uploadDirectory['cplaylist']);
                            callback(true);
                        });
                    }else{
                        callback(true);
                    }
                });

            }

        },
        // 3rd param is the function to call when everything's done
        function (status) {
            winston.log("info", "[webservices] amazonhlsupload: all eventData done, status - " +status);
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
AmazonHLSUpload.prototype.getUploadDirectory = function (eventType, file) {
    winston.log("info", "[webservices] amazonhlsupload: getUploadDirectory ");

    //1. Get the folder and file names from the file location
    var fileDirectory = file.split(path.sep);
    var uploadDirectory = new Object();

    //2. Set the uploading directory where the files would be uploaded
    if (eventType == 'hlsMasterPlaylistUpdated') {
        uploadDirectory['mplaylist'] = fileDirectory.pop();
        uploadDirectory['groupName'] = fileDirectory.pop();
        uploadDirectory['main'] = uploadDirectory['groupName'] + '/' + uploadDirectory['mplaylist'];

    } else {
        uploadDirectory['chunk'] = fileDirectory.pop();
        uploadDirectory['localStreamName'] = fileDirectory.pop();
        uploadDirectory['groupName'] = fileDirectory.pop();
        uploadDirectory['main'] = uploadDirectory['groupName'] + '/' + uploadDirectory['localStreamName'] + '/' + uploadDirectory['chunk'];
        uploadDirectory['cplaylist'] = uploadDirectory['groupName'] + '/' + uploadDirectory['localStreamName'] + '/playlist.m3u8';
        uploadDirectory['cplaylistDir'] = path.dirname(file) + '/playlist.m3u8';
    }

    winston.log("info", "[webservices] amazonhlsupload: getUploadDirectory data - "+JSON.stringify(uploadDirectory));
    return uploadDirectory;
};

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
AmazonHLSUpload.prototype.supportsEvent = function (eventType) {
    winston.log("info", "[webservices] amazonhlsupload: supportsEvent ");
    winston.log("verbose", "[webservices] amazonhlsupload: supportsEvent eventType "+eventType);

    //Validate that Plugin supports the Event for Master Playlist
    if (eventType == 'hlsMasterPlaylistUpdated') {
        return true;
    }

    //Validate that Plugin supports the Event for Chunk
    if (eventType == 'hlsChunkClosed') {
        return true;
    }

    //Validate that Plugin supports the Event for Chunk
    if (eventType == 'hlsChunkDeleted') {
        return true;
    }

};

module.exports = AmazonHLSUpload;
