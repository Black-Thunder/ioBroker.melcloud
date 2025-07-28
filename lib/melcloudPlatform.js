"use strict";

const FormData = require("form-data");
const MelCloudAtaDevice = require("./melcloudAtaDevice");
const MelCloudAtwDevice = require("./melcloudAtwDevice");
const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");
const Axios = require("axios").default;
const Https = require("https");

let gthat = null; // pointer to "this" from main.js/MelCloud instance
let pollingJob = null; // runs at user-defined interval to update data from MELCloud
let contextKeyInvalidationTimeout = null; // fixed timeout to update context key from MELCloud
const contextKeyInvalidationTimer = 12 * 60 * 60 * 1000; // time (in ms) after which a new context key should be obtained
const maxRetries = 3; // number of connection retries when connection was lost
const retryInterval = 60 * 60 * 1000; // time (in ms) after which a new reconnection try should be made

class MelcloudPlatform {
	constructor(that) {
		gthat = that;
		this.language = that.config.melCloudLanguage;
		this.username = that.config.melCloudEmail;
		this.password = that.config.melCloudPassword;
		this.contextKey = "";
		this.useFahrenheit = false;
		this.isConnected = false;
		this.retryCounter = 0;
		this.customHttpsAgent = that.config.ignoreSslErrors ? new Https.Agent({ rejectUnauthorized: false }) : null;
	}

	async GetContextKey(callback, callback2) {
		gthat.log.debug("Fetching context key...");

		// Login
		const loginUrl = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Login/ClientLogin";
		const formData = new FormData();
		formData.append("AppVersion", "1.35.1.0");
		formData.append("CaptchaResponse", "");
		formData.append("Email", this.username);
		formData.append("Language", this.language);
		formData.append("Password", this.password);
		formData.append("Persist", "true");

		Axios({
			url: loginUrl,
			method: "POST",
			data: formData,
			httpsAgent: this.customHttpsAgent,
			headers: {
				Authority: "app.melcloud.com",
				Accept: "application/json, text/javascript, */*; q=0.01",
				"Accept-Language": "de-DE,de;q=0.9,en-DE;q=0.8,en;q=0.7,en-US;q=0.6,la;q=0.5",
				Origin: "https://app.melcloud.com/",
				Referer: "https://app.melcloud.com/",
				"Sec-Fetch-Mode": "cors",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
				"X-Requested-With": "XMLHttpRequest",
			},
		})
			.then(response => {
				if (!response) {
					gthat.log.error(`There was a problem receiving the response from: ${loginUrl}`);
					this.isConnected = false;
					gthat.setAdapterConnectionState(false);
				} else {
					const statusCode = response.status;
					const statusText = response.statusText;
					gthat.log.debug(`Received response from: ${loginUrl} (status code: ${statusCode} - ${statusText})`);

					if (statusCode != HttpStatus.StatusCodes.OK) {
						this.isConnected = false;
						gthat.setAdapterConnectionState(false);
						gthat.log.error(`Invalid HTTP status code (${statusCode} - ${statusText}). Login failed!`);
						return;
					}

					const responseData = response.data;
					gthat.log.debug(`Response from cloud: ${JSON.stringify(responseData)}`);

					if (responseData.LoginData == null) {
						let errText = `Login failed (error code: ${responseData.ErrorId})! Error message: `;
						switch (responseData.ErrorId) {
							case 1:
								errText +=
									"Incorrect username and/or password. Verify your credentials in the adapter settings.";
								break;
							case 6:
								errText +=
									"Too many failed login attempts, account is temporarily locked (max. 60min). Try again later.";
								break;
							default:
								errText += responseData.ErrorMessage;
								break;
						}
						gthat.log.error(errText);
						this.isConnected = false;
						gthat.setAdapterConnectionState(false);
					} else {
						this.useFahrenheit = responseData.LoginData.UseFahrenheit;
						this.contextKey = responseData.LoginData.ContextKey;

						contextKeyInvalidationTimeout = setTimeout(async function invalidateContextKey() {
							gthat.log.debug(`Context key invalidated. Getting a new one for the next request.`);
							this.GetContextKey(); // only get new context key without refreshing device data
						}, contextKeyInvalidationTimer);

						this.isConnected = true;
						gthat.setAdapterConnectionState(true);
						gthat.log.debug(`Login successful. ContextKey: ${this.contextKey}`);

						callback && this.GetDevices(callback, callback2);
					}
				}
			})
			.catch(error => {
				gthat.log.error(`There was a problem sending login to: ${loginUrl}`);
				gthat.log.error(error);

				if (error.response && error.response.status && error.response.status == 429) {
					gthat.log.error(
						"You have probably been rate limited by the MELCloud servers because of too much requests. Stop the adapter for a few hours, increase the polling interval in the settings and try again later.",
					);
				}

				this.isConnected = false;
				gthat.setAdapterConnectionState(false);
			});
	}

