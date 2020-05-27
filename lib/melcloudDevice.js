"use strict";

const request = require("request");
const commonDefines = require("./commonDefines");
const JSONHelper = require("./jsonHelper");

let gthat = null; // pointer to "this" from main.js/MelCloud instance
let gthis = null; // pointer to "this" from MelcloudDevice

class MelcloudDevice {
	constructor(that) {
		gthat = that;
		gthis = this;
		this.platform = null;
		this.airInfo = null;

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

		//// INFO
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
				desc: "MELCloud device name"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceName, this.name, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.SerialNumber, {
			type: "state",
			common: {
				name: "Serial number",
				type: "string",
				role: "value",
				read: true,
				write: false,
				desc: "Serial number of the device"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.SerialNumber, this.serialNumber, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MacAddress, {
			type: "state",
			common: {
				name: "MAC address",
				type: "string",
				role: "info.mac",
				read: true,
				write: false,
				desc: "MAC address of the device"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.MacAddress, this.macAddress, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.BuildingId, {
			type: "state",
			common: {
				name: "Building ID",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "MELCloud building ID"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.BuildingId, this.buildingId, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.FloorId, {
			type: "state",
			common: {
				name: "Floor ID",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "MELCloud floor ID"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.FloorId, this.floorId, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.CanCool, {
			type: "state",
			common: {
				name: "Ability to cool",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				desc: "Ability to cool"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.CanCool, this.canCool, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.CanHeat, {
			type: "state",
			common: {
				name: "Ability to heat",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				desc: "Ability to heat"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.CanHeat, this.canHeat, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.CanDry, {
			type: "state",
			common: {
				name: "Ability to dry",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				desc: "Ability to dry"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.CanDry, this.canDry, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempCoolDry, {
			type: "state",
			common: {
				name: "Minimal temperature (Cool/Dry)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				desc: "Minimal temperature in cool/dry-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempCoolDry, this.minTempCoolDry, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempCoolDry, {
			type: "state",
			common: {
				name: "Maximal temperature (Cool/Dry)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				desc: "Maximal temperature in cool/dry-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempCoolDry, this.maxTempCoolDry, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempHeat, {
			type: "state",
			common: {
				name: "Minimal temperature (Heat)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				desc: "Minimal temperature in heat-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempHeat, this.minTempHeat, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempHeat, {
			type: "state",
			common: {
				name: "Maximal temperature (Heat)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				desc: "Maximal temperature in heat-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempHeat, this.maxTempHeat, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempAuto, {
			type: "state",
			common: {
				name: "Minimal Temperature (Auto)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				desc: "Minimal temperature in auto-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.MinTempAuto, this.minTempAuto, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempAuto, {
			type: "state",
			common: {
				name: "Maximal Temperature (Auto)",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				desc: "Maximal temperature in auto-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.MaxTempAuto, this.maxTempAuto, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.RoomTemp, {
			type: "state",
			common: {
				name: "Room temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				desc: "Maximal temperature in auto-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.RoomTemp, this.roomTemp, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.FanSpeedAuto, {
			type: "state",
			common: {
				name: "Fan speed (while in auto mode)",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Actual fan speed when fan is set to auto mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.FanSpeedAuto, this.actualFanSpeed, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.NumberOfFanSpeeds, {
			type: "state",
			common: {
				name: "Number of fan speeds",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Number of available fan speeds"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.NumberOfFanSpeeds, this.numberOfFanSpeeds, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.LastCommunication, {
			type: "state",
			common: {
				name: "Last communication",
				type: "number",
				role: "date",
				read: true,
				write: false,
				desc: "Last communication date/time (MELCloud to device)"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.LastCommunication, this.lastCommunication, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.NextCommunication, {
			type: "state",
			common: {
				name: "Next communication",
				type: "number",
				role: "date",
				read: true,
				write: false,
				desc: "Next communication date/time (MELCloud to device)"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.NextCommunication, this.nextCommunication, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceOnline, {
			type: "state",
			common: {
				name: "Is device online",
				type: "boolean",
				role: "indicator.reachable",
				read: true,
				write: false,
				desc: "Indicates if device is reachable"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceOnline, this.deviceOnline, true);

		//// END INFO

		//// CONTROL
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
				desc: "Power switch"
			},
			native: {}
		});
		await gthat.setStateAsync(controlPrefix + commonDefines.AdapterStateIDs.Power, this.power, true);

		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.Mode, {
			type: "state",
			common: {
				name: "Operation mode",
				type: "number",
				role: "value",
				read: true,
				write: true,
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
		await gthat.setStateAsync(controlPrefix + commonDefines.AdapterStateIDs.Mode, this.operationMode, true);

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
				desc: "Target temperature of the device"
			},
			native: {}
		});
		await gthat.setStateAsync(controlPrefix + commonDefines.AdapterStateIDs.TargetTemp, this.targetTemp, true);

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
				desc: "Current fan speed of the device (while in manual mode)"
			},
			native: {}
		});
		await gthat.setStateAsync(controlPrefix + commonDefines.AdapterStateIDs.FanSpeedManual, this.fanSpeed, true);

		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.VaneVerticalDirection, {
			type: "state",
			common: {
				name: "Vane vertical direction",
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
					5: "MAX",
					7: "SWING"
				},
				read: true,
				write: true,
				desc: "Current vertical direction of the device's vane"
			},
			native: {}
		});
		await gthat.setStateAsync(controlPrefix + commonDefines.AdapterStateIDs.VaneVerticalDirection, this.vaneVerticalDirection, true);

		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.VaneHorizontalDirection, {
			type: "state",
			common: {
				name: "Vane horizontal direction",
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
					5: "MAX",
					12: "SWING"
				},
				read: true,
				write: true,
				desc: "Current horizontal direction of the device's vane"
			},
			native: {}
		});
		await gthat.setStateAsync(controlPrefix + commonDefines.AdapterStateIDs.VaneHorizontalDirection, this.vaneHorizontalDirection, true);
		//// END CONTROL

		gthat.log.debug("Created and saved device " + this.id + " (" + this.name + ")");
	}

	// Only writes changed data into the DB
	async Update() {
		//// INFO
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
		//// END INFO

		//// CONTROL
		const controlPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Control + ".";
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.Power, this.power, true);
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.Mode, this.operationMode, true);
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.TargetTemp, this.targetTemp, true);
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.FanSpeedManual, this.fanSpeed, true);
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.VaneVerticalDirection, this.vaneVerticalDirection, true);
		await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.VaneHorizontalDirection, this.vaneHorizontalDirection, true);
		//// END CONTROL

		gthat.log.debug("Updated device data for device " + this.id + " (" + this.name + ")");
	}

	getDeviceInfo(callback, deviceOption, value) {
		if (this.airInfo != null) {
			gthat.log.debug("Data already available for: " + this.id + " (" + this.name + ")");
			callback && callback(deviceOption, value);
			return;
		}

		gthat.log.info("Getting device data for " + this.id + " (" + this.name + ")");

		const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/Get?id=" + this.id + "&buildingID=" + this.buildingId;
		const method = "get";

		request({
			url: url,
			method: method,
			headers: {
				"X-MitsContextKey": this.platform.contextKey
			}
		}, function (err, response) {
			if (err || response.body.search("<!DOCTYPE html>") != -1) {
				gthat.log.error("There was a problem getting info from: " + url);
				gthat.log.error("Error: " + err);
				gthis.airInfo = null;
			}
			else {
				const responseBoy = response.body;
				gthis.airInfo = JSONHelper.JSONHelper.ParseCloudResponse(responseBoy, gthat);

				// Cache airInfo data for 1 minute
				setTimeout(function () {
					gthis.airInfo = null;
				}, 60 * 1000);

				callback && callback(deviceOption, value);
			}
		});
	}

	setDevice(deviceOption, value) {
		gthat.log.info("Changing device option '" + deviceOption.id + "' to '" +
			(value.value != undefined ? value.value : (value.power != undefined ? value.power : value)) + "'...");
		const r = gthis.airInfo;

		value = gthis.verifyDeviceOptionValue(deviceOption, value);

		if (deviceOption == commonDefines.DeviceOptions.PowerState) {
			switch (value) {
				case commonDefines.DevicePowerStates.OFF:
					r.Power = commonDefines.DevicePowerStates.OFF.power;
					r.EffectiveFlags = commonDefines.DevicePowerStates.OFF.effectiveFlags;
					break;
				case commonDefines.DevicePowerStates.ON:
					r.Power = commonDefines.DevicePowerStates.ON.power;
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

		request({
			url: url,
			method: method,
			body: body,
			headers: {
				"X-MitsContextKey": gthis.platform.contextKey,
				"content-type": "application/json"
			}
		}, function (err, response) {
			if (err) {
				gthat.log.error("There was a problem setting info to: " + url);
				gthat.log.error(err);
			}
			else {
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
				gthis.Update(); // write updated values
			}
		});
	}

	verifyDeviceOptionValue(deviceOption, value) {
		switch (deviceOption) {
			case commonDefines.DeviceOptions.FanSpeed:
				if (value > gthis.numberOfFanSpeeds) {
					gthat.log.info("Fan speed limited to " + gthis.numberOfFanSpeeds + " because device can't handle more than that!");
					return gthis.numberOfFanSpeeds;
				}
				return value;
			case commonDefines.DeviceOptions.TargetTemperature:
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
					gthat.log.info("SetTemperature limited to " + min + " because device can't handle lower than that!");
				}
				else if (value > max) {
					value = max;
					gthat.log.info("SetTemperature limited to " + max + " because device can't handle more than that!");
				}
				return value;
			default: return value;
		}
	}
}

exports.MelCloudDevice = MelcloudDevice;