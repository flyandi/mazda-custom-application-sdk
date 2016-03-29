/**
 * Custom Applications SDK for Mazda Connect Infotainment System
 *
 * A mini framework that allows to write custom applications for the Mazda Connect Infotainment System
 * that includes an easy to use abstraction layer to the JCI system.
 *
 * Written by Andreas Schwarz (http://github.com/flyandi/mazda-custom-applications-sdk)
 * Copyright (c) 2016. All rights reserved.
 *
 * WARNING: The installation of this application requires modifications to your Mazda Connect system.
 * If you don't feel comfortable performing these changes, please do not attempt to install this. You might
 * be ending up with an unusuable system that requires reset by your Dealer. You were warned!
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU General Public License as published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
 * License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see http://www.gnu.org/licenses/
 *
 */

/**
 * This is the main system file that manages everything between the CMU backend server and the frontend.
 */

/**
 * (Logger)
 */

window.Logger = {

	levels: {
		debug: 'DEBUG',
		info: 'INFO',
		error: 'ERROR',
	},

	/**
	 * Subscriptions
	 * @array
	 */
	subscriptions: [],

	/**
	 * (debug) debug message
	 */

	debug: function() {
		this.__message(this.levels.debug, "#006600", Array.apply(null, arguments));
	},

	/**
	 * (error) error message
	 */

	error: function() {
		this.__message(this.levels.error, "#FF0000", Array.apply(null, arguments));
	},

	/**
	 * (info) info message
	 */

	info: function() {
		this.__message(this.levels.info, "#0000FF", Array.apply(null, arguments));
	},

	/**
	 * Subscribe
	 * @return {[type]} [description]
	 */
	subscribe: function(callback) {

		if(typeof(callback) == "function") {
			this.subscriptions.push(callback);
		}
	},

	/**
	 * [__message description]
	 * @param  {[type]} level  [description]
	 * @param  {[type]} color  [description]
	 * @param  {[type]} values [description]
	 * @return {[type]}        [description]
	 */
	__message: function(level, color, values) {

		var msg = [];

		if(values.length > 1) {
			values.forEach(function(value, index) {

				if(index > 0) {

					if(typeof(value) == "object") {

						var keys = value, o = false;

						if(Object.prototype.toString.call(value) == "[object Object]") {
							var keys = Object.keys(value),
								o = true;
						}

						keys.forEach(function(v, index) {
							msg.push(o ? '[' + v + '=' + value[v]+ ']' : '[' + v + ']');
						});

					} else {
						msg.push(value);
					}
				}
			});
		}

		msg = msg.join(" ");

		this.subscriptions.forEach(function(subscription) {

			try {
				subscription(level, values[0], msg, color);
			} catch(e) {

			}
		});
	}
};


/**
 * (CustomApplications)
 *
 * Registers itself between the JCI system and CustomApplication framework.
 */

