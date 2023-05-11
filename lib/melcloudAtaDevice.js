"use strict";

const Axios = require("axios").default;
const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");
const Https = require("https");
const RootCas = require("ssl-root-cas").create();
const Path = require("path");

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
		this.deviceHasError = false;
		this.errorMessages = "";
		this.errorCode = 8000;

		// Control
		this.power = false;
		this.operationMode = commonDefines.AtaDeviceOperationModes.UNDEF.value;
		this.targetTemp = 0;
		this.fanSpeed = 0;
		this.vaneVerticalDirection = 0;
		this.vaneHorizontalDirection = 0;
		this.timerToggle = false;

		// Reports
		this.powerConsumptionReportStartDate = "";
		this.powerConsumptionReportEndDate = "";
		this.totalPowerConsumptionCooling = 0;
		this.totalPowerConsumptionHeating = 0;
		this.totalPowerConsumptionAuto = 0;
		this.totalPowerConsumptionDry = 0;
		this.totalPowerConsumptionVent = 0;
		this.totalPowerConsumptionMinutes = 0;
		this.rawPowerConsumptionReportData = null;
		this.linkedDevicesIncludedInArregateEnergyReport = "";
	}

	// Creates all necessery states and channels and writes the values into the DB
	async CreateAndSave() {
		// check if object has already been created
		if (this.hasBeenCreated) return;

		const devicePrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}`;
		await gthat.extendObjectAsync(devicePrefix, {
			type: "device",
			common: {
				statusStates: {
					onlineId: `${gthat.namespace}.${devicePrefix}.${commonDefines.AdapterDatapointIDs.Info}.${commonDefines.CommonDeviceStateIDs.DeviceOnline}`,
					errorId: `${gthat.namespace}.${devicePrefix}.${commonDefines.AdapterDatapointIDs.Info}.${commonDefines.CommonDeviceStateIDs.DeviceHasError}`
				},
				name: `ATA Device ${this.id} (${this.name})`
			},
			native: {},
		});

		//#region INFO
		let infoPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Info}`;
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

		if (this.canHeat) {
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
		}


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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceHasError, {
			type: "state",
			common: {
				name: "Has device an error",
				type: "boolean",
				role: "indicator.maintenance.alarm",
				read: true,
				write: false,
				def: this.deviceHasError,
				desc: "Indicates if device has an error"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.ErrorMessages, {
			type: "state",
			common: {
				name: "Error messages",
				type: "string",
				role: "value",
				read: true,
				write: false,
				def: this.errorMessages,
				desc: "Current error messages"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.ErrorCode, {
			type: "state",
			common: {
				name: "Error code",
				type: "number",
				role: "value",
				read: true,
				write: false,
				def: this.errorCode,
				desc: "Current error code",
				states: {
					8000: "No error"
				},
			},
			native: {}
		});
		//#endregion

		//#region CONTROL
		let controlPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Control}`;
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

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.TargetTemp, {
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

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.TimerToogle, {
			type: "state",
			common: {
				name: "Timer toggle",
				type: "boolean",
				role: "switch.enable",
				read: true,
				write: true,
				def: this.timerToggle,
				desc: "Enable or disable the device's timer"
			},
			native: {}
		});
		//#endregion

		//#region REPORTS
		let reportsPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Reports}`;
		await gthat.extendObjectAsync(reportsPrefix, {
			type: "channel",
			common: {
				name: "Device reports"
			},
			native: {}
		});

		reportsPrefix += ".";

		await gthat.extendObjectAsync(reportsPrefix + commonDefines.CommonDeviceStateIDs.PowerConsumptionReportStartDate, {
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

		await gthat.extendObjectAsync(reportsPrefix + commonDefines.CommonDeviceStateIDs.PowerConsumptionReportEndDate, {
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

		await gthat.extendObjectAsync(reportsPrefix + commonDefines.CommonDeviceStateIDs.GetPowerConsumptionReport, {
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

		let lastReportDataPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.AdapterDatapointIDs.LastReportData}`;
		await gthat.extendObjectAsync(lastReportDataPrefix, {
			type: "channel",
			common: {
				name: "Last report data"
			},
			native: {}
		});

		lastReportDataPrefix += ".";
		const reportModes = [commonDefines.AtaDeviceOperationModes.HEAT.id, commonDefines.AtaDeviceOperationModes.COOL.id, commonDefines.AtaDeviceOperationModes.AUTO.id, commonDefines.AtaDeviceOperationModes.VENT.id, commonDefines.AtaDeviceOperationModes.DRY.id];

		reportModes.forEach(mode => {
			if (mode == commonDefines.AtaDeviceOperationModes.HEAT.id && !this.canHeat ||
				mode == commonDefines.AtaDeviceOperationModes.DRY.id && !this.canDry ||
				mode == commonDefines.AtaDeviceOperationModes.COOL.id && !this.canCool)
				return;

			gthat.extendObjectAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + mode, {
				type: "state",
				common: {
					name: `Total power consumption for mode '${mode}'`,
					type: "number",
					role: "value.power.consumption",
					min: 0,
					read: true,
					write: false,
					unit: "kWh",
					def: 0,
					desc: `Total power consumption for mode '${mode}'`
				},
				native: {}
			});
		});

		gthat.extendObjectAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix, {
			type: "state",
			common: {
				name: "Total power consumption for all modes",
				type: "number",
				role: "value.power.consumption",
				min: 0,
				read: true,
				write: false,
				unit: "kWh",
				def: 0,
				desc: "Total power consumption for all modes"
			},
			native: {}
		});

		await gthat.extendObjectAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalReportedMinutes, {
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

		await gthat.extendObjectAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.RawPowerConsumptionData, {
			type: "state",
			common: {
				name: "Raw data of current report",
				type: "string",
				role: "json",
				read: true,
				write: false,
				desc: "Raw data of current report"
			},
			native: {}
		});
		//#endregion

		gthat.log.debug(`Created and saved ATA device ${this.id} (${this.name})`);
		this.hasBeenCreated = true;
	}

	// Only writes changed device data into the DB
	async UpdateDeviceData(deviceOption) {
		//#region INFO
		const infoPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Info}.`;

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
		if (this.canHeat) await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempHeat, this.minTempHeat, true);
		if (this.canHeat) await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempHeat, this.maxTempHeat, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempAuto, this.minTempAuto, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempAuto, this.maxTempAuto, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.RoomTemp, this.roomTemp, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedAuto, this.actualFanSpeed, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.NumberOfFanSpeeds, this.numberOfFanSpeeds, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.LastCommunication, this.lastCommunication, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.NextCommunication, this.nextCommunication, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceOnline, this.deviceOnline, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceHasError, this.deviceHasError, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.ErrorMessages, this.errorMessages, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.ErrorCode, this.errorCode, true);
		//#endregion

		//#region CONTROL
		const controlPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Control}.`;

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

		gthat.log.debug(`Updated device data for ATA device ${this.id} (${this.name})`);
	}

	// Only writes changed report data into the DB
	async UpdateReportData() {
		const reportsPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Reports}.`;

		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.CommonDeviceStateIDs.PowerConsumptionReportStartDate, this.powerConsumptionReportStartDate, true);
		await gthat.setStateChangedAsync(reportsPrefix + commonDefines.CommonDeviceStateIDs.PowerConsumptionReportEndDate, this.powerConsumptionReportEndDate, true);

		const lastReportDataPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.AdapterDatapointIDs.LastReportData}.`;
		let totalConsumption = 0;
		if (this.canCool) {
			await gthat.setStateChangedAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.COOL.id, commonDefines.roundValue(this.totalPowerConsumptionCooling, 3), true);
			totalConsumption += this.totalPowerConsumptionCooling;
		}

		if (this.canHeat) {
			await gthat.setStateChangedAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.HEAT.id, commonDefines.roundValue(this.totalPowerConsumptionHeating, 3), true);
			totalConsumption += this.totalPowerConsumptionHeating;
		}

		await gthat.setStateChangedAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.AUTO.id, commonDefines.roundValue(this.totalPowerConsumptionAuto, 3), true);
		totalConsumption += this.totalPowerConsumptionAuto;

		if (this.canDry) {
			await gthat.setStateChangedAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.DRY.id, commonDefines.roundValue(this.totalPowerConsumptionDry, 3), true);
			totalConsumption += this.totalPowerConsumptionDry;
		}

		await gthat.setStateChangedAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.VENT.id, commonDefines.roundValue(this.totalPowerConsumptionVent, 3), true);
		totalConsumption += this.totalPowerConsumptionVent;

		await gthat.setStateChangedAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix, commonDefines.roundValue(totalConsumption, 3), true);

		await gthat.setStateChangedAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalReportedMinutes, this.totalPowerConsumptionMinutes, true);
		await gthat.setStateChangedAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.RawPowerConsumptionData, JSON.stringify(this.rawPowerConsumptionReportData), true);

		gthat.log.debug(`Updated report data for device ${this.id} (${this.name})`);
	}

	getDeviceInfo(callback, deviceOption, value) {
		const gthis = this;

		if (gthis.airInfo != null) {
			gthat.log.debug(`Data already available for: ${gthis.id} (${gthis.name})`);
			callback && callback(deviceOption, value, gthis);

			if (gthis.deviceInfoRequestQueue.length) {
				const args = gthis.deviceInfoRequestQueue.shift();
				gthat.log.debug(`Dequeuing getDeviceInfo remote request for device option '${args[1].id}' with value '${args[2].value != undefined ? args[2].value : args[2]}'...`);
				gthis.getDeviceInfo.apply(gthis, args);
			}

			return;
		}

		gthat.log.debug(`Getting device data for ${gthis.id} (${gthis.name})`);

		if (gthis.currentDeviceInfoRequests < 1) {
			gthis.currentDeviceInfoRequests++;

			const url = `https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/Get?id=${gthis.id}&buildingID=${gthis.buildingId}`;

			RootCas.addFile(Path.resolve(__dirname, "melcloud_intermediate.pem"));
			const agent = new Https.Agent({ ca: RootCas });

			Axios.get(url, {
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey
				}, httpsAgent: agent
			}).then(function handleDeviceInfoResponse(response) {
				gthis.currentDeviceInfoRequests--;

				if (!response || !response.data || JSON.stringify(response.data).search("<!DOCTYPE html>") != -1) {
					gthat.log.error(`There was a problem receiving the response from: ${url}`);
					gthis.airInfo = null;
				}
				else {
					const statusCode = response.status;
					gthat.log.debug(`Received response from: ${url} (status code: ${statusCode} - ${response.statusText})`);

					if (statusCode != HttpStatus.StatusCodes.OK) {
						gthis.airInfo = null;
						gthat.log.error(`Invalid HTTP status code (${statusCode} - ${response.statusText}). Getting device data failed!`);
					}
					else {
						gthat.log.debug(`Response from cloud: ${JSON.stringify(response.data)}`);
						gthis.airInfo = response.data;

						// Cache airInfo data for 1 minute
						setTimeout(function clearAirInfo() {
							gthis.airInfo = null;
						}, 60 * 1000);

						callback && callback(deviceOption, value, gthis);
					}
				}

				if (gthis.deviceInfoRequestQueue.length) {
					const args = gthis.deviceInfoRequestQueue.shift();
					gthat.log.debug(`Dequeuing getDeviceInfo remote request for device option '${args[1].id}' with value '${args[2].value != undefined ? args[2].value : args[2]}'`);
					gthis.getDeviceInfo.apply(gthis, args);
				}
			}).catch(error => {
				gthat.log.error(`There was a problem getting device data from: ${url}`);
				gthat.log.error(`Error: ${error}`);
				gthis.airInfo = null;

				gthis.currentDeviceInfoRequests--;

				if (gthis.deviceInfoRequestQueue.length) {
					const args = gthis.deviceInfoRequestQueue.shift();
					gthat.log.debug(`Dequeuing getDeviceInfo remote request for device option '${args[1].id}' with value '${args[2].value != undefined ? args[2].value : args[2]}'`);
					gthis.getDeviceInfo.apply(gthis, args);
				}
			});
		}
		else {
			gthat.log.debug(`Queueing getDeviceInfo remote request for '${deviceOption.id}' with value '${value.value != undefined ? value.value : value}'...`);
			gthis.deviceInfoRequestQueue.push(arguments);
		}
	}

	setDevice(deviceOption, value, gthis) {
		if (gthis.currentDeviceSetRequests < 1) {
			gthis.currentDeviceSetRequests++;

			gthat.log.debug(`Changing device option '${deviceOption.id}' to '${value.value != undefined ? value.value : value}'...`);
			const modifiedAirInfo = gthis.airInfo;

			if (modifiedAirInfo == null) {
				gthat.log.error(`setDevice(): modifiedAirInfo is not filled - please report this to the developer!`);
				return;
			}

			value = gthis.verifyDeviceOptionValue(deviceOption, value, gthis);

			if (deviceOption == commonDefines.AtaDeviceOptions.PowerState) {
				switch (value) {
					case commonDefines.DevicePowerStates.OFF:
						modifiedAirInfo.Power = commonDefines.DevicePowerStates.OFF.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.DevicePowerStates.OFF.effectiveFlags;
						break;
					case commonDefines.DevicePowerStates.ON:
						modifiedAirInfo.Power = commonDefines.DevicePowerStates.ON.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.DevicePowerStates.ON.effectiveFlags;
						break;
					default:
						gthat.log.error("setDevice(): Unsupported value for device option - please report this to the developer!");
						return;
				}
			}
			else if (deviceOption == commonDefines.AtaDeviceOptions.TargetHeatingCoolingState) {
				switch (value) {
					case commonDefines.AtaDeviceOperationModes.HEAT:
						modifiedAirInfo.OperationMode = commonDefines.AtaDeviceOperationModes.HEAT.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOperationModes.HEAT.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.DRY:
						modifiedAirInfo.OperationMode = commonDefines.AtaDeviceOperationModes.DRY.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOperationModes.DRY.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.COOL:
						modifiedAirInfo.OperationMode = commonDefines.AtaDeviceOperationModes.COOL.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOperationModes.COOL.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.VENT:
						modifiedAirInfo.OperationMode = commonDefines.AtaDeviceOperationModes.VENT.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOperationModes.VENT.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.AUTO:
						modifiedAirInfo.OperationMode = commonDefines.AtaDeviceOperationModes.AUTO.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOperationModes.AUTO.effectiveFlags;
						break;
					default:
						gthat.log.error("setDevice(): Unsupported value for device option - please report this to the developer!");
						return;
				}
			}
			else if (deviceOption == commonDefines.AtaDeviceOptions.TargetTemperature) {
				modifiedAirInfo.SetTemperature = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOptions.TargetTemperature.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtaDeviceOptions.FanSpeed) {
				modifiedAirInfo.SetFanSpeed = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOptions.FanSpeed.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtaDeviceOptions.VaneHorizontalDirection) {
				modifiedAirInfo.VaneHorizontal = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOptions.VaneHorizontalDirection.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtaDeviceOptions.VaneVerticalDirection) {
				modifiedAirInfo.VaneVertical = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOptions.VaneVerticalDirection.effectiveFlags;
			}
			else {
				gthat.log.error("setDevice(): Unsupported device option - please report this to the developer!");
				return;
			}

			modifiedAirInfo.HasPendingCommand = true;
			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetAta";
			const body = JSON.stringify(modifiedAirInfo);
			gthat.log.silly(`Request body: ${body}`);

			RootCas.addFile(Path.resolve(__dirname, "melcloud_intermediate.pem"));
			const agent = new Https.Agent({ ca: RootCas });

			Axios.post(url, body, {
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey,
					"content-type": "application/json"
				}, httpsAgent: agent
			}).then(function handleSetDeviceResponse(response) {
				if (!response) {
					gthat.log.error(`There was a problem receiving the response from: ${url}`);
					gthis.airInfo = null;
					return;
				}
				else {
					const statusCode = response.status;
					const statusText = response.statusText;
					gthat.log.debug(`Received response from: ${url} (status code: ${statusCode} - ${statusText})`);

					if (statusCode != HttpStatus.StatusCodes.OK) {
						gthis.airInfo = null;
						gthat.log.error(`Invalid HTTP status code (${statusCode} - ${statusText}). Changing device option failed!`);
						return;
					}

					const responseData = response.data;
					gthat.log.debug(`Response from cloud: ${JSON.stringify(responseData)}`);

					gthis.lastCommunication = responseData.LastCommunication;
					gthis.nextCommunication = responseData.NextCommunication;
					gthis.roomTemp = responseData.RoomTemperature;
					gthis.deviceOnline = !responseData.Offline;
					gthis.errorCode = responseData.ErrorCode;
					gthis.errorMessages = responseData.ErrorMessage;

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
						gthat.log.debug(`Dequeuing setDevice remote request for device option '${args[0].id}' with value '${args[1].value != undefined ? args[1].value : args[1]}'`);
						gthis.setDevice.apply(gthis, args);
					}
				}
			}).catch(error => {
				gthat.log.error(`There was a problem setting info to: ${url}`);
				gthat.log.error(error);

				gthis.currentDeviceSetRequests--;

				if (gthis.deviceSetRequestQueue.length) {
					const args = gthis.deviceSetRequestQueue.shift();
					gthat.log.debug(`Dequeuing setDevice remote request for device option '${args[0].id}' with value '${args[1].value != undefined ? args[1].value : args[1]}'`);
					gthis.setDevice.apply(gthis, args);
				}
			});
		}
		else {
			gthat.log.debug(`Queueing setDevice remote request for '${deviceOption.id}' with value '${value.value != undefined ? value.value : value}'...`);
			gthis.deviceSetRequestQueue.push(arguments);
		}
	}

	verifyDeviceOptionValue(deviceOption, value, gthis) {
		switch (deviceOption) {
			case commonDefines.AtaDeviceOptions.FanSpeed:
				if (value > gthis.numberOfFanSpeeds) {
					gthat.log.warn(`Fan speed limited to ${gthis.numberOfFanSpeeds} because device can't handle more than that!`);
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
					gthat.log.warn(`SetTemperature limited to ${min} because device can't handle lower than that!`);
				}
				else if (value > max) {
					value = max;
					gthat.log.warn(`SetTemperature limited to ${max} because device can't handle more than that!`);
				}
				return value;
			case commonDefines.AtaDeviceOptions.VaneHorizontalDirection:
				if (value < 0 || value > 5 && value != 8 && value != 12) {
					gthat.log.warn(`VaneHorizontalDirection: unsupported value '${value}' - falling back to '0'!`);
					value = 0;
				}
				return value;
			case commonDefines.AtaDeviceOptions.VaneVerticalDirection:
				if (value < 0 || value > 5 && value != 7) {
					gthat.log.warn(`VaneVerticalDirection: unsupported value '${value}' - falling back to '0'!`);
					value = 0;
				}
				return value;
			case commonDefines.AtaDeviceOptions.TargetHeatingCoolingState:
				if (value == commonDefines.AtaDeviceOperationModes.COOL.value && !gthis.canCool) {
					gthat.log.warn(`TargetHeatingCoolingState: unsupported value '${value}'. Device can not cool!`);
				}
				else if (value == commonDefines.AtaDeviceOperationModes.DRY.value && !gthis.canDry) {
					gthat.log.warn(`TargetHeatingCoolingState: unsupported value '${value}'. Device can not dry!`);
				}
				else if (value == commonDefines.AtaDeviceOperationModes.HEAT.value && !gthis.canHeat) {
					gthat.log.warn(`TargetHeatingCoolingState: unsupported value '${value}'. Device can not heat!`);
				}
				return value; // don't modify the value as the correct value cant't be known here
			default: return value;
		}
	}

	async getPowerConsumptionReport(isCumulatedReport = false) {
		// eslint-disable-next-line no-async-promise-executor
		return /** @type {Promise<void>} */(new Promise(async (resolve, reject) => {
			const gthis = this;
			gthat.log.debug(`Getting power consumption report for ${gthis.id} (${gthis.name})`);

			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/EnergyCost/Report";
			const body = JSON.stringify(await this.buildPowerConsumptionReportRequestBody(isCumulatedReport));
			gthat.log.silly(`Request body: ${body}`);

			if (body == "{}") return; // creating body failed or was provided dates were invalid

			RootCas.addFile(Path.resolve(__dirname, "melcloud_intermediate.pem"));
			const agent = new Https.Agent({ ca: RootCas });

			Axios.post(url, body, {
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey,
					"content-type": "application/json"
				}, httpsAgent: agent
			}).then(function handleConsumptionReportResponse(response) {
				if (!response) {
					gthat.log.error(`There was a problem receiving the response from: ${url}`);
					reject();
				}
				else {
					const statusCode = response.status;
					const statusText = response.statusText;
					gthat.log.debug(`Received response from: ${url} (status code: ${statusCode} - ${statusText})`);

					if (statusCode != HttpStatus.StatusCodes.OK) {
						gthat.log.error(`Invalid HTTP status code (${statusCode} - ${statusText}). Getting power consumption report failed!`);
						reject();
						return;
					}

					const responseData = response.data;
					gthat.log.debug(`Response from cloud: ${JSON.stringify(responseData)}`);

					// only save date portion of timestamp without the empty time
					let timestampPos = responseData.FromDate.indexOf("T");
					if (timestampPos != -1) {
						gthis.powerConsumptionReportStartDate = responseData.FromDate.substring(0, timestampPos);
					}
					else {
						gthis.powerConsumptionReportStartDate = responseData.FromDate;
					}

					timestampPos = responseData.ToDate.indexOf("T");
					if (timestampPos != -1) {
						gthis.powerConsumptionReportEndDate = responseData.ToDate.substring(0, timestampPos);
					}
					else {
						gthis.powerConsumptionReportEndDate = responseData.ToDate;
					}

					// round all consumption values to 3 digits
					gthis.totalPowerConsumptionCooling = responseData.TotalCoolingConsumed;
					gthis.totalPowerConsumptionHeating = responseData.TotalHeatingConsumed;
					gthis.totalPowerConsumptionAuto = responseData.TotalAutoConsumed;
					gthis.totalPowerConsumptionDry = responseData.TotalDryConsumed;
					gthis.totalPowerConsumptionVent = responseData.TotalFanConsumed;
					gthis.totalPowerConsumptionMinutes = responseData.TotalMinutes;

					gthis.rawPowerConsumptionReportData = responseData;
					gthis.linkedDevicesIncludedInArregateEnergyReport = responseData.LinkedDevicesIncludedInArregateEnergyReport;

					gthis.UpdateReportData();
					resolve();
				}
			}).catch(error => {
				gthat.log.error(`There was a problem getting power consumption report from: ${url}`);
				gthat.log.error(`Error: ${error}`);
				reject();
			});
		}));
	}

	async buildPowerConsumptionReportRequestBody(isCumulatedReport = false) {
		const requestBody = {};

		const startStateId = isCumulatedReport ? `${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.CommonDeviceStateIDs.PowerConsumptionReportStartDate}` : `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.CommonDeviceStateIDs.PowerConsumptionReportStartDate}`;
		const startDateObj = await gthat.getStateAsync(startStateId);
		let startDate = (startDateObj == null || startDateObj.val == null) ? "" : startDateObj.val;

		const endStateId = isCumulatedReport ? `${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.CommonDeviceStateIDs.PowerConsumptionReportEndDate}` : `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.CommonDeviceStateIDs.PowerConsumptionReportEndDate}`;
		const endDateObj = await gthat.getStateAsync(endStateId);
		let endDate = (endDateObj == null || endDateObj.val == null) ? "" : endDateObj.val;

		if (startDate == "") {
			gthat.log.warn("No valid start date was provided (format: YYYY-MM-DD). Defaulting to 6 months prior.");
			const d = new Date();
			d.setMonth(d.getMonth() - 6);
			startDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		}

		const parsedStartDate = startDate.split("-");
		if (parsedStartDate.length != 3 || parsedStartDate[0].length != 4 || parsedStartDate[1].length > 2 || parsedStartDate[2].length > 2) {
			gthat.log.warn("No valid start date was provided (format: YYYY-MM-DD). Defaulting to 6 months prior.");
			const d = new Date();
			d.setMonth(d.getMonth() - 6);
			startDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		}

		if (endDate == "") {
			gthat.log.warn("No valid end date was provided (format: YYYY-MM-DD). Defaulting to today.");
			const d = new Date();
			endDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		}

		const parsedEndDate = endDate.split("-");
		if (parsedEndDate.length != 3 || parsedEndDate[0].length != 4 || parsedEndDate[1].length > 2 || parsedEndDate[2].length > 2) {
			gthat.log.warn("No valid end date was provided (format: YYYY-MM-DD). Defaulting to today.");
			const d = new Date();
			endDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		}

		requestBody.DeviceId = this.id;
		requestBody.FromDate = `${startDate}T00:00:00`;
		requestBody.ToDate = `${endDate}T00:00:00`;
		requestBody.UseCurrency = false;

		return requestBody;
	}

	async toggleTimerState(enableTimer) {
		// eslint-disable-next-line no-async-promise-executor
		return /** @type {Promise<void>} */(new Promise(async (resolve, reject) => {
			const gthis = this;
			gthat.log.debug(`${enableTimer ? `Enabling` : `Disabling`} timer for ${gthis.id} (${gthis.name})`);

			// Step 1: Get current timer infos
			const getTimerUrl = `https://app.melcloud.com/Mitsubishi.Wifi.Client/Timer/Get2?deviceId=${gthis.id}`;

			RootCas.addFile(Path.resolve(__dirname, "melcloud_intermediate.pem"));
			const agent = new Https.Agent({ ca: RootCas });

			Axios.get(getTimerUrl, {
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey
				}, httpsAgent: agent
			}).then(function handleGetTimerResponse(response) {
				if (!response) {
					gthat.log.error(`There was a problem receiving the response from: ${getTimerUrl}`);
					reject();
				}
				else {
					const statusCode = response.status;
					const statusText = response.statusText;
					gthat.log.debug(`Received response from: ${getTimerUrl} (status code: ${statusCode} - ${statusText})`);

					if (statusCode != HttpStatus.StatusCodes.OK) {
						gthat.log.error(`Invalid HTTP status code (${statusCode} - ${statusText}). Getting timer information failed!`);
						reject();
						return;
					}

					const responseData = response.data;
					gthat.log.debug(`Response from cloud: ${JSON.stringify(responseData)}`);

					gthis.timerToggle = responseData.Enabled;
					gthat.setStateChangedAsync(`${commonDefines.AdapterDatapointIDs.Devices}.${gthis.id}.${commonDefines.AdapterDatapointIDs.Control}.${commonDefines.AtaDeviceStateIDs.TimerToogle}`, gthis.timerToggle, true);

					if (enableTimer == gthis.timerToggle) {
						gthat.log.warn(`Timer for ${gthis.id} (${gthis.name}) is already ${enableTimer ? `enabled` : `disabled`}. Ignoring request.`);
						resolve();
						return;
					}

					if (responseData.Seasons[0].Events.length == 0) {
						gthat.log.warn(`No timer events for ${gthis.id} (${gthis.name}) set. Please set them first in the MelCloud app/website before toggling it here. Ignoring request.`);
						resolve();
						return;
					}

					// Step 2: Set desired timer state with infos retrieved from step 1
					const toggleRequest = response.data;
					toggleRequest.Devices = gthis.id;
					toggleRequest.TimerEnabled = enableTimer;
					toggleRequest.SkipPage1 = true;

					const setTimerUrl = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Timer/SetAta2";
					const body = JSON.stringify(toggleRequest);
					gthat.log.silly(`Request body: ${body}`);

					RootCas.addFile(Path.resolve(__dirname, "melcloud_intermediate.pem"));
					const agent = new Https.Agent({ ca: RootCas });

					Axios.post(setTimerUrl, body, {
						headers: {
							"X-MitsContextKey": gthis.platform.contextKey,
							"content-type": "application/json"
						}, httpsAgent: agent
					}).then(function handleToggleTimerResponse(response) {
						if (!response) {
							gthat.log.error(`There was a problem receiving the response from: ${setTimerUrl}`);
						}
						else {
							const statusCode = response.status;
							const statusText = response.statusText;
							gthat.log.debug(`Received response from: ${setTimerUrl} (status code: ${statusCode} - ${statusText})`);

							if (statusCode != HttpStatus.StatusCodes.OK) {
								gthat.log.error(`Invalid HTTP status code (${statusCode} - ${statusText}). Toggling timer failed!`);
								return;
							}

							const responseData = response.data;
							gthat.log.debug(`Response from cloud: ${JSON.stringify(responseData)}`);

							if (responseData.Success == true) {
								gthis.timerToggle = enableTimer;
								gthat.setStateChangedAsync(`${commonDefines.AdapterDatapointIDs.Devices}.${gthis.id}.${commonDefines.AdapterDatapointIDs.Control}.${commonDefines.AtaDeviceStateIDs.TimerToogle}`, gthis.timerToggle, true);
							}
							else {
								gthat.log.error(`${enableTimer ? `Enabling` : `Disabling`} timer failed with error code ${responseData.Data.ErrorCode}`);
								reject();
							}
						}
					}).catch(error => {
						gthat.log.error(`There was a problem setting timer to: ${setTimerUrl}`);
						gthat.log.error(error);
					});

					resolve();
				}
			}).catch(error => {
				gthat.log.error(`There was a problem getting timer information from: ${getTimerUrl}`);
				gthat.log.error(`Error: ${error}`);
				reject();
			});
		}));
	}
}

exports.MelCloudDevice = MelcloudAtaDevice;