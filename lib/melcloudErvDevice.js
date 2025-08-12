"use strict";

const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");
const MelcloudBaseDevice = require("./melcloudBaseDevice");
const Axios = require("axios").default;

class MelcloudErvDevice extends MelcloudBaseDevice {
	constructor(adapter, platform) {
		super(adapter, platform, commonDefines.DeviceTypes.EnergyRecoveryVentilation);

		// Info
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

		// Control
		this.operationMode = commonDefines.ErvDeviceOperationModes.UNDEF.value;
		this.fanSpeed = 0;
	}

	// Creates all necessary states and channels and writes the values into the DB
	async CreateAndSave() {
		// check if object has already been created
		if (this.hasBeenCreated) {
			return;
		}

		await super.createCommonStates();

		const devicePrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}`;

		//#region INFO
		const infoPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Info}`;

		await this.createStates(infoPrefix, [
			{
				id: commonDefines.ErvDeviceStateIDs.MinTempCoolDry,
				definition: {
					type: "state",
					common: {
						name: "Minimal temperature (Cool/Dry)",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: false,
						def: this.minTempCoolDry,
						desc: "Minimal temperature in cool/dry-mode",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.MaxTempCoolDry,
				definition: {
					type: "state",
					common: {
						name: "Maximal temperature (Cool/Dry)",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: false,
						def: this.maxTempCoolDry,
						desc: "Maximal temperature in cool/dry-mode",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.MinTempHeat,
				definition: {
					type: "state",
					common: {
						name: "Minimal temperature (Heat)",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: false,
						def: this.minTempHeat,
						desc: "Minimal temperature in heat-mode",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.MaxTempHeat,
				definition: {
					type: "state",
					common: {
						name: "Maximal temperature (Heat)",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: false,
						def: this.maxTempHeat,
						desc: "Maximal temperature in heat-mode",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.MinTempAuto,
				definition: {
					type: "state",
					common: {
						name: "Minimal Temperature (Auto)",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: false,
						def: this.minTempAuto,
						desc: "Minimal temperature in auto-mode",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.MaxTempAuto,
				definition: {
					type: "state",
					common: {
						name: "Maximal Temperature (Auto)",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: false,
						def: this.maxTempAuto,
						desc: "Maximal temperature in auto-mode",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.RoomTemp,
				definition: {
					type: "state",
					common: {
						name: "Room temperature",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: false,
						def: this.roomTemp,
						desc: "Current room temperature",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.OutdoorTemp,
				definition: {
					type: "state",
					common: {
						name: "Outdoor temperature",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: false,
						def: this.outdoorTemp,
						desc: "Current outdoor temperature",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.SupplyFanSpeed,
				definition: {
					type: "state",
					common: {
						name: "Supply fan speed",
						type: "number",
						role: "value",
						read: true,
						write: false,
						def: this.actualSupplyFanSpeed,
						desc: "Actual supply fan speed",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.ExhaustFanSpeed,
				definition: {
					type: "state",
					common: {
						name: "Exhaust fan speed",
						type: "number",
						role: "value",
						read: true,
						write: false,
						def: this.actualExhaustFanSpeed,
						desc: "Actual exhaust fan speed",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.NumberOfFanSpeeds,
				definition: {
					type: "state",
					common: {
						name: "Number of fan speeds",
						type: "number",
						role: "value",
						read: true,
						write: false,
						def: this.numberOfFanSpeeds,
						desc: "Number of available fan speeds",
					},
					native: {},
				},
			},
		]);
		//#endregion

		//#region CONTROL
		const controlPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Control}`;

		await this.createStates(controlPrefix, [
			{
				id: commonDefines.ErvDeviceStateIDs.Power,
				definition: {
					type: "state",
					common: {
						name: "Power",
						type: "boolean",
						role: "switch.power",
						read: true,
						write: true,
						def: this.power,
						desc: "Power switch",
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.Mode,
				definition: {
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
							2: "Auto",
						},
					},
					native: {},
				},
			},
			{
				id: commonDefines.ErvDeviceStateIDs.FanSpeed,
				definition: {
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
							5: "4",
						},
						read: true,
						write: true,
						def: this.fanSpeed,
						desc: "Current fan speed of the device",
					},
					native: {},
				},
			},
		]);
		//#endregion

		this.adapter.log.debug(`Created and saved ERV device ${this.id} (${this.name})`);
		this.hasBeenCreated = true;
	}

	// Only writes changed device data into the DB
	async UpdateDeviceData(deviceOption) {
		super.UpdateCommonDeviceData();

		//#region INFO
		const infoPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Info}.`;

		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.ErvDeviceStateIDs.MinTempCoolDry,
			this.minTempCoolDry,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.ErvDeviceStateIDs.MaxTempCoolDry,
			this.maxTempCoolDry,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.ErvDeviceStateIDs.MinTempHeat,
			this.minTempHeat,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.ErvDeviceStateIDs.MaxTempHeat,
			this.maxTempHeat,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.ErvDeviceStateIDs.MinTempAuto,
			this.minTempAuto,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.ErvDeviceStateIDs.MaxTempAuto,
			this.maxTempAuto,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.ErvDeviceStateIDs.RoomTemp,
			this.roomTemp,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.ErvDeviceStateIDs.SupplyFanSpeed,
			this.actualSupplyFanSpeed,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.ErvDeviceStateIDs.ExhaustFanSpeed,
			this.actualExhaustFanSpeed,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.ErvDeviceStateIDs.NumberOfFanSpeeds,
			this.numberOfFanSpeeds,
			true,
		);
		//#endregion

		//#region CONTROL
		const controlPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Control}.`;

		switch (deviceOption) {
			case commonDefines.ErvDeviceOptions.PowerState:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.ErvDeviceStateIDs.Power,
					this.power,
					true,
				);
				break;
			case commonDefines.ErvDeviceOptions.OperationMode:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.ErvDeviceStateIDs.Mode,
					this.operationMode,
					true,
				);
				break;
			case commonDefines.ErvDeviceOptions.FanSpeed:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.ErvDeviceStateIDs.FanSpeed,
					this.fanSpeed,
					true,
				);
				break;
			case "ALL":
			default:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.ErvDeviceStateIDs.Power,
					this.power,
					true,
				);
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.ErvDeviceStateIDs.Mode,
					this.operationMode,
					true,
				);
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.ErvDeviceStateIDs.FanSpeed,
					this.fanSpeed,
					true,
				);
				break;
		}
		//#endregion

		this.adapter.log.debug(`Updated device data for ERV device ${this.id} (${this.name})`);
	}

	setDevice(deviceOption, value) {
		if (this.currentDeviceSetRequests < 1) {
			this.currentDeviceSetRequests++;

			this.adapter.log.debug(
				`Changing device option '${deviceOption.id}' to '${value.value != undefined ? value.value : value}'...`,
			);
			const modifiedAirInfo = this.airInfo;

			if (modifiedAirInfo == null) {
				this.adapter.log.error(
					`setDevice(): modifiedAirInfo is not filled - please report this to the developer!`,
				);
				this.currentDeviceSetRequests--;
				return;
			}

			value = this.verifyDeviceOptionValue(deviceOption, value);

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
						this.adapter.log.error(
							"setDevice(): Unsupported value for device option - please report this to the developer!",
						);
						this.currentDeviceSetRequests--;
						return;
				}
			} else if (deviceOption == commonDefines.ErvDeviceOptions.OperationMode) {
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
						this.adapter.log.error(
							"setDevice(): Unsupported value for device option - please report this to the developer!",
						);
						this.currentDeviceSetRequests--;
						return;
				}
			} else if (deviceOption == commonDefines.ErvDeviceOptions.FanSpeed) {
				modifiedAirInfo.SetFanSpeed = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.ErvDeviceOptions.FanSpeed.effectiveFlags;
			} else {
				this.adapter.log.error("setDevice(): Unsupported device option - please report this to the developer!");
				this.currentDeviceSetRequests--;
				return;
			}

			modifiedAirInfo.HasPendingCommand = true;
			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetErv";
			const body = JSON.stringify(modifiedAirInfo);
			this.adapter.log.silly(`Request body: ${body}`);

			Axios.post(url, body, {
				httpsAgent: this.platform.customHttpsAgent,
				headers: {
					Host: "app.melcloud.com",
					"X-MitsContextKey": this.platform.contextKey,
					"Content-Type": "application/json; charset=utf-8",
				},
			})
				.then(response => {
					if (!response) {
						this.adapter.log.error(`There was a problem receiving the response from: ${url}`);
						this.airInfo = null;
					} else {
						const statusCode = response.status;
						const statusText = response.statusText;
						this.adapter.log.debug(
							`Received response from: ${url} (status code: ${statusCode} - ${statusText})`,
						);

						if (statusCode != HttpStatus.StatusCodes.OK) {
							this.airInfo = null;
							this.adapter.log.error(
								`Invalid HTTP status code (${statusCode} - ${statusText}). Changing device option failed!`,
							);
							this.currentDeviceSetRequests--;
							return;
						}

						const responseData = response.data;
						this.adapter.log.debug(`Response from cloud: ${JSON.stringify(responseData)}`);

						this.lastCommunication = responseData.LastCommunication;
						this.nextCommunication = responseData.NextCommunication;
						this.roomTemp = responseData.RoomTemperature;
						this.deviceOnline = !responseData.Offline;
						this.errorCode = responseData.ErrorCode;
						this.errorMessages = responseData.ErrorMessage;

						switch (deviceOption) {
							case commonDefines.ErvDeviceOptions.PowerState:
								this.power = responseData.Power;
								break;
							case commonDefines.ErvDeviceOptions.OperationMode:
								this.operationMode = responseData.OperationMode;
								break;
							case commonDefines.ErvDeviceOptions.FanSpeed:
								this.fanSpeed = responseData.SetFanSpeed;
								break;
							default:
								break;
						}

						this.UpdateDeviceData(deviceOption); // write updated values

						this.currentDeviceSetRequests--;

						if (this.deviceSetRequestQueue.length) {
							const args = this.deviceSetRequestQueue.shift();
							this.adapter.log.debug(
								`Dequeueing setDevice remote request for device option '${args[0].id}' with value '${args[1].value != undefined ? args[1].value : args[1]}'`,
							);
							this.setDevice.apply(this, args);
						}
					}
				})
				.catch(error => {
					this.adapter.log.error(`There was a problem setting info to: ${url}`);
					this.adapter.log.error(error);

					this.currentDeviceSetRequests--;

					if (error.response && error.response.status && error.response.status == 429) {
						this.adapter.log.error(
							"You have probably been rate limited by the MELCloud servers because of too much requests. Stop the adapter for a few hours, increase the polling interval in the settings and try again later.",
						);
					}

					if (this.deviceSetRequestQueue.length) {
						const args = this.deviceSetRequestQueue.shift();
						this.adapter.log.debug(
							`Dequeueing setDevice remote request for device option '${args[0].id}' with value '${args[1].value != undefined ? args[1].value : args[1]}'`,
						);
						this.setDevice.apply(this, args);
					}
				});
		} else {
			this.adapter.log.debug(
				`Queueing setDevice remote request for '${deviceOption.id}' with value '${value.value != undefined ? value.value : value}'...`,
			);
			this.deviceSetRequestQueue.push([deviceOption, value]);
		}
	}

	verifyDeviceOptionValue(deviceOption, value) {
		switch (deviceOption) {
			case commonDefines.ErvDeviceOptions.FanSpeed:
				if (value > this.numberOfFanSpeeds) {
					this.adapter.log.warn(
						`Fan speed limited to ${this.numberOfFanSpeeds} because device can't handle more than that!`,
					);
					return this.numberOfFanSpeeds;
				}
				return value;
			default:
				return value;
		}
	}
}

exports.MelCloudDevice = MelcloudErvDevice;
