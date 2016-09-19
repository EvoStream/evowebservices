/***
 * 
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2016 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 * 
 ***/

var util = require('util');
//Include the Base Plugin for the application
var BasePlugin = require('../base_plugins/baseplugin');
var winston = require('winston');

/*
 * Azure Stream Manager Plugin
 */
var AzureStreamManager = function() {};

//implement the BasePlugin
util.inherits(AzureStreamManager, BasePlugin);

/**
 * Initialize the settings for Azure Stream Manager
 * @param array settings
 * @return boolean
 */
AzureStreamManager.prototype.init = function(settings) {

    //Apply Logs
    winston.log("info", "AzureStreamManager initializing settings");

    this.settings = settings;

};

/**
 * Execute process for Azure Stream Manager
 * @param array event
 * @return boolean
 */
AzureStreamManager.prototype.processEvent = function(event) {

    //Apply Logs
    winston.log("info", "AzureStreamManager.prototype.processEvent ");

    //1. Get the localStreamName and List of Ip Address
    var localStreamName = event.payload.name;
    var destinationUri = this.settings.destination_uri;
    var remoteAddress = event.remoteIp;

    //Get the localStreamName from previous pull
    var _localStreamName = null;
    if (event.payload.pullSettings != null) {
        _localStreamName = event.payload.pullSettings._localStreamName;
    }

    //Apply the logs
    winston.log("verbose", "AzureStreamManager localStreamName " + localStreamName);
    winston.log("verbose", "AzureStreamManager destinationUri " + destinationUri);
    winston.log("verbose", "AzureStreamManager remoteAddress " + remoteAddress);
    winston.log("verbose", "AzureStreamManager _localStreamName " + _localStreamName);

    //2. Check if stream was a previously processed by using property of the pull settings
    if (_localStreamName == "" || _localStreamName != localStreamName) {

        for (var i in destinationUri) {

            //Create object for the ems core api
            var ipEms = "http://" + destinationUri[i] + ":7777/";

            //require ems module using the ipEms
            var ems = require("../core_modules/ems-api-core")(ipEms);

            if (destinationUri[i] === remoteAddress) {
                continue;
            }

            targetUri = 'rtmp://' + remoteAddress + '/live/' + localStreamName;

            //Apply the logs
            winston.log("verbose", "AzureStreamManager targetUri " + targetUri);

            //Execute pullstream command
            var parameters = {
                uri: targetUri,
                localStreamName: localStreamName,
                keepAlive: 0
            };

            ems.pullStream(parameters, function(result) {
                winston.log("info", "AzureStreamManager pullStream status " + result.status);

                if (result.status == "FAIL") {
                    winston.log("error", "AzureStreamManager pullStream status " + result.status);

                    return false;
                }

            });
        }
    }

    //Return True if process execution is done
    return true;


};

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
AzureStreamManager.prototype.supportsEvent = function(eventType) {

    //Apply Logs
    winston.log("info", "AzureStreamManager.prototype.supportsEvent ");

    //Validate that Plugin supports the Event
    if (eventType == 'inStreamCreated') {
        return true;
    }

};

module.exports = AzureStreamManager;