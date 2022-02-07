"use strict";

const Axios = require("axios").default;
const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");

const operationModes = [commonDefines.DeviceOperationModes.HEAT.id, commonDefines.DeviceOperationModes.COOL.id, commonDefines.DeviceOperationModes.AUTO.id, commonDefines.DeviceOperationModes.VENT.id, commonDefines.DeviceOperationModes.DRY.id];

const deviceType = commonDefines.DeviceTypes.AirToWater;

let gthat = null; // pointer to "this" from main.js/MelCloud instance

class MelcloudAtwDevice {
	constructor(that) {
		gthat = that;
		this.platform = null;
		this.airInfo = null;
		this.deviceInfoRequestQueue = [];
		this.currentDeviceInfoRequests = 0;
		this.deviceSetRequestQueue = [];
		this.currentDeviceSetRequests = 0;
		this.hasBeenCreated = false;

		// Info
		this.id = -1;
		this.name = "";
		this.serialNumber = "";
		this.macAddress = "";
		this.buildingId = -1;
		this.floorId = -1;
		this.roomTemperatureZone1 = -1;
		this.roomTemperatureZone2 = -1;
		this.mixingTankWaterTemperature = -1;
		this.condensingTemperature = -1;
		this.lastCommunication = null;
		this.nextCommunication = null;
		this.deviceOnline = false;

		// Control
		this.power = false;
		this.operationMode = commonDefines.DeviceOperationModes.UNDEF.value;
	}

	// Creates all necessery states and channels and writes the values into the DB
	async CreateAndSave() {
		// check if object has already been created
		if (this.hasBeenCreated) return;

		const devicePrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id;
		await gthat.extendObjectAsync(devicePrefix, {
			type: "channel",
			common: {
				name: "Device " + this.id + " (" + this.name + ")"
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceName, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceType, {
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
				def: deviceType,
				desc: "MELCloud device type"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.SerialNumber, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.MacAddress, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.BuildingId, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.FloorId, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.RoomTemperatureZone1, {
			type: "state",
			common: {
				name: "Room temperature zone 1",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.roomTemperatureZone1,
				desc: "Room temperature in zone 1"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.RoomTemperatureZone2, {
			type: "state",
			common: {
				name: "Room temperature zone 2",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.roomTemperatureZone2,
				desc: "Room temperature in zone 2"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.MixingTankWaterTemperature, {
			type: "state",
			common: {
				name: "Mixing tank temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.mixingTankWaterTemperature,
				desc: "Mixing tank temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.CondensingTemperature, {
			type: "state",
			common: {
				name: "Condensing temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.condensingTemperature,
				desc: "Condensing temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.LastCommunication, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.NextCommunication, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceOnline, {
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

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AdapterStateIDs.Power, {
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

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AdapterStateIDs.Mode, {
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
		//#endregion

		gthat.log.debug("Created and saved device " + this.id + " (" + this.name + ")");
		this.hasBeenCreated = true;
	}

	// Only writes changed device data into the DB
	async UpdateDeviceData(deviceOption = null) {
		//#region INFO
		const infoPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Info + ".";

		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceName, this.name, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.SerialNumber, this.serialNumber, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.MacAddress, this.macAddress, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.BuildingId, this.buildingId, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.FloorId, this.floorId, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.RoomTemperatureZone1, this.roomTemperatureZone1, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.RoomTemperatureZone2, this.roomTemperatureZone2, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.MixingTankWaterTemperature, this.mixingTankWaterTemperature, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.CondensingTemperature, this.condensingTemperature, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.LastCommunication, this.lastCommunication, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.NextCommunication, this.nextCommunication, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AdapterStateIDs.DeviceOnline, this.deviceOnline, true);
		//#endregion

		//#region CONTROL
		const controlPrefix = commonDefines.AdapterDatapointIDs.Devices + "." + this.id + "." + commonDefines.AdapterDatapointIDs.Control + ".";

		switch (deviceOption) {
			case commonDefines.DeviceOptions.PowerState:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.Power, this.power, true);
				break;
			default:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.Power, this.power, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AdapterStateIDs.Mode, this.operationMode, true);
				break;
		}
		//#endregion

		gthat.log.debug("Updated device data for device " + this.id + " (" + this.name + ")");
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
						case commonDefines.DeviceOptions.PowerState:
							gthis.power = responseData.Power;
							break;
						case commonDefines.DeviceOptions.TargetHeatingCoolingState:
							gthis.operationMode = responseData.OperationMode;
							break;
						case commonDefines.DeviceOptions.TargetTemperature:
							gthis.targetTemp = responseData.SetTemperature;
							break;
						case commonDefines.DeviceOptions.FanSpeed:
							gthis.fanSpeed = responseData.SetFanSpeed;
							break;
						case commonDefines.DeviceOptions.VaneHorizontalDirection:
							gthis.vaneHorizontalDirection = responseData.VaneHorizontal;
							break;
						case commonDefines.DeviceOptions.VaneVerticalDirection:
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
}

exports.MelCloudDevice = MelcloudAtwDevice;