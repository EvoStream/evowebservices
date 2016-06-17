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
 * Stream Auto Router Plugin
 */
var StreamAutoRouter = function() {};

//implement the BasePlugin
util.inherits(StreamAutoRouter, BasePlugin);

/**
 * Initialize the settings for Auto Router
 * @param array settings
 * @return boolean
 */
StreamAutoRouter.prototype.init = function(settings) {

    //Apply Logs
    winston.log("info", "StreamAutoRouter.prototype.init ");

    this.settings = settings;

};

/**
 * Execute process for Auto Router
 * @param array event
 * @return boolean
 */
StreamAutoRouter.prototype.processEvent = function(event) {

    //Apply Logs
    winston.log("info", "StreamAutoRouter.prototype.processEvent ");

    this.StreamAutoRouterCtr = this.StreamAutoRouterCtr + 1;

    //1. Get LocalStreamName and ip address of sender and receiver
    var localStreamName = event.payload.name;
    var remoteAddress = event.remoteIp;

    //2. Check the token on LocalStreamName
    var tokenExists = localStreamName.indexOf(this.settings.token);

    //Apply the logs
    winston.log("verbose", "StreamAutoRouter localStreamName " + localStreamName);
    winston.log("verbose", "StreamAutoRouter remoteAddress " + remoteAddress);
    winston.log("verbose", "StreamAutoRouter tokenExists " + tokenExists);

    //3. If Token is valid, execute AutoRouter Stream
    if ((tokenExists > -1) || (this.settings.token == "")) {

        //Exit plugin if ip address of receiver and sender is the same
        if (this.settings.destination_uri === remoteAddress) {
            return true;
        }

        var targetUri = "rtmp://" + this.settings.destination_uri + "/live";

        //Apply the logs
        winston.log("verbose", "StreamAutoRouter targetUri " + targetUri);

        parameters = {
            uri: targetUri,
            localStreamName: localStreamName,
            keepAlive: 0
        };

        var ems = require("../core_modules/ems-api-core")(null);

        //Execute command for pushStream using destination address
        ems.pushStream(parameters, function(result) {
            winston.log("info", "StreamAutoRouter pushStream status " + result.status);        

            if(result.status == "FAIL"){
                winston.log("error", "StreamAutoRouter pushStream status " + result.status);

                return false;
            }
        });

    }


    //Return True if process execution is done
    return true;



};

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
StreamAutoRouter.prototype.supportsEvent = function(eventType) {

    //Apply Logs
    winston.log("info", "StreamAutoRouter.prototype.supportsEvent ");

    //Validate that Plugin supports the Event
    if (eventType == 'inStreamCreated') {
        return true;
    }

    //Validate that Plugin supports the Event
    if (eventType == 'inStreamClosed') {
        return true;
    }

};

module.exports = StreamAutoRouter;