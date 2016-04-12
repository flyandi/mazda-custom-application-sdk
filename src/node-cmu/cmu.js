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

const _socket = require("ws").Server;
const _extend = require("./cmu-utils").extend;
const _spawn = require('threads').spawn;
const fs = require("fs");


/**
 * Minimal Command
 * @constants
 */

const REQUEST_VERSION = "version";
const REQUEST_PING = "ping";
const REQUEST_SETUP = "setup";

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

const COMMAND_LOAD_JS = "loadjs";
const COMMAND_LOAD_CSS = "loadcss";

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
        // initial app drive
        this.updateAppDrive();

        // create webserver
        this.__socket = new _socket({
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

        // we only allow one client to be connected
        this.client = client;

        // assing
        this.client.on('message', function(message) {

            this._log('client:message', message);

            this.handleClientData(client, message);

        }.bind(this));

        this.client.on('close', function() {

            this._log('client:closed');
        }.bind(this));

        this.client.on('error', function(e) {

            this._log('client:error', e.message);
        }.bind(this));
    },


    /**
     * Handles a client message
     * @param  object   client      The client instance
     * @param  string   message     The message payload
     * @return void
     */
    handleClientData: function(client, message, flags) {

        try {
            let payload = JSON.parse(message);

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
                     * Setup
                     * @type REQUEST_SETUP
                     */
                    case REQUEST_SETUP:

                        if(this.appdrive && this.appdrive.enabled) {

                            // load javascripts
                            this.requestLoadJavascript(this.resources.js);

                            // load css
                            this.requestLoadCSS(this.resources.css);

                        }

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

        let final = JSON.stringify(_extend({}, payload, data, {
            result: resultCode || RESULT_OK
        }));

        client.send(final);
    },


    /**
     * Sends a command to the client
     * @param  {[type]} command [description]
     * @param  {[type]} payload [description]
     * @param  {[type]} client  [description]
     * @return {[type]}         [description]
     */
    sendCommand: function(command, attributes, client) {

        this.sendFromPayload(client || this.client, {
            command: command,
            attributes: attributes,
        });

    },

    /**
     * [requestLoadJavascript description]
     * @param  {[type]} files [description]
     * @return {[type]}       [description]
     */
    requestLoadJavascript: function(files) {

        return this.invokeLoadCommand(COMMAND_LOAD_JS, files);
    },

    /**
     * [requestLoadCSS description]
     * @param  {[type]} files [description]
     * @return {[type]}       [description]
     */
    requestLoadCSS: function(files) {

        return this.invokeLoadCommand(COMMAND_LOAD_CSS, files);
    },

    /**
     * [invokeLoadCommand description]
     * @param  {[type]} command [description]
     * @param  {[type]} files   [description]
     * @return {[type]}         [description]
     */
    invokeLoadCommand: function(command, files) {

        let source = files instanceof Array ? files : ([].push(files)),
            data = [];

        source.forEach(function(filename) {

            if(this._isFile(filename)) {

                data.push({
                    contents: (fs.readFileSync(filename)).toString(),
                    location: filename
                });
            }

        }.bind(this));

        this.sendCommand(command, {
            data
        });
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
    updateAppDrive: function(callback) {

        this.appdrive = {
            locations: {},
            applications: {},
            enabled: false,
        };

        this.workers = {};

        this.resources = {
            js: [],
            css: [],
        };

        let result = [],
            mountPoints = ['sd_nav', 'sda', 'sdb', 'sdc', 'sdd', 'sde', 'sdf'];

        mountPoints.forEach(function(mountPoint) {

            let appDrivePath = [MOUNTROOT_PATH, mountPoint, APPDRIVE_PATH].join(""),

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

                this.resources.js.push([systemPath, SYSTEM_FRAMEWORK_PATH, SYSTEM_FRAMEWORK_JS].join(""));

                this.resources.css.push([systemPath, SYSTEM_FRAMEWORK_PATH, SYSTEM_FRAMEWORK_CSS].join(""))

                this.appdrive.enabled = true;

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

                let appFiles = fs.readdirSync(applicationsPath);

                if(appFiles.length) appFiles.forEach(function(appId) {

                    /**
                     * currently we only allow the first application to be registered
                     * otherwise you would need to restart the CMU
                     */

                    if(!this.appdrive.applications[appId]) {

                        let applicationPath = [applicationsPath, appId, "/"].join("");

                        if(this._isDir(applicationPath)) {

                            let profile = {
                                    id: appId,
                                    path: applicationPath,
                                    files: {},
                                },
                                parts = [APPLICATION_JS, APPLICATION_JSON, APPLICATION_CSS, APPLICATION_WORKER],
                                found = 0;

                            parts.forEach(function(filename) {

                                let fullFilename = [applicationPath, filename].join("");

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

                                this.registerWorker(appId);
                            }
                        }
                    }

                }.bind(this));
            }

        }.bind(this));

        if(callback) callback(this.appdrive);
    },


    /**
     * Registers a worker to the appid
     * @param  {[type]} appId [description]
     * @return {[type]}       [description]
     */
    registerWorker: function(appId) {

        // ensure applications is registered
        if(!this.appdrive.applications[appId]) return false;

        // ensure worker is eligible
        if(!this._isFile(this.appdrive.applications[appId].files[APPLICATION_WORKER])) return false;

        // create worker
        this.workers[appId] = {

            appId: appId,

            thread: _spawn(this.appdrive.applications[appId].files[APPLICATION_WORKER])
        };

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

    /**
     * [__log description]
     * @param  {[type]} name        [description]
     * @param  {[type]} description [description]
     * @param  {[type]} attributes  [description]
     * @return {[type]}             [description]
     */
    _log: function(name, description, attributes) {

        console.log("[" + name + "]", description, attributes ? function() {

            let result = [];

            Object.keys(attributes).forEach(function(element, key, _array) {
                result.push("[" + element + "=" + _array[key] + "]");
            });

            return result.join(" ");
        }.call() : "");
    },
};

/**
 * Exports
 */

exports = new cmu();

/** eof */
