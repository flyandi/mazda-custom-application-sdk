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
 * (Proxy)
 *
 * Registers itself between the JCI system and CustomApplication framework.
 */

CMU.attach("proxy", function(cmu) {

    function Proxy() {

        let that = this;

        // register bootstrap event

        if(window.opera) {
            window.opera.addEventListener('AfterEvent.load', function (e) {
                that.bootstrap();
            });
        }

    };

    Proxy.prototype = {

        /**
         * The SYSTEM_APP_ID constant
         * @var string
         */
        SYSTEM_APP_ID: 'system',

        /**
         * The SYSTEM_APP_CATEGORY constant
         * @var string
         */
        SYSTEM_APP_CATEGORY: 'Applications',

        /**
         * An array that stores the registered proxies
         * @var array
         */
        proxies: {},

        /**
         * An translation array that converts a uiaId to a proxy
         * @type {Object}
         */
        uiaIds: {},


        /**
         * Adds a new proxy
         * @param void
         */
        add: function(proxy) {

            if(!proxy.mmuiEvent || this.has(proxy.mmuiEvent)) return false;

            this.proxies[proxy.mmuiEvent] = proxy;

            this.uiaIds[proxy.proxyAppName] = proxy.mmuiEvent;

            return true;
        },


        /**
         * Checks if a proxy exists
         * @param  {[type]}  mmuiEvent [description]
         * @return {Boolean}           [description]
         */
        has: function(mmuiEvent) {
            return this.proxies[mmuiEvent] ? true : false;
        },

        /**
         * Returns a proxy
         * @param  {[type]} mmuiEvent [description]
         * @return {[type]}           [description]
         */
        get: function(mmuiEvent) {
            return this.proxies[mmuiEvent];
        },

        /**
         * Converts a uiaId to a prixy
         * @param  {[type]} uiaId [description]
         * @return {[type]}       [description]
         */
        fromUiaId: function(uiaId) {

            var entry = this.uiaIds[uiaId];

            if(entry && this.has(entry)) {
                return this.get(entry);
            }

            return false;
        },


        /**
         * Bootstraps the JCI system
         * @return {[type]} [description]
         */
        bootstrap: function() {

            // verify that core objects are available
            if(typeof framework === 'object' && framework._currentAppUiaId === this.SYSTEM_APP_ID && this.bootstrapped === false) {

                // retrieve system app
                var systemApp = framework.getAppInstance(this.SYSTEM_APP_ID);

                // verify bootstrapping - yeah long name
                if(systemApp) {

                    // set to strap - if everything fails - no harm is done :-)
                    this.bootstrapped = true;

                    // let's boostrap
                    try {

                        // overwrite list2 handler
                        systemApp._contextTable[this.systemAppCategory].controlProperties.List2Ctrl.selectCallback = this.menuItemSelectCallback.bind(systemApp);

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

                if(CMU.proxy.has(appData.mmuiEvent)) {

                    var proxy = CMU.proxy.getProxyForEvent(appData.mmuiEvent);

                    if(proxy && typeof(proxy.callback == "function") && proxy.callback(appData)) {

                        try {
                            // clone app data
                            appData = JSON.parse(JSON.stringify(appData));

                            // overwrite proxy
                            appData.appName = proxy.proxyAppName;
                            appData.mmuiEvent = proxy.proxyMmuiEvent;

                        } catch(e) {
                            // do nothing
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
                currentContextId = this.getCurrCtxtId(),
                proxy = CMU.proxy.fromUiaId(currentUiaId);

            // check proxy
            if(proxy) {
                currentUiaId = proxy.proxyAppName;
                currentContextId = proxy.proxyAppContext;
            }

            // pass to original handler
            framework.overwriteSendEventToMmui(uiaId, eventId, params, fromVui, currentUiaId, currentContextId);
        },


        /**
         * (Overwrite) routeMmuiMsg
         */

        routeMmuiMsg: function(jsObject) {

            if(CMU.has("handler")) {

                try {

                    // validate routing message
                    switch(jsObject.msgType) {

                        // magic switch
                        case 'ctxtChg':

                            var proxy = CMU.proxy.fromUiaId(jsObject.uiaId);

                            if(proxy) {
                                jsObject.uiaId = proxy.targetAppName;
                                jsObject.ctxtId = proxy.targetAppContext;
                            }
                            break;

                        // check if our proxy is in the focus stack
                        case 'focusStack':

                            if(jsObject.appIdList && jsObject.appIdList.length) {
                                for(var i = 0; i < jsObject.appIdList.length; i++) {

                                    var appId = jsObject.appIdList[i],
                                        proxy = CMU.proxy.fromUiaId(appId.id);

                                    if(proxy) {
                                        appId.id = proxy.targetAppName;
                                    }
                                };
                            }

                        case 'msg':
                        case 'alert':

                            var proxy = CMU.proxy.fromUiaId(jsObject.uiaId);

                            if(proxy) {
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

    };

    /**
     * Initial Handler
     */

    return new Proxy();

});


/** EOF **/