/***
 * 
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2016 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 * 
 ***/


var jsonComment = require('comment-json');
var fs = require('fs');

//require configuration of plugins
//parse the configuration and remove the comments
var config = jsonComment.parse(fs.readFileSync("./config/plugins.json"), null, true);
var winston = require('winston');

exports.getPluginsStack = function() {

    winston.log("info", "Get enabled Plugins");

    var pluginStack = new Object();

    //load Plugin Configuration 
    for (var i in config) { 

        if (config[i].plugin_switch == "enabled") {

            winston.log("info", "plugin name: " + i);

            //call the plugin and create an instance of it
            var pluginPath = "../plugins/" + i.toLowerCase();
            var plugin = require(pluginPath);
            var pluginCreated = new plugin();

            //initialize the settings of the plugin
            pluginCreated.init(config[i].parameters);

            //store the plugin to an array
            pluginStack[i] = pluginCreated;
        } 
    }
    
    return pluginStack;

};
