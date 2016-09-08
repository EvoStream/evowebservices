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

    //Apply Logs
    winston.log("info", "StreamRecorder.prototype.init ");

    this.settings = settings;
};


/**
 * Execute process for Recorder
 * @param array event
 * @return boolean
 */
StreamRecorder.prototype.processEvent = function(event) {

    //Apply Logs
    winston.log("info", "StreamRecorder.prototype.processEvent ");

    var self = this;
    var ems = require("../core_modules/ems-api-core")(null);

    //Process for New Stream created
    if (event.type == 'inStreamCreated') {

        //Apply the logs
        winston.log("info", "StreamRecorder inStreamCreated");

        //1. Get LocalStreamName
        localStreamName = event.payload.name;

        //2. Execute Record Stream
        if ((this.settings.file_location === null) || (this.settings.file_location === "")) {
            winston.log('error', "Evowebservices Error: The file location for recorded files is invalid");
            return false;
        }

        try {
            // Query the entry
            var statsPath = fs.lstatSync(this.settings.file_location);

            // Is it a directory?
            //Check if file location is a valid directory
            if (fs.lstatSync(statsPath).isDirectory()) {
                winston.log('info', "Evowebservices Error: The file location for recorded files is valid");
            }
        }
        catch (e) {
            winston.log('error', "Evowebservices Error: The file location for recorded files is invalid");

            return false;
        }

        var recordFileDirectory = this.settings.file_location + path.sep + localStreamName;

        //Apply the logs
        winston.log("verbose", "StreamRecorder localStreamName " + localStreamName);
        winston.log("verbose", "StreamRecorder recordFileDirectory " + recordFileDirectory);

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
            winston.log("info", "StreamRecorder record status " + result.status);

            if (result.status == "FAIL") {
                winston.log("error", "StreamRecorder record status " + result.status);

                return false;
            }

        });
    }

    //Process for OutStreamCreated for the recorded stream
    if (event.type == 'outStreamCreated') {

        //Apply the logs
        winston.log("info", "StreamRecorder outStreamCreated");

        var periodTime = parseInt(this.settings.period_time, 10);


        //1. Get the Recorded stream
        recordedStream = event.payload.recordSettings._localStreamName;
        localStreamName = event.payload.name;
        uniqueId = event.payload.uniqueId;

        //Check if the localStreamName is the recorded stream, 
        //if not exit the plugin
        if (localStreamName !== recordedStream) {
            return true;
        }

        //Apply the logs
        winston.log("verbose", "StreamRecorder periodTime " + periodTime);
        winston.log("verbose", "StreamRecorder localStreamName " + localStreamName);
        winston.log("verbose", "StreamRecorder recordedStream " + recordedStream);
        winston.log("verbose", "StreamRecorder uniqueId " + uniqueId);

        //2. Execute creation of timer
        var parameters = null;
        ems.listTimers(parameters, function(result) {

            if (result.data != null) {
                var timerListData = result.data;

                //Apply the logs
                winston.log("verbose", "StreamRecorder timerListData " + JSON.stringify(timerListData));

                //Check that the stream is not yet set with a timer
                for (var i in timerListData) {

                    if (timerListData[i]._uniqueId == uniqueId) {
                        //if a timer is already set to the stream, exit plugin 
                        //by returning true
                        return true;
                    }
                }
            }

            var parameters = {
                value: periodTime,
                _uniqueId: uniqueId
            };

            ems.setTimer(parameters, function(result) {
                winston.log("info", "StreamRecorder setTimer status " + result.status);

                if (result.status == "FAIL") {
                    winston.log("error", "StreamRecorder setTimer status " + result.status);

                    return false;
                }

            });

        });
    }

    //Process when timer is triggered
    if (event.type == "timerTriggered") {

        //Apply the logs
        winston.log("info", "StreamRecorder timerTriggered");

        //1. Get uniqueId from a parameter set by the Set Timer 
        _uniqueId = event.payload._uniqueId;

        //Apply the logs
        winston.log("verbose", "StreamRecorder _uniqueId " + _uniqueId);


        //Remove the timer 
        var parameters = null;
        ems.listTimers(parameters, function(result) {


            if (result.data != null) {
                var timerListData = result.data;



                //Get the timer id using the _localStreamName and remove it
                for (var i in timerListData) {

                    //Apply the logs
                    winston.log("verbose", "StreamRecorder timerListData " + JSON.stringify(timerListData));

                    if (timerListData[i]._uniqueId == _uniqueId) {
                        //Execute api for removing a timer
                        var parameters = {
                            id: timerListData[i].timerId
                        };
                        ems.removeTimer(parameters, function(result) {
                            winston.log("info", "StreamRecorder removeTimer status " + result.status);

                            if (result.status == "FAIL") {
                                winston.log("error", "StreamRecorder removeTimer status " + result.status);

                                return false;
                            }

                            //Execute ShutdownStream using the uniqueId
                            var parameters = {
                                id: _uniqueId,
                                permanently: 0
                            };

                            ems.shutdownStream(parameters, function(result) {

                                winston.log("info", "StreamRecorder shutdownStream status " + result.status);

                                if (result.status == "SUCCESS") {

                                    var localStreamName = result.data.streamInfo.recordSettings.localStreamName;
                                    var recordFileDirectory = result.data.streamInfo.pathToFile;

                                }
                            });
                        });
                    }
                }
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
StreamRecorder.prototype.supportsEvent = function(eventType) {

    //Apply Logs
    winston.log("info", "StreamRecorder.prototype.supportsEvent ");


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