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
 * CMU - Lightweight Communication Management Module
 */

window.CMU = {

    /**
     * Configuration
     */
    configuration: {

        networkHost: '127.0.0.1',
        networkPort: 9700,

    },

    /**
     * Requests
     */
    requests: {

        REQUEST_PING: 'ping',
        REQUEST_SETUP: 'setup',
        REQUEST_APPLICATIONS: 'applications',
        REQUEST_APPDRIVE: 'appdrive',
    },

    /**
     * Commands
     */

    commands: {

        LOAD_JS: 'loadjs',
        LOAD_CSS: 'loadcss',
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
     * Resource
     */

    resource: {
        JAVASCRIPT: 'js',
        CSS: 'css',
        JSON: 'json',
    },

    /**
     * Initializes the proxy
     * @return void
     */
    initialize: function(callback) {

        if(!this.initialized) {

            this.initialized = true;

            this.requestBuffer = {};

            this.waitForQueue = {};

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

                this.request(this.requests.REQUEST_PING, {
                    inboundStamp: (new Date()).getTime()
                }, function(error, result) {

                    this.__log("ping", {
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

                this.__log("connection open");

                this.requestSetup();

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

                this.__error('error', error);

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

                        CMU.obtainConnection();

                    }, 5000); // retry later

                }

            }.bind(this);

        } catch(e) {

            this.client = null;
        }
    },


    /**
     * Request initial setup
     * @return {[type]} [description]
     */
    requestSetup: function(callback) {

        this.request(this.requests.REQUEST_SETUP, false, function(error, result) {

            this.appdrive = result.appdrive;

        }.bind(this));
    },

    /**
     * Requests the applicationst to be loaded
     * @return {[type]} [description]
     */
    requestApplications: function() {

        this.request(this.requests.REQUEST_APPLICATIONS);
    },


    /**
     * [requestResource description]
     * @return {[type]} [description]
     */
    requestResource: function(type, files, location, callback) {

        if(typeof(location) == "function") callback = location;

        if(typeof(files) != "object") {
            (files = []).push(files);
        }

        console.log(files, location);

        if(typeof(location) == "string") {


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
        while(!id || this.requestBuffer[id]) {
            id = (new Date()).getTime();
        }

        // register request
        this.requestBuffer[id] = callback;

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

            // payload
            switch(true) {

                /**
                 * Requests (Command from CMU)
                 */
                case typeof(payload.command) != "undefined":

                    this.handleCommand(payload.command, payload.attributes);

                    break;

                /**
                 * Everything else
                 */
                default:

                    // check against active requests
                    if(payload.requestId && this.requestBuffer[payload.requestId]) {

                        var callback = this.requestBuffer[payload.requestId];

                        if(typeof(callback) == "function") {

                            callback(payload.result == this.results.RESULT_ERROR, payload);
                        }

                        delete this.requestBuffer[payload.requestId];

                        return; // all done
                    }

                    break;
            }

        } catch(error) {

            this.__error('handleReturnRequest', error);
        }
    },


    /**
     * (handleCommand)
     */

    handleCommand: function(command, attributes) {

        switch(command) {

            /** @type {LOADJS} [description] */
            case this.commands.LOAD_JS:

                this.__loadInvoker(attributes, 'script', 'text/javascript');
                break;

            /** @type {LOADCSS} */
            case this.commands.LOAD_CSS:

                 this.__loadInvoker(attributes, 'style', 'text/css');
                 break;
        }
    },

    /**
     * (attach)
     */

    attach: function(key, callback) {

        if(this.has(key) || typeof(callback) != "function") return false;

        this[key] = callback(this);

        if(this.waitForQueue[key]) {

            this.waitForQueue[key].forEach(function(callback) {
                callback(this[key]);
            }.bind(this));

            this.waitForQueue[key] = false;
        }
    },


    /**
     * (has)
     */

    has: function(key) {

        return this[key] ? true : false;
    },


    /**
     * (waitFor)
     */

    waitFor: function(key, callback) {

        if(typeof(callback) != 'function') return false;

        if(this.has(key)) return callback(this[key]);

        if(!this.waitForQueue[key]) this.waitForQueue[key] = [];

        this.waitForQueue[key].push(callback);

    },


    /**
     * (__loadInvoker)
     */

    __loadInvoker: function(attributes, tag, type) {

        if(!attributes.data || !attributes.data instanceof Array) return false;

        attributes.data.forEach(function(item) {

            if(item.location && item.contents) {

                this.__unload(item.location);

                var element = document.createElement(tag);
                element.setAttribute("data-script-url", item.location);
                element.appendChild(document.createTextNode(item.contents));

                if(type) element.setAttribute("type", type);
                document.head.appendChild(element);
            }

        }.bind(this));
    },

    /**
     * [__unload description]
     * @return {[type]} [description]
     */
    __unload: function(location) {

        var element = document.querySelector('[data-script-url="' + location + '"]');

        if(element) {
            document.head.removeChild(element);
        }

    },

    /**
     * Simple proxy to the logger
     * @param  string   message     The message
     * @param  array    params      The parameters
     * @return void
     */
    __log: function(message, params) {
        if(typeof(Logger) != "undefined") {
            Logger.info(this.IDs, message, params);
        }

        console.log(message, params);
    },

    /**
     * Simple proxy to the logger
     * @param  string   message     The message
     * @param  array    params      The parameters
     * @return void
     */
    __error: function(message, params) {
        if(typeof(Logger) != "undefined") {
            Logger.error(this.ID, message, params);
        }

        console.log(message, params);
    }
};


/**
 * Runtime Caller
 */

if(window.opera) {
    window.opera.addEventListener('load', function (e) {
        CMU.initialize();
    });
}

/** EOF **/