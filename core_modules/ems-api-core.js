/***
 *
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2017 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 *
 ***/

/**
 * EMS API
 */

// var request = require('request-enhanced');
var request = require('request-promise');
var winston = require('winston');



module.exports = function(serverUrl) {

    //set the Server URL
    //Change to support IPv4 to IPv6
    var defaultServerUrl = "http://127.0.0.1:7777";

    if (serverUrl != null) {
        this.serverUrl = serverUrl;
    } else {
        this.serverUrl = defaultServerUrl;
    }


    //default options
    this.options = {
        url: this.serverUrl,
        method: 'GET',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'User-Agent': 'Request-Promise for EMS Applications'
        },
        json: true
    };

    var self = this;

    this.buildqs = function(parameters) {

        winston.log("info", "[EMS-API] building the query string ");

        var qs = "?params=";
        var params = "";

        for (var key in parameters) {
            params += key + "=" + parameters[key] + " ";
        }

        winston.log("verbose", "[EMS-API] parameters: " + params);

        var buffer = new Buffer(params);
        var params64 = buffer.toString('base64');
        qs += params64;

        winston.log("verbose", "[EMS-API] base64 parameters: " + params);

        return qs;

    };


    this.sendCommand = function(command, parameters, callbackResponse) {

        winston.log("info", "[EMS-API] building the command");

        var queryString = self.buildqs(parameters);

        if (queryString == "?params=") {
            self.options["url"] = self.serverUrl + "/" + command;
        } else {
            self.options["url"] = self.serverUrl + "/" + command + queryString;
        }


        if(command != 'version'){
            if (queryString == "?params=") {
                winston.log("info", "[EMS-API] command url: [SERVERURL]/" + command);
            } else {
                winston.log("info", "[EMS-API] command url: [SERVERURL]/" + command + queryString);
            }
        }

        request(self.options)
            .then(function (response) {
                // winston.log("verbose", "[EMS-API] response: "+JSON.stringify(response));

                return callbackResponse(response);
            })
            .catch(function (error) {
                winston.log("error", "[EMS-API] response failed: "+JSON.stringify(error));
            });
    };

    this.command = {
        version: "version",

        /*********************************************************************************************************************
         * Streams 
         */

        pullStream: "pullStream",
        pushStream: "pushStream",
        createHLSStream: "createHLSStream",
        createHDSStream: "createHDSStream",
        createMSSStream: "createMSSStream",
        createDASHStream: "createDASHStream",
        record: "record",
        transcode: "transcode",
        listStreamsIds: "listStreamsIds",
        getStreamInfo: "getStreamInfo",
        listStreams: "listStreams",
        getStreamsCount: "getStreamsCount",
        shutdownStream: "shutdownStream",
        listConfig: "listConfig",
        removeConfig: "removeConfig",
        getConfigInfo: "getConfigInfo",
        isStreamRunning: "isStreamRunning",

        /*********************************************************************************************************************
         * Aliasing 
         */

        addStreamAlias: "addStreamAlias",
        listStreamAliases: "listStreamAliases",
        removeStreamAlias: "removeStreamAlias",
        flushStreamAliases: "flushStreamAliases",
        addGroupNameAlias: "addGroupNameAlias",
        flushGroupNameAliases: "flushGroupNameAliases",
        getGroupNameByAlias: "getGroupNameByAlias",
        listGroupNameAliases: "listGroupNameAliases",
        removeGroupNameAliases: "removeGroupNameAliases",
        listHttpStreamingSessions: "listHttpStreamingSessions",
        createIngestPoint: "createIngestPoint",
        removeIngestPoint: "removeIngestPoint",
        listIngestPoints: "listIngestPoints",

        /*********************************************************************************************************************
         * Utility and Feature API Functions 
         */

        startWebRTC: "startWebRTC",
        stopWebRTC: "stopWebRTC",
        launchProcess: "launchProcess",
        setTimer: "setTimer",
        listTimers: "listTimers",
        removeTimer: "removeTimer",
        generateLazyPullFile: "generateLazyPullFile",
        generateServerPlaylist: "generateServerPlaylist",
        insertPlaylistItem: "insertPlaylistItem",
        uploadMedia: "uploadMedia",
        getMetadata: "getMetadata",
        pushMetadata: "pushMetadata",
        shutdownMetadata: "shutdownMetadata",
        listStorage: "listStorage",
        addStorage: "addStorage",
        removeStorage: "removeStorage",
        setAuthentication: "setAuthentication",
        setLogLevel: "setLogLevel",
        help: "help",
        shutdownServer: "shutdownServer",

        /*********************************************************************************************************************
         * Connections
         */

        listInboundStreamNames: "listInboundStreamNames",
        listInboundStreams: "listInboundStreams",
        getConnectionInfo: "getConnectionInfo",
        listConnections: "listConnections",
        clientsConnected: "clientsConnected",
        httpClientsConnected: "httpClientsConnected",
        getExtendedConnectionCounters: "getExtendedConnectionCounters",
        resetMaxFdCounters: "resetMaxFdCounters",
        resetTotalFdCounters: "resetTotalFdCounters",
        getConnectionsCount: "getConnectionsCount",
        getConnectionsCountLimit: "getConnectionsCountLimit",
        setConnectionsCountLimit: "setConnectionsCountLimit",
        getBandwidth: "getBandwidth",
        setBandwidthLimit: "setBandwidthLimit",

        /*********************************************************************************************************************
         * Connections
         */

        listServices: "listServices",
        createService: "createService",
        enableService: "enableService",
        shutdownService: "shutdownService",
        addMetadataListener: "addMetadataListener",
        listMetadataListeners: "listMetadataListeners",

        /*********************************************************************************************************************
         * Additional Info
         */

        getInboundStreamsCount: "getinboundStreamsCount",
        getLicenseId: "getLicenseId",
        getServerInfo: "getServerInfo",


    }


    for (var key in this.command)(function(key) {
        global[key] = function(parameters, callbackResponse) {
            self.sendCommand(key, parameters, callbackResponse);
        };
    })(key);

    return self;

};