"use strict";

const request = require("request");

let gthis = null;

class MelcloudPlatform {
	constructor(that) {
		gthis = that;
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

	Connect() {
		gthis.log.info("Connecting to Melcloud...");
		gthis.log.debug("MELCloud email address: " + this.username + " - MELCloud password: " + this.password);
		const that = this;

		// Login
		const loginUrl = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Login/ClientLogin";
		const method = "post";
		const form = {
			AppVersion: "1.9.3.0",
			CaptchaChallenge: "",
			CaptchaResponse: "",
			Email: that.username,
			Language: that.language,
			Password: that.password,
			Persist: "true"
		};

		request({
			url: loginUrl,
			form: form,
			method: method
		}, function (err, response) {
			if (err) {
				gthis.log.error("There was a problem sending login to: " + loginUrl);
				gthis.log.error(err);
			} else {
				const r = eval("(" + response.body + ")");

				if (r.LoginData == null) {
					gthis.log.error("Login failed (error code: " + r.ErrorId + ")! Verify user name and password.");				
				}
				else {
					that.contextKey = r.LoginData.ContextKey;
					that.useFahrenheit = r.LoginData.UseFahrenheit;
					gthis.setAdapterConnectionState(true);
					gthis.log.debug("Login successful. ContextKey: " + that.contextKey);
					that.GetDevices();
				}

			}
		});
	}

	GetDevices() {
		gthis.log.info("Fetching devices...");
		const that = this;

		const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/User/ListDevices";
		const method = "get";

		request({
			url: url,
			method: method,
			headers: {
				"X-MitsContextKey": that.contextKey
			}
		}, function (err, response) {
			if (err) {
				gthis.log.error("There was a problem getting devices from: " + url);
				gthis.log.error(err);
			}
			else {
				gthis.log.debug("Response from cloud: " + response.body);
				const r = eval("(" + response.body + ")");
				const foundAccessories = [];

				for (let b = 0; b < r.length; b++) {
					const building = r[b];
					const devices = building.Structure.Devices;
					//that.createAccessories(building, devices, foundAccessories);

					for (let f = 0; f < building.Structure.Floors.length; f++) {
						const devices = building.Structure.Floors[f].Devices;
						//that.createAccessories(building, devices, foundAccessories);

						for (let a = 0; a < building.Structure.Floors[f].Areas.length; a++) {
							const devices = building.Structure.Floors[f].Areas[a].Devices;
							//that.createAccessories(building, devices, foundAccessories);
						}
					}

					for (let a = 0; a < building.Structure.Areas.length; a++) {
						const devices = building.Structure.Areas[a].Devices;
						//gthis.createAccessories(building, devices, foundAccessories);
					}
				}
				//callback(foundAccessories);
			}
		});
	}
}

exports.MelCloudPlatform = MelcloudPlatform;