"use strict";

const request = require("request");
const commonDefines = require("./commonDefines");
const JSONHelper = require("./jsonHelper");
const HttpStatus = require("http-status-codes");

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const operationModes = [commonDefines.DeviceOperationModes.HEAT.id, commonDefines.DeviceOperationModes.COOL.id, commonDefines.DeviceOperationModes.AUTO.id, commonDefines.DeviceOperationModes.VENT.id, commonDefines.DeviceOperationModes.DRY.id, ];

let gthat = null; // pointer to "this" from main.js/MelCloud instance

class MelcloudDevice {
	constructor(that) {
		gthat = that;
		this.platform = null;
		this.airInfo = null;
		this.requestQueue = [];
		this.currentRequestExecution = 0;

		// Info
		this.id = -1;
		this.name = "";
		this.serialNumber = "";
		this.macAddress = "";
		this.buildingId = -1;
		this.floorId = -1;
		this.canCool = false;
		this.canHeat = false;
		this.canDry = false;
		this.minTempCoolDry = 0;
		this.maxTempCoolDry = 0;
		this.minTempHeat = 0;
		this.maxTempHeat = 0;
		this.minTempAuto = 0;
		this.maxTempAuto = 0;
		this.roomTemp = 0;
		this.actualFanSpeed = 0;
		this.numberOfFanSpeeds = 0;
		this.lastCommunication = null;
		this.nextCommunication = null;
		this.deviceOnline = false;

		// Control
		this.power = false;
		this.operationMode = commonDefines.DeviceOperationModes.UNDEF.value;
		this.targetTemp = 0;
		this.fanSpeed = 0;
		this.vaneVerticalDirection = 0;
		this.vaneHorizontalDirection = 0;

		// Reports
		this.powerConsumptionReportStartDate = "";
		this.powerConsumptionReportEndDate = "";
		this.powerConsumptionReportMonths = [];
		this.monthlyPowerConsumptionCooling = [];
		this.monthlyPowerConsumptionHeating = [];
		this.monthlyPowerConsumptionAuto = [];
		this.monthlyPowerConsumptionDry = [];
		this.monthlyPowerConsumptionVent = [];
		this.totalPowerConsumptionCooling = 0;
		this.totalPowerConsumptionHeating = 0;
		this.totalPowerConsumptionAuto = 0;
		this.totalPowerConsumptionDry = 0;
		this.totalPowerConsumptionVent = 0;
		this.totalPowerConsumptionMinutes = 0;
	}

