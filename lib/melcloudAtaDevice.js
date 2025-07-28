"use strict";

const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");
const Axios = require("axios").default;

class MelcloudAtaDevice {
	constructor(adapter) {
		this.adapter = adapter;
		this.platform = null;
		this.airInfo = null;
		this.deviceInfoRequestQueue = [];
		this.currentDeviceInfoRequests = 0;
		this.deviceSetRequestQueue = [];
		this.currentDeviceSetRequests = 0;
		this.hasBeenCreated = false;
		this.deviceType = commonDefines.DeviceTypes.AirToAir;

		// Info
		this.id = -1;
		this.name = "";
		this.serialNumber = "";
		this.macAddress = "";
		this.buildingId = -1;
		this.floorId = -1;
		this.canCool = false;
		this.canHeat = false;
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
		this.lastCommunication = null;
		this.nextCommunication = null;
		this.deviceOnline = false;
		this.deviceHasError = false;
		this.errorMessages = "";
		this.errorCode = 8000;

		// Control
		this.power = false;
		this.operationMode = commonDefines.AtaDeviceOperationModes.UNDEF.value;
		this.targetTemp = 0;
		this.fanSpeed = 0;
		this.vaneVerticalDirection = 0;
		this.vaneHorizontalDirection = 0;
		this.timerToggle = false;

		// Reports
		this.powerConsumptionReportStartDate = "";
		this.powerConsumptionReportEndDate = "";
		this.totalPowerConsumptionCooling = 0;
		this.totalPowerConsumptionHeating = 0;
		this.totalPowerConsumptionAuto = 0;
		this.totalPowerConsumptionDry = 0;
		this.totalPowerConsumptionVent = 0;
		this.totalPowerConsumptionMinutes = 0;
		this.rawPowerConsumptionReportData = null;
		this.linkedDevicesIncludedInArregateEnergyReport = "";
	}

	// Creates all necessery states and channels and writes the values into the DB
	async CreateAndSave() {
		// check if object has already been created
		if (this.hasBeenCreated) {
			return;
		}

		const devicePrefix = `${commonDefines.AdapterDatapointIDs.Devices}.${this.id}`;
		await this.adapter.extendObjectAsync(devicePrefix, {
			type: "device",
			common: {
				statusStates: {
					onlineId: `${this.adapter.namespace}.${devicePrefix}.${commonDefines.AdapterDatapointIDs.Info}.${commonDefines.CommonDeviceStateIDs.DeviceOnline}`,
					errorId: `${this.adapter.namespace}.${devicePrefix}.${commonDefines.AdapterDatapointIDs.Info}.${commonDefines.CommonDeviceStateIDs.DeviceHasError}`,
				},
				name: `ATA Device ${this.id} (${this.name})`,
			},
			native: {},
		});

		//#region INFO
		let infoPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Info}`;
		await this.adapter.extendObjectAsync(infoPrefix, {
			type: "channel",
			common: {
				name: "Device information",
			},
			native: {},
		});

		infoPrefix += ".";

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceName, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceType, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.SerialNumber, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.MacAddress, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.BuildingId, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.FloorId, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.CanCool, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.CanHeat, {
			type: "state",
			common: {
				name: "Ability to heat",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				def: this.canHeat,
				desc: "Ability to heat",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.CanDry, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempCoolDry, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempCoolDry, {
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
		});

		if (this.canHeat) {
			await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempHeat, {
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
			});

			await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempHeat, {
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
			});
		}

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MinTempAuto, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.MaxTempAuto, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.RoomTemp, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedAuto, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtaDeviceStateIDs.NumberOfFanSpeeds, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.LastCommunication, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.NextCommunication, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceOnline, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceHasError, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.ErrorMessages, {
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
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.ErrorCode, {
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
		});
		//#endregion

		//#region CONTROL
		let controlPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Control}`;
		await this.adapter.extendObjectAsync(controlPrefix, {
			type: "channel",
			common: {
				name: "Device control",
			},
			native: {},
		});

		controlPrefix += ".";

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.Power, {
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
		});

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.Mode, {
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
		});

		const minTemp = Math.min(this.minTempAuto, this.minTempCoolDry, this.minTempHeat);
		const maxTemp = Math.max(this.maxTempAuto, this.maxTempCoolDry, this.maxTempHeat);
		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.TargetTemp, {
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
		});

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.TargetTemp, {
			common: {
				step: 0.5,
			},
		});

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.FanSpeedManual, {
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
		});

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.VaneVerticalDirection, {
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
		});

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.VaneHorizontalDirection, {
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
		});

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtaDeviceStateIDs.TimerToogle, {
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
		});
		//#endregion

		//#region REPORTS
		let reportsPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Reports}`;
		await this.adapter.extendObjectAsync(reportsPrefix, {
			type: "channel",
			common: {
				name: "Device reports",
			},
			native: {},
		});

		reportsPrefix += ".";

		await this.adapter.extendObjectAsync(
			reportsPrefix + commonDefines.CommonDeviceStateIDs.PowerConsumptionReportStartDate,
			{
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
		);

		await this.adapter.extendObjectAsync(
			reportsPrefix + commonDefines.CommonDeviceStateIDs.PowerConsumptionReportEndDate,
			{
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
		);

		await this.adapter.extendObjectAsync(
			reportsPrefix + commonDefines.CommonDeviceStateIDs.GetPowerConsumptionReport,
			{
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
		);

		let lastReportDataPrefix = `${devicePrefix}.${commonDefines.AdapterDatapointIDs.Reports}.${commonDefines.AdapterDatapointIDs.LastReportData}`;
		await this.adapter.extendObjectAsync(lastReportDataPrefix, {
			type: "channel",
			common: {
				name: "Last report data",
			},
			native: {},
		});

		lastReportDataPrefix += ".";
		const reportModes = [
			commonDefines.AtaDeviceOperationModes.HEAT.id,
			commonDefines.AtaDeviceOperationModes.COOL.id,
			commonDefines.AtaDeviceOperationModes.AUTO.id,
			commonDefines.AtaDeviceOperationModes.VENT.id,
			commonDefines.AtaDeviceOperationModes.DRY.id,
		];

		reportModes.forEach(mode => {
			if (
				(mode == commonDefines.AtaDeviceOperationModes.HEAT.id && !this.canHeat) ||
				(mode == commonDefines.AtaDeviceOperationModes.DRY.id && !this.canDry) ||
				(mode == commonDefines.AtaDeviceOperationModes.COOL.id && !this.canCool)
			) {
				return;
			}

			this.adapter.extendObjectAsync(
				lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix + mode,
				{
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
			);
		});

		this.adapter.extendObjectAsync(
			lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix,
			{
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
		);

		await this.adapter.extendObjectAsync(
			lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalReportedMinutes,
			{
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
		);

		await this.adapter.extendObjectAsync(
			lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.RawPowerConsumptionData,
			{
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
		);
		//#endregion

		this.adapter.log.debug(`Created and saved ATA device ${this.id} (${this.name})`);
		this.hasBeenCreated = true;
	}

	// Only writes changed device data into the DB
	async UpdateDeviceData(deviceOption) {
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
			infoPrefix + commonDefines.AtaDeviceStateIDs.CanCool,
			this.canCool,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtaDeviceStateIDs.CanHeat,
			this.canHeat,
			true,
		);
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

		this.adapter.log.debug(`Updated report data for device ${this.id} (${this.name})`);
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

exports.MelCloudDevice = MelcloudAtaDevice;
