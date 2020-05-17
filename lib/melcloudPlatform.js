"use strict";

const request = require("request");
const MelCloudDevice = require("./melcloudDevice");
const JSONHelper = require("./jsonHelper");

let gthat = null; // pointer to "this" from main.js/MelCloud instance
let gthis = null; // pointer to "this" from MelcloudPlatform

class MelcloudPlatform {
	constructor(that) {
		gthat = that;
		gthis = this;
		this.language = that.config.melCloudLanguage;
		this.username = that.config.melCloudEmail;
		this.password = that.config.melCloudPassword;
		this.contextKey = "";
		this.useFahrenheit = false;		
		/*this.CurrentHeatingCoolingStateUUID = (new Characteristic.CurrentHeatingCoolingState()).UUID;
        this.TargetHeatingCoolingStateUUID = (new Characteristic.TargetHeatingCoolingState()).UUID;
        this.CurrentTemperatureUUID = (new Characteristic.CurrentTemperature()).UUID;
        this.TargetTemperatureUUID = (new Characteristic.TargetTemperature()).UUID;
        this.TemperatureDisplayUnitsUUID = (new Characteristic.TemperatureDisplayUnits()).UUID;
        this.RotationSpeedUUID = (new Characteristic.RotationSpeed()).UUID;
        this.CurrentHorizontalTiltAngleUUID = (new Characteristic.CurrentHorizontalTiltAngle()).UUID;
        this.TargetHorizontalTiltAngleUUID = (new Characteristic.TargetHorizontalTiltAngle()).UUID;
        this.CurrentVerticalTiltAngleUUID = (new Characteristic.CurrentVerticalTiltAngle()).UUID;
        this.TargetVerticalTiltAngleUUID = (new Characteristic.TargetVerticalTiltAngle()).UUID;
        this.currentAirInfoExecution = 0;
        this.airInfoExecutionPending = [];*/
	}

	GetContextKey(callback) {
		gthat.log.info("Connecting to Melcloud and fetching context key...");
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
		}, function (err, response) {
			if (err) {
				gthat.log.error("There was a problem sending login to: " + loginUrl);
				gthat.log.error(err);
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
					gthat.setAdapterConnectionState(false);
				}
				else {
					gthis.useFahrenheit = r.LoginData.UseFahrenheit;
					gthis.contextKey = r.LoginData.ContextKey;
					gthat.setAdapterConnectionState(true);
					gthat.log.debug("Login successful. ContextKey: " + gthis.contextKey);
					gthis.GetDevices(callback);
				}

			}
		});
	}

	async GetDevices(callback) {
		gthat.log.info("Fetching devices...");

		const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/User/ListDevices";
		const method = "get";

		request({
			url: url,
			method: method,
			headers: {
				"X-MitsContextKey": gthis.contextKey
			}
		}, function (err, response) {
			if (err) {
				gthat.log.error("There was a problem getting devices from: " + url);
				gthat.log.error(err);
				gthat.setAdapterConnectionState(false);
			}
			else {
				gthat.setAdapterConnectionState(true);
				const responseBody = response.body;
				const jsonObject = JSONHelper.JSONHelper.ParseCloudResponse(responseBody, gthat);

				if (jsonObject == null) return;

				const foundDevices = [];

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

				callback && callback(foundDevices);
			}
		});
	}

	CreateDevices(building, devices, foundDevices) {
		for (let d = 0; d < devices.length; d++) {
			const device = devices[d];
			const newDevice = new MelCloudDevice.MelCloudDevice(gthat);

			newDevice.platform = gthis;
			newDevice.id = device.DeviceID;
			newDevice.name = device.DeviceName;
			newDevice.serialNumber = device.SerialNumber;
			newDevice.buildingId = building.ID;
			newDevice.floorId = device.FloorID;
			newDevice.power = device.Device.Power;
			newDevice.canCool = device.Device.CanCool;
			newDevice.canDry = device.Device.CanDry;
			newDevice.canHeat = device.Device.CanHeat;
			newDevice.minTempCoolDry = device.Device.MinTempCoolDry;
			newDevice.maxTempCoolDry = device.Device.MaxTempCoolDry;
			newDevice.minTempHeat = device.Device.MinTempHeat;
			newDevice.maxTempHeat = device.Device.MaxTempHeat;
			newDevice.minTempAuto = device.Device.MinTempAutomatic;
			newDevice.maxTempAuto = device.Device.MaxTempAutomatic;
			newDevice.operationMode = device.Device.OperationMode;
			newDevice.targetTemp = device.Device.SetTemperature;

			gthat.log.debug("Got device from cloud: " + device.DeviceID + " (" + device.DeviceName + ")");
			foundDevices.push(newDevice);
		}
	}

	async SaveDevices(newDevices) {
		const currentDeviceIDs = gthat.getCurrentKnownDeviceIDs();
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
				gthat.log.debug("Device already known: " + device.id + " (" + device.name + ")");
			}			
			await device.Save();
		}
	}
}

exports.MelCloudPlatform = MelcloudPlatform;
