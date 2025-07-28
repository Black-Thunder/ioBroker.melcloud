"use strict";

const Axios = require("axios").default;
const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");

class MelcloudBaseDevice {
	constructor(adapter, platform, deviceType) {
		this.adapter = adapter;
		this.platform = platform;
		this.deviceType = deviceType;

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
		this.canCool = false;
		this.canHeat = false;
		this.lastCommunication = null;
		this.nextCommunication = null;
		this.deviceOnline = false;
		this.deviceHasError = false;
		this.errorMessages = "";
		this.errorCode = 8000;

		// Control
		this.power = false;
		this.timerToggle = false;

		// Reports
		this.powerConsumptionReportStartDate = "";
		this.powerConsumptionReportEndDate = "";
		this.totalPowerConsumptionCooling = 0;
		this.totalPowerConsumptionHeating = 0;
		this.totalPowerConsumptionMinutes = 0;
		this.rawPowerConsumptionReportData = null;
		this.linkedDevicesIncludedInArregateEnergyReport = "";
	}

	async createStates(prefix, stateDefs) {
		for (const def of stateDefs) {
			const stateName = def.id != null ? `${prefix}.${def.id}` : prefix;
			await this.adapter.extendObjectAsync(stateName, def.definition);
		}
	}

	async createCommonStates() {
		let deviceTypeName = "";
		switch (this.deviceType) {
			case commonDefines.DeviceTypes.AirToAir:
				deviceTypeName = "AirToAir";
				break;
			case commonDefines.DeviceTypes.AirToWater:
				deviceTypeName = "AirToWater";
				break;
			default:
				break;
		}

		const devicePrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}`;
		await this.createStates(devicePrefix, [
			{
				id: null,
				definition: {
					type: "device",
					common: {
						statusStates: {
							onlineId: `${this.adapter.namespace}.${devicePrefix}.${commonDefines.AdapterDatapointIDs.Info}.${commonDefines.CommonDeviceStateIDs.DeviceOnline}`,
							errorId: `${this.adapter.namespace}.${devicePrefix}.${commonDefines.AdapterDatapointIDs.Info}.${commonDefines.CommonDeviceStateIDs.DeviceHasError}`,
						},
						name: `${deviceTypeName} Device ${this.id} (${this.name})`,
					},
					native: {},
				},
			},
		]);

		//#region INFO
		const infoPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Info}`;