	// Creates all necessery states and channels and writes the values into the DB
	async CreateAndSave() {
		const devicePrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id;
		await gthat.setObjectNotExistsAsync(devicePrefix, {
			type: "channel",
			common: {
				name: "Device " + this.id + " (" + this.name + ")"
			},
			native: {}
		});

		//#region INFO
		let infoPrefix = devicePrefix + "." + commonDefines.AdapterDatapointIDs.Info;
		await gthat.setObjectNotExistsAsync(infoPrefix, {
			type: "channel",
			common: {
				name: "Device information"
			},
			native: {}
		});

		infoPrefix += ".";

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceName, {
			type: "state",
			common: {
				name: "Device name",
				type: "string",
				role: "info.name",
				read: true,
				write: false,
				def: this.name,
				desc: "MELCloud device name"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.SerialNumber, {
			type: "state",
			common: {
				name: "Serial number",
				type: "string",
				role: "value",
				read: true,
				write: false,
				def: this.serialNumber,
				desc: "Serial number of the device"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MacAddress, {
			type: "state",
			common: {
				name: "MAC address",
				type: "string",
				role: "info.mac",
				read: true,
				write: false,
				def: this.macAddress,
				desc: "MAC address of the device"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.BuildingId, {
			type: "state",
			common: {
				name: "Building ID",
				type: "number",
				role: "value",
				read: true,
				write: false,
				def: this.buildingId,
				desc: "MELCloud building ID"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.FloorId, {
			type: "state",
			common: {
				name: "Floor ID",
				type: "number",
				role: "value",
				read: true,
				write: false,
				def: this.floorId,
				desc: "MELCloud floor ID"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.CanCool, {
			type: "state",
			common: {
				name: "Ability to cool",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				def: this.canCool,
				desc: "Ability to cool"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.CanHeat, {
			type: "state",
			common: {
				name: "Ability to heat",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				def: this.canHeat,
				desc: "Ability to heat"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.CanDry, {
			type: "state",
			common: {
				name: "Ability to dry",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				def: this.canDry,
				desc: "Ability to dry"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempCoolDry, {
			type: "state",
			common: {
				name: "Minimal temperature (Cool/Dry)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.minTempCoolDry,
				desc: "Minimal temperature in cool/dry-mode"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempCoolDry, {
			type: "state",
			common: {
				name: "Maximal temperature (Cool/Dry)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.maxTempCoolDry,
				desc: "Maximal temperature in cool/dry-mode"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempHeat, {
			type: "state",
			common: {
				name: "Minimal temperature (Heat)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.minTempHeat,
				desc: "Minimal temperature in heat-mode"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempHeat, {
			type: "state",
			common: {
				name: "Maximal temperature (Heat)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.maxTempHeat,
				desc: "Maximal temperature in heat-mode"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempAuto, {
			type: "state",
			common: {
				name: "Minimal Temperature (Auto)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.minTempAuto,
				desc: "Minimal temperature in auto-mode"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempAuto, {
			type: "state",
			common: {
				name: "Maximal Temperature (Auto)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.maxTempAuto,
				desc: "Maximal temperature in auto-mode"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.RoomTemp, {
			type: "state",
			common: {
				name: "Room temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.roomTemp,
				desc: "Maximal temperature in auto-mode"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.FanSpeedAuto, {
			type: "state",
			common: {
				name: "Fan speed (while in auto mode)",
				type: "number",
				role: "value",
				read: true,
				write: false,
				def: this.actualFanSpeed,
				desc: "Actual fan speed when fan is set to auto mode"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.NumberOfFanSpeeds, {
			type: "state",
			common: {
				name: "Number of fan speeds",
				type: "number",
				role: "value",
				read: true,
				write: false,
				def: this.numberOfFanSpeeds,
				desc: "Number of available fan speeds"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.LastCommunication, {
			type: "state",
			common: {
				name: "Last communication",
				type: "string",
				role: "date",
				read: true,
				write: false,
				def: this.lastCommunication,
				desc: "Last communication date/time (MELCloud to device)"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.NextCommunication, {
			type: "state",
			common: {
				name: "Next communication",
				type: "string",
				role: "date",
				read: true,
				write: false,
				def: this.nextCommunication,
				desc: "Next communication date/time (MELCloud to device)"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceOnline, {
			type: "state",
			common: {
				name: "Is device online",
				type: "boolean",
				role: "indicator.reachable",
				read: true,
				write: false,
				def: this.deviceOnline,
				desc: "Indicates if device is reachable"
			},
			native: {}
		});
		//#endregion

		//#region CONTROL
		let controlPrefix = devicePrefix + "." + commonDefines.AdapterDatapointIDs.Control;
		await gthat.setObjectNotExistsAsync(controlPrefix, {
			type: "channel",
			common: {
				name: "Device control"
			},
			native: {}
		});

		controlPrefix += ".";

		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.Power, {
			type: "state",
			common: {
				name: "Power",
				type: "boolean",
				role: "switch.power",
				read: true,
				write: true,
				def: this.power,
				desc: "Power switch"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.Mode, {
			type: "state",
			common: {
				name: "Operation mode",
				type: "number",
				role: "value",
				read: true,
				write: true,
				def: this.operationMode,
				desc: "Operation mode of the device",
				states: {
					1: "HEAT",
					2: "DRY",
					3: "COOL",
					7: "VENT",
					8: "AUTO"
				}
			},
			native: {}
		});

		const minTemp = Math.min(this.minTempAuto, this.minTempCoolDry, this.minTempHeat);
		const maxTemp = Math.max(this.maxTempAuto, this.maxTempCoolDry, this.maxTempHeat);
		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.TargetTemp, {
			type: "state",
			common: {
				name: "Target temperature",
				type: "number",
				role: "level.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				min: minTemp,
				max: maxTemp,
				read: true,
				write: true,
				def: this.targetTemp,
				desc: "Target temperature of the device"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.FanSpeedManual, {
			type: "state",
			common: {
				name: "Fan speed (while in manual mode)",
				type: "number",
				role: "value",
				min: 0,
				max: 5,
				states: {
					0: "AUTO",
					1: "LOWEST",
					2: "LOW",
					3: "MEDIUM",
					4: "HIGH",
					5: "MAX"
				},
				read: true,
				write: true,
				def: this.fanSpeed,
				desc: "Current fan speed of the device (while in manual mode)"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.VaneVerticalDirection, {
			type: "state",
			common: {
				name: "Vane vertical direction",
				type: "number",
				role: "value",
				min: 0,
				max: 7,
				states: {
					0: "AUTO",
					1: "TOPMOST",
					2: "UP",
					3: "MIDDLE",
					4: "DOWN",
					5: "BOTTOMMOST",
					7: "SWING"
				},
				read: true,
				write: true,
				def: this.vaneVerticalDirection,
				desc: "Current vertical direction of the device's vane"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.VaneHorizontalDirection, {
			type: "state",
			common: {
				name: "Vane horizontal direction",
				type: "number",
				role: "value",
				min: 0,
				max: 12,
				states: {
					0: "AUTO",
					1: "LEFTMOST",
					2: "LEFT",
					3: "MIDDLE",
					4: "RIGHT",
					5: "RIGHTMOST",
					8: "50/50",
					12: "SWING"
				},
				read: true,
				write: true,
				def: this.vaneHorizontalDirection,
				desc: "Current horizontal direction of the device's vane"
			},
			native: {}
		});
		//#endregion

		//#region REPORTS
		let reportsPrefix = devicePrefix + "." + commonDefines.AdapterDatapointIDs.Reports;
		await gthat.setObjectNotExistsAsync(reportsPrefix, {
			type: "channel",
			common: {
				name: "Device reports"
			},
			native: {}
		});

		reportsPrefix += ".";

		await gthat.setObjectNotExistsAsync(reportsPrefix + commonDefines.AdapterStateIDs.ReportStartDate, {
			type: "state",
			common: {
				name: "Report start date (format: YYYY-MM-DD)",
				type: "string",
				role: "date",
				read: true,
				write: true,
				desc: "Report data will be collected starting at this date"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(reportsPrefix + commonDefines.AdapterStateIDs.ReportEndDate, {
			type: "state",
			common: {
				name: "Report end date (format: YYYY-MM-DD)",
				type: "string",
				role: "date",
				read: true,
				write: true,
				desc: "Report data will be collected until this date"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(reportsPrefix + commonDefines.AdapterStateIDs.GetPowerConsumptionReport, {
			type: "state",
			common: {
				name: "Get current power consumption report",
				type: "boolean",
				role: "button",
				min: 0,
				read: false,
				write: true,
				def: false,
				desc: "Get current power consumption report"
			},
			native: {}
		});

		await gthat.setObjectNotExistsAsync(reportsPrefix + commonDefines.AdapterStateIDs.ReportedMonths, {
			type: "state",
			common: {
				name: "Months included in current report",
				type: "string",
				role: "value",
				read: true,
				write: false,
				def: "",
				desc: "Months included in current report"
			},
			native: {}
		});

		monthNames.forEach(month => {
			operationModes.forEach(mode => {
				gthat.setObjectNotExistsAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + mode, {
					type: "state",
					common: {
						name: "Total power consumption for mode '" + mode + "'",
						type: "number",
						role: "value.power.consumption",
						min: 0,
						read: true,
						write: false,
						unit: "kWh",
						def: 0,
						desc: "Total power consumption for mode '" + mode + "'"
					},
					native: {}
				});

				gthat.setObjectNotExistsAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + mode + month, {
					type: "state",
					common: {
						name: "Total power consumption for month '" + month + "' in mode '" + mode + "'",
						type: "number",
						role: "value.power.consumption",
						min: 0,
						read: true,
						write: false,
						unit: "kWh",
						def: 0,
						desc: "Total power consumption for month '" + month + "' in mode '" + mode + "'",
					},
					native: {}
				});
			});
		});

		await gthat.setObjectNotExistsAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalMinutes, {
			type: "state",
			common: {
				name: "Total power consumption minutes",
				type: "number",
				role: "value",
				min: 0,
				read: true,
				write: false,
				unit: "min",
				def: 0,
				desc: "Total operation time"
			},
			native: {}
		});
		//#endregion

		gthat.log.debug("Created and saved device " + this.id + " (" + this.name + ")");
	}

	// Only writes changed device data into the DB
	async UpdateDeviceData() {
		//#region INFO
		const infoPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Info + ".";

		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceName, this.name, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.SerialNumber, this.serialNumber, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.MacAddress, this.macAddress, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.BuildingId, this.buildingId, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.FloorId, this.floorId, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.CanCool, this.canCool, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.CanHeat, this.canHeat, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.CanDry, this.canDry, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempCoolDry, this.minTempCoolDry, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempCoolDry, this.maxTempCoolDry, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempHeat, this.minTempHeat, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempHeat, this.maxTempHeat, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempAuto, this.minTempAuto, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempAuto, this.maxTempAuto, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.RoomTemp, this.roomTemp, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.FanSpeedAuto, this.actualFanSpeed, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.NumberOfFanSpeeds, this.numberOfFanSpeeds, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.LastCommunication, this.lastCommunication, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.NextCommunication, this.nextCommunication, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceOnline, this.deviceOnline, true);
		//#endregion

		//#region CONTROL
		const controlPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Control + ".";

		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.Power, this.power, true);
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.Mode, this.operationMode, true);
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.TargetTemp, this.targetTemp, true);
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.FanSpeedManual, this.fanSpeed, true);
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.VaneVerticalDirection, this.vaneVerticalDirection, true);
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.VaneHorizontalDirection, this.vaneHorizontalDirection, true);
		//#endregion

		gthat.log.debug("Updated device data for device " + this.id + " (" + this.name + ")");
	}

	// Only writes changed report data into the DB
	async UpdateReportData() {
		const reportsPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Reports + ".";

		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.ReportStartDate, this.powerConsumptionReportStartDate, true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.ReportEndDate, this.powerConsumptionReportEndDate, true);

		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.ReportedMonths, this.powerConsumptionReportMonths, true);
		let counter = 0;
		this.powerConsumptionReportMonths.forEach(month => {
			const monthName = monthNames[month - 1]; // months delivered from cloud range from 1=January to 12=December
			gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + commonDefines.DeviceOperationModes.COOL.id + monthName, commonDefines.roundValue(this.monthlyPowerConsumptionCooling[counter], 3), true);
			gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + commonDefines.DeviceOperationModes.HEAT.id + monthName, commonDefines.roundValue(this.monthlyPowerConsumptionHeating[counter], 3), true);
			gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + commonDefines.DeviceOperationModes.AUTO.id + monthName, commonDefines.roundValue(this.monthlyPowerConsumptionAuto[counter], 3), true);
			gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + commonDefines.DeviceOperationModes.DRY.id + monthName, commonDefines.roundValue(this.monthlyPowerConsumptionDry[counter], 3), true);
			gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + commonDefines.DeviceOperationModes.VENT.id + monthName, commonDefines.roundValue(this.monthlyPowerConsumptionVent[counter], 3), true);
			counter++;
		});

		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + commonDefines.DeviceOperationModes.COOL.id, commonDefines.roundValue(this.totalPowerConsumptionCooling, 3), true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + commonDefines.DeviceOperationModes.HEAT.id, commonDefines.roundValue(this.totalPowerConsumptionHeating, 3), true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + commonDefines.DeviceOperationModes.AUTO.id, commonDefines.roundValue(this.totalPowerConsumptionAuto, 3), true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + commonDefines.DeviceOperationModes.DRY.id, commonDefines.roundValue(this.totalPowerConsumptionDry, 3), true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalPowerConsumptionPrefix + commonDefines.DeviceOperationModes.VENT.id, commonDefines.roundValue(this.totalPowerConsumptionVent, 3), true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AdapterStateIDs.TotalMinutes, this.totalPowerConsumptionMinutes, true);

		gthat.log.debug("Updated report data for device " + this.id + " (" + this.name + ")");
	}

	getDeviceInfo(callback, deviceOption, value) {
		const gthis = this;

		if (gthis.airInfo != null) {
			gthat.log.debug("Data already available for: " + gthis.id + " (" + gthis.name + ")");
			callback && callback(deviceOption, value, gthis);

			if (gthis.requestQueue.length) {
				const args = gthis.requestQueue.shift();
				gthat.log.debug("Dequeuing remote request for device option '" + args[1].id + "' with value '" + (args[2].value != undefined ? args[2].value : args[2]) + "'...");
				gthis.getDeviceInfo.apply(gthis, args);
			}

			return;
		}

		gthat.log.debug("Getting device data for " + gthis.id + " (" + gthis.name + ")");

		if (gthis.currentRequestExecution < 1) {
			gthis.currentRequestExecution++;

			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/Get?id=" + gthis.id + "&buildingID=" + gthis.buildingId;
			const method = "get";

			request({
				url: url,
				method: method,
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey
				}
			}, function handleDeviceInfoResponse(err, response) {
				if (err) {
					gthat.log.error("There was a problem getting device data from: " + url);
					gthat.log.error("Error: " + err);
					gthis.airInfo = null;
				}
				else if (!response || response.body.search("<!DOCTYPE html>") != -1) {
					gthat.log.error("There was a problem receiving the response from: " + url);
					gthis.airInfo = null;
				}
				else {
					const statusCode = response.statusCode;
					gthat.log.debug("Received response from: " + url + " (status code: " + statusCode + " - " + HttpStatus.getReasonPhrase(statusCode) + ")");

					if (statusCode != HttpStatus.StatusCodes.OK) {
						gthis.airInfo = null;
						gthat.log.error("Invalid HTTP status code (" + statusCode + " - " + HttpStatus.getReasonPhrase(statusCode) + "). Getting device data failed!");
						return;
					}

					const responseBoy = response.body;
					gthis.airInfo = JSONHelper.JSONHelper.ParseCloudResponse(responseBoy, gthat);

					// Cache airInfo data for 1 minute
					setTimeout(function () {
						gthis.airInfo = null;
					}, 60 * 1000);

					callback && callback(deviceOption, value, gthis);
				}
			});
		}
		else {
			gthat.log.debug("Queing remote request for '" + deviceOption.id + "' with value '" + (value.value != undefined ? value.value : value) + "'...");
			gthis.requestQueue.push(arguments);
		}
	}

	setDevice(deviceOption, value, gthis) {
		gthat.log.debug("Changing device option '" + deviceOption.id + "' to '" + (value.value != undefined ? value.value : value) + "'...");
		const r = gthis.airInfo;

		value = gthis.verifyDeviceOptionValue(deviceOption, value, gthis);

		if (deviceOption == commonDefines.DeviceOptions.PowerState) {
			switch (value) {
				case commonDefines.DevicePowerStates.OFF:
					r.Power = commonDefines.DevicePowerStates.OFF.value;
					r.EffectiveFlags = commonDefines.DevicePowerStates.OFF.effectiveFlags;
					break;
				case commonDefines.DevicePowerStates.ON:
					r.Power = commonDefines.DevicePowerStates.ON.value;
					r.EffectiveFlags = commonDefines.DevicePowerStates.ON.effectiveFlags;
					break;
				default:
					gthat.log.error("Unsupported value for device option - please report this to the developer!");
					return;
			}
		}
		else if (deviceOption == commonDefines.DeviceOptions.TargetHeatingCoolingState) {
			switch (value) {
				case commonDefines.DeviceOperationModes.HEAT:
					r.OperationMode = commonDefines.DeviceOperationModes.HEAT.value;
					r.EffectiveFlags = commonDefines.DeviceOperationModes.HEAT.effectiveFlags;
					break;
				case commonDefines.DeviceOperationModes.DRY:
					r.OperationMode = commonDefines.DeviceOperationModes.DRY.value;
					r.EffectiveFlags = commonDefines.DeviceOperationModes.DRY.effectiveFlags;
					break;
				case commonDefines.DeviceOperationModes.COOL:
					r.OperationMode = commonDefines.DeviceOperationModes.COOL.value;
					r.EffectiveFlags = commonDefines.DeviceOperationModes.COOL.effectiveFlags;
					break;
				case commonDefines.DeviceOperationModes.VENT:
					r.OperationMode = commonDefines.DeviceOperationModes.VENT.value;
					r.EffectiveFlags = commonDefines.DeviceOperationModes.VENT.effectiveFlags;
					break;
				case commonDefines.DeviceOperationModes.AUTO:
					r.OperationMode = commonDefines.DeviceOperationModes.AUTO.value;
					r.EffectiveFlags = commonDefines.DeviceOperationModes.AUTO.effectiveFlags;
					break;
				default:
					gthat.log.error("Unsupported value for device option - please report this to the developer!");
					return;
			}
		}
		else if (deviceOption == commonDefines.DeviceOptions.TargetTemperature) {
			r.SetTemperature = value;
			r.EffectiveFlags = commonDefines.DeviceOptions.TargetTemperature.effectiveFlags;
		}
		else if (deviceOption == commonDefines.DeviceOptions.FanSpeed) {
			r.SetFanSpeed = value;
			r.EffectiveFlags = commonDefines.DeviceOptions.FanSpeed.effectiveFlags;
		}
		else if (deviceOption == commonDefines.DeviceOptions.VaneHorizontalDirection) {
			r.VaneHorizontal = value;
			r.EffectiveFlags = commonDefines.DeviceOptions.VaneHorizontalDirection.effectiveFlags;
		}
		else if (deviceOption == commonDefines.DeviceOptions.VaneVerticalDirection) {
			r.VaneVertical = value;
			r.EffectiveFlags = commonDefines.DeviceOptions.VaneVerticalDirection.effectiveFlags;
		}
		else {
			gthat.log.error("Unsupported device option - please report this to the developer!");
			return;
		}

		r.HasPendingCommand = true;
		const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetAta";
		const method = "post";
		const body = JSON.stringify(gthis.airInfo);
		gthat.log.silly("Request body: " + body);

		request({
			url: url,
			method: method,
			body: body,
			headers: {
				"X-MitsContextKey": gthis.platform.contextKey,
				"content-type": "application/json"
			}
		}, function handleSetDeviceResponse(err, response) {
			if (err) {
				gthat.log.error("There was a problem setting info to: " + url);
				gthat.log.error(err);
			}
			else if (!response) {
				gthat.log.error("There was a problem receiving the response from: " + url);
				gthis.airInfo = null;
			}
			else {
				const statusCode = response.statusCode;
				gthat.log.debug("Received response from: " + url + " (status code: " + statusCode + " - " + HttpStatus.getReasonPhrase(statusCode) + ")");

				if (statusCode != HttpStatus.StatusCodes.OK) {
					gthis.airInfo = null;
					gthat.log.error("Invalid HTTP status code (" + statusCode + " - " + HttpStatus.getReasonPhrase(statusCode) + "). Changing device option failed!");
					return;
				}

				const responseBoy = response.body;
				const jsonObject = JSONHelper.JSONHelper.ParseCloudResponse(responseBoy, gthat);

				gthis.lastCommunication = jsonObject.LastCommunication;
				gthis.nextCommunication = jsonObject.NextCommunication;
				gthis.operationMode = jsonObject.OperationMode;
				gthis.targetTemp = jsonObject.SetTemperature;
				gthis.roomTemp = jsonObject.RoomTemperature;
				gthis.power = jsonObject.Power;
				gthis.fanSpeed = jsonObject.SetFanSpeed;
				gthis.vaneVerticalDirection = jsonObject.VaneVertical;
				gthis.vaneHorizontalDirection = jsonObject.VaneHorizontal;
				gthis.deviceOnline = !jsonObject.Offline;
				gthis.UpdateDeviceData(); // write updated values

				gthis.currentRequestExecution--;

				if (gthis.requestQueue.length) {
					const args = gthis.requestQueue.shift();
					gthat.log.debug("Dequeuing remote request for device option '" + args[1].id + "' with value '" + (args[2].value != undefined ? args[2].value : args[2]) + "'");
					gthis.getDeviceInfo.apply(gthis, args);
				}
			}
		});
	}

	verifyDeviceOptionValue(deviceOption, value, gthis) {
		switch (deviceOption) {
			case commonDefines.DeviceOptions.FanSpeed:
				if (value > gthis.numberOfFanSpeeds) {
					gthat.log.warn("Fan speed limited to " + gthis.numberOfFanSpeeds + " because device can't handle more than that!");
					return gthis.numberOfFanSpeeds;
				}
				return value;
			case commonDefines.DeviceOptions.TargetTemperature:
				// eslint-disable-next-line no-case-declarations
				let min, max;
				switch (gthis.operationMode) {
					case commonDefines.DeviceOperationModes.COOL.value:
					case commonDefines.DeviceOperationModes.DRY.value:
						min = gthis.minTempCoolDry;
						max = gthis.maxTempCoolDry;
						break;
					case commonDefines.DeviceOperationModes.HEAT.value:
						min = gthis.minTempHeat;
						max = gthis.maxTempHeat;
						break;
					case commonDefines.DeviceOperationModes.AUTO.value:
						min = gthis.minTempAuto;
						max = gthis.maxTempAuto;
						break;
					default:
						min = gthis.platform.UseFahrenheit ? 60 : 16;
						max = gthis.platform.UseFahrenheit ? 104 : 40;
						break;
				}
				if (value < min) {
					value = min;
					gthat.log.warn("SetTemperature limited to " + min + " because device can't handle lower than that!");
				}
				else if (value > max) {
					value = max;
					gthat.log.warn("SetTemperature limited to " + max + " because device can't handle more than that!");
				}
				return value;
			case commonDefines.DeviceOptions.VaneHorizontalDirection:
				if (value < 0 || value > 5 && value != 8 && value != 12) {
					gthat.log.warn("VaneHorizontalDirection: unsupported value '" + value + "' - falling back to '0'!");
					value = 0;
				}
				return value;
			case commonDefines.DeviceOptions.VaneVerticalDirection:
				if (value < 0 || value > 5 && value != 7) {
					gthat.log.warn("VaneVerticalDirection: unsupported value '" + value + "' - falling back to '0'!");
					value = 0;
				}
				return value;
			default: return value;
		}
	}

	async getPowerConsumptionReport() {
		const gthis = this;
		gthat.log.debug("Getting power consumption report for " + gthis.id + " (" + gthis.name + ")");

		const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/EnergyCost/Report";
		const method = "post";
		const body = JSON.stringify(await this.buildPowerConsumptionReportRequestBody());
		gthat.log.silly("Request body: " + body);

		if (body == "{}") return; // creating body failed or was provided dates were invalid

		request({
			url: url,
			method: method,
			body: body,
			headers: {
				"X-MitsContextKey": gthis.platform.contextKey,
				"content-type": "application/json"
			}
		}, function handleConsumptionReportResponse(err, response) {
			if (err) {
				gthat.log.error("There was a problem getting power consumption report from: " + url);
				gthat.log.error("Error: " + err);
			}
			else if (!response) {
				gthat.log.error("There was a problem receiving the response from: " + url);
			}
			else {
				const statusCode = response.statusCode;
				gthat.log.debug("Received response from: " + url + " (status code: " + statusCode + " - " + HttpStatus.getReasonPhrase(statusCode) + ")");

				if (statusCode != HttpStatus.StatusCodes.OK) {
					gthis.airInfo = null;
					gthat.log.error("Invalid HTTP status code (" + statusCode + " - " + HttpStatus.getReasonPhrase(statusCode) + "). Getting power consumption report failed!");
					return;
				}

				const responseBoy = response.body;
				const parsedReport = JSONHelper.JSONHelper.ParseCloudResponse(responseBoy, gthat);

				if (parsedReport.LinkedDevicesNotIncludedInArregateEnergyReport.includes(gthis.name)) {
					gthat.log.warn("Power consumption report is not supported for this device!");
					return;
				}

				// only save date portion of timestamp without the empty time
				gthis.powerConsumptionReportStartDate = parsedReport.FromDate.replace("T00:00:00", "");
				gthis.powerConsumptionReportEndDate = parsedReport.ToDate.replace("T00:00:00", "");

				gthis.powerConsumptionReportMonths = parsedReport.Labels;
				gthis.monthlyPowerConsumptionCooling = parsedReport.Cooling;
				gthis.monthlyPowerConsumptionHeating = parsedReport.Heating;
				gthis.monthlyPowerConsumptionAuto = parsedReport.Auto;
				gthis.monthlyPowerConsumptionDry = parsedReport.Dry;
				gthis.monthlyPowerConsumptionVent = parsedReport.Fan;

				// round all consumption values to 3 digits
				gthis.totalPowerConsumptionCooling = parsedReport.TotalCoolingConsumed;
				gthis.totalPowerConsumptionHeating = parsedReport.TotalHeatingConsumed;
				gthis.totalPowerConsumptionAuto = parsedReport.TotalAutoConsumed;
				gthis.totalPowerConsumptionDry = parsedReport.TotalDryConsumed;
				gthis.totalPowerConsumptionVent = parsedReport.TotalFanConsumed;
				gthis.totalPowerConsumptionMinutes = parsedReport.TotalMinutes;

				gthis.UpdateReportData();
			}
		});
	}

	async buildPowerConsumptionReportRequestBody() {
		const requestBody = {};

		const startDateObj = await gthat.getStateAsync(commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Reports + "." + commonDefines.AdapterStateIDs.ReportStartDate);
		let startDate = (startDateObj == null || startDateObj.val == null) ? "" : startDateObj.val;
		const endDateObj = await gthat.getStateAsync(commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Reports + "." + commonDefines.AdapterStateIDs.ReportEndDate);
		let endDate = (endDateObj == null || endDateObj.val == null) ? "" : endDateObj.val;

		if (startDate == "") {
			gthat.log.warn("No valid start date was provided (format: YYYY-MM-DD). Defaulting to 6 months prior.");
			const d = new Date();
			d.setMonth(d.getMonth() - 6);
			startDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
		}

		const parsedStartDate = startDate.split("-");
		if (parsedStartDate.length != 3 || parsedStartDate[0].length != 4 || parsedStartDate[1].length > 2 || parsedStartDate[2].length > 2) {
			gthat.log.warn("No valid start date was provided (format: YYYY-MM-DD). Defaulting to 6 months prior.");
			const d = new Date();
			d.setMonth(d.getMonth() - 6);
			startDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
		}

		if (endDate == "") {
			gthat.log.warn("No valid end date was provided (format: YYYY-MM-DD). Defaulting to today.");
			const d = new Date();
			endDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
		}

		const parsedEndDate = endDate.split("-");
		if (parsedEndDate.length != 3 || parsedEndDate[0].length != 4 || parsedEndDate[1].length > 2 || parsedEndDate[2].length > 2) {
			gthat.log.warn("No valid end date was provided (format: YYYY-MM-DD). Defaulting to today.");
			const d = new Date();
			endDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
		}

		if (startDate == endDate) {
			gthat.log.warn("Start and end date must not be the same. Ignoring request.");
			return requestBody;
		}

		requestBody.DeviceId = this.id;
		requestBody.FromDate = startDate + "T00:00:00";
		requestBody.ToDate = endDate + "T00:00:00";
		requestBody.UseCurrency = false;

		return requestBody;
	}
}

exports.MelCloudDevice = MelcloudDevice;