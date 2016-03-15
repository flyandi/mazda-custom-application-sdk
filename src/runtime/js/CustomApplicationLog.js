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
 * (CustomApplicationLog)
 *
 * A logger
 */

var CustomApplicationLog = {

	levels: {
		debug: 'DEBUG',
		info: 'INFO',
		error: 'ERROR',
	},

	enabledLogger: false,
	enabledConsole: false,

	/**
	 * (enable) enables the log
	 */

	enableLogger: function(value) {

		this.enabledLogger = value;
	},

	/**
	 * (enable) enables the log
	 */

	enableConsole: function(value) {

		this.enabledConsole = value;
	},

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
	 * (message)
	 */

	__message: function(level, color, values) {

		if(this.enabledLogger || this.enabledConsole || typeof(DevLogger) != "undefined") {

			var msg = [];
			if(values.length > 1) {
				values.forEach(function(value, index) {

					if(index > 0) {

						switch(true) {

							case CustomApplicationHelpers.is().iterable(value):

								CustomApplicationHelpers.iterate(value, function(key, value, obj) {

									msg.push(obj ? CustomApplicationHelpers.sprintr("[{0}={1}]", key, value) : CustomApplicationHelpers.sprintr("[{0}]", value));

								});
								break;

							default:
								msg.push(value);
								break;
						}
					}

				});
			}

			try {
				if(this.enabledLogger && typeof(Logger) != "undefined") {
					Logger.log(level, values[0], msg.join(" "), color);
				}

				if(typeof(DevLogger) != "undefined") {
					DevLogger.log(level, values[0], msg.join(" "), color);
				}
			} catch(e) {
				// do nothing
			}

			try {
				if(this,enabledConsole) {
					console.log(
						CustomApplicationHelpers.sprintr("%c[{0}] [{1}] ", (new Date()).toDateString(), values[0]) +
						CustomApplicationHelpers.sprintr("%c{0}", msg.join(" ")),
						"color:black",
						CustomApplicationHelpers.sprintr("color:{0}", color)
					);
				}
			} catch(e) {
				// do nothing
			}
		}
	}
};