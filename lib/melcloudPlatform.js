"use strict";

const Axios = require("axios").default;
const FormData = require("form-data");
const MelCloudAtaDevice = require("./melcloudAtaDevice");
const MelCloudAtwDevice = require("./melcloudAtwDevice");
const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");

let gthat = null; // pointer to "this" from main.js/MelCloud instance
let gthis = null; // pointer to "this" from MelcloudPlatform
let pollingJob = null; // runs at user-defined interval to update data from MELCloud
const maxRetries = 3; // number of connection retries when connection was lost
const retryInterval = 60 * 60 * 1000; // time (in ms) after which a new reconnection try should be made

class MelcloudPlatform {
	constructor(that) {
		gthat = that;
		gthis = this;
		this.language = that.config.melCloudLanguage;
		this.username = that.config.melCloudEmail;
		this.password = that.config.melCloudPassword;
		this.contextKey = "";
		this.useFahrenheit = false;
		this.isConnected = false;
		this.retryCounter = 0;
	}

	async GetContextKey(callback, callback2) {
		gthat.log.debug("Fetching context key...");
		gthat.log.debug("MELCloud email address: " + this.username + " - MELCloud password: " + this.password);

		// Login
		const loginUrl = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Login/ClientLogin";
		const form = new FormData();
		form.append("AppVersion", "1.21.6.0");
		form.append("CaptchaChallenge", "");
		form.append("CaptchaResponse", "");
		form.append("Email", gthis.username);
		form.append("Language", gthis.language);
		form.append("Password", gthis.password);
		form.append("Persist", "true");

		Axios.post(loginUrl, form, { headers: form.getHeaders() })
			.then(function handleLoginResponse(response) {
				if (!response) {
					gthat.log.error("There was a problem receiving the response from: " + loginUrl);
					gthis.isConnected = false;
					gthat.setAdapterConnectionState(false);
				}
				else {
					const statusCode = response.status;
					const statusText = response.statusText;
					gthat.log.debug("Received response from: " + loginUrl + " (status code: " + statusCode + " - " + statusText + ")");

					if (statusCode != HttpStatus.StatusCodes.OK) {
						gthis.isConnected = false;
						gthat.setAdapterConnectionState(false);
						gthat.log.error("Invalid HTTP status code (" + statusCode + " - " + statusText + "). Login failed!");
						return;
					}

					const responseData = response.data;
					gthat.log.debug("Response from cloud: " + JSON.stringify(responseData));

					if (responseData.LoginData == null) {
						let errText = "Login failed (error code: " + responseData.ErrorId + ")! Error message: ";
						switch (responseData.ErrorId) {
							case 1:
								errText += "Incorrect username and/or password. Verify your credentials in the adapter settings.";
								break;
							case 6:
								errText += "Too many failed login attempts, account is temporarily locked (max. 60min). Try again later.";
								break;
							default:
								errText += responseData.ErrorMessage;
								break;
						}
						gthat.log.error(errText);
						gthis.isConnected = false;
						gthat.setAdapterConnectionState(false);
					}
					else {
						gthis.useFahrenheit = responseData.LoginData.UseFahrenheit;
						gthis.contextKey = responseData.LoginData.ContextKey;
						gthis.isConnected = true;
						gthat.setAdapterConnectionState(true);
						gthat.log.debug("Login successful. ContextKey: " + gthis.contextKey);
						gthis.GetDevices(callback, callback2);
					}
				}
			}).catch(error => {
				gthat.log.error("There was a problem sending login to: " + loginUrl);
				gthat.log.error(error);
				gthis.isConnected = false;
				gthat.setAdapterConnectionState(false);
			});
	}

