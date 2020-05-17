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

		// Control
		this.power = false;
		this.operationMode = commonDefines.DeviceOperationModes.UNDEF;
		this.targetTemp = 0;
	}

	async Save() {
		//// INFO
		const infoPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + ".info.";
		await gthat.setObjectNotExistsAsync(infoPrefix + "deviceName", {
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
		await gthat.setStateAsync(infoPrefix + "deviceName", this.name, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "serialNumber", {
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
		await gthat.setStateAsync(infoPrefix + "serialNumber", this.serialNumber, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "buildingId", {
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
		await gthat.setStateAsync(infoPrefix + "buildingId", this.buildingId, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "floorId", {
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
		await gthat.setStateAsync(infoPrefix + "floorId", this.floorId, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "canCool", {
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
		await gthat.setStateAsync(infoPrefix + "canCool", this.canCool, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "canHeat", {
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
		await gthat.setStateAsync(infoPrefix + "canHeat", this.canHeat, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "canDry", {
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
		await gthat.setStateAsync(infoPrefix + "canDry", this.canDry, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "minTempCoolDry", {
			type: "state",
			common: {
				name: "MinTempCoolDry",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Minimal temperature in cool/dry-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "minTempCoolDry", this.minTempCoolDry, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "maxTempCoolDry", {
			type: "state",
			common: {
				name: "MaxTempCoolDry",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Maximal temperature in cool/dry-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "maxTempCoolDry", this.maxTempCoolDry, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "minTempHeat", {
			type: "state",
			common: {
				name: "MinTempHeat",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Minimal temperature in heat-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "minTempHeat", this.minTempHeat, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "maxTempHeat", {
			type: "state",
			common: {
				name: "MaxTempHeat",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Maximal temperature in heat-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "maxTempHeat", this.maxTempHeat, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "minTempAuto", {
			type: "state",
			common: {
				name: "MinTempAuto",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Minimal temperature in auto-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "minTempAuto", this.minTempAuto, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "maxTempAuto", {
			type: "state",
			common: {
				name: "MaxTempAuto",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Maximal temperature in auto-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "maxTempAuto", this.maxTempAuto, true);

		//// END INFO

		//// CONTROL
		const controlPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + ".control.";

		await gthat.setObjectNotExistsAsync(controlPrefix + "power", {
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
		await gthat.setStateAsync(controlPrefix + "power", this.power, true);

		await gthat.setObjectNotExistsAsync(controlPrefix + "mode", {
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
		await gthat.setStateAsync(controlPrefix + "mode", this.operationMode, true);

		await gthat.setObjectNotExistsAsync(controlPrefix + "targetTemp", {
			type: "state",
			common: {
				name: "Target temperature",
				type: "number",
				role: "value",
				read: true,
				write: true,		
				desc: "Target temperature of the device"
			},
			native: {}
		});
		await gthat.setStateAsync(controlPrefix + "targetTemp", this.targetTemp, true);

		//// END CONTROL

		gthat.log.debug("Saved device: " + this.id + " (" + this.name + ")");
	}

	getDeviceInfo(callback) {
		if (this.airInfo != null) {
			gthat.log.debug("Data already available for: " + this.id + " (" + this.name + ")");
			//operation(callback, characteristic, service, homebridgeAccessory, value);
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
				callback();
			}
			else {
				const responseBoy = response.body;
				gthis.airInfo = JSONHelper.JSONHelper.ParseCloudResponse(responseBoy, gthat);
				//operation(callback, characteristic, service, homebridgeAccessory, value);

				// Cache airInfo data for 1 minutes
				setTimeout(function () {
					gthis.airInfo = null;
				}, 60 * 1000);
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

	setDevice(callback, deviceOption, value) {
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
					callback();
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
			callback();
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
				JSONHelper.JSONHelper.ParseCloudResponse(responseBoy, gthat);				
			}
			callback();
		});
	}
}

exports.MelCloudDevice = MelcloudDevice;