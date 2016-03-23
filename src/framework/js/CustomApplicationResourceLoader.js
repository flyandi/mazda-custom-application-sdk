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
 * (CustomApplicationResourceLoader)
 *
 * The resource loader for applications
 */

var CustomApplicationResourceLoader = {

	__name: 'ResourceLoader',

	/**
	 * (loadJavascript)
	 */

	loadJavascript: function(scripts, path, callback, options, async) {

		this.__loadInvoker(scripts, path, function(filename, next) {
			var script = document.createElement('script');
	        script.type = 'text/javascript';
	        script.src = filename;
	        script.onload = next;
	        document.body.appendChild(script);
		}, callback, options, async);
	},

	/**
	 * (loadCSS)
	 */

	loadCSS: function(css, path, callback, options, async) {

		this.__loadInvoker(css, path, function(filename, next) {
			var css = document.createElement('link');
	        css.rel = "stylesheet";
	        css.type = "text/css";
	        css.href = filename
	        css.onload = async ? callback : next;
	        document.body.appendChild(css);
		}, callback, options, async);
	},

	/**
	 * (loadImages)
	 */

	loadImages: function(images, path, callback, options, async) {

		this.__loadInvoker(images, path, function(filename, next, id) {
			var img = document.createElement('img');
			img.onload = function() {

				if(async) {
					var result = false;
					if(id) {
						result = {};
						result[id] = this;
					}
					callback(id ? result : this);
				} else {
					next(this);
				}
			}
			img.src = filename;
		}, callback, options, async);
	},

	/**
	 * (fromFormatted)
	 */

	fromFormatted: function(format, items) {

		items.forEach(function(value, index) {
			items[index] = CustomApplicationHelpers.sprintr(format, value);
		});

		return items;

	},


	/**
	 * (__loadInvoker)
	 */

	__loadInvoker: function(items, path, build, callback, options, async) {

		var ids = false, result = false, options = options ? options : {}, timeout = false;

		// assign default object
		this.logger = CustomApplicationLog;

		// support for arrays and objects
		if(CustomApplicationHelpers.is().object(items)) {

			var idsObject = items, ids = [], items = [];

			Object.keys(idsObject).map(function(key) {
				ids.push(key);
				items.push(idsObject[key]);
			});

			// return as object
			result = {};

		} else {

			if(!CustomApplicationHelpers.is().array(items)) items = [items];
		}

		// loaded handler
		var loaded = 0, next = function(failure) {
			loaded++;
			if(loaded >= items.length) {
				if(CustomApplicationHelpers.is().fn(callback)) {
					callback(result);
				}
			}
		};

		// process items
		items.forEach(function(filename, index) {

			try {

				filename = path + filename;

				this.logger.debug(this.__name, "Attempting to load resource from", filename);

				if(!async && options.timeout) {

					clearTimeout(timeout);
					timeout = setTimeout(function() {

						this.logger.error(this.__name, "Timeout occured while loading resource", filename);

						// just do the next one
						next(true);

					}.bind(this), options.timeout);

				}

				build(filename, function(resource) {

					this.logger.info(this.__name, "Successfully loaded resource", filename);

					if(resource && ids != false) {
						this.logger.debug(this.__name, "Loaded resource assigned to id", {id: ids[index], filename: filename});

						result[ids[index]] = resource;
					}

		        	if(async) {
		        		if(CustomApplicationHelpers.is().fn(callback)) callback();
		        	} else {
		        		next();
		        	}

		        }.bind(this), ids ? ids[index] : false);

			} catch(e) {
				this.logger.error(this.__name, "Failed to load resource", {filename: filename, error: e.message});
			}

	   	}.bind(this));
	}

}
