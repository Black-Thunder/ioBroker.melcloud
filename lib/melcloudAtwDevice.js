"use strict";

const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");
const Axios = require("axios").default;

class MelcloudAtwDevice {
	constructor(adapter) {
		this.adapter = adapter;
		this.platform = null;
		this.airInfo = null;
		this.deviceInfoRequestQueue = [];
		this.currentDeviceInfoRequests = 0;
		this.deviceSetRequestQueue = [];
		this.currentDeviceSetRequests = 0;
		this.hasBeenCreated = false;
		this.deviceType = commonDefines.DeviceTypes.AirToWater;

		// Info
		this.id = -1;
		this.name = "";
		this.serialNumber = "";
		this.macAddress = "";
		this.buildingId = -1;
		this.floorId = -1;
		this.canCool = false;
		this.canHeat = false;
		this.hasZone2 = false;
		this.roomTemperatureZone1 = -1;
		this.roomTemperatureZone2 = -1;
		this.mixingTankWaterTemperature = -1;
		this.condensingTemperature = -1;
		this.outdoorTemperature = -1;
		this.flowTemperature = -1;
		this.flowTemperatureZone1 = -1;
		this.flowTemperatureZone2 = -1;
		this.flowTemperatureBoiler = -1;
		this.returnTemperature = -1;
		this.returnTemperatureZone1 = -1;
		this.ReturnTemperatureZone2 = -1;
		this.returnTemperatureBoiler = -1;
		this.tankWaterTemperature = -1;
		this.heatPumpFrequency = -1;
		this.operationState = -1;
		this.lastCommunication = null;
		this.nextCommunication = null;
		this.deviceOnline = false;
		this.deviceHasError = false;
		this.errorMessages = "";
		this.errorCode = 8000;

		// Control
		this.power = false;
		this.forcedHotWaterMode = commonDefines.AtwDeviceOperationModes.UNDEF.value;
		this.operationModeZone1 = commonDefines.AtwDeviceZoneOperationModes.UNDEF.value;
		this.operationModeZone2 = commonDefines.AtwDeviceZoneOperationModes.UNDEF.value;
		this.setTankWaterTemperature = -1;
		this.setTemperatureZone1 = -1;
		this.setTemperatureZone2 = -1;
		this.setHeatFlowTemperatureZone1 = -1;
		this.setHeatFlowTemperatureZone2 = -1;
		this.setCoolFlowTemperatureZone1 = -1;
		this.setCoolFlowTemperatureZone2 = -1;
		this.timerToggle = false;

		// Reports
		this.powerConsumptionReportStartDate = "";
		this.powerConsumptionReportEndDate = "";
		this.totalPowerConsumptionCooling = 0;
		this.totalPowerConsumptionHeating = 0;
		this.totalPowerConsumptionHotWater = 0;
		this.totalPowerProductionCooling = 0;
		this.totalPowerProductionHeating = 0;
		this.totalPowerProductionHotWater = 0;
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

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.CanCool, {
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

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.CanHeat, {
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

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.HasZone2, {
			type: "state",
			common: {
				name: "Has Zone 2",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				def: this.hasZone2,
				desc: "Has Zone 2?",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.RoomTemperatureZone1, {
			type: "state",
			common: {
				name: "Room temperature zone 1",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.roomTemperatureZone1,
				desc: "Room temperature in zone 1",
			},
			native: {},
		});

		if (this.hasZone2) {
			await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.RoomTemperatureZone2, {
				type: "state",
				common: {
					name: "Room temperature zone 2",
					type: "number",
					role: "value.temperature",
					unit: this.platform.UseFahrenheit ? "°F" : "°C",
					read: true,
					write: false,
					def: this.roomTemperatureZone2,
					desc: "Room temperature in zone 2",
				},
				native: {},
			});
		}

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.MixingTankWaterTemperature, {
			type: "state",
			common: {
				name: "Mixing tank temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.mixingTankWaterTemperature,
				desc: "Mixing tank temperature",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.CondensingTemperature, {
			type: "state",
			common: {
				name: "Condensing temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.condensingTemperature,
				desc: "Condensing temperature",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.OutdoorTemperature, {
			type: "state",
			common: {
				name: "Outdoor temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.outdoorTemperature,
				desc: "Outdoor temperature",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperature, {
			type: "state",
			common: {
				name: "Flow temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.flowTemperature,
				desc: "Flow temperature",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureZone1, {
			type: "state",
			common: {
				name: "Flow temperature zone 1",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.flowTemperatureZone1,
				desc: "Flow temperaturein zone 1",
			},
			native: {},
		});

		if (this.hasZone2) {
			await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureZone2, {
				type: "state",
				common: {
					name: "Flow temperature zone 1",
					type: "number",
					role: "value.temperature",
					unit: this.platform.UseFahrenheit ? "°F" : "°C",
					read: true,
					write: false,
					def: this.flowTemperatureZone2,
					desc: "Flow temperaturein zone 2",
				},
				native: {},
			});
		}

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureBoiler, {
			type: "state",
			common: {
				name: "Flow temperature boiler",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.flowTemperatureBoiler,
				desc: "Flow temperature boiler",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperature, {
			type: "state",
			common: {
				name: "Return temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.returnTemperature,
				desc: "Return temperature",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureZone1, {
			type: "state",
			common: {
				name: "Return temperature zone 1",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.returnTemperatureZone1,
				desc: "Return temperature in zone 1",
			},
			native: {},
		});

		if (this.hasZone2) {
			await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureZone2, {
				type: "state",
				common: {
					name: "Return temperature zone 2",
					type: "number",
					role: "value.temperature",
					unit: this.platform.UseFahrenheit ? "°F" : "°C",
					read: true,
					write: false,
					def: this.ReturnTemperatureZone2,
					desc: "Return temperature in zone 2",
				},
				native: {},
			});
		}

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureBoiler, {
			type: "state",
			common: {
				name: "Return temperature boiler",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.returnTemperatureBoiler,
				desc: "Return temperature boiler",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.TankWaterTemperature, {
			type: "state",
			common: {
				name: "Tank water temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.tankWaterTemperature,
				desc: "Tank water temperature",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.HeatPumpFrequency, {
			type: "state",
			common: {
				name: "Heat pump frequency",
				type: "number",
				role: "value",
				unit: "Hz",
				read: true,
				write: false,
				def: this.heatPumpFrequency,
				desc: "Heat pump frequency",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.OperationState, {
			type: "state",
			common: {
				name: "Heat pump operation state",
				type: "number",
				role: "value",
				read: true,
				write: false,
				def: this.operationState,
				states: {
					0: "Idle",
					1: "Heating Water",
					2: "Heating Zone",
					3: "Cooling",
					4: "Defrost",
					5: "Standby",
					6: "Legionella",
				},
				desc: "Heat pump operation state",
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

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.Power, {
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

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.ForcedHotWaterMode, {
			type: "state",
			common: {
				name: "Forced hot water mode",
				type: "boolean",
				role: "value",
				read: true,
				write: true,
				def: this.forcedHotWaterMode,
				desc: "Forced hot water mode",
				states: {
					false: "AUTO",
					true: "FORCEDHOTWATERMODE",
				},
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone1, {
			type: "state",
			common: {
				name: "Operation mode zone 1",
				type: "number",
				role: "value",
				read: true,
				write: true,
				def: this.operationModeZone1,
				min: this.canHeat ? 0 : 3,
				max: this.canCool ? 4 : 2,
				desc: "Operation mode zone 1",
				states: {
					0: "HEATTHERMOSTAT",
					1: "HEATFLOW",
					2: "CURVE",
					3: "COOLTHERMOSTAT",
					4: "COOLFLOW",
				},
			},
			native: {},
		});

		if (this.hasZone2) {
			await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone2, {
				type: "state",
				common: {
					name: "Operation mode zone 2",
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: this.operationModeZone2,
					min: this.canHeat ? 0 : 3,
					max: this.canCool ? 4 : 2,
					desc: "Operation mode zone 2",
					states: {
						0: "HEATTHERMOSTAT",
						1: "HEATFLOW",
						2: "CURVE",
						3: "COOLTHERMOSTAT",
						4: "COOLFLOW",
					},
				},
				native: {},
			});
		}

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTankWaterTemperature, {
			type: "state",
			common: {
				name: "Set tank water temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: true,
				def: this.setTankWaterTemperature,
				desc: "Set tank water temperature",
			},
			native: {},
		});

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone1, {
			type: "state",
			common: {
				name: "Set temperature zone 1",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: true,
				def: this.setTemperatureZone1,
				desc: "Set temperature for zone 1",
			},
			native: {},
		});

		if (this.hasZone2) {
			await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone2, {
				type: "state",
				common: {
					name: "Set temperature zone 2",
					type: "number",
					role: "value.temperature",
					unit: this.platform.UseFahrenheit ? "°F" : "°C",
					read: true,
					write: true,
					def: this.setTemperatureZone2,
					desc: "Set temperature for zone 2",
				},
				native: {},
			});
		}

		if (this.canHeat) {
			await this.adapter.extendObjectAsync(
				controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone1,
				{
					type: "state",
					common: {
						name: "Set heat flow temperature zone 1",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: true,
						def: this.setHeatFlowTemperatureZone1,
						desc: "Set heat flow temperature for zone 1",
					},
					native: {},
				},
			);

			if (this.hasZone2) {
				await this.adapter.extendObjectAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone2,
					{
						type: "state",
						common: {
							name: "Set heat flow temperature zone 2",
							type: "number",
							role: "value.temperature",
							unit: this.platform.UseFahrenheit ? "°F" : "°C",
							read: true,
							write: true,
							def: this.setHeatFlowTemperatureZone2,
							desc: "Set heat flow temperature for zone 2",
						},
						native: {},
					},
				);
			}
		}

		if (this.canCool) {
			await this.adapter.extendObjectAsync(
				controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone1,
				{
					type: "state",
					common: {
						name: "Set cool flow temperature zone 1",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: true,
						def: this.setCoolFlowTemperatureZone1,
						desc: "Set cool flow temperature for zone 1",
					},
					native: {},
				},
			);

			if (this.hasZone2) {
				await this.adapter.extendObjectAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone2,
					{
						type: "state",
						common: {
							name: "Set cool flow temperature zone 2",
							type: "number",
							role: "value.temperature",
							unit: this.platform.UseFahrenheit ? "°F" : "°C",
							read: true,
							write: true,
							def: this.setCoolFlowTemperatureZone2,
							desc: "Set cool flow temperature for zone 2",
						},
						native: {},
					},
				);
			}
		}

		await this.adapter.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.TimerToogle, {
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
		const reportModes = ["Heat", "Cool", "HotWater"];

		reportModes.forEach(mode => {
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

			this.adapter.extendObjectAsync(
				lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerProductionPrefix + mode,
				{
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
						desc: `Total power production for mode '${mode}'`,
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

		this.adapter.extendObjectAsync(
			lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerProductionPrefix,
			{
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
					desc: "Total power production for all modes",
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

		this.adapter.log.debug(`Created and saved ATW device ${this.id} (${this.name})`);
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
			infoPrefix + commonDefines.AtwDeviceStateIDs.RoomTemperatureZone1,
			this.roomTemperatureZone1,
			true,
		);
		if (this.hasZone2) {
			await this.adapter.setStateChangedAsync(
				infoPrefix + commonDefines.AtwDeviceStateIDs.RoomTemperatureZone2,
				this.roomTemperatureZone2,
				true,
			);
		}
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.MixingTankWaterTemperature,
			this.mixingTankWaterTemperature,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.CondensingTemperature,
			this.condensingTemperature,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.OutdoorTemperature,
			this.outdoorTemperature,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperature,
			this.flowTemperature,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureZone1,
			this.flowTemperatureZone1,
			true,
		);
		if (this.hasZone2) {
			await this.adapter.setStateChangedAsync(
				infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureZone2,
				this.flowTemperatureZone2,
				true,
			);
		}
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureBoiler,
			this.flowTemperatureBoiler,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperature,
			this.returnTemperature,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureZone1,
			this.returnTemperatureZone1,
			true,
		);
		if (this.hasZone2) {
			await this.adapter.setStateChangedAsync(
				infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureZone2,
				this.ReturnTemperatureZone2,
				true,
			);
		}
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureBoiler,
			this.returnTemperatureBoiler,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.TankWaterTemperature,
			this.tankWaterTemperature,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.HeatPumpFrequency,
			this.heatPumpFrequency,
			true,
		);
		await this.adapter.setStateChangedAsync(
			infoPrefix + commonDefines.AtwDeviceStateIDs.OperationState,
			this.operationState,
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
			case commonDefines.AtwDeviceOptions.PowerState:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.Power,
					this.power,
					true,
				);
				break;
			case commonDefines.AtwDeviceOptions.ForcedHotWaterMode:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.ForcedHotWaterMode,
					this.forcedHotWaterMode,
					true,
				);
				break;
			case commonDefines.AtwDeviceOptions.OperationModeZone1:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone1,
					this.operationModeZone1,
					true,
				);
				break;
			case commonDefines.AtwDeviceOptions.OperationModeZone2:
				if (this.hasZone2) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone2,
						this.operationModeZone2,
						true,
					);
				}
				break;
			case commonDefines.AtwDeviceOptions.SetTankWaterTemperature:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.SetTankWaterTemperature,
					this.setTankWaterTemperature,
					true,
				);
				break;
			case commonDefines.AtwDeviceOptions.SetTemperatureZone1:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone1,
					this.setTemperatureZone1,
					true,
				);
				break;
			case commonDefines.AtwDeviceOptions.SetTemperatureZone2:
				if (this.hasZone2) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone2,
						this.setTemperatureZone2,
						true,
					);
				}
				break;
			case commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone1:
				if (this.canHeat) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone1,
						this.setHeatFlowTemperatureZone1,
						true,
					);
				}
				break;
			case commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone2:
				if (this.canHeat && this.hasZone2) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone2,
						this.setHeatFlowTemperatureZone2,
						true,
					);
				}
				break;
			case commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone1:
				if (this.canCool) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone1,
						this.setCoolFlowTemperatureZone1,
						true,
					);
				}
				break;
			case commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone2:
				if (this.canCool && this.hasZone2) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone2,
						this.setCoolFlowTemperatureZone2,
						true,
					);
				}
				break;

			case "ALL":
			default:
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.Power,
					this.power,
					true,
				);
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.ForcedHotWaterMode,
					this.forcedHotWaterMode,
					true,
				);
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone1,
					this.operationModeZone1,
					true,
				);
				if (this.hasZone2) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone2,
						this.operationModeZone2,
						true,
					);
				}
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.SetTankWaterTemperature,
					this.setTankWaterTemperature,
					true,
				);
				await this.adapter.setStateChangedAsync(
					controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone1,
					this.setTemperatureZone1,
					true,
				);
				if (this.hasZone2) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone2,
						this.setTemperatureZone2,
						true,
					);
				}
				if (this.canHeat) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone1,
						this.setHeatFlowTemperatureZone1,
						true,
					);
				}
				if (this.canHeat && this.hasZone2) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone2,
						this.setHeatFlowTemperatureZone2,
						true,
					);
				}
				if (this.canCool) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone1,
						this.setCoolFlowTemperatureZone1,
						true,
					);
				}
				if (this.canCool && this.hasZone2) {
					await this.adapter.setStateChangedAsync(
						controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone2,
						this.setCoolFlowTemperatureZone2,
						true,
					);
				}
				break;
		}
		//#endregion

		this.adapter.log.debug(`Updated device data for ATW device ${this.id} (${this.name})`);
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
		let totalProduction = 0;

		await this.adapter.setStateChangedAsync(
			`${lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix}Cool`,
			commonDefines.roundValue(this.totalPowerConsumptionCooling, 3),
			true,
		);
		totalConsumption += this.totalPowerConsumptionCooling;
		await this.adapter.setStateChangedAsync(
			`${lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerProductionPrefix}Cool`,
			commonDefines.roundValue(this.totalPowerProductionCooling, 3),
			true,
		);
		totalProduction += this.totalPowerProductionCooling;

		await this.adapter.setStateChangedAsync(
			`${lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix}Heat`,
			commonDefines.roundValue(this.totalPowerConsumptionHeating, 3),
			true,
		);
		totalConsumption += this.totalPowerConsumptionHeating;
		await this.adapter.setStateChangedAsync(
			`${lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerProductionPrefix}Heat`,
			commonDefines.roundValue(this.totalPowerProductionHeating, 3),
			true,
		);
		totalProduction += this.totalPowerProductionHeating;

		await this.adapter.setStateChangedAsync(
			`${lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix}HotWater`,
			commonDefines.roundValue(this.totalPowerConsumptionHotWater, 3),
			true,
		);
		totalConsumption += this.totalPowerConsumptionHotWater;
		await this.adapter.setStateChangedAsync(
			`${lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerProductionPrefix}HotWater`,
			commonDefines.roundValue(this.totalPowerProductionHotWater, 3),
			true,
		);
		totalProduction += this.totalPowerProductionHotWater;

		await this.adapter.setStateChangedAsync(
			lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerConsumptionPrefix,
			commonDefines.roundValue(totalConsumption, 3),
			true,
		);
		await this.adapter.setStateChangedAsync(
			lastReportDataPrefix + commonDefines.CommonDeviceStateIDs.TotalPowerProductionPrefix,
			commonDefines.roundValue(totalProduction, 3),
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

			if (deviceOption == commonDefines.AtwDeviceOptions.PowerState) {
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
			} else if (deviceOption == commonDefines.AtwDeviceOptions.ForcedHotWaterMode) {
				modifiedAirInfo.ForcedHotWaterMode = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtwDeviceOptions.ForcedHotWaterMode.effectiveFlags;
			} else if (
				deviceOption == commonDefines.AtwDeviceOptions.OperationModeZone1 ||
				deviceOption == commonDefines.AtwDeviceOptions.OperationModeZone2
			) {
				const isZone1 = deviceOption == commonDefines.AtwDeviceOptions.OperationModeZone1;

				if (!isZone1 && !this.hasZone2) {
					this.adapter.log.error("setDevice(): Unsupported operation mode. This device has no zone 2.");
					return;
				}

				if (
					(value == commonDefines.AtwDeviceZoneOperationModes.COOLFLOW.value ||
						value == commonDefines.AtwDeviceZoneOperationModes.COOLTHERMOSTAT.value) &&
					!this.canCool
				) {
					this.adapter.log.error("setDevice(): Unsupported operation mode. Device can not cool!");
					return;
				}

				if (
					(value == commonDefines.AtwDeviceZoneOperationModes.HEATFLOW.value ||
						value == commonDefines.AtwDeviceZoneOperationModes.HEATFLOW.value ||
						value == commonDefines.AtwDeviceZoneOperationModes.CURVE.value) &&
					!this.canHeat
				) {
					this.adapter.log.error("setDevice(): Unsupported operation mode. Device can not heat!");
					return;
				}

				modifiedAirInfo.EffectiveFlags = isZone1
					? commonDefines.AtwDeviceOptions.OperationModeZone1.effectiveFlags
					: commonDefines.AtwDeviceOptions.OperationModeZone2.effectiveFlags;

				switch (value) {
					case commonDefines.AtwDeviceZoneOperationModes.HEATTHERMOSTAT:
						isZone1
							? (modifiedAirInfo.OperationModeZone1 =
									commonDefines.AtwDeviceZoneOperationModes.HEATTHERMOSTAT.value)
							: (modifiedAirInfo.OperationModeZone2 =
									commonDefines.AtwDeviceZoneOperationModes.HEATTHERMOSTAT.value);
						break;
					case commonDefines.AtwDeviceZoneOperationModes.HEATFLOW:
						isZone1
							? (modifiedAirInfo.OperationModeZone1 =
									commonDefines.AtwDeviceZoneOperationModes.HEATFLOW.value)
							: (modifiedAirInfo.OperationModeZone2 =
									commonDefines.AtwDeviceZoneOperationModes.HEATFLOW.value);
						break;
					case commonDefines.AtwDeviceZoneOperationModes.CURVE:
						isZone1
							? (modifiedAirInfo.OperationModeZone1 =
									commonDefines.AtwDeviceZoneOperationModes.CURVE.value)
							: (modifiedAirInfo.OperationModeZone2 =
									commonDefines.AtwDeviceZoneOperationModes.CURVE.value);
						break;
					case commonDefines.AtwDeviceZoneOperationModes.COOLTHERMOSTAT:
						isZone1
							? (modifiedAirInfo.OperationModeZone1 =
									commonDefines.AtwDeviceZoneOperationModes.COOLTHERMOSTAT.value)
							: (modifiedAirInfo.OperationModeZone2 =
									commonDefines.AtwDeviceZoneOperationModes.COOLTHERMOSTAT.value);
						break;
					case commonDefines.AtwDeviceZoneOperationModes.COOLFLOW:
						isZone1
							? (modifiedAirInfo.OperationModeZone1 =
									commonDefines.AtwDeviceZoneOperationModes.COOLFLOW.value)
							: (modifiedAirInfo.OperationModeZone2 =
									commonDefines.AtwDeviceZoneOperationModes.COOLFLOW.value);
						break;
					default:
						this.adapter.log.error(
							"setDevice(): Unsupported value for device option - please report this to the developer!",
						);
						return;
				}
			} else if (deviceOption == commonDefines.AtwDeviceOptions.SetTankWaterTemperature) {
				modifiedAirInfo.SetTankWaterTemperature = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtwDeviceOptions.SetTankWaterTemperature.effectiveFlags;
			} else if (deviceOption == commonDefines.AtwDeviceOptions.SetTemperatureZone1) {
				modifiedAirInfo.SetTemperatureZone1 = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtwDeviceOptions.SetTemperatureZone1.effectiveFlags;
			} else if (deviceOption == commonDefines.AtwDeviceOptions.SetTemperatureZone2) {
				if (!this.hasZone2) {
					this.adapter.log.error("setDevice(): Unsupported device option. This device has no zone 2.");
					return;
				}

				modifiedAirInfo.SetTemperatureZone2 = value;
				modifiedAirInfo.EffectiveFlags = commonDefines.AtwDeviceOptions.SetTemperatureZone2.effectiveFlags;
			} else if (deviceOption == commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone1) {
				modifiedAirInfo.SetHeatFlowTemperatureZone1 = value;
				modifiedAirInfo.EffectiveFlags =
					commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone1.effectiveFlags;
			} else if (deviceOption == commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone2) {
				if (!this.hasZone2) {
					this.adapter.log.error("setDevice(): Unsupported device option. This device has no zone 2.");
					return;
				}

				modifiedAirInfo.SetHeatFlowTemperatureZone2 = value;
				modifiedAirInfo.EffectiveFlags =
					commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone2.effectiveFlags;
			} else if (deviceOption == commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone1) {
				modifiedAirInfo.SetCoolFlowTemperatureZone1 = value;
				modifiedAirInfo.EffectiveFlags =
					commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone1.effectiveFlags;
			} else if (deviceOption == commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone2) {
				if (!this.hasZone2) {
					this.adapter.log.error("setDevice(): Unsupported device option. This device has no zone 2.");
					return;
				}

				modifiedAirInfo.SetCoolFlowTemperatureZone2 = value;
				modifiedAirInfo.EffectiveFlags =
					commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone2.effectiveFlags;
			} else {
				this.adapter.log.error("setDevice(): Unsupported device option - please report this to the developer!");
				return;
			}

			modifiedAirInfo.HasPendingCommand = true;
			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetAtw";
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
							case commonDefines.AtwDeviceOptions.PowerState:
								this.power = responseData.Power;
								break;
							case commonDefines.AtwDeviceOptions.ForcedHotWaterMode:
								this.forcedHotWaterMode = responseData.ForcedHotWaterMode;
								break;
							case commonDefines.AtwDeviceOptions.OperationModeZone1:
								this.operationModeZone1 = responseData.OperationModeZone1;
								break;
							case commonDefines.AtwDeviceOptions.OperationModeZone2:
								if (this.hasZone2) {
									this.operationModeZone2 = responseData.OperationModeZone2;
								}
								break;
							case commonDefines.AtwDeviceOptions.SetTankWaterTemperature:
								this.setTankWaterTemperature = responseData.SetTankWaterTemperature;
								break;
							case commonDefines.AtwDeviceOptions.SetTemperatureZone1:
								this.setTemperatureZone1 = responseData.SetTemperatureZone1;
								break;
							case commonDefines.AtwDeviceOptions.SetTemperatureZone2:
								if (this.hasZone2) {
									this.setTemperatureZone2 = responseData.SetTemperatureZone2;
								}
								break;
							case commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone1:
								if (this.canHeat) {
									this.setHeatFlowTemperatureZone1 = responseData.SetHeatFlowTemperatureZone1;
								}
								break;
							case commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone2:
								if (this.canHeat && this.hasZone2) {
									this.setHeatFlowTemperatureZone2 = responseData.SetHeatFlowTemperatureZone2;
								}
								break;
							case commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone1:
								if (this.canCool) {
									this.setCoolFlowTemperatureZone1 = responseData.SetCoolFlowTemperatureZone1;
								}
								break;
							case commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone2:
								if (this.canCool && this.hasZone2) {
									this.setCoolFlowTemperatureZone2 = responseData.SetCoolFlowTemperatureZone2;
								}
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
			this.deviceSetRequestQueue.push([deviceOption, value]);
		}
	}

	async getPowerConsumptionReport(isCumulatedReport = false) {
		return new Promise((resolve, reject) => {
			this.adapter.log.debug(`Getting power consumption report for ${this.id} (${this.name})`);

			const doRequest = async () => {
				const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/EnergyCost/Report";
				const body = JSON.stringify(await this.buildPowerConsumptionReportRequestBody(isCumulatedReport));
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
								this.powerConsumptionReportStartDate = responseData.FromDate.substring(0, timestampPos);
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
							this.totalPowerConsumptionHeating = responseData.TotalHeatingConsumed;
							this.totalPowerConsumptionCooling = responseData.TotalCoolingConsumed;
							this.totalPowerConsumptionHotWater = responseData.TotalHotWaterConsumed;

							this.totalPowerProductionHeating = responseData.TotalHeatingProduced;
							this.totalPowerProductionCooling = responseData.TotalCoolingProduced;
							this.totalPowerProductionHotWater = responseData.TotalHotWaterProduced;

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
			};

			doRequest();
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

			// Step 1: Get current timer infos
			const getTimerUrl = `https://app.melcloud.com/Mitsubishi.Wifi.Client/Timer/Get2?deviceId=${this.id}`;

			Axios.get(getTimerUrl, {
				httpsAgent: this.platform.customHttpsAgent,
				headers: {
					Host: "app.melcloud.com",
					"X-MitsContextKey": this.platform.contextKey,
				},
			})
				.then(response => {
					if (!response) {
						this.adapter.log.error(`There was a problem receiving the response from: ${getTimerUrl}`);
						reject();
					} else {
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
							`${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Control}.${commonDefines.AtwDeviceStateIDs.TimerToogle}`,
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

						Axios.post(setTimerUrl, body, {
							httpsAgent: this.platform.customHttpsAgent,
							headers: {
								Host: "app.melcloud.com",
								"X-MitsContextKey": this.platform.contextKey,
								"Content-Type": "application/json; charset=utf-8",
							},
						})
							.then(response => {
								if (!response) {
									this.adapter.log.error(
										`There was a problem receiving the response from: ${setTimerUrl}`,
									);
								} else {
									const statusCode = response.status;
									const statusText = response.statusText;
									this.adapter.log.debug(
										`Received response from: ${setTimerUrl} (status code: ${statusCode} - ${statusText})`,
									);

									if (statusCode != HttpStatus.StatusCodes.OK) {
										this.adapter.log.error(
											`Invalid HTTP status code (${statusCode} - ${statusText}). Toggling timer failed!`,
										);
										return;
									}

									const responseData = response.data;
									this.adapter.log.debug(`Response from cloud: ${JSON.stringify(responseData)}`);

									if (responseData.Success == true) {
										this.timerToggle = enableTimer;
										this.adapter.setStateChangedAsync(
											`${commonDefines.AdapterDatapointIDs.Devices}.${this.id}.${commonDefines.AdapterDatapointIDs.Control}.${commonDefines.AtwDeviceStateIDs.TimerToogle}`,
											this.timerToggle,
											true,
										);
									} else {
										this.adapter.log.error(
											`${enableTimer ? `Enabling` : `Disabling`} timer failed with error code ${responseData.Data.ErrorCode}`,
										);
										reject();
									}
								}
							})
							.catch(error => {
								this.adapter.log.error(`There was a problem setting timer to: ${setTimerUrl}`);
								this.adapter.log.error(error);

								if (error.response && error.response.status && error.response.status == 429) {
									this.adapter.log.error(
										"You have probably been rate limited by the MELCloud servers because of too much requests. Stop the adapter for a few hours, increase the polling interval in the settings and try again later.",
									);
								}
							});

						resolve();
					}
				})
				.catch(error => {
					this.adapter.log.error(`There was a problem getting timer information from: ${getTimerUrl}`);
					this.adapter.log.error(`Error: ${error}`);

					if (error.response && error.response.status && error.response.status == 429) {
						this.adapter.log.error(
							"You have probably been rate limited by the MELCloud servers because of too much requests. Stop the adapter for a few hours, increase the polling interval in the settings and try again later.",
						);
					}

					reject();
				});
		});
	}
}

exports.MelCloudDevice = MelcloudAtwDevice;
