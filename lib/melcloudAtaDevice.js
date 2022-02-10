"use strict";

const Axios = require("axios").default;
const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const operationModes = [commonDefines.AtaDeviceOperationModes.HEAT.id, commonDefines.AtaDeviceOperationModes.COOL.id, commonDefines.AtaDeviceOperationModes.AUTO.id, commonDefines.AtaDeviceOperationModes.VENT.id, commonDefines.AtaDeviceOperationModes.DRY.id];

let gthat = null; // pointer to "this" from main.js/MelCloud instance

class MelcloudAtaDevice {
	constructor(that) {
		gthat = that;
		this.platform = null;
		this.airInfo = null;
		this.deviceInfoRequestQueue = [];
		this.currentDeviceInfoRequests = 0;
		this.deviceSetRequestQueue = [];
		this.currentDeviceSetRequests = 0;
		this.hasBeenCreated = false;
		this.deviceType = commonDefines.DeviceTypes.AirToAir;

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
		this.operationMode = commonDefines.AtaDeviceOperationModes.UNDEF.value;
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
		// check if object has already been created
		if (this.hasBeenCreated) return;

		const devicePrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id;
		await gthat.extendObjectAsync(devicePrefix, {
			type: "channel",
			common: {
				name: "ATA Device " + this.id + " (" + this.name + ")"
			},
			native: {}
		});

		//#region INFO
		let infoPrefix = devicePrefix + "." + commonDefines.AdapterDatapointIDs.Info;
		await gthat.extendObjectAsync(infoPrefix, {
			type: "channel",
			common: {
				name: "Device information"
			},
			native: {}
		});

		infoPrefix += ".";

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceName, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceType, {
			type: "state",
			common: {
				name: "Device type",
				type: "number",
				role: "value",
				states: {
					0: "Air to air heat pump / air conditioner",
					1: "Air to water heat pump"
				},
				read: true,
				write: false,
				def: this.deviceType,
				desc: "MELCloud device type"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.SerialNumber, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.MacAddress, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.BuildingId, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.FloorId, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.CanCool, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.CanHeat, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.CanDry, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempCoolDry, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempCoolDry, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempHeat, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempHeat, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempAuto, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempAuto, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.RoomTemp, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedAuto, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.NumberOfFanSpeeds, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.LastCommunication, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.NextCommunication, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceOnline, {
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
		await gthat.extendObjectAsync(controlPrefix, {
			type: "channel",
			common: {
				name: "Device control"
			},
			native: {}
		});

		controlPrefix += ".";

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.Power, {
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

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.Mode, {
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
		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.TargetTemp, {
			type: "state",
			common: {
				name: "Target temperature",
				type: "number",
				role: "level.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				min: minTemp,
				max: maxTemp,
				step: 0.5,
				read: true,
				write: true,
				def: this.targetTemp,
				desc: "Target temperature of the device"
			},
			native: {}
		});

		// Extend existing object
		await gthat.extendObject(controlPrefix + commonDefines.AtaDeviceStateIDs.TargetTemp, {
			common: {
				step: 0.5
			}
		});

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedManual, {
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

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.VaneVerticalDirection, {
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

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.VaneHorizontalDirection, {
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
		await gthat.extendObjectAsync(reportsPrefix, {
			type: "channel",
			common: {
				name: "Device reports"
			},
			native: {}
		});

		reportsPrefix += ".";

		await gthat.extendObjectAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.ReportStartDate, {
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

		await gthat.extendObjectAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.ReportEndDate, {
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

		await gthat.extendObjectAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.GetPowerConsumptionReport, {
			type: "state",
			common: {
				name: "Get current power consumption report",
				type: "boolean",
				role: "button",
				read: false,
				write: true,
				def: false,
				desc: "Get current power consumption report"
			},
			native: {}
		});

		await gthat.extendObjectAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.ReportedMonths, {
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
				gthat.extendObjectAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + mode, {
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

				gthat.extendObjectAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + mode + month, {
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

		await gthat.extendObjectAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalMinutes, {
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
		this.hasBeenCreated = true;
	}

	// Only writes changed device data into the DB
	async UpdateDeviceData(deviceOption) {
		//#region INFO
		const infoPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Info + ".";

		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceName, this.name, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.SerialNumber, this.serialNumber, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.MacAddress, this.macAddress, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.BuildingId, this.buildingId, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.FloorId, this.floorId, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.CanCool, this.canCool, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.CanHeat, this.canHeat, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.CanDry, this.canDry, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempCoolDry, this.minTempCoolDry, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempCoolDry, this.maxTempCoolDry, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempHeat, this.minTempHeat, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempHeat, this.maxTempHeat, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempAuto, this.minTempAuto, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempAuto, this.maxTempAuto, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.RoomTemp, this.roomTemp, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedAuto, this.actualFanSpeed, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.NumberOfFanSpeeds, this.numberOfFanSpeeds, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.LastCommunication, this.lastCommunication, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.NextCommunication, this.nextCommunication, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceOnline, this.deviceOnline, true);
		//#endregion

		//#region CONTROL
		const controlPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Control + ".";

		switch (deviceOption) {
			case commonDefines.AtaDeviceOptions.PowerState:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.Power, this.power, true);
				break;
			case commonDefines.AtaDeviceOptions.TargetHeatingCoolingState:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.Mode, this.operationMode, true);
				break;
			case commonDefines.AtaDeviceOptions.TargetTemperature:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.TargetTemp, this.targetTemp, true);
				break;
			case commonDefines.AtaDeviceOptions.FanSpeed:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedManual, this.fanSpeed, true);
				break;
			case commonDefines.AtaDeviceOptions.VaneHorizontalDirection:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.VaneHorizontalDirection, this.vaneHorizontalDirection, true);
				break;
			case commonDefines.AtaDeviceOptions.VaneVerticalDirection:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.VaneVerticalDirection, this.vaneVerticalDirection, true);
				break;
			case "ALL":
			default:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.Power, this.power, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.Mode, this.operationMode, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.TargetTemp, this.targetTemp, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedManual, this.fanSpeed, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.VaneHorizontalDirection, this.vaneHorizontalDirection, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.VaneVerticalDirection, this.vaneVerticalDirection, true);
				break;
		}
		//#endregion

		gthat.log.debug("Updated device data for device " + this.id + " (" + this.name + ")");
	}

	// Only writes changed report data into the DB
	async UpdateReportData() {
		const reportsPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Reports + ".";

		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.ReportStartDate, this.powerConsumptionReportStartDate, true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.ReportEndDate, this.powerConsumptionReportEndDate, true);

		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.ReportedMonths, this.powerConsumptionReportMonths, true);
		let counter = 0;
		this.powerConsumptionReportMonths.forEach(month => {
			const monthName = monthNames[month - 1]; // months delivered from cloud range from 1=January to 12=December
			gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.COOL.id + monthName, commonDefines.roundValue(this.monthlyPowerConsumptionCooling[counter], 3), true);
			gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.HEAT.id + monthName, commonDefines.roundValue(this.monthlyPowerConsumptionHeating[counter], 3), true);
			gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.AUTO.id + monthName, commonDefines.roundValue(this.monthlyPowerConsumptionAuto[counter], 3), true);
			gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.DRY.id + monthName, commonDefines.roundValue(this.monthlyPowerConsumptionDry[counter], 3), true);
			gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.VENT.id + monthName, commonDefines.roundValue(this.monthlyPowerConsumptionVent[counter], 3), true);
			counter++;
		});

		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.COOL.id, commonDefines.roundValue(this.totalPowerConsumptionCooling, 3), true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.HEAT.id, commonDefines.roundValue(this.totalPowerConsumptionHeating, 3), true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.AUTO.id, commonDefines.roundValue(this.totalPowerConsumptionAuto, 3), true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.DRY.id, commonDefines.roundValue(this.totalPowerConsumptionDry, 3), true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.VENT.id, commonDefines.roundValue(this.totalPowerConsumptionVent, 3), true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.AtaDeviceStateIDs.TotalMinutes, this.totalPowerConsumptionMinutes, true);

		gthat.log.debug("Updated report data for device " + this.id + " (" + this.name + ")");
	}

	getDeviceInfo(callback, deviceOption, value) {
		const gthis = this;

		if (gthis.airInfo != null) {
			gthat.log.debug("Data already available for: " + gthis.id + " (" + gthis.name + ")");
			callback && callback(deviceOption, value, gthis);

			if (gthis.deviceInfoRequestQueue.length) {
				const args = gthis.deviceInfoRequestQueue.shift();
				gthat.log.debug("Dequeuing getDeviceInfo remote request for device option '" + args[1].id + "' with value '" + (args[2].value != undefined ? args[2].value : args[2]) + "'...");
				gthis.getDeviceInfo.apply(gthis, args);
			}

			return;
		}

		gthat.log.debug("Getting device data for " + gthis.id + " (" + gthis.name + ")");

		if (gthis.currentDeviceInfoRequests < 1) {
			gthis.currentDeviceInfoRequests++;

			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/Get?id=" + gthis.id + "&buildingID=" + gthis.buildingId;

			Axios.get(url, {
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey
				}
			}).then(function handleDeviceInfoResponse(response) {
				if (!response || !response.data || JSON.stringify(response.data).search("<!DOCTYPE html>") != -1) {
					gthat.log.error("There was a problem receiving the response from: " + url);
					gthis.airInfo = null;
				}
				else {
					const statusCode = response.status;
					gthat.log.debug("Received response from: " + url + " (status code: " + statusCode + " - " + response.statusText + ")");

					if (statusCode != HttpStatus.StatusCodes.OK) {
						gthis.airInfo = null;
						gthat.log.error("Invalid HTTP status code (" + statusCode + " - " + response.statusText + "). Getting device data failed!");
						return;
					}

					gthat.log.debug("Response from cloud: " + JSON.stringify(response.data));
					gthis.airInfo = response.data;

					// Cache airInfo data for 1 minute
					setTimeout(function clearAirInfo() {
						gthis.airInfo = null;
					}, 60 * 1000);
				}

				gthis.currentDeviceInfoRequests--;
				callback && callback(deviceOption, value, gthis);

				if (gthis.deviceInfoRequestQueue.length) {
					const args = gthis.deviceInfoRequestQueue.shift();
					gthat.log.debug("Dequeuing getDeviceInfo remote request for device option '" + args[1].id + "' with value '" + (args[2].value != undefined ? args[2].value : args[2]) + "'");
					gthis.getDeviceInfo.apply(gthis, args);
				}
			}).catch(error => {
				gthat.log.error("There was a problem getting device data from: " + url);
				gthat.log.error("Error: " + error);
				gthis.airInfo = null;
			});
		}
		else {
			gthat.log.debug("Queueing getDeviceInfo remote request for '" + deviceOption.id + "' with value '" + (value.value != undefined ? value.value : value) + "'...");
			gthis.deviceInfoRequestQueue.push(arguments);
		}
	}

	setDevice(deviceOption, value, gthis) {
		if (gthis.currentDeviceSetRequests < 1) {
			gthis.currentDeviceSetRequests++;

			gthat.log.debug("Changing device option '" + deviceOption.id + "' to '" + (value.value != undefined ? value.value : value) + "'...");
			const r = gthis.airInfo;

			value = gthis.verifyDeviceOptionValue(deviceOption, value, gthis);

			if (deviceOption == commonDefines.AtaDeviceOptions.PowerState) {
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
			else if (deviceOption == commonDefines.AtaDeviceOptions.TargetHeatingCoolingState) {
				switch (value) {
					case commonDefines.AtaDeviceOperationModes.HEAT:
						r.OperationMode = commonDefines.AtaDeviceOperationModes.HEAT.value;
						r.EffectiveFlags = commonDefines.AtaDeviceOperationModes.HEAT.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.DRY:
						r.OperationMode = commonDefines.AtaDeviceOperationModes.DRY.value;
						r.EffectiveFlags = commonDefines.AtaDeviceOperationModes.DRY.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.COOL:
						r.OperationMode = commonDefines.AtaDeviceOperationModes.COOL.value;
						r.EffectiveFlags = commonDefines.AtaDeviceOperationModes.COOL.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.VENT:
						r.OperationMode = commonDefines.AtaDeviceOperationModes.VENT.value;
						r.EffectiveFlags = commonDefines.AtaDeviceOperationModes.VENT.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.AUTO:
						r.OperationMode = commonDefines.AtaDeviceOperationModes.AUTO.value;
						r.EffectiveFlags = commonDefines.AtaDeviceOperationModes.AUTO.effectiveFlags;
						break;
					default:
						gthat.log.error("Unsupported value for device option - please report this to the developer!");
						return;
				}
			}
			else if (deviceOption == commonDefines.AtaDeviceOptions.TargetTemperature) {
				r.SetTemperature = value;
				r.EffectiveFlags = commonDefines.AtaDeviceOptions.TargetTemperature.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtaDeviceOptions.FanSpeed) {
				r.SetFanSpeed = value;
				r.EffectiveFlags = commonDefines.AtaDeviceOptions.FanSpeed.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtaDeviceOptions.VaneHorizontalDirection) {
				r.VaneHorizontal = value;
				r.EffectiveFlags = commonDefines.AtaDeviceOptions.VaneHorizontalDirection.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtaDeviceOptions.VaneVerticalDirection) {
				r.VaneVertical = value;
				r.EffectiveFlags = commonDefines.AtaDeviceOptions.VaneVerticalDirection.effectiveFlags;
			}
			else {
				gthat.log.error("Unsupported device option - please report this to the developer!");
				return;
			}

			r.HasPendingCommand = true;
			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetAta";
			const body = JSON.stringify(gthis.airInfo);
			gthat.log.silly("Request body: " + body);

			Axios.post(url, body, {
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey,
					"content-type": "application/json"
				}
			}).then(function handleSetDeviceResponse(response) {
				if (!response) {
					gthat.log.error("There was a problem receiving the response from: " + url);
					gthis.airInfo = null;
				}
				else {
					const statusCode = response.status;
					const statusText = response.statusText;
					gthat.log.debug("Received response from: " + url + " (status code: " + statusCode + " - " + statusText + ")");

					if (statusCode != HttpStatus.StatusCodes.OK) {
						gthis.airInfo = null;
						gthat.log.error("Invalid HTTP status code (" + statusCode + " - " + statusText + "). Changing device option failed!");
						return;
					}

					const responseData = response.data;
					gthat.log.debug("Response from cloud: " + JSON.stringify(responseData));

					gthis.lastCommunication = responseData.LastCommunication;
					gthis.nextCommunication = responseData.NextCommunication;
					gthis.roomTemp = responseData.RoomTemperature;
					gthis.deviceOnline = !responseData.Offline;

					switch (deviceOption) {
						case commonDefines.AtaDeviceOptions.PowerState:
							gthis.power = responseData.Power;
							break;
						case commonDefines.AtaDeviceOptions.TargetHeatingCoolingState:
							gthis.operationMode = responseData.OperationMode;
							break;
						case commonDefines.AtaDeviceOptions.TargetTemperature:
							gthis.targetTemp = responseData.SetTemperature;
							break;
						case commonDefines.AtaDeviceOptions.FanSpeed:
							gthis.fanSpeed = responseData.SetFanSpeed;
							break;
						case commonDefines.AtaDeviceOptions.VaneHorizontalDirection:
							gthis.vaneHorizontalDirection = responseData.VaneHorizontal;
							break;
						case commonDefines.AtaDeviceOptions.VaneVerticalDirection:
							gthis.vaneVerticalDirection = responseData.VaneVertical;
							break;
						default:
							break;
					}

					gthis.UpdateDeviceData(deviceOption); // write updated values

					gthis.currentDeviceSetRequests--;

					if (gthis.deviceSetRequestQueue.length) {
						const args = gthis.deviceSetRequestQueue.shift();
						gthat.log.debug("Dequeuing setDevice remote request for device option '" + args[0].id + "' with value '" + (args[1].value != undefined ? args[1].value : args[1]) + "'");
						gthis.setDevice.apply(gthis, args);
					}
				}
			}).catch(error => {
				gthat.log.error("There was a problem setting info to: " + url);
				gthat.log.error(error);
			});
		}
		else {
			gthat.log.debug("Queueing setDevice remote request for '" + deviceOption.id + "' with value '" + (value.value != undefined ? value.value : value) + "'...");
			gthis.deviceSetRequestQueue.push(arguments);
		}
	}

	verifyDeviceOptionValue(deviceOption, value, gthis) {
		switch (deviceOption) {
			case commonDefines.AtaDeviceOptions.FanSpeed:
				if (value > gthis.numberOfFanSpeeds) {
					gthat.log.warn("Fan speed limited to " + gthis.numberOfFanSpeeds + " because device can't handle more than that!");
					return gthis.numberOfFanSpeeds;
				}
				return value;
			case commonDefines.AtaDeviceOptions.TargetTemperature:
				// eslint-disable-next-line no-case-declarations
				let min, max;
				switch (gthis.operationMode) {
					case commonDefines.AtaDeviceOperationModes.COOL.value:
					case commonDefines.AtaDeviceOperationModes.DRY.value:
						min = gthis.minTempCoolDry;
						max = gthis.maxTempCoolDry;
						break;
					case commonDefines.AtaDeviceOperationModes.HEAT.value:
						min = gthis.minTempHeat;
						max = gthis.maxTempHeat;
						break;
					case commonDefines.AtaDeviceOperationModes.AUTO.value:
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
			case commonDefines.AtaDeviceOptions.VaneHorizontalDirection:
				if (value < 0 || value > 5 && value != 8 && value != 12) {
					gthat.log.warn("VaneHorizontalDirection: unsupported value '" + value + "' - falling back to '0'!");
					value = 0;
				}
				return value;
			case commonDefines.AtaDeviceOptions.VaneVerticalDirection:
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
		const body = JSON.stringify(await this.buildPowerConsumptionReportRequestBody());
		gthat.log.silly("Request body: " + body);

		if (body == "{}") return; // creating body failed or was provided dates were invalid

		Axios.post(url, body, {
			headers: {
				"X-MitsContextKey": gthis.platform.contextKey,
				"content-type": "application/json"
			}
		}).then(function handleConsumptionReportResponse(response) {
			if (!response) {
				gthat.log.error("There was a problem receiving the response from: " + url);
			}
			else {
				const statusCode = response.status;
				const statusText = response.statusText;
				gthat.log.debug("Received response from: " + url + " (status code: " + statusCode + " - " + statusText + ")");

				if (statusCode != HttpStatus.StatusCodes.OK) {
					gthis.airInfo = null;
					gthat.log.error("Invalid HTTP status code (" + statusCode + " - " + statusText + "). Getting power consumption report failed!");
					return;
				}

				const responseData = response.data;
				gthat.log.debug("Response from cloud: " + JSON.stringify(responseData));

				if (responseData.LinkedDevicesNotIncludedInArregateEnergyReport.includes(gthis.name)) {
					gthat.log.warn("Power consumption report is not supported for this device!");
					return;
				}

				// only save date portion of timestamp without the empty time
				gthis.powerConsumptionReportStartDate = responseData.FromDate.replace("T00:00:00", "");
				gthis.powerConsumptionReportEndDate = responseData.ToDate.replace("T00:00:00", "");

				gthis.powerConsumptionReportMonths = responseData.Labels;
				gthis.monthlyPowerConsumptionCooling = responseData.Cooling;
				gthis.monthlyPowerConsumptionHeating = responseData.Heating;
				gthis.monthlyPowerConsumptionAuto = responseData.Auto;
				gthis.monthlyPowerConsumptionDry = responseData.Dry;
				gthis.monthlyPowerConsumptionVent = responseData.Fan;

				// round all consumption values to 3 digits
				gthis.totalPowerConsumptionCooling = responseData.TotalCoolingConsumed;
				gthis.totalPowerConsumptionHeating = responseData.TotalHeatingConsumed;
				gthis.totalPowerConsumptionAuto = responseData.TotalAutoConsumed;
				gthis.totalPowerConsumptionDry = responseData.TotalDryConsumed;
				gthis.totalPowerConsumptionVent = responseData.TotalFanConsumed;
				gthis.totalPowerConsumptionMinutes = responseData.TotalMinutes;

				gthis.UpdateReportData();
			}
		}).catch(error => {
			gthat.log.error("There was a problem getting power consumption report from: " + url);
			gthat.log.error("Error: " + error);
		});
	}

	async buildPowerConsumptionReportRequestBody() {
		const requestBody = {};

		const startDateObj = await gthat.getStateAsync(commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Reports + "." + commonDefines.AtaDeviceStateIDs.ReportStartDate);
		let startDate = (startDateObj == null || startDateObj.val == null) ? "" : startDateObj.val;
		const endDateObj = await gthat.getStateAsync(commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Reports + "." + commonDefines.AtaDeviceStateIDs.ReportEndDate);
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

exports.MelCloudDevice = MelcloudAtaDevice;