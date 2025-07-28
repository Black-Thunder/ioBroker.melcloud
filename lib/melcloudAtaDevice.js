"use strict";

const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");
const MelcloudBaseDevice = require("./melcloudBaseDevice");
const Axios = require("axios").default;

class MelcloudAtaDevice extends MelcloudBaseDevice {
	constructor(adapter, platform) {
		super(adapter, platform, commonDefines.DeviceTypes.AirToAir);

		// Info
		this.canDry = false;
		this.minTempCoolDry = 0;
		this.maxTempCoolDry = 0;
		this.minTempHeat = 0;
		this.maxTempHeat = 0;
		this.minTempAuto = 0;
		this.maxTempAuto = 0;
		this.roomTemp = 0;
		this.actualFanSpeed = 0;
		this.numberOfFanSpeeds = 0;

		// Control
		this.operationMode = commonDefines.AtaDeviceOperationModes.UNDEF.value;
		this.targetTemp = 0;
		this.fanSpeed = 0;
		this.vaneVerticalDirection = 0;
		this.vaneHorizontalDirection = 0;

		// Reports
		this.totalPowerConsumptionAuto = 0;
		this.totalPowerConsumptionDry = 0;
		this.totalPowerConsumptionVent = 0;
	}

	// Creates all necessery states and channels and writes the values into the DB
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
				id: commonDefines.AtaDeviceStateIDs.CanDry,
				definition: {
					type: "state",
					common: {
						name: "Ability to dry",
						type: "boolean",
						role: "value",
						read: true,
						write: false,
						def: this.canDry,
						desc: "Ability to dry",
					},
					native: {},
				},
			},
			{
				id: commonDefines.AtaDeviceStateIDs.MinTempCoolDry,
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
				id: commonDefines.AtaDeviceStateIDs.MaxTempCoolDry,
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
				id: commonDefines.AtaDeviceStateIDs.MinTempAuto,
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
				id: commonDefines.AtaDeviceStateIDs.MaxTempAuto,
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
				id: commonDefines.AtaDeviceStateIDs.RoomTemp,
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
						desc: "Maximal temperature in auto-mode",
					},
					native: {},
				},
			},
			{
				id: commonDefines.AtaDeviceStateIDs.FanSpeedAuto,
				definition: {
					type: "state",
					common: {
						name: "Fan speed (while in auto mode)",
						type: "number",
						role: "value",
						read: true,
						write: false,
						def: this.actualFanSpeed,
						desc: "Actual fan speed when fan is set to auto mode",
					},
					native: {},
				},
			},
			{
				id: commonDefines.AtaDeviceStateIDs.NumberOfFanSpeeds,
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

		if (this.canHeat) {
			await this.createStates(infoPrefix, [
				{
					id: commonDefines.AtaDeviceStateIDs.MinTempHeat,
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
					id: commonDefines.AtaDeviceStateIDs.MaxTempHeat,
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
			]);
		}
		//#endregion

		//#region CONTROL
		const controlPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Control}`;
		const minTemp = Math.min(this.minTempAuto, this.minTempCoolDry, this.minTempHeat);
		const maxTemp = Math.max(this.maxTempAuto, this.maxTempCoolDry, this.maxTempHeat);

		await this.createStates(controlPrefix, [
			{
				id: commonDefines.AtaDeviceStateIDs.Power,
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
				id: commonDefines.AtaDeviceStateIDs.Mode,
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
							1: "HEAT",
							2: "DRY",
							3: "COOL",
							7: "VENT",
							8: "AUTO",
						},
					},
					native: {},
				},
			},
			{
				id: commonDefines.AtaDeviceStateIDs.TargetTemp,
				definition: {
					type: "state",
					common: {
						name: "Target temperature",
						type: "number",
						role: "level.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						min: minTemp,
						max: maxTemp,
						step: 0.5,
						read: true,
						write: true,
						def: this.targetTemp,
						desc: "Target temperature of the device",
					},
					native: {},
				},
			},
			{
				id: commonDefines.AtaDeviceStateIDs.FanSpeedManual,
				definition: {
					type: "state",
					common: {
						name: "Fan speed (while in manual mode)",
						type: "number",
						role: "value",
						min: 0,
						max: 5,
						states: {
							0: "AUTO",
							1: "LOWEST",
							2: "LOW",
							3: "MEDIUM",
							4: "HIGH",
							5: "MAX",
						},
						read: true,
						write: true,
						def: this.fanSpeed,
						desc: "Current fan speed of the device (while in manual mode)",
					},
					native: {},
				},
			},
			{
				id: commonDefines.AtaDeviceStateIDs.VaneVerticalDirection,
				definition: {
					type: "state",
					common: {
						name: "Vane vertical direction",
						type: "number",
						role: "value",
						min: 0,
						max: 7,
						states: {
							0: "AUTO",
							1: "TOPMOST",
							2: "UP",
							3: "MIDDLE",
							4: "DOWN",
							5: "BOTTOMMOST",
							7: "SWING",
						},
						read: true,
						write: true,
						def: this.vaneVerticalDirection,
						desc: "Current vertical direction of the device's vane",
					},
					native: {},
				},
			},
			{
				id: commonDefines.AtaDeviceStateIDs.VaneHorizontalDirection,
				definition: {
					type: "state",
					common: {
						name: "Vane horizontal direction",
						type: "number",
						role: "value",
						min: 0,
						max: 12,
						states: {
							0: "AUTO",
							1: "LEFTMOST",
							2: "LEFT",
							3: "MIDDLE",
							4: "RIGHT",
							5: "RIGHTMOST",
							8: "50/50",
							12: "SWING",
						},
						read: true,
						write: true,
						def: this.vaneHorizontalDirection,
						desc: "Current horizontal direction of the device's vane",
					},
					native: {},
				},
			},
		]);
		//#endregion

		//#region REPORTS
		const lastReportDataPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.AdapterDatapointIDs.LastReportData}`;
		const reportModes = [
			commonDefines.AtaDeviceOperationModes.HEAT.id,
			commonDefines.AtaDeviceOperationModes.COOL.id,
			commonDefines.AtaDeviceOperationModes.AUTO.id,
			commonDefines.AtaDeviceOperationModes.VENT.id,
			commonDefines.AtaDeviceOperationModes.DRY.id,
		];

		reportModes.forEach(mode => async () => {
			if (
				(mode == commonDefines.AtaDeviceOperationModes.HEAT.id && !this.canHeat) ||
				(mode == commonDefines.AtaDeviceOperationModes.DRY.id && !this.canDry) ||
				(mode == commonDefines.AtaDeviceOperationModes.COOL.id && !this.canCool)
			) {
				return;
			}

			await this.createStates(lastReportDataPrefix, [
				{
					id: lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + mode,
					definition: {
						type: "state",
						common: {
							name: `Total power consumption for mode '${mode}'`,
							type: "number",
							role: "value.power.consumption",
							min: 0,
							read: true,
							write: false,
							unit: "kWh",
							def: 0,
							desc: `Total power consumption for mode '${mode}'`,
						},
						native: {},
					},
				},
			]);
		});
		//#endregion

		this.adapter.log.debug(`Created and saved ATA device ${this.id} (${this.name})`);
		this.hasBeenCreated = true;
	}

	// Only writes changed device data into the DB
	async UpdateDeviceData(deviceOption) {
		super.UpdateCommonDeviceData();

		//#region INFO
		const infoPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Info}.`;

		await this.adapter.setStateChangedAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.CanDry, this.canDry, true);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempCoolDry,
			this.minTempCoolDry,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempCoolDry,
			this.maxTempCoolDry,
			true,
		);
		if (this.canHeat) {
			await this.adapter.setStateChangedAsync(
				infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempHeat,
				this.minTempHeat,
				true,
			);
		}
		if (this.canHeat) {
			await this.adapter.setStateChangedAsync(
				infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempHeat,
				this.maxTempHeat,
				true,
			);
		}
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempAuto,
			this.minTempAuto,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempAuto,
			this.maxTempAuto,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtaDeviceStateIDs.RoomTemp,
			this.roomTemp,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedAuto,
			this.actualFanSpeed,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtaDeviceStateIDs.NumberOfFanSpeeds,
			this.numberOfFanSpeeds,
			true,
		);
		//#endregion

		//#region CONTROL
		const controlPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Control}.`;

		switch (deviceOption) {
			case commonDefines.AtaDeviceOptions.PowerState:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.Power,
					this.power,
					true,
				);
				break;
			case commonDefines.AtaDeviceOptions.TargetHeatingCoolingState:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.Mode,
					this.operationMode,
					true,
				);
				break;
			case commonDefines.AtaDeviceOptions.TargetTemperature:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.TargetTemp,
					this.targetTemp,
					true,
				);
				break;
			case commonDefines.AtaDeviceOptions.FanSpeed:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedManual,
					this.fanSpeed,
					true,
				);
				break;
			case commonDefines.AtaDeviceOptions.VaneHorizontalDirection:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.VaneHorizontalDirection,
					this.vaneHorizontalDirection,
					true,
				);
				break;
			case commonDefines.AtaDeviceOptions.VaneVerticalDirection:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.VaneVerticalDirection,
					this.vaneVerticalDirection,
					true,
				);
				break;
			case "ALL":
			default:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.Power,
					this.power,
					true,
				);
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.Mode,
					this.operationMode,
					true,
				);
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.TargetTemp,
					this.targetTemp,
					true,
				);
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedManual,
					this.fanSpeed,
					true,
				);
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.VaneHorizontalDirection,
					this.vaneHorizontalDirection,
					true,
				);
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtaDeviceStateIDs.VaneVerticalDirection,
					this.vaneVerticalDirection,
					true,
				);
				break;
		}
		//#endregion

		this.adapter.log.debug(`Updated device data for ATA device ${this.id} (${this.name})`);
	}

	// Only writes changed report data into the DB
	async UpdateReportData() {
		await super.UpdateCommonReportData();

		const lastReportDataPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.AdapterDatapointIDs.LastReportData}.`;
		let totalConsumption = 0;
		if (this.canCool) {
			await this.adapter.setStateChangedAsync(
				lastReportDataPrefix +
					commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix +
					commonDefines.AtaDeviceOperationModes.COOL.id,
				commonDefines.roundValue(this.totalPowerConsumptionCooling, 3),
				true,
			);
			totalConsumption += this.totalPowerConsumptionCooling;
		}

		if (this.canHeat) {
			await this.adapter.setStateChangedAsync(
				lastReportDataPrefix +
					commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix +
					commonDefines.AtaDeviceOperationModes.HEAT.id,
				commonDefines.roundValue(this.totalPowerConsumptionHeating, 3),
				true,
			);
			totalConsumption += this.totalPowerConsumptionHeating;
		}

		await this.adapter.setStateChangedAsync(
			lastReportDataPrefix +
				commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix +
				commonDefines.AtaDeviceOperationModes.AUTO.id,
			commonDefines.roundValue(this.totalPowerConsumptionAuto, 3),
			true,
		);
		totalConsumption += this.totalPowerConsumptionAuto;

		if (this.canDry) {
			await this.adapter.setStateChangedAsync(
				lastReportDataPrefix +
					commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix +
					commonDefines.AtaDeviceOperationModes.DRY.id,
				commonDefines.roundValue(this.totalPowerConsumptionDry, 3),
				true,
			);
			totalConsumption += this.totalPowerConsumptionDry;
		}

		await this.adapter.setStateChangedAsync(
			lastReportDataPrefix +
				commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix +
				commonDefines.AtaDeviceOperationModes.VENT.id,
			commonDefines.roundValue(this.totalPowerConsumptionVent, 3),
			true,
		);
		totalConsumption += this.totalPowerConsumptionVent;

		await this.adapter.setStateChangedAsync(
			lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix,
			commonDefines.roundValue(totalConsumption, 3),
			true,
		);

		this.adapter.log.debug(`Updated report data for device ${this.id} (${this.name})`);
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
				return;
			}

			value = this.verifyDeviceOptionValue(deviceOption, value);

			if (deviceOption == commonDefines.AtaDeviceOptions.PowerState) {
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
						return;
				}
			} else if (deviceOption == commonDefines.AtaDeviceOptions.TargetHeatingCoolingState) {
				switch (value) {
					case commonDefines.AtaDeviceOperationModes.HEAT:
						modifiedAirInfo.OperationMode = commonDefines.AtaDeviceOperationModes.HEAT.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOperationModes.HEAT.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.DRY:
						modifiedAirInfo.OperationMode = commonDefines.AtaDeviceOperationModes.DRY.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOperationModes.DRY.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.COOL:
						modifiedAirInfo.OperationMode = commonDefines.AtaDeviceOperationModes.COOL.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOperationModes.COOL.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.VENT:
						modifiedAirInfo.OperationMode = commonDefines.AtaDeviceOperationModes.VENT.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOperationModes.VENT.effectiveFlags;
						break;
					case commonDefines.AtaDeviceOperationModes.AUTO:
						modifiedAirInfo.OperationMode = commonDefines.AtaDeviceOperationModes.AUTO.value;
						modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOperationModes.AUTO.effectiveFlags;
						break;
					default:
						this.adapter.log.error(
							"setDevice(): Unsupported value for device option - please report this to the developer!",
						);
						return;
				}
			} else if (deviceOption == commonDefines.AtaDeviceOptions.TargetTemperature) {
				modifiedAirInfo.SetTemperature = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOptions.TargetTemperature.effectiveFlags;
			} else if (deviceOption == commonDefines.AtaDeviceOptions.FanSpeed) {
				modifiedAirInfo.SetFanSpeed = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOptions.FanSpeed.effectiveFlags;
			} else if (deviceOption == commonDefines.AtaDeviceOptions.VaneHorizontalDirection) {
				modifiedAirInfo.VaneHorizontal = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOptions.VaneHorizontalDirection.effectiveFlags;
			} else if (deviceOption == commonDefines.AtaDeviceOptions.VaneVerticalDirection) {
				modifiedAirInfo.VaneVertical = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtaDeviceOptions.VaneVerticalDirection.effectiveFlags;
			} else {
				this.adapter.log.error("setDevice(): Unsupported device option - please report this to the developer!");
				return;
			}

			modifiedAirInfo.HasPendingCommand = true;
			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetAta";
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
						return;
					}

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
						case commonDefines.AtaDeviceOptions.PowerState:
							this.power = responseData.Power;
							break;
						case commonDefines.AtaDeviceOptions.TargetHeatingCoolingState:
							this.operationMode = responseData.OperationMode;
							break;
						case commonDefines.AtaDeviceOptions.TargetTemperature:
							this.targetTemp = responseData.SetTemperature;
							break;
						case commonDefines.AtaDeviceOptions.FanSpeed:
							this.fanSpeed = responseData.SetFanSpeed;
							break;
						case commonDefines.AtaDeviceOptions.VaneHorizontalDirection:
							this.vaneHorizontalDirection = responseData.VaneHorizontal;
							break;
						case commonDefines.AtaDeviceOptions.VaneVerticalDirection:
							this.vaneVerticalDirection = responseData.VaneVertical;
							break;
						default:
							break;
					}

					this.UpdateDeviceData(deviceOption); // write updated values

					this.currentDeviceSetRequests--;

					if (this.deviceSetRequestQueue.length) {
						const args = this.deviceSetRequestQueue.shift();
						this.adapter.log.debug(
							`Dequeuing setDevice remote request for device option '${args[0].id}' with value '${args[1].value != undefined ? args[1].value : args[1]}'`,
						);
						this.setDevice.apply(this, args);
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
							`Dequeuing setDevice remote request for device option '${args[0].id}' with value '${args[1].value != undefined ? args[1].value : args[1]}'`,
						);
						this.setDevice.apply(this, args);
					}
				});
		} else {
			this.adapter.log.debug(
				`Queueing setDevice remote request for '${deviceOption.id}' with value '${value.value != undefined ? value.value : value}'...`,
			);
			this.deviceSetRequestQueue.push(arguments);
		}
	}

	verifyDeviceOptionValue(deviceOption, value) {
		switch (deviceOption) {
			case commonDefines.AtaDeviceOptions.FanSpeed:
				if (value > this.numberOfFanSpeeds) {
					this.adapter.log.warn(
						`Fan speed limited to ${this.numberOfFanSpeeds} because device can't handle more than that!`,
					);
					return this.numberOfFanSpeeds;
				}
				return value;
			case commonDefines.AtaDeviceOptions.TargetTemperature:
				// eslint-disable-next-line no-case-declarations
				let min, max;
				switch (this.operationMode) {
					case commonDefines.AtaDeviceOperationModes.COOL.value:
					case commonDefines.AtaDeviceOperationModes.DRY.value:
						min = this.minTempCoolDry;
						max = this.maxTempCoolDry;
						break;
					case commonDefines.AtaDeviceOperationModes.HEAT.value:
						min = this.minTempHeat;
						max = this.maxTempHeat;
						break;
					case commonDefines.AtaDeviceOperationModes.AUTO.value:
						min = this.minTempAuto;
						max = this.maxTempAuto;
						break;
					default:
						min = this.platform.UseFahrenheit ? 60 : 16;
						max = this.platform.UseFahrenheit ? 104 : 40;
						break;
				}
				if (value < min) {
					value = min;
					this.adapter.log.warn(
						`SetTemperature limited to ${min} because device can't handle lower than that!`,
					);
				} else if (value > max) {
					value = max;
					this.adapter.log.warn(
						`SetTemperature limited to ${max} because device can't handle more than that!`,
					);
				}
				return value;
			case commonDefines.AtaDeviceOptions.VaneHorizontalDirection:
				if (value < 0 || (value > 5 && value != 8 && value != 12)) {
					this.adapter.log.warn(
						`VaneHorizontalDirection: unsupported value '${value}' - falling back to '0'!`,
					);
					value = 0;
				}
				return value;
			case commonDefines.AtaDeviceOptions.VaneVerticalDirection:
				if (value < 0 || (value > 5 && value != 7)) {
					this.adapter.log.warn(`VaneVerticalDirection: unsupported value '${value}' - falling back to '0'!`);
					value = 0;
				}
				return value;
			case commonDefines.AtaDeviceOptions.TargetHeatingCoolingState:
				if (value == commonDefines.AtaDeviceOperationModes.COOL.value && !this.canCool) {
					this.adapter.log.warn(
						`TargetHeatingCoolingState: unsupported value '${value}'. Device can not cool!`,
					);
				} else if (value == commonDefines.AtaDeviceOperationModes.DRY.value && !this.canDry) {
					this.adapter.log.warn(
						`TargetHeatingCoolingState: unsupported value '${value}'. Device can not dry!`,
					);
				} else if (value == commonDefines.AtaDeviceOperationModes.HEAT.value && !this.canHeat) {
					this.adapter.log.warn(
						`TargetHeatingCoolingState: unsupported value '${value}'. Device can not heat!`,
					);
				}
				return value; // don't modify the value as the correct value cant't be known here
			default:
				return value;
		}
	}

	async getPowerConsumptionReport(isCumulatedReport = false) {
		return new Promise((resolve, reject) => {
			this.adapter.log.debug(`Getting power consumption report for ${this.id} (${this.name})`);

			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/EnergyCost/Report";
			this.buildPowerConsumptionReportRequestBody(isCumulatedReport)
				.then(requestBody => {
					const body = JSON.stringify(requestBody);
					this.adapter.log.silly(`Request body: ${body}`);

					if (body == "{}") {
						return; // creating body failed or was provided dates were invalid
					}

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
								reject();
							} else {
								const statusCode = response.status;
								const statusText = response.statusText;
								this.adapter.log.debug(
									`Received response from: ${url} (status code: ${statusCode} - ${statusText})`,
								);

								if (statusCode != HttpStatus.StatusCodes.OK) {
									this.adapter.log.error(
										`Invalid HTTP status code (${statusCode} - ${statusText}). Getting power consumption report failed!`,
									);
									reject();
									return;
								}

								const responseData = response.data;
								this.adapter.log.debug(`Response from cloud: ${JSON.stringify(responseData)}`);

								// only save date portion of timestamp without the empty time
								let timestampPos = responseData.FromDate.indexOf("T");
								if (timestampPos != -1) {
									this.powerConsumptionReportStartDate = responseData.FromDate.substring(
										0,
										timestampPos,
									);
								} else {
									this.powerConsumptionReportStartDate = responseData.FromDate;
								}

								timestampPos = responseData.ToDate.indexOf("T");
								if (timestampPos != -1) {
									this.powerConsumptionReportEndDate = responseData.ToDate.substring(0, timestampPos);
								} else {
									this.powerConsumptionReportEndDate = responseData.ToDate;
								}

								// round all consumption values to 3 digits
								this.totalPowerConsumptionCooling = responseData.TotalCoolingConsumed;
								this.totalPowerConsumptionHeating = responseData.TotalHeatingConsumed;
								this.totalPowerConsumptionAuto = responseData.TotalAutoConsumed;
								this.totalPowerConsumptionDry = responseData.TotalDryConsumed;
								this.totalPowerConsumptionVent = responseData.TotalFanConsumed;
								this.totalPowerConsumptionMinutes = responseData.TotalMinutes;

								this.rawPowerConsumptionReportData = responseData;
								this.linkedDevicesIncludedInArregateEnergyReport =
									responseData.LinkedDevicesIncludedInArregateEnergyReport;

								this.UpdateReportData();
								resolve();
							}
						})
						.catch(error => {
							this.adapter.log.error(`There was a problem getting power consumption report from: ${url}`);
							this.adapter.log.error(`Error: ${error}`);

							if (error.response && error.response.status && error.response.status == 429) {
								this.adapter.log.error(
									"You have probably been rate limited by the MELCloud servers because of too much requests. Stop the adapter for a few hours, increase the polling interval in the settings and try again later.",
								);
							}

							reject();
						});
				})
				.catch(reject);
		});
	}
}

exports.MelCloudDevice = MelcloudAtaDevice;
