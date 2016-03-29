/**
 * Custom Application SDK for Mazda Connect Infotainment System
 *
 * A micro framework that allows to write custom applications for the Mazda Connect Infotainment System
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


'use strict';

const VERSION = "0.0.1";

/**
 * Definitions
 * @const
 */

const _webSocketServer = require("ws").Server;
const _extend = require("./cmu-utils").extend;
const fs = require("fs");

/**
 * Minimal Command
 * @constants
 */

const REQUEST_VERSION = "version";
const REQUEST_PING = "ping";
const REQUEST_APPDRIVE = "appdrive";

const RESULT_OK = 200;
const RESULT_PONG = 201;
const RESULT_NOTFOUND = 404;
const RESULT_ERROR = 500;


const MOUNTROOT_PATH = "/tmp/mnt/";
const APPDRIVE_PATH = "/appdrive/";
const APPDRIVE_JSON = "appdrive.json";

const APPLICATIONS_PATH = "apps/";

const APPLICATION_JSON = "app.json";
const APPLICATION_CSS = "app.css";
const APPLICATION_JS = "app.js";
const APPLICATION_WORKER = "worker.js";

const SYSTEM_PATH = "system/";
const FRAMEWORK_JS = "framework.js";
const FRAMEWORK_CSS = "framework.css";

/**
 * This is the CMU that is compiled into the node binary and runs the actual link between the
 * custom applications and the CMU.
 * @node-cmu
 */

function cmu() {

    this.__construct();

}

/**
 * Prototypes
 * @type The prototype object
 */
cmu.prototype = {

    /**
     * The version number
     * @var string
     */
    version: VERSION,

    /**
     * The network object
     * @var array
     */
    network: {

        /**
         * The network port
         */
        port: 9700,
    },



    /**
     * Constructs the CMU object
     * @constructor
     */
    __construct: function()
    {
        this.applications = {};

        this.__socket = new _webSocketServer({
            port: this.network.port
        });

        this.__socket.on('connection', function(client) {

            this.attachClient(client);

        }.bind(this));

    },


    /**
     * Preps a client
     * @param  object   client      The client instance
     * @return void
     */
    attachClient: function(client) {

        client.on('message', function(message) {

            this.handleClientData(client, message);

        }.bind(this));

        client.on('close', function() {

            // do nothing
        });

        client.on('error', function(e) {

            // do nothing
        });
    },

    /**
     * Handles a client message
     * @param  object   client      The client instance
     * @param  string   message     The message payload
     * @return void
     */
    handleClientData: function(client, message, flags) {

        try {
            var payload = JSON.parse(message);

            // process minimal command interfae
            if(payload.request) {

                switch(payload.request) {

                    /**
                     * Returns the current CMU backend version
                     * @type REQUEST_VERSION
                     */
                    case REQUEST_VERSION:

                        return this.sendFromPayload(client, payload, {
                            version: this.getVersion()
                        });
                        break;

                    /**
                     * Heartbeat
                     * @type REQUEST_PING
                     */
                    case REQUEST_PING:

                        return this.sendFromPayload(client, payload, {
                            outboundStamp: (new Date()).getTime()
                        }, RESULT_PONG);
                        break;

                    /**
                     * Finds the AppDrive
                     * @type REQUEST_APPDRIVE
                     */
                    case REQUEST_APPDRIVE:

                        // find applications
                        this.findAppDrive(function(applications, appdrive) {

                            this.sendFromPayload(client, payload, {
                                applications: applications,
                                appdrive: appdrive,
                            });

                        }.bind(this));

                        break;

                    /**
                     * Default - Pass to application handler
                     * @type default
                     */
                    default:

                        break;

                }

            }

        } catch(e) {

        }
    },

    /**
     * Sends a payload back to the client
     * @param  object   client      The client
     * @param  object   payload     The payload in object format
     * @return boolean              Returns the status of the operation
     */
    sendFromPayload: function(client, payload, data, resultCode) {

        var final = JSON.stringify(_extend({}, payload, data, {
            result: resultCode || RESULT_OK
        }));

        client.send(final);
    },

    /**
     * Returns the version
     * @getter
     * @return  string              The version number
     */
    getVersion: function() {
        return this.version;
    },


    /**
     * Finds the appdrive
     * @return {[type]} [description]
     */
    findAppDrive: function(callback) {

        this.applications = {};

        this.appdrive = false;

        this.framework = false;

        var result = [],
            mountPoints = ['sd_nav', 'sda', 'sdb', 'sdc', 'sdd', 'sde'];

        mountPoints.forEach(function(mountPoint) {

            /** framework */

            var frameworkPath = [MOUNTROOT_PATH, mountPoint, FRAMEWORK_PATH].join("");

            var appDrivePath = [MOUNTROOT_PATH, mountPoint, APPDRIVE_PATH].join(""),

                appDriveFilename = [appDrivePath, APPDRIVE_JSON].join("");


            if(this._isFile(appDriveFilename)) {

                this.appdrive = require(appDriveFilename);

                var files = fs.readdirSync(appDrivePath);

                if(files.length) files.forEach(function(appId) {

                    /**
                     * currently we only allow the first application to be registered
                     * otherwise you would need to restart the CMU
                     */

                    if(!this.applications[appId]) {

                        var applicationPath = [appDrivePath, appId, "/"].join("");

                        if(this._isDir(applicationPath)) {

                            var profile = {
                                    id: appId,
                                    path: applicationPath,
                                    files: {},
                                },
                                parts = [APPLICATION_JS, APPLICATION_JSON, APPLICATION_CSS, APPLICATION_WORKER],
                                found = 0;

                            parts.forEach(function(filename) {

                                var fullFilename = [applicationPath, filename].join("");

                                if(this._isFile(fullFilename)) {

                                    profile.files[filename] = fullFilename;
                                    found++;

                                    switch(filename) {

                                        case APPLICATION_JSON:
                                            profile.info = require(fullFilename);
                                            break;
                                    }
                                }
                            }.bind(this));


                            if(found >= 1) {
                                this.applications[appId] = profile;
                            }
                        }
                    }

                }.bind(this));
            }

        }.bind(this));

        if(callback) callback(this.applications, this.appdrive);

    },

    /**
     * __fileExists
     */

    _isFile: function(path) {
        try {
            return fs.lstatSync(path).isFile();
        } catch(e) {}

        return false;
    },

    /**
     * Checks if the directory exists
     * @param  {[type]}  path [description]
     * @return {Boolean}      [description]
     */
    _isDir: function(path) {
        try {
            return fs.lstatSync(path).isDirectory();
        } catch(e) {}

        return false;
    },
};

/**
 *
 */

exports = new cmu();

/**
/** eof */