	async GetDevices(callback, callback2) {
		gthat.log.debug("Fetching devices...");

		const getDevicesUrl = "https://app.melcloud.com/Mitsubishi.Wifi.Client/User/ListDevices";

		Axios.get(getDevicesUrl, {
			httpsAgent: this.customHttpsAgent,
			headers: {
				Host: "app.melcloud.com",
				"X-MitsContextKey": this.contextKey,
			},
		})
			.then(response => {
				if (!response) {
					gthat.log.error(`There was a problem receiving the response from: ${getDevicesUrl}`);
					this.isConnected = false;
					gthat.setAdapterConnectionState(false);
				} else {
					const statusCode = response.status;
					const statusText = response.statusText;
					gthat.log.debug(
						`Received response from: ${getDevicesUrl} (status code: ${statusCode} - ${statusText})`,
					);

					if (statusCode != HttpStatus.StatusCodes.OK) {
						this.isConnected = false;
						gthat.setAdapterConnectionState(false);
						gthat.log.error(
							`Invalid HTTP status code (${statusCode} - ${statusText}). Getting devices failed!`,
						);
						return;
					}

					this.isConnected = true;
					gthat.setAdapterConnectionState(true);
					const responseData = response.data;

					if (responseData == null) {
						return;
					}

					gthat.log.debug(`Response from cloud: ${JSON.stringify(responseData)}`);

					const foundDevices = [];
					gthat.deviceObjects.length = 0; // clear main array first before adding new devices

					for (let b = 0; b < responseData.length; b++) {
						const building = responseData[b];
						const devices = building.Structure.Devices;

						this.CreateDevices(building, devices, foundDevices);

						for (let f = 0; f < building.Structure.Floors.length; f++) {
							const devices = building.Structure.Floors[f].Devices;
							this.CreateDevices(building, devices, foundDevices);

							for (let a = 0; a < building.Structure.Floors[f].Areas.length; a++) {
								const devices = building.Structure.Floors[f].Areas[a].Devices;
								this.CreateDevices(building, devices, foundDevices);
							}
						}

						for (let a = 0; a < building.Structure.Areas.length; a++) {
							const devices = building.Structure.Areas[a].Devices;
							this.CreateDevices(building, devices, foundDevices);
						}
					}

					callback && callback(foundDevices, callback2);
				}
			})
			.catch(error => {
				gthat.log.error(`There was a problem getting devices from: ${getDevicesUrl}`);
				gthat.log.error(error);

				if (error.response && error.response.status && error.response.status == 429) {
					gthat.log.error(
						"You have probably been rate limited by the MELCloud servers because of too much requests. Stop the adapter for a few hours, increase the polling interval in the settings and try again later.",
					);
				}

				this.isConnected = false;
				gthat.setAdapterConnectionState(false);
			});
	}

	CreateDevices(building, devices, foundDevices) {
		for (let d = 0; d < devices.length; d++) {
			const deviceJson = devices[d];
			const deviceType = deviceJson.Device.DeviceType;

			switch (deviceType) {
				case commonDefines.DeviceTypes.AirToAir:
					this.CreateAtaDevice(building, deviceJson, foundDevices);
					break;
				case commonDefines.DeviceTypes.AirToWater:
					this.CreateAtwDevice(building, deviceJson, foundDevices);
					break;
				default:
					gthat.log.error(
						`Received unknown device type '${deviceType}'. Please report this to the developer!`,
					);
					break;
			}
		}
	}

	CreateAtaDevice(building, deviceJson, foundDevices) {
		const newDevice = new MelCloudAtaDevice.MelCloudDevice(gthat);

		newDevice.platform = this;

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
		if (newDevice.canHeat) {
			newDevice.minTempHeat = deviceJson.Device.MinTempHeat;
		}
		if (newDevice.canHeat) {
			newDevice.maxTempHeat = deviceJson.Device.MaxTempHeat;
		}
		newDevice.minTempAuto = deviceJson.Device.MinTempAutomatic;
		newDevice.maxTempAuto = deviceJson.Device.MaxTempAutomatic;
		newDevice.roomTemp = deviceJson.Device.RoomTemperature;
		newDevice.actualFanSpeed = deviceJson.Device.ActualFanSpeed;
		newDevice.numberOfFanSpeeds = deviceJson.Device.NumberOfFanSpeeds;
		newDevice.lastCommunication = deviceJson.Device.LastTimeStamp;
		newDevice.deviceOnline = !deviceJson.Device.Offline;
		newDevice.deviceHasError = deviceJson.Device.HasError;
		newDevice.errorMessages = deviceJson.Device.ErrorMessages;
		newDevice.errorCode = deviceJson.Device.ErrorCode;

		// "control"
		newDevice.power = deviceJson.Device.Power;
		newDevice.operationMode = deviceJson.Device.OperationMode;
		newDevice.targetTemp = deviceJson.Device.SetTemperature;
		newDevice.fanSpeed = deviceJson.Device.FanSpeed;
		newDevice.vaneVerticalDirection = deviceJson.Device.VaneVerticalDirection;
		newDevice.vaneHorizontalDirection = deviceJson.Device.VaneHorizontalDirection;

		gthat.log.debug(`Got ATA device from cloud: ${deviceJson.DeviceID} (${deviceJson.DeviceName})`);
		foundDevices.push(newDevice);
		gthat.deviceObjects.push(newDevice);
	}

