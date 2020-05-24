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
		this.lastCommunication = null;
		this.nextCommunication = null;

		// Control
		this.power = false;
		this.operationMode = commonDefines.DeviceOperationModes.UNDEF.value;
		this.targetTemp = 0;
	}

	async Save() {
		//// INFO
		const infoPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Info + ".";
		
		await gthat.setObjectNotExistsAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceName, {
			type: "state",
			common: {
				name: "Device name",
				type: "string",
				role: "value",
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

		//// END INFO

		//// CONTROL
		const controlPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Control  + ".";

		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.Power, {
			type: "state",
			common: {
				name: "Power",
				type: "boolean",
				role: "switch",
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
				"states": {
					0: "OFF",
					1: "HEAT",
					3: "COOL",
					8: "AUTO"
				}
			},
			native: {}
		});
		await gthat.setStateAsync(controlPrefix + commonDefines.AdapterStateIDs.Mode, this.operationMode, true);

		await gthat.setObjectNotExistsAsync(controlPrefix + commonDefines.AdapterStateIDs.TargetTemp, {
			type: "state",
			common: {
				name: "Target temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: true,		
				desc: "Target temperature of the device"
			},
			native: {}
		});
		await gthat.setStateAsync(controlPrefix + commonDefines.AdapterStateIDs.TargetTemp, this.targetTemp, true);

		//// END CONTROL

		gthat.log.debug("Saved device: " + this.id + " (" + this.name + ")");
	}

	getDeviceInfo(callback, deviceOption, value) {
		if (this.airInfo != null) {
			gthat.log.debug("Data already available for: " + this.id + " (" + this.name + ")");
			/*if (this.airInfoExecutionPending.length) {
				var args = this.airInfoExecutionPending.shift()
				this.log("Dequeuing remote request for. " + args[3].name + " - " + args[1].displayName);
				this.proxyAirInfo.apply(this, args);
			}*/
			return;
		}

		gthat.log.debug("Getting device data for: " + this.id + " (" + this.name + ")");

		//if (this.currentAirInfoExecution < 1) {
		//this.airInfoRequestSent = true;
		//this.currentAirInfoExecution++;
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
			//gthis.currentAirInfoExecution--;
			/*if (gthis.airInfoExecutionPending.length) {
				var args = that.airInfoExecutionPending.shift()
				gthat.log.debug("Dequeuing remote request for: " + args[3].name + " - " + args[1].displayName);
				gthis.proxyAirInfo.apply(gthis, args);
			}*/
		});
		/*} else {
			this.log("Queing remote request data for: " + homebridgeAccessory.name + " - " + characteristic.displayName);
			this.airInfoExecutionPending.push(arguments);
		}*/
	}

	setDevice(deviceOption, value) {
		gthat.log.debug("Changing device option '" + deviceOption.id + "' to '" + (value.value ? value.value : value) + "'...");
		const r = gthis.airInfo;

		if (deviceOption == commonDefines.DeviceOptions.TargetHeatingCoolingState) {
			switch (value) {
				case commonDefines.DeviceOperationModes.OFF:
					r.Power = commonDefines.DeviceOperationModes.OFF.power;
					r.EffectiveFlags = commonDefines.DeviceOperationModes.OFF.effectiveFlags;
					break;
				case commonDefines.DeviceOperationModes.HEAT:
					r.Power = commonDefines.DeviceOperationModes.HEAT.power;
					r.OperationMode = commonDefines.DeviceOperationModes.HEAT.value;
					r.EffectiveFlags = commonDefines.DeviceOperationModes.HEAT.effectiveFlags;
					break;
				case commonDefines.DeviceOperationModes.COOL:
					r.Power = commonDefines.DeviceOperationModes.COOL.power;
					r.OperationMode = commonDefines.DeviceOperationModes.COOL.value;
					r.EffectiveFlags = commonDefines.DeviceOperationModes.COOL.effectiveFlags;
					break;
				case commonDefines.DeviceOperationModes.AUTO:
					r.Power = commonDefines.DeviceOperationModes.AUTO.power;
					r.OperationMode = commonDefines.DeviceOperationModes.AUTO.value;
					r.EffectiveFlags = commonDefines.DeviceOperationModes.AUTO.effectiveFlags;
					break;
				default:
					return;
			}
		}
		else if (deviceOption == commonDefines.DeviceOptions.TargetTemperature) {
			r.SetTemperature = value;
			r.EffectiveFlags = commonDefines.DeviceOptions.TargetTemperature.effectiveFlags;
		}/*
		else if (deviceOption == commonDefines.DeviceOptions.TemperatureDisplayUnits) {
			var UseFahrenheit = false;
			if (value == Characteristic.TemperatureDisplayUnits.FAHRENHEIT)
				UseFahrenheit = true;
			homebridgeAccessory.platform.updateApplicationOptions(UseFahrenheit);
			gthis.platform.useFahrenheit = UseFahrenheit;
			callback();
			return;
		}*/
		else if (deviceOption == commonDefines.DeviceOptions.RotationSpeed) {
			r.SetFanSpeed = (value / 100.0 * r.NumberOfFanSpeeds).toFixed(0);
			r.EffectiveFlags = commonDefines.DeviceOptions.RotationSpeed.effectiveFlags;
		}
		else if (deviceOption == commonDefines.DeviceOptions.TargetHorizontalTiltAngle) {
			r.VaneHorizontal = ((value + 90.0) / 45.0 + 1.0).toFixed(0);
			r.EffectiveFlags = commonDefines.DeviceOptions.TargetHorizontalTiltAngle.effectiveFlags;
		}
		else if (deviceOption == commonDefines.DeviceOptions.TargetVerticalTiltAngle) {
			r.VaneVertical = ((value + 90.0) / 45.0 + 1.0).toFixed(0);
			r.EffectiveFlags = commonDefines.DeviceOptions.TargetVerticalTiltAngle.effectiveFlags;
		}
		else {
			return;
		}
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
				// TODO SetFanSpeed etc...
				gthis.Save(); // write updated values
			}
		});
	}
}

exports.MelCloudDevice = MelcloudDevice;