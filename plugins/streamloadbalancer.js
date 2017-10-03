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
 * Stream Load Balancer Plugin
 */
var StreamLoadBalancer = function() {};

//implement the BasePlugin
util.inherits(StreamLoadBalancer, BasePlugin);

/**
 * Initialize the settings for Load Balancer
 * @param array settings
 * @return boolean
 */
StreamLoadBalancer.prototype.init = function(settings) {

    winston.log("info", "[webservices] streamloadbalancer: init ");
    this.settings = settings;

};

/**
 * Execute process for Load Balancer
 * @param array event
 * @return boolean
 */
StreamLoadBalancer.prototype.processEvent = function(event) {
    winston.log("info", "[webservices] streamloadbalancer: processEvent ");

    var StreamLoadBalancer = this;

    var eventDataArray = [];
    eventDataArray.push(event);

    var async = require("async");
    async.mapSeries(eventDataArray,
        function (eventData, callback) {
            winston.log("info", "[webservices] streamloadbalancer: processEvent eventData " + JSON.stringify(eventData));

            //1. Get the localStreamName and List of Ip Address
            var localStreamName = eventData.payload.name;
            var destinationEMSs = StreamLoadBalancer.settings.destination_ems_apiproxies;
            var remoteAddress = eventData.remoteIp;

            //Get the localStreamName from previous pull
            var _localStreamName = null;

            if (eventData.payload.pullSettings != null) {
                _localStreamName = eventData.payload.pullSettings._localStreamName;
            }

            //Apply the logs
            winston.log("verbose", "[webservices] streamloadbalancer: localStreamName " + localStreamName);
            winston.log("verbose", "[webservices] streamloadbalancer: remoteAddress " + remoteAddress);
            winston.log("verbose", "[webservices] streamloadbalancer: _localStreamName " + _localStreamName);
            winston.log("verbose", "[webservices] streamloadbalancer: destinationEMSs " + JSON.stringify(destinationEMSs));

            //2. Check if stream was a previously processed by using property of the pull settings
            if (_localStreamName == "" || _localStreamName != localStreamName) {

                var asyncFor = require("async");
                asyncFor.mapSeries(destinationEMSs,
                    function (destinationEMS, destinationEMSCallback) {

                        winston.log("verbose", "[webservices] streamloadbalancer: destinationEMS " + JSON.stringify(destinationEMS));

                        winston.log("verbose", "[webservices] streamloadbalancer: destinationEMS.enable " + destinationEMS.enable);

                        if(destinationEMS.enable == false ){
                            var ipEms = "http://" + destinationEMS.address + ":7777/";
                        }else{
                            //Create object for the ems core api
                            var ipEms = 'http://' + destinationEMS.userName + ':' + destinationEMS.password + '@' + destinationEMS.address + ':' + destinationEMS.ewsPort + '/' + destinationEMS.pseudoDomain;
                        }

                        winston.log("verbose", "[webservices] streamloadbalancer: ipEms " + ipEms);

                        //require ems module using the ipEms
                        var ems = require("../core_modules/ems-api-core")(ipEms);

                        if (destinationEMS.address === remoteAddress) {
                            destinationEMSCallback();
                        }

                        var targetUri = 'rtmp://' + remoteAddress + '/live/' + localStreamName;

                        //Apply the logs
                        winston.log("verbose", "[webservices] streamloadbalancer: targetUri " + targetUri);

                        //Execute pullstream command
                        var parameters = {
                            uri: targetUri,
                            localStreamName: localStreamName,
                            keepAlive: 0
                        };

                        ems.pullStream(parameters, function(result) {
                            winston.log("info", "[webservices] streamloadbalancer: pullStream result " + JSON.stringify(result));

                            if (result.status == "FAIL") {
                                winston.log("error", "[webservices] streamloadbalancer: pullStream result " + JSON.stringify(result));
                            }

                        });

                        destinationEMSCallback(null);


                    },
                    // function to call when everything's done
                    function (result) {
                        // All tasks are done now
                        winston.log("info", "[webservices] streamloadbalancer: all destinationEMSC done, result");
                        callback(true);
                    }
                ); 
            }else{
                callback(true);
            }
        },
        //the function to call when everything's done
        function (status) {
            winston.log("info", "[webservices] streamloadbalancer: all eventData done, status - " +status);

            return status;

        }
    );
};

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
StreamLoadBalancer.prototype.supportsEvent = function(eventType) {
    winston.log("info", "[webservices] streamloadbalancer: supportsEvent ");
    winston.log("verbose", "[webservices] streamloadbalancer: supportsEvent eventType "+eventType);

    //Validate that Plugin supports the Event
    if (eventType == 'inStreamCreated') {
        return true;
    }

};

module.exports = StreamLoadBalancer;