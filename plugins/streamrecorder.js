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
var fs = require('fs');
var path = require('path');


/*
 * Stream Recorder Plugin
 */
var StreamRecorder = function() {};

//implement the BasePlugin
util.inherits(StreamRecorder, BasePlugin);

/**
 * Initialize the settings for Recorder
 * @param array settings
 * @param object ems 
 * @return boolean
 */
StreamRecorder.prototype.init = function(settings) {

    winston.log("info", "[webservices] streamrecorder: init ");
    this.settings = settings;
    
};


/**
 * Execute process for Recorder
 * @param array event
 * @return boolean
 */
StreamRecorder.prototype.processEvent = function(event) {
    winston.log("info", "[webservices] streamrecorder: processEvent ");

    var StreamRecorder = this;

    var eventDataArray = [];
    eventDataArray.push(event);

    var async = require("async");
    async.mapSeries(eventDataArray,
        function (eventData, callback) {
            winston.log("info", "[webservices] streamrecorder: processEvent eventData " + JSON.stringify(eventData));

            var ipApiProxy = require(path.join(__dirname, "../core_modules/ems-api-proxy"));
            var ems = require(path.join(__dirname, "../core_modules/ems-api-core"))(ipApiProxy.url);

            //Process for New Stream created
            if (eventData.type == 'inStreamCreated') {

                //1. Get LocalStreamName
                localStreamName = eventData.payload.name;

                //2. Execute Record Stream
                if ((StreamRecorder.settings.file_location === null)) {
                    winston.log("error", "[webservices] streamrecorder: file location for recorded files is required ");
                    callback(false);
                }

                if ((StreamRecorder.settings.file_location === "")) {
                    winston.log("error", "[webservices] streamrecorder: file location for recorded files is required ");
                    callback(false);
                }

                try {
                    winston.log("info", "[webservices] streamrecorder: checking if file directory is valid " +(fs.lstatSync(StreamRecorder.settings.file_location).isDirectory()) );
                }
                catch (e) {
                    winston.log('error', "[webservices] streamrecorder: the file location for recorded files is invalid");
                    callback(false);
                }

                var recordFileDirectory = StreamRecorder.settings.file_location + path.sep + localStreamName;

                //Apply the logs
                winston.log("verbose", "[webservices] streamrecorder: localStreamName " + localStreamName);
                winston.log("verbose", "[webservices] streamrecorder: recordFileDirectory " + recordFileDirectory);

                //Execute command for record stream
                var parameters = {
                    localStreamName: localStreamName,
                    pathtofile: recordFileDirectory,
                    overwrite: 0,
                    keepAlive: 1,
                    type: 'mp4',
                    _localStreamName: localStreamName
                };

                ems.record(parameters, function(result) {
                    winston.log("info", "[webservices] streamrecorder: record result - " + JSON.stringify(result));

                    callback(true);

                });
            }

            //Process for OutStreamCreated for the recorded stream
            if (eventData.type == 'outStreamCreated') {
                var periodTime = parseInt(StreamRecorder.settings.period_time, 10);

                //1. Get the Recorded stream
                recordedStream = eventData.payload.recordSettings._localStreamName;
                localStreamName = eventData.payload.name;
                uniqueId = eventData.payload.uniqueId;

                //Check if the localStreamName is the recorded stream,
                //if not exit the plugin
                if (localStreamName !== recordedStream) {
                    callback(true);
                }

                //Apply the logs
                winston.log("verbose", "[webservices] streamrecorder: periodTime - " + periodTime);
                winston.log("verbose", "[webservices] streamrecorder: localStreamName - " + localStreamName);
                winston.log("verbose", "[webservices] streamrecorder: recordedStream - " + recordedStream);
                winston.log("verbose", "[webservices] streamrecorder: uniqueId - " + uniqueId);

                //2. Execute creation of timer
                var parameters = null;
                ems.listTimers(parameters, function(result) {

                    if (result.data != null) {
                        var timerListData = result.data;

                        winston.log("info", "[webservices] streamrecorder: timerListData - " + JSON.stringify(timerListData));

                        //Check that the stream is not yet set with a timer
                        for (var i in timerListData) {

                            if (timerListData[i]._uniqueId == uniqueId) {
                                //if a timer is already set to the stream, exit plugin
                                //by returning true
                                callback(true);
                            }
                        }
                    }

                    var parameters = {
                        value: periodTime,
                        _uniqueId: uniqueId
                    };

                    ems.setTimer(parameters, function(result) {
                        winston.log("info", "[webservices] streamrecorder: setTimer result - " + JSON.stringify(result));

                        callback(true);

                    });

                });
            }

            //Process when timer is triggered
            if (eventData.type == "timerTriggered") {

                //1. Get uniqueId from a parameter set by the Set Timer
                _uniqueId = eventData.payload._uniqueId;

                //Apply the logs
                winston.log("verbose", "[webservices] streamrecorder:  _uniqueId - " + _uniqueId);


                //Remove the timer
                var parameters = null;
                ems.listTimers(parameters, function(result) {

                    if (result.data != null) {
                        var timerListData = result.data;

                        //Get the timer id using the _localStreamName and remove it
                        for (var i in timerListData) {

                            //Apply the logs
                            winston.log("verbose", "[webservices] streamrecorder: timerListData - " + JSON.stringify(timerListData));

                            if (timerListData[i]._uniqueId == _uniqueId) {
                                //Execute api for removing a timer
                                var parameters = {
                                    id: timerListData[i].timerId
                                };
                                ems.removeTimer(parameters, function(result) {
                                    winston.log("info", "[webservices] streamrecorder: removeTimer result - " + JSON.stringify(result));

                                    if (result.status == "FAIL") {
                                        winston.log("error", "[webservices] streamrecorder: removeTimer result - " + JSON.stringify(result));

                                        callback(false);
                                    }

                                    //Execute ShutdownStream using the uniqueId
                                    var parameters = {
                                        id: _uniqueId,
                                        permanently: 0
                                    };

                                    ems.shutdownStream(parameters, function(result) {

                                        winston.log("info", "[webservices] streamrecorder: shutdownStream result - " + JSON.stringify(result));

                                        if (result.status == "SUCCESS") {

                                            var localStreamName = result.data.streamInfo.recordSettings.localStreamName;
                                            var recordFileDirectory = result.data.streamInfo.pathToFile;
                                        }

                                        callback(true);
                                    });
                                });
                            }
                        }
                    }
                });
            }
        },
        // 3rd param is the function to call when everything's done
        function (status) {

            winston.log("info", "[webservices] streamrecorder: all eventData done, status - " +status);
            return status;

        }
    );


};

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
StreamRecorder.prototype.supportsEvent = function(eventType) {
    winston.log("info", "[webservices] streamrecorder: supportsEvent ");
    winston.log("verbose", "[webservices] streamrecorder: supportsEvent eventType "+eventType);
    
    //Validate that Plugin supports the Event
    if (eventType == 'inStreamCreated') {
        return true;
    }

    //Validate that Plugin supports the Event
    if (eventType == 'outStreamCreated') {
        return true;
    }

    //Validate that Plugin supports the Event
    if (eventType == 'timerTriggered') {
        return true;
    }

};

module.exports = StreamRecorder;