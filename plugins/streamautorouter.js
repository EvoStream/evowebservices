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
var path = require('path');


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

    winston.log("info", "[webservices] streamautorouter: init ");
    this.settings = settings;

};

/**
 * Execute process for Auto Router
 * @param array event
 * @return boolean
 */
StreamAutoRouter.prototype.processEvent = function(event) {
    winston.log("info", "[webservices] streamautorouter: processEvent ");

    var StreamAutoRouter = this;

    var eventDataArray = [];
    eventDataArray.push(event);

    var async = require("async");
    async.mapSeries(eventDataArray,
        function (eventData, callback) {

            winston.log("info", "[webservices] streamautorouter: processEvent eventData " + JSON.stringify(eventData));

            StreamAutoRouter.StreamAutoRouterCtr = StreamAutoRouter.StreamAutoRouterCtr + 1;

            //1. Get LocalStreamName and ip address of sender and receiver
            var localStreamName = eventData.payload.name;
            var remoteAddress = eventData.remoteIp;

            //2. Check the token on LocalStreamName
            var tokenExists = localStreamName.indexOf(StreamAutoRouter.settings.token);

            //Apply the logs
            winston.log("verbose", "[webservices] streamautorouter: localStreamName " + localStreamName);
            winston.log("verbose", "[webservices] streamautorouter: remoteAddress " + remoteAddress);
            winston.log("verbose", "[webservices] streamautorouter: tokenExists " + tokenExists);

            //3. If Token is valid, execute AutoRouter Stream
            if ((tokenExists > -1) || (StreamAutoRouter.settings.token == "")) {

                //Exit plugin if ip address of receiver and sender is the same
                if (StreamAutoRouter.settings.destination_uri === remoteAddress) {
                    callback(true);
                }

                var targetUri = "rtmp://" + StreamAutoRouter.settings.destination_uri + "/live";

                //Apply the logs
                winston.log("verbose", "[webservices] streamautorouter: targetUri " + targetUri);

                parameters = {
                    uri: targetUri,
                    localStreamName: localStreamName,
                    keepAlive: 0 
                };

                var ipApiProxy = require(path.join(__dirname, "../core_modules/ems-api-proxy"));
                var ems = require(path.join(__dirname, "../core_modules/ems-api-core"))(ipApiProxy.url);

                //Execute command for pushStream using destination address
                ems.pushStream(parameters, function(result) {
                    winston.log("info", "[webservices] streamautorouter: pushStream result " + JSON.stringify(result));

                    callback(true);


                });

            }
        },
        //the function to call when everything's done
        function (status) {
            winston.log("info", "[webservices] streamautorouter: all eventData done, status - " +status);
            return status;

        }
    );



};

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
StreamAutoRouter.prototype.supportsEvent = function(eventType) {
    winston.log("info", "[webservices] streamautorouter: supportsEvent ");
    winston.log("verbose", "[webservices] streamautorouter: supportsEvent eventType "+eventType);

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