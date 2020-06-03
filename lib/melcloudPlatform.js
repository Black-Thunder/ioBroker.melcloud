"use strict";

const request = require("request");
const MelCloudDevice = require("./melcloudDevice");
const JSONHelper = require("./jsonHelper");

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
		gthat.log.info("Fetching context key...");
		gthat.log.debug("MELCloud email address: " + this.username + " - MELCloud password: " + this.password);

		// Login
		const loginUrl = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Login/ClientLogin";
		const method = "post";
		const form = {
			AppVersion: "1.9.3.0",
			CaptchaChallenge: "",
			CaptchaResponse: "",
			Email: gthis.username,
			Language: gthis.language,
			Password: gthis.password,
			Persist: "true"
		};

		request({
			url: loginUrl,
			form: form,
			method: method
		}, function handleLoginResponse(err, response) {
			if (err) {
				gthat.log.error("There was a problem sending login to: " + loginUrl);
				gthat.log.error(err);
				gthis.isConnected = false;
				gthat.setAdapterConnectionState(false);
			}
			else {
				const r = JSONHelper.JSONHelper.ParseCloudResponse(response.body, gthat);

				if (r.LoginData == null) {
					let errText = "Login failed (error code: " + r.ErrorId + ")!";
					switch (r.ErrorId) {
						case 1:
							errText += " Incorrect username and/or password. Verify your credentials in the adapter settings.";
							break;
						case 6:
							errText += " Too many failed login attempts, account is temporarily locked (max. 60min). Try again later.";
							break;
						default:
							break;
					}
					gthat.log.error(errText);
					gthis.isConnected = false;
					gthat.setAdapterConnectionState(false);
				}
				else {
					gthis.useFahrenheit = r.LoginData.UseFahrenheit;
					gthis.contextKey = r.LoginData.ContextKey;
					gthis.isConnected = true;
					gthat.setAdapterConnectionState(true);
					gthat.log.debug("Login successful. ContextKey: " + gthis.contextKey);
					gthis.GetDevices(callback, callback2);
				}
			}
		});
	}

	async GetDevices(callback, callback2) {
		gthat.log.info("Fetching devices...");

		const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/User/ListDevices";
		const method = "get";

		request({
			url: url,
			method: method,
			headers: {
				"X-MitsContextKey": gthis.contextKey
			}
		}, function handleDeviceResponse(err, response) {
			if (err) {
				gthat.log.error("There was a problem getting devices from: " + url);
				gthat.log.error(err);
				gthis.isConnected = false;
				gthat.setAdapterConnectionState(false);
			}
			else {
				gthis.isConnected = true;
				gthat.setAdapterConnectionState(true);
				const responseBody = response.body;
				const jsonObject = JSONHelper.JSONHelper.ParseCloudResponse(responseBody, gthat);

				if (jsonObject == null) return;

				const foundDevices = [];
				gthat.deviceObjects.length = 0; // clear main array first before adding new devices

				for (let b = 0; b < jsonObject.length; b++) {
					const building = jsonObject[b];
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
		});
	}

	CreateDevices(building, devices, foundDevices) {
		for (let d = 0; d < devices.length; d++) {
			const deviceJson = devices[d];
			const newDevice = new MelCloudDevice.MelCloudDevice(gthat);

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

			gthat.log.debug("Got device from cloud: " + deviceJson.DeviceID + " (" + deviceJson.DeviceName + ")");
			foundDevices.push(newDevice);
			gthat.deviceObjects.push(newDevice);
		}
	}

	async CreateAndSaveDevices(newDevices, callback) {
		gthat.log.info("Saving device data...");
		const currentDeviceIDs = gthat.currentKnownDeviceIDs;
		const newDeviceIDs = [];
		for (let i = 0; i < newDevices.length; i++) {
			const newDevice = newDevices[i];
			newDeviceIDs.push(newDevice.id);
		}

		const deviceIDsToAdd = newDeviceIDs.filter(x => !currentDeviceIDs.includes(x));
		const deviceIDsToDelete = currentDeviceIDs.filter(x => !newDeviceIDs.includes(x));

		for (let d = 0; d < deviceIDsToDelete.length; d++) {
			const deviceID = deviceIDsToDelete[d];
			gthat.deleteMelDevice(deviceID);
		}

		for (let d = 0; d < newDevices.length; d++) {
			const device = newDevices[d];
			if (!deviceIDsToAdd.includes(device.id)) {
				gthat.log.silly("Device already known: " + device.id + " (" + device.name + ")");
			}
			await device.CreateAndSave();
		}

		callback && callback();
	}

	startPolling() {
		gthat.log.info("Starting polling (interval: " + gthat.config.pollingInterval + " minute(s))...");

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
					gthat.log.info("Connection lost - reconnecting (try " + gthis.retryCounter + " of " + maxRetries + ")...");
					pollingJob = setTimeout(updateData, jobInterval);
				}
				else {
					gthat.log.warn("Connection to MELCloud lost, polling temporarily disabled! Trying again in one hour.");
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