	async GetDevices(callback, callback2) {
		gthat.log.debug("Fetching devices...");

		const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/User/ListDevices";

		Axios.get(url, {
			headers: {
				"X-MitsContextKey": gthis.contextKey
			}
		}).then(function handleDeviceResponse(response) {
			if (!response) {
				gthat.log.error("There was a problem receiving the response from: " + url);
				gthis.isConnected = false;
				gthat.setAdapterConnectionState(false);
			}
			else {
				const statusCode = response.status;
				const statusText = response.statusText;
				gthat.log.debug("Received response from: " + url + " (status code: " + statusCode + " - " + statusText + ")");

				if (statusCode != HttpStatus.StatusCodes.OK) {
					gthis.isConnected = false;
					gthat.setAdapterConnectionState(false);
					gthat.log.error("Invalid HTTP status code (" + statusCode + " - " + statusText + "). Getting devices failed!");
					return;
				}

				gthis.isConnected = true;
				gthat.setAdapterConnectionState(true);
				const responseData = response.data;

				if (responseData == null) return;

				gthat.log.debug("Response from cloud: " + JSON.stringify(responseData));

				const foundDevices = [];
				gthat.deviceObjects.length = 0; // clear main array first before adding new devices

				for (let b = 0; b < responseData.length; b++) {
					const building = responseData[b];
					const devices = building.Structure.Devices;

					gthis.CreateDevices(building, devices, foundDevices);

					for (let f = 0; f < building.Structure.Floors.length; f++) {
						const devices = building.Structure.Floors[f].Devices;
						gthis.CreateDevices(building, devices, foundDevices);

						for (let a = 0; a < building.Structure.Floors[f].Areas.length; a++) {
							const devices = building.Structure.Floors[f].Areas[a].Devices;
							gthis.CreateDevices(building, devices, foundDevices);
						}
					}

					for (let a = 0; a < building.Structure.Areas.length; a++) {
						const devices = building.Structure.Areas[a].Devices;
						gthis.CreateDevices(building, devices, foundDevices);
					}
				}

				callback && callback(foundDevices, callback2);
			}
		}).catch(error => {
			gthat.log.error("There was a problem getting devices from: " + url);
			gthat.log.error(error);
			gthis.isConnected = false;
			gthat.setAdapterConnectionState(false);
		});
	}

	CreateDevices(building, devices, foundDevices) {
		for (let d = 0; d < devices.length; d++) {
			const deviceJson = devices[d];
			const deviceType = deviceJson.Device.DeviceType;

			switch (deviceType) {
				case commonDefines.DeviceTypes.AirToAir:
					gthis.CreateAtaDevice(building, deviceJson, foundDevices);
					break;
				case commonDefines.DeviceTypes.AirToWater:
					gthis.CreateAtwDevice(building, deviceJson, foundDevices);
					break;
				default:
					gthat.log.error("Received unknown device type '" + deviceType + "'. Please report this to the developer!");
					break;
			}
		}
	}

	CreateAtaDevice(building, deviceJson, foundDevices) {
		const newDevice = new MelCloudAtaDevice.MelCloudDevice(gthat);

		newDevice.platform = gthis;

		// "info"
		newDevice.id = deviceJson.DeviceID;
		newDevice.name = deviceJson.DeviceName;
		newDevice.serialNumber = deviceJson.SerialNumber;
		newDevice.macAddress = deviceJson.MacAddress;
		newDevice.buildingId = building.ID;
		newDevice.floorId = deviceJson.FloorID;
		newDevice.canCool = deviceJson.Device.CanCool;
		newDevice.canDry = deviceJson.Device.CanDry;
		newDevice.canHeat = deviceJson.Device.CanHeat;
		newDevice.minTempCoolDry = deviceJson.Device.MinTempCoolDry;
		newDevice.maxTempCoolDry = deviceJson.Device.MaxTempCoolDry;
		newDevice.minTempHeat = deviceJson.Device.MinTempHeat;
		newDevice.maxTempHeat = deviceJson.Device.MaxTempHeat;
		newDevice.minTempAuto = deviceJson.Device.MinTempAutomatic;
		newDevice.maxTempAuto = deviceJson.Device.MaxTempAutomatic;
		newDevice.roomTemp = deviceJson.Device.RoomTemperature;
		newDevice.actualFanSpeed = deviceJson.Device.ActualFanSpeed;
		newDevice.numberOfFanSpeeds = deviceJson.Device.NumberOfFanSpeeds;
		newDevice.lastCommunication = deviceJson.Device.LastTimeStamp;
		newDevice.deviceOnline = !deviceJson.Device.Offline;

		// "control"
		newDevice.power = deviceJson.Device.Power;
		newDevice.operationMode = deviceJson.Device.OperationMode;
		newDevice.targetTemp = deviceJson.Device.SetTemperature;
		newDevice.fanSpeed = deviceJson.Device.FanSpeed;
		newDevice.vaneVerticalDirection = deviceJson.Device.VaneVerticalDirection;
		newDevice.vaneHorizontalDirection = deviceJson.Device.VaneHorizontalDirection;

		gthat.log.debug("Got air-to-air device from cloud: " + deviceJson.DeviceID + " (" + deviceJson.DeviceName + ")");
		foundDevices.push(newDevice);
		gthat.deviceObjects.push(newDevice);
	}

