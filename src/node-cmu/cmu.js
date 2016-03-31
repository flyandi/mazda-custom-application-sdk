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
const SYSTEM_FRAMEWORK_PATH = "framework/";
const SYSTEM_FRAMEWORK_JS = "framework.js";
const SYSTEM_FRAMEWORK_CSS = "framework.css";
const SYSTEM_CUSTOM_PATH = "custom/";

const JCI_MOUNT_PATH = "/tmp/mnt/data_persist/appdrive/"; // we link our resources in here
const JCI_APP_PATH = "custom";

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
        this.__socket = new _webSocketServer({
            port: this.network.port
        });

        this.__socket.on('connection', function(client) {

            this.attachClient(client);

        }.bind(this));

        this.findAppDrive();
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
                        this.findAppDrive(function(appdrive) {

                            this.sendFromPayload(client, payload, {
                                appdrive
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
     * @param  object       client      The client
     * @param  object       payload     The payload in object format
     * @return boolean                  Returns the status of the operation
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
     * @return  string                  The version number
     */
    getVersion: function() {
        return this.version;
    },


    /**
     * Finds the appdrive
     * @param   function    callback    A callback
     * @return void
     */
    findAppDrive: function(callback) {

        this.appdrive = {
            locations: {},
            applications: {},
            js: [],
            css: [],
        };

        var result = [],
            mountPoints = ['sd_nav', 'sda', 'sdb', 'sdc', 'sdd', 'sde', 'sdf'];

        mountPoints.forEach(function(mountPoint) {

            var appDrivePath = [MOUNTROOT_PATH, mountPoint, APPDRIVE_PATH].join(""),

                appDriveFilename = [appDrivePath, APPDRIVE_JSON].join(""),

                applicationsPath = [appDrivePath, APPLICATIONS_PATH].join(""),

                systemPath = [appDrivePath, SYSTEM_PATH].join(""),

                mountPath = [JCI_MOUNT_PATH, JCI_APP_PATH].join("");

            // check primary conditions
            if(this._isFile(appDriveFilename) && this._isDir(systemPath) && this._isDir(applicationsPath)) {

                /**
                 * Assign locations
                 */

                this.appdrive.locations = {
                    root: appDrivePath,
                    apps: applicationsPath,
                    mount: mountPath,
                };

                /**
                 * Load AppDrive
                 */

                this.appdrive.package = require(appDriveFilename);

                /**
                 * Load Framework
                 */

                this.appdrive.js.push([systemPath, SYSTEM_FRAMEWORK_PATH, SYSTEM_FRAMEWORK_JS].join(""));

                this.appdrive.css.push([systemPath, SYSTEM_FRAMEWORK_PATH, SYSTEM_FRAMEWORK_CSS].join(""))

                /**
                 * Prepare system mount
                 */

                if(this._isLink(mountPath)) {
                    // unlink
                    fs.unlinkSync(mountPath)
                }

                // create symbolic link for this session
                fs.symlinkSync([systemPath, SYSTEM_CUSTOM_PATH].join(""), mountPath);

                /**
                 * Find Applications
                 */

                var appFiles = fs.readdirSync(applicationsPath);

                if(appFiles.length) appFiles.forEach(function(appId) {

                    /**
                     * currently we only allow the first application to be registered
                     * otherwise you would need to restart the CMU
                     */

                    if(!this.appdrive.applications[appId]) {

                        var applicationPath = [applicationsPath, appId, "/"].join("");

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
                                this.appdrive.applications[appId] = profile;
                            }
                        }
                    }

                }.bind(this));
            }

        }.bind(this));

        if(callback) callback(this.appdrive);
    },

    /**
     * Checks if the file exists
     * @param   string  path    A string that represents a file path
     * @return  bool            Returns true if the file is present
     */
    _isFile: function(path) {
        try {
            return fs.lstatSync(path).isFile();
        } catch(e) {}

        return false;
    },

    /**
     * Checks if the directory exists
     * @param   string  path    A string that represents a path
     * @return  bool            Returns true if the path is a directory
     */
    _isDir: function(path) {
        try {
            return fs.lstatSync(path).isDirectory();
        } catch(e) {}

        return false;
    },

     /**
     * Checks if the path is a symlink
     * @param   string  path    A string that represents a path
     * @return  bool            Returns true if the path is symbolic
     */
    _isLink: function(path) {
        try {
            return fs.lstatSync(path).isSymbolicLink();
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
