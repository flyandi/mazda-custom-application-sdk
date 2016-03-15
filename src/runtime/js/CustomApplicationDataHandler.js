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
 * (Predeterminate data)
 */

var VehicleDataBrand = {
	7: 'Mazda'
};

var VehicleDataVehicleType = {
	18: 'MX-5',
	109: '3 Sport',
	110: '3 Touring',
	111: '3 Grand Touring',
	112: '6 Sport',
	113: '6 Touring',  // Maybe right, everythign else is Bogus right now
	114: '6 Grand Touring',
};

var VehicleDataRegion = {
	na: 'North America',
	eu: 'Europe',
	jp: 'Japan',
};


/**
 * (VehicleData) a collection of useful mappings
 */

var VehicleData = {

	/*
	 * General
	 */

	general: {
		brand: {id:'VDTSBrand', friendlyName: 'Vehicle Brand', input: 'list', values: VehicleDataBrand},
		type: {id:'VDTSVehicle_Type', friendlyName: 'Vehicle Type', input: 'list', values: VehicleDataVehicleType},
		region: {id: 'SYSRegion', friendlyName: 'Region', input: 'list', values: VehicleDataRegion},
	},

	/**
	 * Vehicle
	 */

	vehicle: {
		speed: {id: 'VDTVehicleSpeed', friendlyName: 'Vehicle Speed', input: 'range', min: 0, max: 240, factor: 0.01},
		rpm: {id: 'VDTEngineSpeed', friendlyName: 'Engine RPM', input: 'range', min: 0, max: 8000, factor: 2.25},
		odometer: {id: 'VDTCOdocount', friendlyName: 'Odocount'},
		batterylevel: {id: 'VDTCBattery_StateOfCharge', friendlyName: 'Battery Level'},
	},

	/**
	 * Fuel
	 */

	fuel: {
		position: {id: 'VDTFuelGaugePosition', friendlyName: 'Fuel Gauge Position'},
		averageconsumption: {id: 'VDTDrv1AvlFuelE', friendlyName: 'Average Fuel Consumption'},
	},

	/**
	 * Engine
	 */

	engine: {
		brakefluidpressure: {id: 'PIDBrakeFluidLineHydraulicPressure', friendlyName: 'Brake Fluid Pressure'},
	},

	/**
	 * Temperature
	 */

	temperature: {
		outside: {id: 'VDTCOut-CarTemperature', friendlyName: 'Outside Temperature'},
		intake: {id: 'VDTDR_IntakeAirTemp', friendlyName: 'Intake Air Temperature'},
		coolant: {id: 'PIDEngineCoolantTemperature', friendlyName: 'Engine Coolant Temperature'},
	},


	/**
	 * GPS
	 */

	gps: {
		latitude: {id: 'GPSLatitude', friendlyName: 'Latitude'},
		longitude: {id: 'GPSLongitude', friendlyName: 'Longitude'},
		altitude: {id: 'GPSAltitude', friendlyName: 'Altitude'},
		heading: {id: 'GPSHeading', friendlyName: 'Heading', input: 'range', min: 0, max: 360, step:45},
		velocity: {id: 'GPSVelocity', friendlyName: 'Velocity'},
		timestamp: {id: 'GPSTimestamp', friendlyName: 'Timestamp'},

	},

};


/**
 * (PreProcessors) Data processers
 */

var CustomApplicationDataProcessors = {

	vdtvehiclespeed: function(value) {

		return Math.round(value * 0.01);
	},

	vdtenginespeed: function(value) {

		return Math.round(value * 2.25);
	},


};


/**
 * (CustomApplicationDataHandler)
 *
 * This is the data controller that reads the current vehicle data
 */