		await this.createStates(infoPrefix, [
			{
				id: null,
				definition: {
					type: "channel",
					common: {
						name: "Device information",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.DeviceName,
				definition: {
					type: "state",
					common: {
						name: "Device name",
						type: "string",
						role: "info.name",
						read: true,
						write: false,
						def: this.name,
						desc: "MELCloud device name",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.DeviceType,
				definition: {
					type: "state",
					common: {
						name: "Device type",
						type: "number",
						role: "value",
						states: {
							0: "Air to air heat pump / air conditioner",
							1: "Air to water heat pump",
						},
						read: true,
						write: false,
						def: this.deviceType,
						desc: "MELCloud device type",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.SerialNumber,
				definition: {
					type: "state",
					common: {
						name: "Serial number",
						type: "string",
						role: "value",
						read: true,
						write: false,
						def: this.serialNumber,
						desc: "Serial number of the device",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.MacAddress,
				definition: {
					type: "state",
					common: {
						name: "MAC address",
						type: "string",
						role: "info.mac",
						read: true,
						write: false,
						def: this.macAddress,
						desc: "MAC address of the device",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.BuildingId,
				definition: {
					type: "state",
					common: {
						name: "Building ID",
						type: "number",
						role: "value",
						read: true,
						write: false,
						def: this.buildingId,
						desc: "MELCloud building ID",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.FloorId,
				definition: {
					type: "state",
					common: {
						name: "Floor ID",
						type: "number",
						role: "value",
						read: true,
						write: false,
						def: this.floorId,
						desc: "MELCloud floor ID",
					},
					native: {},
				},
			},
			{
				id: commonDefines.AtaDeviceStateIDs.CanCool,
				definition: {
					type: "state",
					common: {
						name: "Ability to cool",
						type: "boolean",
						role: "value",
						read: true,
						write: false,
						def: this.canCool,
						desc: "Ability to cool",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.LastCommunication,
				definition: {
					type: "state",
					common: {
						name: "Last communication",
						type: "string",
						role: "date",
						read: true,
						write: false,
						def: this.lastCommunication,
						desc: "Last communication date/time (MELCloud to device)",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.NextCommunication,
				definition: {
					type: "state",
					common: {
						name: "Next communication",
						type: "string",
						role: "date",
						read: true,
						write: false,
						def: this.nextCommunication,
						desc: "Next communication date/time (MELCloud to device)",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.DeviceOnline,
				definition: {
					type: "state",
					common: {
						name: "Is device online",
						type: "boolean",
						role: "indicator.reachable",
						read: true,
						write: false,
						def: this.deviceOnline,
						desc: "Indicates if device is reachable",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.DeviceHasError,
				definition: {
					type: "state",
					common: {
						name: "Has device an error",
						type: "boolean",
						role: "indicator.maintenance.alarm",
						read: true,
						write: false,
						def: this.deviceHasError,
						desc: "Indicates if device has an error",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.ErrorMessages,
				definition: {
					type: "state",
					common: {
						name: "Error messages",
						type: "string",
						role: "value",
						read: true,
						write: false,
						def: this.errorMessages,
						desc: "Current error messages",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.ErrorCode,
				definition: {
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
							8000: "No error",
						},
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
				id: null,
				definition: {
					type: "channel",
					common: {
						name: "Device control",
					},
					native: {},
				},
			},
			{
				id: commonDefines.AtaDeviceStateIDs.TimerToogle,
				definition: {
					type: "state",
					common: {
						name: "Timer toggle",
						type: "boolean",
						role: "switch.enable",
						read: true,
						write: true,
						def: this.timerToggle,
						desc: "Enable or disable the device's timer",
					},
					native: {},
				},
			},
		]);
		//#endregion

		//#region REPORTS
		const reportsPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Reports}`;

		await this.createStates(reportsPrefix, [
			{
				id: null,
				definition: {
					type: "channel",
					common: {
						name: "Device reports",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.PowerConsumptionReportStartDate,
				definition: {
					type: "state",
					common: {
						name: "Report start date (format: YYYY-MM-DD)",
						type: "string",
						role: "date",
						read: true,
						write: true,
						desc: "Report data will be collected starting at this date",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.PowerConsumptionReportEndDate,
				definition: {
					type: "state",
					common: {
						name: "Report end date (format: YYYY-MM-DD)",
						type: "string",
						role: "date",
						read: true,
						write: true,
						desc: "Report data will be collected until this date",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.GetPowerConsumptionReport,
				definition: {
					type: "state",
					common: {
						name: "Get current power consumption report",
						type: "boolean",
						role: "button",
						read: false,
						write: true,
						def: false,
						desc: "Get current power consumption report",
					},
					native: {},
				},
			},
		]);

		const lastReportDataPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.AdapterDatapointIDs.LastReportData}`;

		await this.createStates(lastReportDataPrefix, [
			{
				id: null,
				definition: {
					type: "channel",
					common: {
						name: "Last report data",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix,
				definition: {
					type: "state",
					common: {
						name: "Total power consumption for all modes",
						type: "number",
						role: "value.power.consumption",
						min: 0,
						read: true,
						write: false,
						unit: "kWh",
						def: 0,
						desc: "Total power consumption for all modes",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.TotalReportedMinutes,
				definition: {
					type: "state",
					common: {
						name: "Total power consumption minutes",
						type: "number",
						role: "value",
						min: 0,
						read: true,
						write: false,
						unit: "min",
						def: 0,
						desc: "Total operation time",
					},
					native: {},
				},
			},
			{
				id: commonDefines.CommonDeviceStateIDs.RawPowerConsumptionData,
				definition: {
					type: "state",
					common: {
						name: "Raw data of current report",
						type: "string",
						role: "json",
						read: true,
						write: false,
						desc: "Raw data of current report",
					},
					native: {},
				},
			},
		]);
		//#endregion
	}

	async UpdateCommonDeviceData() {
		//#region INFO
		const infoPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Info}.`;

		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceName,
			this.name,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.SerialNumber,
			this.serialNumber,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.MacAddress,
			this.macAddress,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.BuildingId,
			this.buildingId,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.FloorId,
			this.floorId,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.CanCool,
			this.canCool,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.CanHeat,
			this.canHeat,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.LastCommunication,
			this.lastCommunication,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.NextCommunication,
			this.nextCommunication,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceOnline,
			this.deviceOnline,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceHasError,
			this.deviceHasError,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.ErrorMessages,
			this.errorMessages,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.CommonDeviceStateIDs.ErrorCode,
			this.errorCode,
			true,
		);
		//#endregion
	}

	async UpdateCommonReportData() {
		const reportsPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Reports}.`;

		await this.adapter.setStateChangedAsync(
			reportsPrefix + commonDefines.CommonDeviceStateIDs.PowerConsumptionReportStartDate,
			this.powerConsumptionReportStartDate,
			true,
		);
		await this.adapter.setStateChangedAsync(
			reportsPrefix + commonDefines.CommonDeviceStateIDs.PowerConsumptionReportEndDate,
			this.powerConsumptionReportEndDate,
			true,
		);

		const lastReportDataPrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.AdapterDatapointIDs.LastReportData}.`;

		await this.adapter.setStateChangedAsync(
			lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalReportedMinutes,
			this.totalPowerConsumptionMinutes,
			true,
		);
		await this.adapter.setStateChangedAsync(
			lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.RawPowerConsumptionData,
			JSON.stringify(this.rawPowerConsumptionReportData),
			true,
		);
	}

	getDeviceInfo(callback, deviceOption, value) {
		if (this.airInfo != null) {
			this.adapter.log.debug(`Data already available for: ${this.id} (${this.name})`);
			callback && callback(deviceOption, value, this);

			if (this.deviceInfoRequestQueue.length) {
				const args = this.deviceInfoRequestQueue.shift();
				this.adapter.log.debug(
					`Dequeuing getDeviceInfo remote request for device option '${args[1].id}' with value '${args[2].value != undefined ? args[2].value : args[2]}'...`,
				);
				this.getDeviceInfo.apply(this, args);
			}

			return;
		}

		this.adapter.log.debug(`Getting device data for ${this.id} (${this.name})`);

		if (this.currentDeviceInfoRequests < 1) {
			this.currentDeviceInfoRequests++;

			const url = `https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/Get?id=${this.id}&buildingID=${this.buildingId}`;

			Axios.get(url, {
				httpsAgent: this.platform.customHttpsAgent,
				headers: {
					Host: "app.melcloud.com",
					"X-MitsContextKey": this.platform.contextKey,
				},
			})
				.then(response => {
					this.currentDeviceInfoRequests--;

					if (!response || !response.data || JSON.stringify(response.data).search("<!DOCTYPE html>") != -1) {
						this.adapter.log.error(`There was a problem receiving the response from: ${url}`);
						this.airInfo = null;
					} else {
						const statusCode = response.status;
						this.adapter.log.debug(
							`Received response from: ${url} (status code: ${statusCode} - ${response.statusText})`,
						);

						if (statusCode != HttpStatus.StatusCodes.OK) {
							this.airInfo = null;
							this.adapter.log.error(
								`Invalid HTTP status code (${statusCode} - ${response.statusText}). Getting device data failed!`,
							);
						} else {
							this.adapter.log.debug(`Response from cloud: ${JSON.stringify(response.data)}`);
							this.airInfo = response.data;

							// Cache airInfo data for 1 minute
							setTimeout(() => {
								this.airInfo = null;
							}, 60 * 1000);

							callback && callback(deviceOption, value, this);
						}
					}

					if (this.deviceInfoRequestQueue.length) {
						const args = this.deviceInfoRequestQueue.shift();
						this.adapter.log.debug(
							`Dequeuing getDeviceInfo remote request for device option '${args[1].id}' with value '${args[2].value != undefined ? args[2].value : args[2]}'`,
						);
						this.getDeviceInfo.apply(this, args);
					}
				})
				.catch(error => {
					this.adapter.log.error(`There was a problem getting device data from: ${url}`);
					this.adapter.log.error(`Error: ${error}`);
					this.airInfo = null;

					this.currentDeviceInfoRequests--;

					if (error.response && error.response.status && error.response.status == 429) {
						this.adapter.log.error(
							"You have probably been rate limited by the MELCloud servers because of too much requests. Stop the adapter for a few hours, increase the polling interval in the settings and try again later.",
						);
					}

					if (this.deviceInfoRequestQueue.length) {
						const args = this.deviceInfoRequestQueue.shift();
						this.adapter.log.debug(
							`Dequeuing getDeviceInfo remote request for device option '${args[1].id}' with value '${args[2].value != undefined ? args[2].value : args[2]}'`,
						);
						this.getDeviceInfo.apply(this, args);
					}
				});
		} else {
			this.adapter.log.debug(
				`Queueing getDeviceInfo remote request for '${deviceOption.id}' with value '${value.value != undefined ? value.value : value}'...`,
			);
			this.deviceInfoRequestQueue.push(arguments);
		}
	}

	async buildPowerConsumptionReportRequestBody(isCumulatedReport = false) {
		const requestBody = {};

		const startStateId = isCumulatedReport
			? `${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.CommonDeviceStateIDs.PowerConsumptionReportStartDate}`
			: `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.CommonDeviceStateIDs.PowerConsumptionReportStartDate}`;
		const startDateObj = await this.adapter.getStateAsync(startStateId);
		let startDate = startDateObj == null || startDateObj.val == null ? "" : startDateObj.val;

		const endStateId = isCumulatedReport
			? `${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.CommonDeviceStateIDs.PowerConsumptionReportEndDate}`
			: `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.CommonDeviceStateIDs.PowerConsumptionReportEndDate}`;
		const endDateObj = await this.adapter.getStateAsync(endStateId);
		let endDate = endDateObj == null || endDateObj.val == null ? "" : endDateObj.val;

		if (startDate == "") {
			this.adapter.log.warn(
				"No valid start date was provided (format: YYYY-MM-DD). Defaulting to 6 months prior.",
			);
			const d = new Date();
			d.setMonth(d.getMonth() - 6);
			startDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		}

		const parsedStartDate = startDate.split("-");
		if (
			parsedStartDate.length != 3 ||
			parsedStartDate[0].length != 4 ||
			parsedStartDate[1].length > 2 ||
			parsedStartDate[2].length > 2
		) {
			this.adapter.log.warn(
				"No valid start date was provided (format: YYYY-MM-DD). Defaulting to 6 months prior.",
			);
			const d = new Date();
			d.setMonth(d.getMonth() - 6);
			startDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		}

		if (endDate == "") {
			this.adapter.log.warn("No valid end date was provided (format: YYYY-MM-DD). Defaulting to today.");
			const d = new Date();
			endDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		}

		const parsedEndDate = endDate.split("-");
		if (
			parsedEndDate.length != 3 ||
			parsedEndDate[0].length != 4 ||
			parsedEndDate[1].length > 2 ||
			parsedEndDate[2].length > 2
		) {
			this.adapter.log.warn("No valid end date was provided (format: YYYY-MM-DD). Defaulting to today.");
			const d = new Date();
			endDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		}

		requestBody.DeviceId = this.id;
		requestBody.FromDate = `${startDate}T00:00:00`;
		requestBody.ToDate = `${endDate}T00:00:00`;
		requestBody.UseCurrency = false;

		return requestBody;
	}

	async toggleTimerState(enableTimer) {
		return new Promise((resolve, reject) => {
			this.adapter.log.debug(`${enableTimer ? `Enabling` : `Disabling`} timer for ${this.id} (${this.name})`);

			(async () => {
				// Step 1: Get current timer infos
				const getTimerUrl = `https://app.melcloud.com/Mitsubishi.Wifi.Client/Timer/Get2?deviceId=${this.id}`;

				try {
					const response = await Axios.get(getTimerUrl, {
						httpsAgent: this.platform.customHttpsAgent,
						headers: {
							Host: "app.melcloud.com",
							"X-MitsContextKey": this.platform.contextKey,
						},
					});

					if (!response) {
						this.adapter.log.error(`There was a problem receiving the response from: ${getTimerUrl}`);
						reject();
						return;
					}

					const statusCode = response.status;
					const statusText = response.statusText;
					this.adapter.log.debug(
						`Received response from: ${getTimerUrl} (status code: ${statusCode} - ${statusText})`,
					);

					if (statusCode != HttpStatus.StatusCodes.OK) {
						this.adapter.log.error(
							`Invalid HTTP status code (${statusCode} - ${statusText}). Getting timer information failed!`,
						);
						reject();
						return;
					}

					const responseData = response.data;
					this.adapter.log.debug(`Response from cloud: ${JSON.stringify(responseData)}`);

					this.timerToggle = responseData.Enabled;
					this.adapter.setStateChangedAsync(
						`${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Control}.${commonDefines.AtaDeviceStateIDs.TimerToogle}`,
						this.timerToggle,
						true,
					);

					if (enableTimer == this.timerToggle) {
						this.adapter.log.warn(
							`Timer for ${this.id} (${this.name}) is already ${enableTimer ? `enabled` : `disabled`}. Ignoring request.`,
						);
						resolve();
						return;
					}

					if (responseData.Seasons[0].Events.length == 0) {
						this.adapter.log.warn(
							`No timer events for ${this.id} (${this.name}) set. Please set them first in the MelCloud app/website before toggling it here. Ignoring request.`,
						);
						resolve();
						return;
					}

					// Step 2: Set desired timer state with infos retrieved from step 1
					const toggleRequest = response.data;
					toggleRequest.Devices = this.id;
					toggleRequest.TimerEnabled = enableTimer;
					toggleRequest.SkipPage1 = true;

					const setTimerUrl = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Timer/SetAta2";
					const body = JSON.stringify(toggleRequest);
					this.adapter.log.silly(`Request body: ${body}`);

					try {
						const setResponse = await Axios.post(setTimerUrl, body, {
							httpsAgent: this.platform.customHttpsAgent,
							headers: {
								Host: "app.melcloud.com",
								"X-MitsContextKey": this.platform.contextKey,
								"Content-Type": "application/json; charset=utf-8",
							},
						});

						if (!setResponse) {
							this.adapter.log.error(`There was a problem receiving the response from: ${setTimerUrl}`);
							reject();
							return;
						}

						const setStatusCode = setResponse.status;
						const setStatusText = setResponse.statusText;
						this.adapter.log.debug(
							`Received response from: ${setTimerUrl} (status code: ${setStatusCode} - ${setStatusText})`,
						);

						if (setStatusCode != HttpStatus.StatusCodes.OK) {
							this.adapter.log.error(
								`Invalid HTTP status code (${setStatusCode} - ${setStatusText}). Toggling timer failed!`,
							);
							reject();
							return;
						}

						const setResponseData = setResponse.data;
						this.adapter.log.debug(`Response from cloud: ${JSON.stringify(setResponseData)}`);

						if (setResponseData.Success == true) {
							this.timerToggle = enableTimer;
							this.adapter.setStateChangedAsync(
								`${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Control}.${commonDefines.AtaDeviceStateIDs.TimerToogle}`,
								this.timerToggle,
								true,
							);
							resolve();
						} else {
							this.adapter.log.error(
								`${enableTimer ? `Enabling` : `Disabling`} timer failed with error code ${setResponseData.Data.ErrorCode}`,
							);
							reject();
						}
					} catch (error) {
						this.adapter.log.error(`There was a problem setting timer to: ${setTimerUrl}`);
						this.adapter.log.error(error);

						if (error.response && error.response.status && error.response.status == 429) {
							this.adapter.log.error(
								"You have probably been rate limited by the MELCloud servers because of too much requests. Stop the adapter for a few hours, increase the polling interval in the settings and try again later.",
							);
						}
						reject();
					}
				} catch (error) {
					this.adapter.log.error(`There was a problem getting timer information from: ${getTimerUrl}`);
					this.adapter.log.error(`Error: ${error}`);

					if (error.response && error.response.status && error.response.status == 429) {
						this.adapter.log.error(
							"You have probably been rate limited by the MELCloud servers because of too much requests. Stop the adapter for a few hours, increase the polling interval in the settings and try again later.",
						);
					}
					reject();
				}
			})();
		});
	}
}

module.exports = MelcloudBaseDevice;
