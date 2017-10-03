BasePlugin = function () { };

	BasePlugin.prototype.init = function(settings) {
		console.log("[webservices] BasePlugin.prototype.init NOT IMPLEMENTED on a Plugin. Please check. ");
		process.exit(1);
	};
	/* !
	 * @brief This function will initialize the setting for the plugin
	 *
	 * @param settings - the array of setting fot the plugin
	 *
	 * @return It must return true if the plugins stack should continue
	 * processing, or false if not
	 */

	BasePlugin.prototype.processEvent = function(event) {
		console.log("[webservices] BasePlugin.prototype.processEvent NOT IMPLEMENTED on a Plugin. Please check. ");
		process.exit(1);
	};
	/* !
	 * @brief This function will be called for each and every event. It is going
	 * to tell the framework if processEvent should be called or not
	 *
	 * @param $event - the event which will be passed to processEvent
	 *
	 * @return It must return true or false. If true, the next plugin would be executed
	 * if false, the process would stop executing the other plugins
	 *
	 */

	BasePlugin.prototype.supportsEvent = function(eventType) {
		console.log("[webservices] BasePlugin.prototype.supportsEvent NOT IMPLEMENTED on a Plugin. Please check. ");
		process.exit(1);
	};
	/*
	 * @brief This function will check if the plugin supports the ems event
	 * 
	 * @param $eventType - the event type which will be passed to processEvent
	 * 
	 * @return It must return true or false. If true, than processEvent will be called
	 * if false, processEvent will not be called, skipping this plugin execution
	 * 
	 */
	 
module.exports = BasePlugin;