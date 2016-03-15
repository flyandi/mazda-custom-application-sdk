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
 * (CustomApplicationsHandler)
 *
 * This is the custom handler that manages the application between the JCI system and the mini framework
 */

var CustomApplicationsHandler = {

	__name: 'ApplicationsHandler',

	/**
	 * (Applications) storage for applications
	 */

	applications: {},

	/**
	 * (Paths)
	 */

	paths: {
		framework: 'apps/custom/runtime/',
		applications: 'apps/custom/apps/',
		vendor: 'apps/custom/runtime/vendor/',
		surface: 'apps/custom/runtime/surface/',
	},

	/**
	 * (Mapping)
	 */

	mapping: {


	},

	/**
	 * (initialize) Initializes some of the core objects
	 */

	initialize: function() {

		this.initialized = true;

		this.loader = CustomApplicationResourceLoader;

		this.log = CustomApplicationLog;

	},


	/**
	 * (Retrieve) loads the current application list and returns the additional items
	 */

	retrieve: function(callback) {

		try {
			// initialize
			if(!this.initialized) this.initialize();

			// load libraries
			this.loader.loadJavascript("jquery.js", this.paths.vendor, function() {

				this.loader.loadCSS("runtime.css", this.paths.framework, function() {

					this.loader.loadJavascript("apps.js", this.paths.applications, function() {

						// this has been completed
						if(typeof(CustomApplications) != "undefined") {

							// load applications
							this.loader.loadJavascript(
								this.loader.fromFormatted("{0}/app.js", CustomApplications),
								this.paths.applications,
								function() {
									// all applications are loaded, run data
									CustomApplicationDataHandler.initialize();

									// create menu items
									callback(this.getMenuItems());
								}.bind(this)
							);
						}

					}.bind(this)); // apps.js

				}.bind(this)); // bootstrap css

			}.bind(this)); // jquery library

		} catch(e) {

			// error message
			this.log.error(this.__name, "Error while retrieving applications", e);

			// make sure that we notify otherwise we don't get any applications
			callback(this.getMenuItems());
		}
	},

	/**
	 * (get) returns an application by id
	 */

	get: function(id) {

		return this.applications[id] ? this.applications[id] : false;
	},


	/**
	 * (Register) registers all the custom applications
	 */

	register: function(id, application) {

		// unregister previous instance
		if(this.applications[id]) {
			this.applications[id].__terminate();
			this.applications[id] = false;
		}

		// registering
		this.log.info(this.__name, {id:id}, "Registering application");

		application.id = id;

		application.location = this.paths.applications + id + "/";

		application.__initialize();

		this.applications[id] = application;

		return true;
	},

	/**
	 * (launch) launches an application
	 */

	launch: function(id) {

		this.log.info(this.__name, {id: id}, "Launch request for application");

		if(CustomApplicationHelpers.is().object(id)) {

			id = id.appId ? id.appId : false;
		}

		if(this.applications[id]) {

			this.currentApplicationId = id;

			this.log.info(this.__name, {id: id}, "Launching application");

			return true;
		}

		this.log.error(this.__name, {id: id}, "Launch failed because application was not registered");

		return false;
	},

	/**
	 * (sleep) sleeps an application
	 */

	sleep: function(application) {

		if(application.id == this.currentApplicationId) {
			// remember last state
			this.lastApplicationId = this.currentApplicationId;

			// clear current
			this.currentApplicationId = false;
		}

		application.__sleep();
	},


	/**
	 * (getCurrentApplication) returns the current application
	 */

	getCurrentApplication: function(allowLast) {

		var applicationId = this.currentApplicationId || (allowLast ? this.lastApplicationId : false);

		if(applicationId) {

			this.log.debug(this.__name, "Invoking current set application", {id: applicationId});

			if(this.applications[applicationId]) {

				this.currentApplicationId = applicationId;

				return this.applications[applicationId];
			}

			this.log.error(this.__name, "Application was not registered", {id: applicationId});

			return false;
		}

		this.log.error(this.__name, "Missing currentApplicationId");

		return false;
	},

	/**
	 * (notifyDataChange) notifies the active application about a data change
	 */

	notifyDataChange: function(id, payload) {

		if(this.currentApplicationId && this.applications[this.currentApplicationId]) {

			this.applications[this.currentApplicationId].__notify(id, payload);

		}

	},


	/**
	 * (getMenuItems) returns the items for the main application menu
	 */

	getMenuItems: function(callback) {

		return CustomApplicationHelpers.iterate(this.applications, function(id, application) {

			this.log.info(this.__name, {id:id}, "Adding application to menu", {
				title: application.getTitle(),
			});

			// set localized language - for now it's just the title
			return {
				appData : {
					appName : application.getId(),
					appId: application.getId(),
					isVisible : true,
					mmuiEvent : 'SelectCustomApplication',
				},
				title: application.getTitle(),
				text1Id : application.getId().replace(".", "_"),
				disabled : false,
				itemStyle : 'style02',
				hasCaret : application.getHasMenuCaret(),
			};

		}.bind(this));
	},

};
