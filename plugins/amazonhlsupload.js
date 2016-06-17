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
var AmazonHLSUpload = function() {};

//implement the BaseHLSPlugin
util.inherits(AmazonHLSUpload, BaseHLSPlugin);

/**
 * Initialize the settings for AmazonHLSUpload
 * @param array settings
 * @return boolean
 */
AmazonHLSUpload.prototype.init = function(settings) {

    //Apply Logs
    winston.log("info", "AmazonHLSUpload.prototype.init ");

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
    });

};

/**
 * Execute process for AmazonHLSUpload
 * @param array event
 * @return boolean
 */
AmazonHLSUpload.prototype.processEvent = function(event) {

    //Apply Logs
    winston.log("info", "AmazonHLSUpload.prototype.processEvent ");

    //1. Get file from the event
    var file = event.payload.file;

    //2. Setup the file directory the the directory where the file would be uploaded
    var uploadDirectory = this.getUploadDirectory(event.type, file);

    //Apply the logs
    winston.log("verbose", "AmazonHLSUpload uploadDirectory " + JSON.stringify(uploadDirectory));

    //3. Set the S3 bucket parameters
    var params = {
        localFile: file,

        s3Params: {
            Bucket: "ems-files",
            Key: uploadDirectory['main'],
            ACL: "public-read"
            // other options supported by putObject, except Body and ContentLength. 
            // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property 
        },
    };

    //4. Execute the file upload using s3
    var uploader = this.client.uploadFile(params);
    uploader.on('error', function(err) {
        console.error("unable to upload:", err.stack);
        winston.log('error', "AmazonHLSUpload unable to upload:", err.stack);
        return false;
    });
    uploader.on('end', function() {
        winston.log('info', "AmazonHLSUpload done uploading file " + file);
    });  

    return true;

};

/**
 * Get the upload directory based on the file location
 * @param string eventType
 * @param string file
 * @return array uploadDirectory
 */
AmazonHLSUpload.prototype.getUploadDirectory = function(eventType, file) {

    //Apply Logs
    winston.log("info", "AmazonHLSUpload.prototype.getUploadDirectory ");

    //1. Get the folder and file names from the file location
    var fileDirectory = file.split(path.sep);
    var uploadDirectory = new Object();

    //2. Set the uploading directory where the files would be uploaded
    if (eventType == 'hlsMasterPlaylistUpdated') {
        uploadDirectory['mplaylist'] = fileDirectory.pop();
        uploadDirectory['groupName'] = fileDirectory.pop();
        uploadDirectory['main'] = uploadDirectory['groupName']+'/'+uploadDirectory['mplaylist'];
    
    } else {
        uploadDirectory['chunk'] = fileDirectory.pop();
        uploadDirectory['localStreamName'] = fileDirectory.pop();
        uploadDirectory['groupName'] = fileDirectory.pop();
        uploadDirectory['main'] = uploadDirectory['groupName']+'/'+uploadDirectory['localStreamName']+'/'+uploadDirectory['chunk'];
    }

    return uploadDirectory;
};

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
AmazonHLSUpload.prototype.supportsEvent = function(eventType) {

    //Apply the logs
    winston.log("info", "AmazonHLSUpload.prototype.supportsEvent ");

    //Validate that Plugin supports the Event for Master Playlist
    if (eventType == 'hlsMasterPlaylistUpdated') {
        return true;
    }

    //Validate that Plugin supports the Event for Child Playlist
    if (eventType == 'hlsChildPlaylistUpdated') {
        return true;
    }

    //Validate that Plugin supports the Event for Chunk
    if (eventType == 'hlsChunkClosed') {
        return true;
    }

};

module.exports = AmazonHLSUpload;
