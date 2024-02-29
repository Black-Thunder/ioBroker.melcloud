"use strict";

/*
 * Created with @iobroker/create-adapter v1.24.1
 */

// The adapter-core module gives you access to the core ioBroker functions
const utils = require("@iobroker/adapter-core");

// Needed modules
const cloudPlatform = require("./lib/melcloudPlatform");
const commonDefines = require("./lib/commonDefines");

let gthis = null; // global to 'this' of Melcloud main instance
let CloudPlatform = null;
const stateValueCache = {}; // used to store all adapter state values to check for unchanged values

class Melcloud extends utils.Adapter {
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		// @ts-ignore
		super({
			...options,
			name: "melcloud",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("unload", this.onUnload.bind(this));
		gthis = this;
		this.deviceObjects = []; // array of all device objects
		this.currentKnownDeviceIDs = []; // array of all current known device IDs
	}

	async checkSettings() {
		this.log.debug("Checking adapter settings...");

		if (this.config.melCloudEmail == null || this.config.melCloudEmail == "") {
			throw new Error("MELCloud username empty! Check settings.");
		}

		if (this.config.melCloudPassword == null || this.config.melCloudPassword == "") {
			throw new Error("MELCloud password empty! Check settings.");
		}

		// Minimum pollingInterval = 5 to prevent rate limiting
		if (this.config.pollingInterval < 5) {
			this.config.pollingInterval = 5;
			this.log.warn("Polling interval can't be set lower than 5 minutes to avoid being throttled by the MELCloud servers. Now set to 5 minutes.");
		}
	}

	async setAdapterConnectionState(isConnected) {
		await this.setStateChangedAsync(`${commonDefines.AdapterDatapointIDs.Info}.${commonDefines.AdapterStateIDs.Connection}`, isConnected, true);
		await this.setForeignState(`system.adapter.${this.namespace}.connected`, isConnected, true);
	}

	async saveKnownDeviceIDs() {
		this.log.debug("Getting current known devices...");
		const prefix = `${this.namespace}.${commonDefines.AdapterDatapointIDs.Devices}.`;
		const objects = await this.getAdapterObjectsAsync();

		for (const id of Object.keys(objects)) {
			if (!id.startsWith(prefix)) {
				continue;
			}

			const deviceIdTemp = id.replace(prefix, "");
			const deviceId = parseInt(deviceIdTemp.substring(0, deviceIdTemp.lastIndexOf(".")), 10);

			// Add each device only one time
			if (!isNaN(deviceId) && !this.currentKnownDeviceIDs.includes(deviceId)) {
				this.currentKnownDeviceIDs.push(deviceId);
				this.log.debug(`Found known device: ${deviceId}`);
			}
		}

		if (this.currentKnownDeviceIDs.length == 0) {
			this.log.debug("No known devices found.");
		}
	}

	async deleteMelDevice(id) {
		const prefix = `${this.namespace}.${commonDefines.AdapterDatapointIDs.Devices}.${id}`;
		const objects = await this.getAdapterObjectsAsync();

		for (const id of Object.keys(objects)) {
			if (id.startsWith(prefix)) {
				const objID = id.replace(`${this.namespace}.`, "");
				this.log.debug(`Deleting state '${objID}'`);
				await this.delObjectAsync(objID);
			}
		}
	}

	async initObjects() {
		this.log.debug("Initializing objects...");

		await this.setObjectNotExistsAsync(commonDefines.AdapterDatapointIDs.Devices, {
			type: "folder",
			common: {
				name: "Devices",
			},
			native: {},
		});

		//#region INFO
		await this.setObjectNotExistsAsync(commonDefines.AdapterDatapointIDs.Info, {
			type: "channel",
			common: {
				name: "Adapter information"
			},
			native: {}
		});

		await this.setObjectNotExistsAsync(`${commonDefines.AdapterDatapointIDs.Info}.${commonDefines.AdapterStateIDs.Connection}`, {
			type: "state",
			common: {
				name: "Connection to cloud",
				type: "boolean",
				role: "indicator.connected",
				read: true,
				write: false,
				def: false,
				desc: "Indicates if connection to MELCloud was successful or not"
			},
			native: {}
		});
		this.setAdapterConnectionState(false);
		//#endregion

		//#region REPORTS (cumulated for all supported devices)
		let reportsPrefix = `${commonDefines.AdapterDatapointIDs.Reports}`;

		await this.setObjectNotExistsAsync(reportsPrefix, {
			type: "channel",
			common: {
				name: "Cumulated report for all supported devices"
			},
			native: {}
		});

		reportsPrefix += ".";

		await this.setObjectNotExistsAsync(reportsPrefix + commonDefines.CommonDeviceStateIDs.PowerConsumptionReportStartDate, {
			type: "state",
			common: {
				name: "Report start date (format: YYYY-MM-DD)",
				type: "string",
				role: "date",
				read: true,
				write: true,
				desc: "Report data will be collected starting at this date"
			},
			native: {}
		});

		await this.setObjectNotExistsAsync(reportsPrefix + commonDefines.CommonDeviceStateIDs.PowerConsumptionReportEndDate, {
			type: "state",
			common: {
				name: "Report end date (format: YYYY-MM-DD)",
				type: "string",
				role: "date",
				read: true,
				write: true,
				desc: "Report data will be collected until this date"
			},
			native: {}
		});

		await this.setObjectNotExistsAsync(reportsPrefix + commonDefines.CommonDeviceStateIDs.GetCumulatedPowerConsumptionReport, {
			type: "state",
			common: {
				name: "Get current power consumption report for all supported devices",
				type: "boolean",
				role: "button",
				read: false,
				write: true,
				def: false,
				desc: "Get current power consumption report for all supported devices"
			},
			native: {}
		});

		let lastReportDataPrefix = `${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.AdapterDatapointIDs.LastReportData}`;
		await this.setObjectNotExistsAsync(lastReportDataPrefix, {
			type: "channel",
			common: {
				name: "Last report data for all supported devices"
			},
			native: {}
		});

		lastReportDataPrefix += ".";
		const reportModes = [commonDefines.AtaDeviceOperationModes.HEAT.id, commonDefines.AtaDeviceOperationModes.COOL.id, commonDefines.AtaDeviceOperationModes.AUTO.id, commonDefines.AtaDeviceOperationModes.VENT.id, commonDefines.AtaDeviceOperationModes.DRY.id, "HotWater"];

		reportModes.forEach(mode => {
			this.setObjectNotExistsAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + mode, {
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
					desc: `Total power consumption for mode '${mode}'`
				},
				native: {}
			});

			if (mode == commonDefines.AtaDeviceOperationModes.AUTO.id || mode == commonDefines.AtaDeviceOperationModes.DRY.id || mode == commonDefines.AtaDeviceOperationModes.VENT.id) return;

			this.setObjectNotExistsAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerProductionPrefix + mode, {
				type: "state",
				common: {
					name: `Total power production for mode '${mode}'`,
					type: "number",
					role: "value.power.consumption",
					min: 0,
					read: true,
					write: false,
					unit: "kWh",
					def: 0,
					desc: `Total power production for mode '${mode}'`
				},
				native: {}
			});
		});

		await this.setObjectNotExistsAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix, {
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
				desc: "Total power consumption for all modes"
			},
			native: {}
		});

		await this.setObjectNotExistsAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerProductionPrefix, {
			type: "state",
			common: {
				name: "Total power production for all modes",
				type: "number",
				role: "value.power.consumption",
				min: 0,
				read: true,
				write: false,
				unit: "kWh",
				def: 0,
				desc: "Total power production for all modes"
			},
			native: {}
		});

		await this.setObjectNotExistsAsync(lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalReportedMinutes, {
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
				desc: "Total operation time"
			},
			native: {}
		});
		//#endregion
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.initObjects()
			.then(() => this.checkSettings()
				.then(() => this.saveKnownDeviceIDs()
					.then(() => {
						this.connectToCloud();
						this.subscribeStates("devices.*.control.*"); // subscribe to states changes under "devices.X.control."
						this.subscribeStates("devices.*.reports.getPowerConsumptionReport"); // subscribe to state "devices.X.reports.getPowerConsumptionReport"
						this.subscribeStates("reports.getCumulatedPowerConsumptionReport"); // subscribe to state "reports.getCumulatedPowerConsumptionReport"
					})
				)
			)
			.catch(err => this.log.error(err));
	}

	async connectToCloud() {
		gthis.log.info("Connecting initially to MELCloud and retrieving data...");

		// Connect to cloud and retrieve/update registered devices initially
		CloudPlatform = new cloudPlatform.MelCloudPlatform(gthis);

		if (this.config.enablePolling) {
			CloudPlatform.GetContextKey(CloudPlatform.CreateAndSaveDevices, CloudPlatform.startPolling);
		}
		else {
			CloudPlatform.GetContextKey(CloudPlatform.CreateAndSaveDevices);
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.setAdapterConnectionState(false);
			this.deviceObjects.length = 0;
			if (CloudPlatform != null) {
				CloudPlatform.stopPolling();
				CloudPlatform.stopContextKeyInvalidation();
			}

			this.log.info("onUnload(): Cleaned everything up...");
			callback();
			// eslint-disable-next-line no-unused-vars
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		// The state was changed
		if (state) {
			// always trigger on "getPowerConsumptionReport" and "getCumulatedPowerConsumptionReport" ignoring if the value has changed or not
			if (!id.includes(commonDefines.CommonDeviceStateIDs.GetPowerConsumptionReport) && !id.includes(commonDefines.CommonDeviceStateIDs.GetCumulatedPowerConsumptionReport)
				&& stateValueCache[id] != undefined && stateValueCache[id] != null && stateValueCache[id] == state.val) {
				this.log.silly(`state ${id} unchanged: ${state.val} (ack = ${state.ack})`);
				return;
			}

			stateValueCache[id] = state.val;

			this.log.silly(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

			// ack is true when state was updated by MELCloud --> in this case, we don't need to send it again
			if (state.ack) {
				this.log.silly("Updated data was retrieved from MELCloud. No need to process changed data.");
				return;
			}

			if (this.deviceObjects.length == 0) {
				this.log.error("No objects for MELCloud devices constructed yet. Try again in a few seconds...");
				return;
			}

			// "reports.getCumulatedPowerConsumptionReport"
			if (id.includes(commonDefines.CommonDeviceStateIDs.GetCumulatedPowerConsumptionReport)) {
				this.log.debug(`Processing command '${commonDefines.CommonDeviceStateIDs.GetCumulatedPowerConsumptionReport}' with value '${state.val}' for all devices...`);
				this.GetCumulatedReport();
			}
			// "devices.XXX.control.*" and "devices.XXX.reports.getPowerConsumptionReport"
			else {
				let deviceId = id.replace(`${this.namespace}.${commonDefines.AdapterDatapointIDs.Devices}.`, "");
				deviceId = deviceId.substring(0, deviceId.indexOf("."));

				// Get the device object that should be changed
				this.log.debug(`Trying to get device object with id ${deviceId}...`);
				const device = this.deviceObjects.find(obj => {
					return obj.id === parseInt(deviceId);
				});

				if (device == null) {
					let knownIds = "";
					this.deviceObjects.forEach(obj => knownIds += `${obj.id}, `);
					this.log.error(`Failed to get device object. Known object IDs: ${knownIds}`);
					this.log.error("This should not happen - report this to the developer!");
					return;
				}

				const controlOption = id.substring(id.lastIndexOf(".") + 1, id.length);
				this.log.debug(`Processing command '${controlOption}' with value '${state.val}' for device object with id ${device.id} (${device.name})...`);

				const type = device.deviceType;

				switch (type) {
					case commonDefines.DeviceTypes.AirToAir: this.processAtaDeviceCommand(controlOption, state, device); break;
					case commonDefines.DeviceTypes.AirToWater: this.processAtwDeviceCommand(controlOption, state, device); break;
					default: this.log.error(`Unsupported device type: '${type}' - Please report this to the developer!`); break;
				}
			}
		}
		// The state was deleted
		else {
			this.log.silly(`state ${id} deleted`);

			if (stateValueCache[id]) {
				delete stateValueCache[id];
			}
		}
	}

	async GetCumulatedReport() {
		const promises = [];

		for (const obj of this.deviceObjects) {
			promises.push(obj.getPowerConsumptionReport(true));
		}

		Promise.all(promises).then(() => {
			this.UpdateCumulatedReportData(this.deviceObjects);
		});
	}

	async UpdateCumulatedReportData(deviceObjs) {
		const cumulatedLastReportDataPrefix = `${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.AdapterDatapointIDs.LastReportData}.`;
		let totalConsumption = 0, totalConsumptionCool = 0, totalConsumptionHeat = 0, totalConsumptionDry = 0, totalConsumptionVent = 0, totalConsumptionAuto = 0, totalConsumptionMinutes = 0;
		const aggregatedDeviceGroups = [];

		for (const obj of deviceObjs) {
			// Check if device is already part of aggregation group to exclude duplicated values
			if (obj.linkedDevicesIncludedInArregateEnergyReport && obj.linkedDevicesIncludedInArregateEnergyReport != "") {
				if (aggregatedDeviceGroups.length == 0) aggregatedDeviceGroups.push({ groupName: obj.linkedDevicesIncludedInArregateEnergyReport, alreadyProcessed: false });
				let isKnownGroup = false;

				for (let i = 0; i < aggregatedDeviceGroups.length; i++) {
					const aggregatedGroup = aggregatedDeviceGroups[i];

					if (aggregatedGroup.groupName.includes(obj.name) && !aggregatedGroup.alreadyProcessed) {
						this.log.debug(`Device '${obj.name}' is part of the aggregated group '${aggregatedGroup.groupName}'. Excluding the other devices from this group for cumulated reports.`);
						totalConsumptionCool += obj.totalPowerConsumptionCooling;
						totalConsumptionHeat += obj.totalPowerConsumptionHeating;
						totalConsumptionAuto += obj.totalPowerConsumptionAuto;
						totalConsumptionDry += obj.totalPowerConsumptionDry;
						totalConsumptionVent += obj.totalPowerConsumptionVent;
						totalConsumptionMinutes = obj.totalPowerConsumptionMinutes; // same for all devices

						totalConsumption += totalConsumptionCool + totalConsumptionHeat + totalConsumptionAuto + totalConsumptionDry + totalConsumptionVent;

						aggregatedGroup.alreadyProcessed = true;
						isKnownGroup = true;
						break;
					}
				}

				if (!isKnownGroup) aggregatedDeviceGroups.push({ groupName: obj.linkedDevicesIncludedInArregateEnergyReport, alreadyProcessed: false });
			}
			// Device is not part of any aggregation group, just take thhe values as they are
			else {
				totalConsumptionCool += obj.totalPowerConsumptionCooling;
				totalConsumptionHeat += obj.totalPowerConsumptionHeating;
				totalConsumptionAuto += obj.totalPowerConsumptionAuto;
				totalConsumptionDry += obj.totalPowerConsumptionDry;
				totalConsumptionVent += obj.totalPowerConsumptionVent;
				totalConsumptionMinutes += obj.totalPowerConsumptionMinutes;

				totalConsumption += totalConsumptionCool + totalConsumptionHeat + totalConsumptionAuto + totalConsumptionDry + totalConsumptionVent;
			}
		}

		await this.setStateChangedAsync(cumulatedLastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.COOL.id, commonDefines.roundValue(totalConsumptionCool, 3), true);
		await this.setStateChangedAsync(cumulatedLastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.HEAT.id, commonDefines.roundValue(totalConsumptionHeat, 3), true);
		await this.setStateChangedAsync(cumulatedLastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.AUTO.id, commonDefines.roundValue(totalConsumptionAuto, 3), true);
		await this.setStateChangedAsync(cumulatedLastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.DRY.id, commonDefines.roundValue(totalConsumptionDry, 3), true);
		await this.setStateChangedAsync(cumulatedLastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + commonDefines.AtaDeviceOperationModes.VENT.id, commonDefines.roundValue(totalConsumptionVent, 3), true);
		await this.setStateChangedAsync(cumulatedLastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix, commonDefines.roundValue(totalConsumption, 3), true);
		await this.setStateChangedAsync(cumulatedLastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalReportedMinutes, totalConsumptionMinutes, true);

		this.log.debug(`Updated cumulated report data for all devices`);
	}

	mapAtaDeviceOperationMode(value) {
		switch (value) {
			case (commonDefines.AtaDeviceOperationModes.HEAT.value):
				return commonDefines.AtaDeviceOperationModes.HEAT;
			case (commonDefines.AtaDeviceOperationModes.DRY.value):
				return commonDefines.AtaDeviceOperationModes.DRY;
			case (commonDefines.AtaDeviceOperationModes.COOL.value):
				return commonDefines.AtaDeviceOperationModes.COOL;
			case (commonDefines.AtaDeviceOperationModes.VENT.value):
				return commonDefines.AtaDeviceOperationModes.VENT;
			case (commonDefines.AtaDeviceOperationModes.AUTO.value):
				return commonDefines.AtaDeviceOperationModes.AUTO;
			default:
				this.log.error(`Unsupported ATA operation mode: '${value}' - Please report this to the developer!`);
				return commonDefines.AtaDeviceOperationModes.UNDEF;
		}
	}

	mapAtwDeviceZoneOperationMode(value) {
		switch (value) {
			case (commonDefines.AtwDeviceZoneOperationModes.HEATTHERMOSTAT.value):
				return commonDefines.AtwDeviceZoneOperationModes.HEATTHERMOSTAT;
			case (commonDefines.AtwDeviceZoneOperationModes.HEATFLOW.value):
				return commonDefines.AtwDeviceZoneOperationModes.HEATFLOW;
			case (commonDefines.AtwDeviceZoneOperationModes.CURVE.value):
				return commonDefines.AtwDeviceZoneOperationModes.CURVE;
			case (commonDefines.AtwDeviceZoneOperationModes.COOLTHERMOSTAT.value):
				return commonDefines.AtwDeviceZoneOperationModes.COOLTHERMOSTAT;
			case (commonDefines.AtwDeviceZoneOperationModes.COOLFLOW.value):
				return commonDefines.AtwDeviceZoneOperationModes.COOLFLOW;
			default:
				this.log.error(`Unsupported ATW zone operation mode: '${value}' - Please report this to the developer!`);
				return commonDefines.AtwDeviceZoneOperationModes.UNDEF;
		}
	}

	processAtaDeviceCommand(controlOption, state, device) {
		switch (controlOption) {
			case (commonDefines.AtaDeviceStateIDs.Power):
				if (state.val) {
					// switch on using current operation mode
					device.getDeviceInfo(device.setDevice, commonDefines.AtaDeviceOptions.PowerState, commonDefines.DevicePowerStates.ON);
				}
				else {
					// switch off
					device.getDeviceInfo(device.setDevice, commonDefines.AtaDeviceOptions.PowerState, commonDefines.DevicePowerStates.OFF);
				}
				break;
			case (commonDefines.AtaDeviceStateIDs.Mode):
				device.getDeviceInfo(device.setDevice, commonDefines.AtaDeviceOptions.TargetHeatingCoolingState, this.mapAtaDeviceOperationMode(state.val));
				break;
			case (commonDefines.AtaDeviceStateIDs.TargetTemp):
				device.getDeviceInfo(device.setDevice, commonDefines.AtaDeviceOptions.TargetTemperature, state.val);
				break;
			case (commonDefines.AtaDeviceStateIDs.FanSpeedManual):
				device.getDeviceInfo(device.setDevice, commonDefines.AtaDeviceOptions.FanSpeed, state.val);
				break;
			case (commonDefines.AtaDeviceStateIDs.VaneVerticalDirection):
				device.getDeviceInfo(device.setDevice, commonDefines.AtaDeviceOptions.VaneVerticalDirection, state.val);
				break;
			case (commonDefines.AtaDeviceStateIDs.VaneHorizontalDirection):
				device.getDeviceInfo(device.setDevice, commonDefines.AtaDeviceOptions.VaneHorizontalDirection, state.val);
				break;
			case (commonDefines.AtaDeviceStateIDs.TimerToogle):
				device.toggleTimerState(state.val);
				break;
			case (commonDefines.CommonDeviceStateIDs.GetPowerConsumptionReport):
				device.getPowerConsumptionReport();
				break;
			default:
				this.log.error(`Unsupported ATA control option: ${controlOption} - Please report this to the developer!`);
				break;
		}
	}

	processAtwDeviceCommand(controlOption, state, device) {
		switch (controlOption) {
			case (commonDefines.AtwDeviceStateIDs.Power):
				if (state.val) {
					// switch on using current operation mode
					device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.PowerState, commonDefines.DevicePowerStates.ON);
				}
				else {
					// switch off
					device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.PowerState, commonDefines.DevicePowerStates.OFF);
				}
				break;
			case (commonDefines.AtwDeviceStateIDs.ForcedHotWaterMode):
				device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.ForcedHotWaterMode, state.val);
				break;
			case (commonDefines.AtwDeviceStateIDs.OperationModeZone1):
				device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.OperationModeZone1, this.mapAtwDeviceZoneOperationMode(state.val));
				break;
			case (commonDefines.AtwDeviceStateIDs.OperationModeZone2):
				device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.OperationModeZone2, this.mapAtwDeviceZoneOperationMode(state.val));
				break;
			case (commonDefines.AtwDeviceStateIDs.SetTankWaterTemperature):
				device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.SetTankWaterTemperature, state.val);
				break;
			case (commonDefines.AtwDeviceStateIDs.SetTemperatureZone1):
				device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.SetTemperatureZone1, state.val);
				break;
			case (commonDefines.AtwDeviceStateIDs.SetTemperatureZone2):
				device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.SetTemperatureZone2, state.val);
				break;
			case (commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone1):
				device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone1, state.val);
				break;
			case (commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone2):
				device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone2, state.val);
				break;
			case (commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone1):
				device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone1, state.val);
				break;
			case (commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone2):
				device.getDeviceInfo(device.setDevice, commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone2, state.val);
				break;
			case (commonDefines.AtwDeviceStateIDs.TimerToogle):
				device.toggleTimerState(state.val);
				break;
			case (commonDefines.CommonDeviceStateIDs.GetPowerConsumptionReport):
				device.getPowerConsumptionReport();
				break;
			default:
				this.log.error(`Unsupported ATW control option: ${controlOption} - Please report this to the developer!`);
				break;
		}
	}
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Melcloud(options);
} else {
	// otherwise start the instance directly
	new Melcloud();
}