window.CustomApplications = {

	ID: 'system',

	/**
	 * (locals)
	 */
	debug: false,
	bootstrapped: false,

	systemAppId: 'system',
	systemAppCategory: 'Applications',

	/**
	 * Overwrites
	 */
	proxyAppName: 'vdt',
	proxyAppContext: 'DriveChartDetails',
	proxyMmuiEvent: 'SelectDriveRecord',

	targetAppName: 'custom',
	targetAppContext: 'Surface',

	/**
	 * Configuration
	 */
	configuration: {

		networkHost: '127.0.0.1',
		networkPort: 9700,

	},

	/**
	 * Commands
	 */
	commands: {

		REQUEST_PING: 'ping',
		REQUEST_APPDRIVE: 'appdrive',
	},

	/**
	 * Results
	 */
	results: {

		RESULT_OK: 200,
		RESULT_PONG: 201,
		RESULT_NOTFOUND: 404,
		RESULT_ERROR: 500,
	},

	/**
	 * Initializes the proxy
	 * @return void
	 */
	initialize: function(callback) {

		if(!this.initialized) {

			this.initialized = true;

			this.requests = {};

			this.obtainConnection();
		}

		return callback ? callback() : true;
	},


	/**
	 * Establishes a connection between the front and backend
	 * @return void
	 */
	obtainConnection: function() {

		try {

			this.client = new WebSocket('ws://' + this.configuration.networkHost + ':' + this.configuration.networkPort);

			/**
			 * Ping
			 */
			this.client.ping = function() {

				this.request(this.commands.REQUEST_PING, {
					inboundStamp: (new Date()).getTime()
				}, function(error, result) {

					Logger.info(this.ID, "ping", {
						lost: error,
						time: !error ? result.outboundStamp - result.inboundStamp : 0,
					});

				}.bind(this));

			}.bind(this);

			/**
			 * onOpen
			 * @event
			 */
			this.client.onopen = function() {

				Logger.info(this.ID, "connection open");

				this.client.ping();

				this.requestAppDrive();

			}.bind(this);

			/**
			 * onMessage
			 * @event
			 */
			this.client.onmessage = function(message) {

				this.handleReturnRequest(message);

			}.bind(this);

			/**
			 * onError
			 * @event
			 */
			this.client.onerror = function(error) {

				Logger.error(CustomApplications.ID, 'ClientError', error);

			}.bind(this);

			/**
			 * onClose
			 * @event
			 */
			this.client.onclose = function(event) {

				this.client = null;

				if(event.code == 3110) {

				} else {

					setTimeout(function() {

						CustomApplications.obtainConnection();

					}, 5000); // retry later

				}

			}.bind(this);

		} catch(e) {

			this.client = null;
		}
	},

	/**
	 * [request description]
	 * @return {[type]} [description]
	 */
	request: function(request, payload, callback) {

		// check connection state
		if(!this.client || this.client.readyState != 1) return callback(true, {});

		// prepare id
		var id = false;
		while(!id || this.requests[id]) {
			id = (new Date()).getTime();
		}

		// register request
		this.requests[id] = callback;

		// sanity check
		payload = payload || {};

		// add request id
		payload.requestId = id;

		payload.request = request;

		// execute
		return this.client.send(JSON.stringify(payload));
	},


	/**
	 * Processes a request
	 * @param  {[type]} data [description]
	 * @return {[type]}      [description]
	 */
	handleReturnRequest: function(message) {

		try {
			// parse message
			var payload = JSON.parse(message.data);

			// check against active requests
			if(payload.requestId && this.requests[payload.requestId]) {

				var callback = this.requests[payload.requestId];

				if(typeof(callback) == "function") {

					callback(payload.result == this.results.RESULT_ERROR, payload);
				}

				delete this.requests[payload.requestId];

				return; // all done
			}

		} catch(e) {

			Logger.error(CustomApplications.ID, 'handleReturnRequest', e);
		}
	},


	/**
	 * Trys to load the AppDrive
	 * @return void
	 */
	requestAppDrive: function() {

		if(typeof(CustomApplicationsHandler) != "undefined") return false;

		if(!this.request(this.commands.REQUEST_APPDRIVE, false, function(error, result) {

			if(error) {
				return setTimeout(function() {

					this.requestAppDrive();

				}.bind(this), 100);
			}

			// boot strap system
			this.bootstrap();

		}.bind(this)));
	},

	/**
	 * (bootstrap)
	 *
	 * Bootstraps the JCI system
	 */

	bootstrap: function() {

		// verify that core objects are available
		if(typeof framework === 'object' && framework._currentAppUiaId === this.systemAppId && this.bootstrapped === false) {

			// retrieve system app
			var systemApp = framework.getAppInstance(this.systemAppId);

			// verify bootstrapping - yeah long name
			if(systemApp) {

				// set to strap - if everything fails - no harm is done :-)
				this.bootstrapped = true;

				// let's boostrap
				try {

					// overwrite list2 handler
					systemApp._contextTable[this.systemAppCategory].controlProperties.List2Ctrl.selectCallback = this.menuItemSelectCallback.bind(systemApp);

					// for usb changes
					if(typeof(systemApp.overwriteStatusMenuUSBAudioMsgHandler) == "undefined") {
						systemApp.overwriteStatusMenuUSBAudioMsgHandler = systemApp._StatusMenuUSBAudioMsgHandler;
						systemApp._StatusMenuUSBAudioMsgHandler = this.StatusMenuUSBAudioMsgHandler.bind(systemApp);
					}

					// overwrite framework route handler
					if(typeof(framework.overwriteRouteMmmuiMsg) == "undefined") {
						framework.overwriteRouteMmmuiMsg = framework.routeMmuiMsg;
						framework.routeMmuiMsg = this.routeMmuiMsg.bind(framework);
					}

					// ovewrite framework MMUI sender
					if(typeof(framework.overwriteSendEventToMmui) == "undefined") {
						framework.overwriteSendEventToMmui = framework.sendEventToMmui;
						framework.sendEventToMmui = this.sendEventToMmui.bind(framework);
					}

					// assign template transition
					framework.transitionsObj._genObj._TEMPLATE_CATEGORIES_TABLE.SurfaceTmplt = 'Detail with UMP';

					// kick off loader
					this.prepareCustomApplications();

				} catch(e) {
					// bootstrapping process failed - we just leave it here
				}
			}
		}
	},


	/**
	 * (Overwrite) menuItemSelectCallback
	 */

	menuItemSelectCallback: function(listCtrlObj, appData, params) {

		try {

		 	if(appData.mmuiEvent == "SelectCustomApplication") {

				// exit if handler is not available
				if(typeof(CustomApplicationsHandler) != "undefined") {

					// launch app
					if(CustomApplicationsHandler.launch(appData)) {

						// clone app data
						try {
							appData = JSON.parse(JSON.stringify(appData));

							// set app data
							appData.appName = CustomApplicationsProxy.proxyAppName;
							appData.mmuiEvent = CustomApplicationsProxy.proxyMmuiEvent;
						} catch(e) {
							// do nothing
						}
		  	 		}
		  		}
		  	}

		} catch(e) {
			// do nothing
		}

		// pass to original handler
		this._menuItemSelectCallback(listCtrlObj, appData, params);
	},


	/**
	 * (Overwrite) sendEventToMmui
	 */

	sendEventToMmui: function(uiaId, eventId, params, fromVui) {

		var currentUiaId = this.getCurrentApp(),
			currentContextId = this.getCurrCtxtId();

		// proxy overwrites
	    if(typeof(CustomApplicationsHandler) === 'object' && currentUiaId == CustomApplicationsProxy.targetAppName) {
	    	currentUiaId = CustomApplicationsProxy.proxyAppName;
	    	currentContextId = CustomApplicationsProxy.proxyAppContext;
	    }

	    // pass to original handler
	    framework.overwriteSendEventToMmui(uiaId, eventId, params, fromVui, currentUiaId, currentContextId);
	},


	/**
	 * (Overwrite) routeMmuiMsg
	 */

	routeMmuiMsg: function(jsObject) {

		if(typeof(CustomApplicationsHandler) === 'object') {

			try {

				var proxy = CustomApplicationsProxy;

				// validate routing message
				switch(jsObject.msgType) {

					// magic switch
					case 'ctxtChg':
						if(jsObject.uiaId == proxy.proxyAppName) {
							jsObject.uiaId = proxy.targetAppName;
							jsObject.ctxtId = proxy.targetAppContext;
						}
						break;

					// check if our proxy app is in the focus stack
					case 'focusStack':

						if(jsObject.appIdList && jsObject.appIdList.length) {
							for(var i = 0; i < jsObject.appIdList.length; i++) {
								var appId = jsObject.appIdList[i];
								if(appId.id == proxy.proxyAppName) {
									appId.id = proxy.targetAppName;
								}
							};
						}

					case 'msg':
					case 'alert':

						if(jsObject.uiaId == proxy.proxyAppName) {
							jsObject.uiaId = proxy.targetAppName;
						}

						break;
					default:
						// do nothing
						break;
				}

			} catch(e) {
				// do nothing
			}
		}

		// pass to framework
		framework.overwriteRouteMmmuiMsg(jsObject);
	},


	/**
	 * (Overwrite) StatusMenuUSBAudioMsgHandler
	 */

	StatusMenuUSBAudioMsgHandler: function(msg) {

		// pass to original handler
		this.overwriteStatusMenuUSBAudioMsgHandler(msg);
	},


	/**
	 * (loadCustomApplications)
	 */

	loadCustomApplications: function() {

	    try {

	        if(typeof(CustomApplicationsHandler) === 'undefined') {

	        	// clear
	        	clearTimeout(this.loadTimer);

	            // try to load the script
	            utility.loadScript("apps/custom/runtime/runtime.js", false, function() {

	            	clearTimeout(this.loadTimer);

	                this.initCustomApplicationsDataList();

	            }.bind(this));

	            // safety timer
	            this.loadTimer = setTimeout(function() {

	                if(typeof(CustomApplicationsHandler) == "undefined") {

	                    this.loadCount = this.loadCount + 1;

	                    // 20 attempts or we forget it - that's almost 3min
	                    if(this.loadCount < 20) {

	                        this.loadCustomApplications();
	                    }
	                }

	            }.bind(this), 10000);

	        }

	    } catch(e) {
	        // if this fails, we won't attempt again because there could be issues with the actual handler
	        setTimeout(function() {

	            this.loadCustomApplications();

	        }.bind(this), 10000);
	    }
	},

	/**
	 * (initCustomApplicationsDataList)
	 */

	initCustomApplicationsDataList: function() {
	    // extend with custom applications
	    try {
	        if(typeof(CustomApplicationsHandler) != "undefined") {

	            CustomApplicationsHandler.retrieve(function(items) {

	            	var systemApp = framework.getAppInstance(this.systemAppId);

	                items.forEach(function(item) {

	                    systemApp._masterApplicationDataList.items.push(item);

	                    framework.localize._appDicts[this.systemAppId][item.appData.appName.replace(".", "_")] = item.title;

	                    framework.common._contextCategory._contextCategoryTable[item.appData.appName + '.*'] = 'Applications';

	                }.bind(this));

	            }.bind(this));
	        }
	    } catch(e) {
	    	// failed to register applications
	    }
	},

}


/**
 * Runtime Caller
 */

if(window.opera) {
	window.opera.addEventListener('AfterEvent.load', function (e) {
		CustomApplications.initialize(function() {
			CustomApplications.bootstrap();
		});
	});
}


/** EOF **/