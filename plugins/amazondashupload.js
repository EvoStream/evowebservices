/***
 *
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2016 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 *
 ***/

var util = require('util');
//Include the Base DASH Plugin for the application
var BaseDASHPlugin = require('../base_plugins/basehdsplugin');
var s3 = require('s3');
var winston = require('winston');


var path = require('path');
var fs = require('fs');

/*
 * Amazon S3 Upload DASH Chunk Plugin
 */
var AmazonDASHUpload = function() {};

//implement the BaseDASHPlugin
util.inherits(AmazonDASHUpload, BaseDASHPlugin);


/**
 * Initialize the settings for AmazonDASHUpload
 * @param array settings
 * @return boolean
 */
AmazonDASHUpload.prototype.init = function (settings) {
    winston.log("info", "[webservices] amazondashupload: init ");

    this.settings = settings;
    this.AmazonDASHUploadCtr = 0;

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
 * Execute process for AmazonDASHUpload
 * @param array event
 * @return boolean
 */
AmazonDASHUpload.prototype.processEvent = function (event) {
    winston.log("info", "[webservices] amazondashupload: processEvent ");

    var AmazonDASHUpload = this;

    var eventDataArray = [];
    eventDataArray.push(event);

    var async = require("async");
    async.mapSeries(eventDataArray,
        function (eventData, callback) {

            winston.log("info", "[webservices] amazondashupload: processEvent eventData " + JSON.stringify(eventData));

            if (eventData.type == 'outStreamCreated') {

                if(typeof eventData.payload.recordSettings !== 'undefined'){

                    var computedPathToFile = eventData.payload.recordSettings.computedPathToFile;

                    winston.log("verbose", "[webservices] amazondashupload: computedPathToFile - " + computedPathToFile);

                    var segInitFile = computedPathToFile.substr(computedPathToFile.length - 12);

                    winston.log("verbose", "[webservices] amazondashupload: segInitFile - " + segInitFile);

                    if(segInitFile == "seg_init.mp4"){

                        var uploadDirectory = AmazonDASHUpload.getUploadDirectory(eventData.type, computedPathToFile);

                        //set the S3 bucket parameters
                        var params = {
                            localFile: computedPathToFile,
                            s3Params: {
                                Bucket: AmazonDASHUpload.settings.default_bucket,
                                Key: uploadDirectory.main,
                                ACL: "public-read"
                                // other options supported by putObject, except Body and ContentLength.
                                // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
                            },
                        };

                        //execute the file upload using s3
                        var uploader = AmazonDASHUpload.client.uploadFile(params);
                        uploader.on('error', function (err) {
                            console.error("[webservices] amazondashupload: unable to upload - ", err.stack);
                            winston.log("error", "[webservices] amazondashupload: unable to upload - " + JSON.stringify(err));
                            winston.log("error", "[webservices] amazondashupload: unable to upload data - " + uploadDirectory.main);
                            callback(false);
                        });
                        uploader.on('end', function () {
                            winston.log("info", "[webservices] amazondashupload: done uploading file - " + uploadDirectory.main);
                            callback(true);
                        });
                    }
                }
            } else {

                //setup the file directory the the directory where the file would be uploaded
                var uploadDirectory = AmazonDASHUpload.getUploadDirectory(eventData.type, eventData.payload.file);

                if (eventData.type == 'dashChunkDeleted') {

                    var params = {
                        Bucket: AmazonDASHUpload.settings.default_bucket,
                        Delete: {
                            Objects: [
                                {
                                    Key: uploadDirectory.main
                                }
                            ],
                        }
                    };

                    var deleter = AmazonDASHUpload.client.deleteObjects(params);
                    deleter.on('error', function (err) {
                        console.error("[webservices] amazondashupload: unable to delete - ", err.stack);
                        winston.log("error", "[webservices] amazondashupload: unable to delete - ", err.stack);
                        winston.log("error", "[webservices] amazondashupload: unable to delete data - " + uploadDirectory.main);
                        callback(false);
                    });
                    deleter.on('end', function () {
                        winston.log("info", "[webservices] amazondashupload: done deleting file - " + uploadDirectory.main);
                        callback(true);
                    });

                } else {

                    //set the S3 bucket parameters
                    var params = {
                        localFile: eventData.payload.file,

                        s3Params: {
                            Bucket: AmazonDASHUpload.settings.default_bucket,
                            Key: uploadDirectory.main,
                            ACL: "public-read"
                            // other options supported by putObject, except Body and ContentLength.
                            // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
                        },
                    };

                    //execute the file upload using s3
                    var uploader = AmazonDASHUpload.client.uploadFile(params);
                    uploader.on('error', function (err) {
                        console.error("[webservices] amazondashupload: unable to upload - ", err.stack);
                        winston.log("error", "[webservices] amazondashupload: unable to upload - " + JSON.stringify(err));
                        winston.log("error", "[webservices] amazondashupload: unable to upload data - " + uploadDirectory.main);
                        callback(false);
                    });
                    uploader.on('end', function () {
                        winston.log("info", "[webservices] amazondashupload: done uploading file - " + uploadDirectory.main);
                        callback(true);
                    });
                }
            }

        },
        // 3rd param is the function to call when everything's done
        function (status) {

            winston.log("info", "[webservices] amazondashupload: all eventData done, status - " + status);
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
AmazonDASHUpload.prototype.getUploadDirectory = function (eventType, file) {

    winston.log("info", "[webservices] amazondashupload: getUploadDirectory ");

    //check for //
    file = file.replace(/\/\//g, "/");

    winston.log("info", "[webservices] amazondashupload: getUploadDirectory file " + file);

    //1. Get the folder and file names from the file location
    var fileDirectory = file.split(path.sep);
    var uploadDirectory = new Object();


    //Remove preceding slash to avoid folder name concatenation
    for (var i = 0; i < fileDirectory.length; i++) {
        while (fileDirectory[i].charAt(0) === '/')
            fileDirectory[i] = fileDirectory[i].substr(1);
    }


    //2. Set the uploading directory where the files would be uploaded
    if (eventType == 'dashPlaylistUpdated') {
        uploadDirectory['mplaylist'] = fileDirectory.pop();
        uploadDirectory['groupName'] = fileDirectory.pop();
        uploadDirectory['main'] = uploadDirectory['groupName'] + '/' + uploadDirectory['mplaylist'];

    } else {


        if (file.charAt(0) !== '/') {
            uploadDirectory['chunk'] = fileDirectory.pop();
            uploadDirectory['localStreamName'] = fileDirectory.pop();
            uploadDirectory['groupName'] = fileDirectory.pop();
            uploadDirectory['main'] = uploadDirectory['groupName'] + '/' + uploadDirectory['localStreamName'] + '/' + uploadDirectory['chunk'];
        } else {
            uploadDirectory['chunk'] = fileDirectory.pop();
            uploadDirectory['segment'] = fileDirectory.pop();
            uploadDirectory['content'] = fileDirectory.pop();
            uploadDirectory['localStreamName'] = fileDirectory.pop();
            uploadDirectory['groupName'] = fileDirectory.pop();

            //rewrite chunk
            uploadDirectory['chunk'] = uploadDirectory['content'] + '/' + uploadDirectory['segment'] + '/' + uploadDirectory['chunk'];
            uploadDirectory['main'] = uploadDirectory['groupName'] + '/' + uploadDirectory['localStreamName'] + '/' + uploadDirectory['chunk'];
        }


    }


    winston.log("info", "[webservices] amazondashupload: getUploadDirectory data - " + JSON.stringify(uploadDirectory));
    return uploadDirectory;

};

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
AmazonDASHUpload.prototype.supportsEvent = function (eventType) {
    winston.log("info", "[webservices] amazondashupload: supportsEvent ");
    winston.log("verbose", "[webservices] amazondashupload: supportsEvent eventType " + eventType);

    //Validate that Plugin supports the Event for Master Playlist
    if (eventType == 'dashPlaylistUpdated') {
        return true;
    }

    //Validate that Plugin supports the Event for Chunk
    if (eventType == 'dashChunkClosed') {
        return true;
    }

    //Validate that Plugin supports the Event for Chunk
    if (eventType == 'dashChunkDeleted') {
        return true;
    }

    //Validate that Plugin supports the Event for Chunk
    if (eventType == 'outStreamCreated') {
        return true;
    }

};

module.exports = AmazonDASHUpload;