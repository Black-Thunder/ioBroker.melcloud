"use strict";

const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");
const Axios = require("axios").default;

let gthat = null; // pointer to "this" from main.js/MelCloud instance

class MelcloudErvDevice {
	constructor(that) {
		gthat = that;
		this.platform = null;
		this.airInfo = null;
		this.deviceInfoRequestQueue = [];
		this.currentDeviceInfoRequests = 0;
		this.deviceSetRequestQueue = [];
		this.currentDeviceSetRequests = 0;
		this.hasBeenCreated = false;
		this.deviceType = commonDefines.DeviceTypes.EnergyRecoveryVentilation;

		// Info
		this.id = -1;
		this.name = "";
		this.serialNumber = "";
		this.macAddress = "";
		this.buildingId = -1;
		this.floorId = -1;
		this.minTempCoolDry = 0;
		this.maxTempCoolDry = 0;
		this.minTempHeat = 0;
		this.maxTempHeat = 0;
		this.minTempAuto = 0;
		this.maxTempAuto = 0;
		this.roomTemp = 0;
		this.outdoorTemp = 0;
		this.actualSupplyFanSpeed = 0;
		this.actualExhaustFanSpeed = 0;
		this.numberOfFanSpeeds = 0;
		this.lastCommunication = null;
		this.nextCommunication = null;
		this.deviceOnline = false;
		this.deviceHasError = false;
		this.errorMessages = "";
		this.errorCode = 8000;

		// Control
		this.power = false;
		this.operationMode = commonDefines.ErvDeviceOperationModes.UNDEF.value;
		this.fanSpeed = 0;
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
				name: `ERV Device ${this.id} (${this.name})`
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
					1: "Air to water heat pump",
					3: "Energy-Recovery-Ventilation"
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MinTempCoolDry, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MaxTempCoolDry, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MinTempHeat, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MaxTempHeat, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MinTempAuto, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MaxTempAuto, {
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

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.RoomTemp, {
			type: "state",
			common: {
				name: "Room temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.roomTemp,
				desc: "Current room temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.OutdoorTemp, {
			type: "state",
			common: {
				name: "Outdoor temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.outdoorTemp,
				desc: "Current outdoor temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.SupplyFanSpeed, {
			type: "state",
			common: {
				name: "Supply fan speed",
				type: "number",
				role: "value",
				read: true,
				write: false,
				def: this.actualSupplyFanSpeed,
				desc: "Actual supply fan speed"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.ExhaustFanSpeed, {
			type: "state",
			common: {
				name: "Exhaust fan speed",
				type: "number",
				role: "value",
				read: true,
				write: false,
				def: this.actualExhaustFanSpeed,
				desc: "Actual exhaust fan speed"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.NumberOfFanSpeeds, {
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

		await gthat.extendObjectAsync(controlPrefix + commonDefines.ErvDeviceStateIDs.Power, {
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

		await gthat.extendObjectAsync(controlPrefix + commonDefines.ErvDeviceStateIDs.Mode, {
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
					0: "Recovery",
					1: "Bypass",
					2: "Auto"
				}
			},
			native: {}
		});

		await gthat.extendObjectAsync(controlPrefix + commonDefines.ErvDeviceStateIDs.FanSpeed, {
			type: "state",
			common: {
				name: "Fan speed",
				type: "number",
				role: "value",
				min: 0,
				max: 5,
				states: {
					0: "Auto",
					1: "Silent",
					2: "1",
					3: "2",
					4: "3",
					5: "4"
				},
				read: true,
				write: true,
				def: this.fanSpeed,
				desc: "Current fan speed of the device"
			},
			native: {}
		});
		//#endregion

		gthat.log.debug(`Created and saved ERV device ${this.id} (${this.name})`);
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
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MinTempCoolDry, this.minTempCoolDry, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MaxTempCoolDry, this.maxTempCoolDry, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MinTempHeat, this.minTempHeat, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MaxTempHeat, this.maxTempHeat, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MinTempAuto, this.minTempAuto, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.MaxTempAuto, this.maxTempAuto, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.RoomTemp, this.roomTemp, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.SupplyFanSpeed, this.actualSupplyFanSpeed, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.ExhaustFanSpeed, this.actualExhaustFanSpeed, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.ErvDeviceStateIDs.NumberOfFanSpeeds, this.numberOfFanSpeeds, true);
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
			case commonDefines.ErvDeviceOptions.PowerState:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.ErvDeviceStateIDs.Power, this.power, true);
				break;
			case commonDefines.ErvDeviceOptions.OperationMode:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.ErvDeviceStateIDs.Mode, this.operationMode, true);
				break;
			case commonDefines.ErvDeviceOptions.FanSpeed:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.ErvDeviceStateIDs.FanSpeed, this.fanSpeed, true);
				break;
			case "ALL":
			default:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.ErvDeviceStateIDs.Power, this.power, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.ErvDeviceStateIDs.Mode, this.operationMode, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.ErvDeviceStateIDs.FanSpeed, this.fanSpeed, true);
				break;
		}
		//#endregion

		gthat.log.debug(`Updated device data for ERV device ${this.id} (${this.name})`);
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

			Axios.get(url, {
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey
				}
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

			if (deviceOption == commonDefines.ErvDeviceOptions.PowerState) {
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
			else if (deviceOption == commonDefines.ErvDeviceOptions.OperationMode) {
				switch (value) {
					case commonDefines.ErvDeviceOperationModes.RECOVERY:
						modifiedAirInfo.OperationMode = commonDefines.ErvDeviceOperationModes.RECOVERY.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.ErvDeviceOperationModes.RECOVERY.effectiveFlags;
						break;
					case commonDefines.ErvDeviceOperationModes.BYPASS:
						modifiedAirInfo.OperationMode = commonDefines.ErvDeviceOperationModes.BYPASS.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.ErvDeviceOperationModes.BYPASS.effectiveFlags;
						break;
					case commonDefines.ErvDeviceOperationModes.AUTO:
						modifiedAirInfo.OperationMode = commonDefines.ErvDeviceOperationModes.AUTO.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.ErvDeviceOperationModes.AUTO.effectiveFlags;
						break;
					default:
						gthat.log.error("setDevice(): Unsupported value for device option - please report this to the developer!");
						return;
				}
			}
			else if (deviceOption == commonDefines.ErvDeviceOptions.FanSpeed) {
				modifiedAirInfo.SetFanSpeed = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.ErvDeviceOptions.FanSpeed.effectiveFlags;
			}
			else {
				gthat.log.error("setDevice(): Unsupported device option - please report this to the developer!");
				return;
			}

			modifiedAirInfo.HasPendingCommand = true;
			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetErv";
			const body = JSON.stringify(modifiedAirInfo);
			gthat.log.silly(`Request body: ${body}`);

			Axios.post(url, body, {
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey,
					"content-type": "application/json"
				}
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
						case commonDefines.ErvDeviceOptions.PowerState:
							gthis.power = responseData.Power;
							break;
						case commonDefines.ErvDeviceOptions.OperationMode:
							gthis.operationMode = responseData.OperationMode;
							break;
						case commonDefines.ErvDeviceOptions.FanSpeed:
							gthis.fanSpeed = responseData.SetFanSpeed;
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
			case commonDefines.ErvDeviceOptions.FanSpeed:
				if (value > gthis.numberOfFanSpeeds) {
					gthat.log.warn(`Fan speed limited to ${gthis.numberOfFanSpeeds} because device can't handle more than that!`);
					return gthis.numberOfFanSpeeds;
				}
				return value;
			default: return value;
		}
	}
}

exports.MelCloudDevice = MelcloudErvDevice;