	CreateAtwDevice(building, deviceJson, foundDevices) {
		const newDevice = new MelCloudAtwDevice.MelCloudDevice(gthat);

		newDevice.platform = gthis;

		// "info"
		newDevice.id = deviceJson.DeviceID;
		newDevice.name = deviceJson.DeviceName;
		newDevice.serialNumber = deviceJson.SerialNumber;
		newDevice.macAddress = deviceJson.MacAddress;
		newDevice.buildingId = building.ID;
		newDevice.floorId = deviceJson.FloorID;
		newDevice.canCool = deviceJson.Device.CanCool;
		newDevice.canHeat = deviceJson.Device.CanHeat;
		newDevice.hasZone2 = deviceJson.Device.HasZone2;
		newDevice.roomTemperatureZone1 = deviceJson.Device.RoomTemperatureZone1;
		newDevice.roomTemperatureZone2 = deviceJson.Device.RoomTemperatureZone2;
		newDevice.mixingTankWaterTemperature = deviceJson.Device.MixingTankWaterTemperature;
		newDevice.condensingTemperature = deviceJson.Device.CondensingTemperature;
		newDevice.outdoorTemperature = deviceJson.Device.OutdoorTemperature;
		newDevice.flowTemperature = deviceJson.Device.FlowTemperature;
		newDevice.flowTemperatureZone1 = deviceJson.Device.FlowTemperatureZone1;
		newDevice.flowTemperatureZone2 = deviceJson.Device.FlowTemperatureZone2;
		newDevice.flowTemperatureBoiler = deviceJson.Device.FlowTemperatureBoiler;
		newDevice.returnTemperature = deviceJson.Device.ReturnTemperature;
		newDevice.returnTemperatureZone1 = deviceJson.Device.ReturnTemperatureZone1;
		newDevice.ReturnTemperatureZone2 = deviceJson.Device.ReturnTemperatureZone2;
		newDevice.returnTemperatureBoiler = deviceJson.Device.ReturnTemperatureBoiler;
		newDevice.tankWaterTemperature = deviceJson.Device.TankWaterTemperature;
		newDevice.lastCommunication = deviceJson.Device.LastTimeStamp;
		newDevice.deviceOnline = !deviceJson.Device.Offline;

		// "control"
		newDevice.power = deviceJson.Device.Power;
		newDevice.forcedHotWaterMode = deviceJson.Device.ForcedHotWaterMode;
		newDevice.operationModeZone1 = deviceJson.Device.OperationModeZone1;
		newDevice.operationModeZone2 = deviceJson.Device.OperationModeZone2;
		newDevice.setTankWaterTemperature = deviceJson.Device.SetTankWaterTemperature;

		gthat.log.debug("Got air-to-water device from cloud: " + deviceJson.DeviceID + " (" + deviceJson.DeviceName + ")");
		foundDevices.push(newDevice);
		gthat.deviceObjects.push(newDevice);
	}

	async CreateAndSaveDevices(newDevices, callback) {
		gthat.log.debug("Saving device data...");
		const currentDeviceIDs = gthat.currentKnownDeviceIDs;
		const newDeviceIDs = [];
		for (let i = 0; i < newDevices.length; i++) {
			const newDevice = newDevices[i];
			newDeviceIDs.push(newDevice.id);
		}

		const deviceIDsToDelete = currentDeviceIDs.filter(x => !newDeviceIDs.includes(x));

		for (let d = 0; d < deviceIDsToDelete.length; d++) {
			const deviceID = deviceIDsToDelete[d];
			gthat.deleteMelDevice(deviceID);
		}

		for (let d = 0; d < newDevices.length; d++) {
			const device = newDevices[d];
			await device.CreateAndSave(); // create device states initially if not exisiting
			await device.UpdateDeviceData("ALL"); // update all device data with values from cloud
		}

		callback && callback();
	}

	startPolling() {
		gthat.log.info("Connection successful. Starting polling (interval: " + gthat.config.pollingInterval + " minute(s))...");

		// Update data regularly according to pollingInterval
		const jobInterval = gthat.config.pollingInterval * 60000; // polling interval in milliseconds
		pollingJob = setTimeout(async function updateData() {
			gthis.GetContextKey(gthis.CreateAndSaveDevices);

			if (gthis.isConnected) {
				gthis.retryCounter = 0;
				pollingJob = setTimeout(updateData, jobInterval);
			}
			else {
				if (gthis.retryCounter < maxRetries) {
					gthis.retryCounter++;
					gthat.log.warn("Connection lost - reconnecting (try " + gthis.retryCounter + " of " + maxRetries + ")...");
					pollingJob = setTimeout(updateData, jobInterval);
				}
				else {
					gthis.retryCounter = 0;
					gthat.log.error("Connection to MELCloud lost, polling temporarily disabled! Trying again in one hour.");
					pollingJob = setTimeout(updateData, retryInterval);
				}
			}
		}, jobInterval);
	}

	stopPolling() {
		clearTimeout(pollingJob);
		gthat.log.debug("Cleared polling timer.");
	}
}

exports.MelCloudPlatform = MelcloudPlatform;