var CustomApplicationDataHandler = {

	__name: 'DataHandler',

	/**
	 * (Locals)
	 */

	refreshRate: 1000,
	paused: false,

	/**
	 * (Paths)
	 */

	paths: {
		data: 'apps/custom/data/casdk-',
	},

	/**
	 * (Tables)
	 */

	tables: [

		/**
		 * (internal) non-file tables
		 *
		 * These are internal tables that can be used by the subscription handlers
		 */

		{table: 'sys', prefix: 'SYS', enabled: true, data: {

			region: {type: 'string', value: 'na'},

		}, update: false},


		/**
		 * (file) file based tables
		 *
		 * Most tables only need to be loaded once when the car is started.
		 */

		/**
		 * Frequent updated tables (1s refresh rate)
		 */

		// VDT - This table contains the most time sensitive values likes speed, rpm, etc
		{table: 'vdt', prefix: 'VDT', enabled: true, file: true, always: true},

		// GPS
		{table: 'gps', prefix: 'GPS', enabled: true, file: true, filter: 'gps', update: 1},


		/**
		 * Less frequent updated tables (60s refresh rate)
		 */

		// Vehicle Data Transfer data
		{table: 'vdtpid', prefix: 'PID', enabled: true, file: true, update: 60},

		// Vehicle Data Transfer data
		{table: 'vdtcurrent', prefix: 'VDTC', enabled: true, file: true, update: 60},


		/**
		 * More less frequent updated tables (5min refresh rate)
		 */

		// VDM - ECO and Energy Management data (disabled)
		{table: 'vdm', prefix: 'VDM', enabled: false, file: true, update: 300},

		// VDM History - ECO and Energy Management data (disabled)
		{table: 'vdmhistory', prefix: 'VDMH', enabled: false, file: true, update: 300},


		/**
		 * One time loaded tables
		 */

		// Vehicle Setting
		{table: 'vdtsettings', prefix: 'VDTS', enabled: true, file: true, update: false},

		// Ignition Diagnostic Monitor (disabled)
		{table: 'idm', prefix: 'IDM', enabled: true, file: true, update: false},

		// Ignition Diagnostic Monitor History (disabled)
		{table: 'idmhistory', prefix: 'IDMH', enabled: true, file: true, update: false},

		// Vehicle Data Transfer data (disabled)
		{table: 'vdthistory', prefix: 'VDTH', enabled: false, file: true, update: false},

	],

	/**
	 * (Pools)
	 */

	data: {},

	/**
	 * (initialize) Initializes some of the core objects
	 */

	initialize: function() {

		this.initialized = true;

		this.next();
	},


	/**
	 * (get) returns a data key
	 */

	get: function(id, _default) {

		if(CustomApplicationHelpers.is().object(id)) {
			id = id.id
		}

		var id = id.toLowerCase();

		return this.data[id] ? this.data[id] : {value: (_default ? _default : null)};
	},

	/**
	 * (getTableByPrefix) returns a table by the prefix
	 */

	getTableByPrefix: function(prefix) {

		var result = false;

		this.tables.map(function(table) {

			if(!result && table.prefix == prefix) {
				result = table;
			}

		});

		return result;
	},


	/**
	 * (registerValue) adds a new value
	 */

	registerValue: function(table, params) {

		// check preq
		if(!params.name) return;

		// create id
		var id = ((table.prefix ? table.prefix : "") + params.name).toLowerCase();

		// check id
		if(!this.data[id]) {

			this.data[id] = $.extend({}, params, {
				id: id,
				prefix: table.prefix,
				value: null,
				previous: null,
				changed: false,
			});
		}

		return id;
	},

	/**
	 * (setValue) sets the value of the key
	 */

	setValue: function(id, value) {

		//CustomApplicationLog.debug(this.__name, "Setting new value", {id: id, available: this.data[id] ? true : false, value: value});

		if(this.data[id]) {

			// automatic converter
			if($.isNumeric(value)) {

				if(parseInt(value) == value) {
					value = parseInt(value);
				} else {
					value = parseFloat(value);
				}

			} else {
				value = $.trim(value);
			}

			// check pre processor
			if(CustomApplicationDataProcessors[id]) {
				value = CustomApplicationDataProcessors[id](value);
			}

			// assign`
			this.data[id].changed = this.data[id].value != value;
			this.data[id].previous = this.data[id].value;
			this.data[id].value = value;

			// notify
			CustomApplicationsHandler.notifyDataChange(id, this.data[id]);
		}

	},

	/**
	 * (pause)
	 */

	pause: function() {

		this.paused = true;
	},

	unpause: function() {

		this.paused = false;

		this.next();
	},

	/**
	 * (next)
	 */

	next: function() {

		clearTimeout(this.currentTimer);

		this.currentTimer = setTimeout(function() {

			if(!this.paused) {

				if(CustomApplicationsHandler.currentApplicationId) {

					this.retrieve();

				} else {

					this.next();
				}
			}

		}.bind(this), this.refreshRate)
	},



	/**
	 * (retrieve) updates the data by reparsing the values
	 */

	retrieve: function(callback) {

		//CustomApplicationLog.debug(this.__name, "Retrieving data tables");

		// prepare
		var loaded = 0, toload = 0, finish = function() {

			if(loaded >= toload) {

				// notify the callback
				if(CustomApplicationHelpers.is().fn(callback)) {
					callback(this.data);
				}

				// continue
				this.next();
			}

		}.bind(this);

		// build to load list
		this.tables.map(function(table, tableIndex) {

			// conditional loading
			var enabled = table.enabled && ( (table.always) || (table.update) || (!table.update && !table.__last) );

			// check time
			if(enabled) {

				if(table.update && table.__last && table.update > 1) {

					enabled = (((new Date()) - table.__last) / 1000) > table.update;

				}

			}

			// load
			if(enabled) {

				// update counter
				toload++;

				// loading
				//CustomApplicationLog.debug(this.__name, "Preparing table for parsing", {table: table.table});

				// process table by type
				switch(true) {

					/**
					 * From preparsed
					 */

					case CustomApplicationHelpers.is().object(table.data):

						$.each(table.data, function(name, params) {

							params.name = name;

							var id = this.registerValue(table, params);

							if(params.value) this.setValue(id, params.value);

						}.bind(this));

						// update counter
						loaded++;

						// completed
						this.tables[tableIndex].__last = new Date();

						// continue
						finish();

						break;

					/**
					 * From file
					 */
					case table.file:

						// prepare variables
						var location = this.paths.data + table.table;

						//CustomApplicationLog.debug(this.__name, "Loading table data from file", {table: table.table, location: location});

						// load
						$.ajax(location, {
							timeout: table.always ? null : 250,

							// success handler
							success: function(data) {

								//CustomApplicationLog.debug(this.__name, "Table data loaded", {table: table.table, loaded: loaded, toload: toload});

								// execute parser
								this.__parseFileData(table, data);

								// completed
								this.tables[tableIndex].__last = new Date();

							}.bind(this),

							// all done handler - timeouts will be handled here as well
							complete: function() {

								// just continue
								loaded++;
								finish();

							}.bind(this),

						});


						break;

					default:

						CustomApplicationLog.error(this.__name, "Unsupported table type" , {table: table.table});

						// just finish
						loaded++;

						// continue
						finish();
						break;
				}
			}
		}.bind(this));
	},


	/**
	 * (__parseFileData) parses data loaded from file
	 */

	__parseFileData: function(table, data) {

		// split data
		data = data.split("\n");

		// filter
		if(table.filter) data = this.__filterFileData(data, table.filter);

		// quick process
		data.forEach(function(line, index) {

			var parts = line.split(/[\((,)\).*(:)]/);

			if(parts.length >= 5 && parts[1]) {

				switch(parts[1].toLowerCase()) {

					case "binary":
						break;

					case "double":

						parts[4] = parts[4] + (parts[5] ? "." + parts[5] : "");

					default:

						// register value
						var id = this.registerValue(table, {
							name: $.trim(parts[0]),
							type: $.trim(parts[1]),
						});

						// update value
						this.setValue(id, $.trim(parts[4]));

						break;
				}

			}

		}.bind(this));
	},

	/**
	 * (__filterFileData) filters data
	 */

	__filterFileData: function(data, filter) {

		switch(filter) {

			case "gps":

				var result = [], parser = {
					Timestamp: 2,
					Latitude: 3,
					Longitude: 4,
					Altitude: 5,
					Heading: 6,
					Velocity: 7,
				}

				// assign
				$.each(parser, function(name, index) {

					if(data[index]) {
						// parse data
						var line = $.trim(data[index]).split(" ");
						if(line[1]) {
							var type = line[0] != "double" ? "int" : "double";
							result.push(name + " (" + type + ", 4): " + $.trim(line[1]));
						}
					}

				});

				return result;
				break;
		}

	},
};

/**
 * DataTransformation
 */

var DataTransform = {

	/**
	 * (toMPH) returns the MPH of the KM/h value
	 */

	toMPH: function(value) {

		return Math.round(value * 0.621371);

	},

	/**
	 * (toMPG) returns the MPG of the L/100km value
	 */

	toMPG: function(value) {

		return Math.round(value * 2.3521458);

	},


	/**
	 * (scaleValue) takes two different scale ranges and recalculates the value
	 */


	scaleValue: function( value, r1, r2 ) {
    	return ( value - r1[ 0 ] ) * ( r2[ 1 ] - r2[ 0 ] ) / ( r1[ 1 ] - r1[ 0 ] ) + r2[ 0 ];
	},

};

