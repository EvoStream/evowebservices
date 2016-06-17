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

    //Apply Logs
    winston.log("info", "AmazonHDSUpload.prototype.init ");

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
    });

};

/**
 * Execute process for AmazonHDSUpload
 * @param array event
 * @return boolean
 */
AmazonHDSUpload.prototype.processEvent = function(event) {

    //Apply Logs
    winston.log("info", "AmazonHDSUpload.prototype.processEvent ");

    //1. Get file from the event
    var file = event.payload.file;

    //2. Setup the file directory the the directory where the file would be uploaded
    var uploadDirectory = this.getUploadDirectory(event.type, file);

    //Apply the logs
    winston.log("verbose", "AmazonHDSUpload uploadDirectory " + JSON.stringify(uploadDirectory));

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
        console.error("AmazonHDSUpload unable to upload:", err.stack);
        winston.log("error", "AmazonHDSUpload unable to upload:", err.stack);
        return false;
    });
    uploader.on('end', function() {
        winston.log("verbose", "AmazonHDSUpload done uploading file " + file);
    });

    //5. Upload the bootstrap file
    var boostrap = path.dirname(file) + path.sep + this.settings.bootstrap;

    //Apply the logs
    winston.log("verbose", "AmazonHDSUpload boostrap " + boostrap);

    if (fs.statSync(boostrap).isFile()) {
        //5.1 Set the S3 bucket parameters
        var params = {
            localFile: boostrap,
            s3Params: {
                Bucket: "ems-files",
                Key: uploadDirectory['bootstrap_directory'],
                ACL: "public-read"
                // other options supported by putObject, except Body and ContentLength. 
                // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property 
            },
        };

        //5.2 Execute the file upload using s3
        var uploader = this.client.uploadFile(params);
        uploader.on('error', function(err) {
            console.error("AmazonHDSUpload unable to upload:", err.stack);
            winston.log("error", "AmazonHDSUpload unable to upload:", err.stack);
            return false;
        });
        uploader.on('end', function() {
            winston.log("verbose", "AmazonHDSUpload done uploading file " + boostrap);
        });
    }

    return true;

};

/**
 * Get the upload directory based on the file location
 * @param string eventType
 * @param string file
 * @return array uploadDirectory
 */
AmazonHDSUpload.prototype.getUploadDirectory = function(eventType, file) {

    //Apply Logs
    winston.log("info", "AmazonHDSUpload.prototype.getUploadDirectory ");

    //1. Get the folder and file names from the file location
    var fileDirectory = file.split(path.sep);
    var uploadDirectory = new Object();

    //2. Set the uploading directory where the files would be uploaded
    if (eventType == 'hdsMasterPlaylistUpdated') {
        uploadDirectory['mplaylist'] = fileDirectory.pop();
        uploadDirectory['groupName'] = fileDirectory.pop();
        uploadDirectory['main'] = uploadDirectory['groupName'] + '/' + uploadDirectory['mplaylist'];

    } else {
        uploadDirectory['chunk'] = fileDirectory.pop();
        uploadDirectory['localStreamName'] = fileDirectory.pop();
        uploadDirectory['groupName'] = fileDirectory.pop();
        uploadDirectory['main'] = uploadDirectory['groupName'] + '/' + uploadDirectory['localStreamName'] + '/' + uploadDirectory['chunk'];
    }

    //3. Get the bootstrap
    var boostrap = path.dirname(file) + path.sep + this.settings.bootstrap;

    //check if a bootstrap file exists
    if (fs.statSync(boostrap).isFile()) {
            
        //3.1 Setup the bootstrap file directory the the directory where the bootstrap would be uploaded
        uploadDirectory['bootstrap_file'] = path.dirname(file) + '/' + this.settings.bootstrap;
        uploadDirectory['bootstrap_directory'] = uploadDirectory['groupName'] + '/' + uploadDirectory['localStreamName'] + '/' + this.settings.bootstrap;
    }

    return uploadDirectory;

};

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
AmazonHDSUpload.prototype.supportsEvent = function(eventType) {

    //Apply the logs
    winston.log("info", "AmazonHDSUpload.prototype.supportsEvent ");

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

};

module.exports = AmazonHDSUpload;