	CreateAtwDevice(building, deviceJson, foundDevices) {
		const newDevice = new MelCloudAtwDevice.MelCloudDevice(gthat);

		newDevice.platform = this;

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
		if (newDevice.hasZone2) {
			newDevice.roomTemperatureZone2 = deviceJson.Device.RoomTemperatureZone2;
		}
		newDevice.mixingTankWaterTemperature = deviceJson.Device.MixingTankWaterTemperature;
		newDevice.condensingTemperature = deviceJson.Device.CondensingTemperature;
		newDevice.outdoorTemperature = deviceJson.Device.OutdoorTemperature;
		newDevice.flowTemperature = deviceJson.Device.FlowTemperature;
		newDevice.flowTemperatureZone1 = deviceJson.Device.FlowTemperatureZone1;
		if (newDevice.hasZone2) {
			newDevice.flowTemperatureZone2 = deviceJson.Device.FlowTemperatureZone2;
		}
		newDevice.flowTemperatureBoiler = deviceJson.Device.FlowTemperatureBoiler;
		newDevice.returnTemperature = deviceJson.Device.ReturnTemperature;
		newDevice.returnTemperatureZone1 = deviceJson.Device.ReturnTemperatureZone1;
		if (newDevice.hasZone2) {
			newDevice.ReturnTemperatureZone2 = deviceJson.Device.ReturnTemperatureZone2;
		}
		newDevice.returnTemperatureBoiler = deviceJson.Device.ReturnTemperatureBoiler;
		newDevice.tankWaterTemperature = deviceJson.Device.TankWaterTemperature;
		newDevice.heatPumpFrequency = deviceJson.Device.HeatPumpFrequency;
		newDevice.operationState = deviceJson.Device.OperationMode;
		newDevice.lastCommunication = deviceJson.Device.LastTimeStamp;
		newDevice.deviceOnline = !deviceJson.Device.Offline;
		newDevice.deviceHasError = deviceJson.Device.HasError;
		newDevice.errorMessages = deviceJson.Device.ErrorMessages;
		newDevice.errorCode = deviceJson.Device.ErrorCode;

		// "control"
		newDevice.power = deviceJson.Device.Power;
		newDevice.forcedHotWaterMode = deviceJson.Device.ForcedHotWaterMode;
		newDevice.operationModeZone1 = deviceJson.Device.OperationModeZone1;
		if (newDevice.hasZone2) {
			newDevice.operationModeZone2 = deviceJson.Device.OperationModeZone2;
		}
		newDevice.setTankWaterTemperature = deviceJson.Device.SetTankWaterTemperature;
		newDevice.setTemperatureZone1 = deviceJson.Device.SetTemperatureZone1;
		if (newDevice.hasZone2) {
			newDevice.setTemperatureZone2 = deviceJson.Device.SetTemperatureZone2;
		}
		newDevice.setHeatFlowTemperatureZone1 = deviceJson.Device.SetHeatFlowTemperatureZone1;
		if (newDevice.hasZone2) {
			newDevice.setHeatFlowTemperatureZone2 = deviceJson.Device.SetHeatFlowTemperatureZone2;
		}
		newDevice.setCoolFlowTemperatureZone1 = deviceJson.Device.SetCoolFlowTemperatureZone1;
		if (newDevice.hasZone2) {
			newDevice.setCoolFlowTemperatureZone2 = deviceJson.Device.SetCoolFlowTemperatureZone2;
		}

		gthat.log.debug(`Got ATW device from cloud: ${deviceJson.DeviceID} (${deviceJson.DeviceName})`);
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

	// Update data regularly according to pollingInterval (if enabled)
	startPolling() {
		let jobInterval = gthat.config.pollingInterval * 60000 + Math.floor(Math.random() * 5 * 1000);

		const updateData = async () => {
			jobInterval = gthat.config.pollingInterval * 60000 + Math.floor(Math.random() * 5 * 1000);

			this.GetDevices(this.CreateAndSaveDevices.bind(this));

			if (this.isConnected) {
				this.retryCounter = 0;
				pollingJob = setTimeout(updateData, jobInterval);
			} else {
				if (this.retryCounter < maxRetries) {
					this.retryCounter++;
					gthat.log.warn(
						`Connection to MELCloud lost - reconnecting (try ${this.retryCounter} of ${maxRetries})...`,
					);
					pollingJob = setTimeout(updateData, jobInterval);
				} else {
					this.retryCounter = 0;
					gthat.log.error(
						"Connection to MELCloud lost, polling temporarily disabled! Trying again in one hour.",
					);
					pollingJob = setTimeout(updateData, retryInterval);
				}
			}
		};

		pollingJob = setTimeout(updateData, jobInterval);
	}

	stopPolling() {
		clearTimeout(pollingJob);
		gthat.log.debug("Cleared polling timer.");
	}

	stopContextKeyInvalidation() {
		clearTimeout(contextKeyInvalidationTimeout);
		gthat.log.debug("Cleared context key invalidation timer.");
	}
}

exports.MelCloudPlatform = MelcloudPlatform;
