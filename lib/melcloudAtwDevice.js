"use strict";

const Axios = require("axios").default;
const commonDefines = require("./commonDefines");
const HttpStatus = require("http-status-codes");

let gthat = null; // pointer to "this" from main.js/MelCloud instance

class MelcloudAtwDevice {
	constructor(that) {
		gthat = that;
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
		this.lastCommunication = null;
		this.nextCommunication = null;
		this.deviceOnline = false;

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
	}

	// Creates all necessery states and channels and writes the values into the DB
	async CreateAndSave() {
		// check if object has already been created
		if (this.hasBeenCreated) return;

		const devicePrefix = `${commonDefines.AdapterDatapointIDs.Devices  }.${  this.id}`;
		await gthat.extendObjectAsync(devicePrefix, {
			type: "channel",
			common: {
				name: `ATW Device ${  this.id  } (${  this.name  })`
			},
			native: {}
		});

		//#region INFO
		let infoPrefix = `${devicePrefix  }.${  commonDefines.AdapterDatapointIDs.Info}`;
		await gthat.extendObjectAsync(infoPrefix, {
			type: "channel",
			common: {
				name: "Device information"
			},
			native: {}
		});

		infoPrefix += ".";

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceName, {
			type: "state",
			common: {
				name: "Device name",
				type: "string",
				role: "info.name",
				read: true,
				write: false,
				def: this.name,
				desc: "MELCloud device name"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceType, {
			type: "state",
			common: {
				name: "Device type",
				type: "number",
				role: "value",
				states: {
					0: "Air to air heat pump / air conditioner",
					1: "Air to water heat pump"
				},
				read: true,
				write: false,
				def: this.deviceType,
				desc: "MELCloud device type"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.SerialNumber, {
			type: "state",
			common: {
				name: "Serial number",
				type: "string",
				role: "value",
				read: true,
				write: false,
				def: this.serialNumber,
				desc: "Serial number of the device"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.MacAddress, {
			type: "state",
			common: {
				name: "MAC address",
				type: "string",
				role: "info.mac",
				read: true,
				write: false,
				def: this.macAddress,
				desc: "MAC address of the device"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.BuildingId, {
			type: "state",
			common: {
				name: "Building ID",
				type: "number",
				role: "value",
				read: true,
				write: false,
				def: this.buildingId,
				desc: "MELCloud building ID"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.FloorId, {
			type: "state",
			common: {
				name: "Floor ID",
				type: "number",
				role: "value",
				read: true,
				write: false,
				def: this.floorId,
				desc: "MELCloud floor ID"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.CanCool, {
			type: "state",
			common: {
				name: "Ability to cool",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				def: this.canCool,
				desc: "Ability to cool"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.CanHeat, {
			type: "state",
			common: {
				name: "Ability to heat",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				def: this.canHeat,
				desc: "Ability to heat"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.HasZone2, {
			type: "state",
			common: {
				name: "Has Zone 2",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				def: this.hasZone2,
				desc: "Has Zone 2?"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.RoomTemperatureZone1, {
			type: "state",
			common: {
				name: "Room temperature zone 1",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.roomTemperatureZone1,
				desc: "Room temperature in zone 1"
			},
			native: {}
		});

		if (this.hasZone2) {
			await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.RoomTemperatureZone2, {
				type: "state",
				common: {
					name: "Room temperature zone 2",
					type: "number",
					role: "value.temperature",
					unit: this.platform.UseFahrenheit ? "°F" : "°C",
					read: true,
					write: false,
					def: this.roomTemperatureZone2,
					desc: "Room temperature in zone 2"
				},
				native: {}
			});
		}

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.MixingTankWaterTemperature, {
			type: "state",
			common: {
				name: "Mixing tank temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.mixingTankWaterTemperature,
				desc: "Mixing tank temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.CondensingTemperature, {
			type: "state",
			common: {
				name: "Condensing temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.condensingTemperature,
				desc: "Condensing temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.OutdoorTemperature, {
			type: "state",
			common: {
				name: "Outdoor temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.outdoorTemperature,
				desc: "Outdoor temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperature, {
			type: "state",
			common: {
				name: "Flow temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.flowTemperature,
				desc: "Flow temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureZone1, {
			type: "state",
			common: {
				name: "Flow temperature zone 1",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.flowTemperatureZone1,
				desc: "Flow temperaturein zone 1"
			},
			native: {}
		});

		if (this.hasZone2) {
			await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureZone2, {
				type: "state",
				common: {
					name: "Flow temperature zone 1",
					type: "number",
					role: "value.temperature",
					unit: this.platform.UseFahrenheit ? "°F" : "°C",
					read: true,
					write: false,
					def: this.flowTemperatureZone2,
					desc: "Flow temperaturein zone 2"
				},
				native: {}
			});
		}

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureBoiler, {
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
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperature, {
			type: "state",
			common: {
				name: "Return temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.returnTemperature,
				desc: "Return temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureZone1, {
			type: "state",
			common: {
				name: "Return temperature zone 1",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.returnTemperatureZone1,
				desc: "Return temperature in zone 1"
			},
			native: {}
		});

		if (this.hasZone2) {
			await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureZone2, {
				type: "state",
				common: {
					name: "Return temperature zone 2",
					type: "number",
					role: "value.temperature",
					unit: this.platform.UseFahrenheit ? "°F" : "°C",
					read: true,
					write: false,
					def: this.ReturnTemperatureZone2,
					desc: "Return temperature in zone 2"
				},
				native: {}
			});
		}

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureBoiler, {
			type: "state",
			common: {
				name: "Return temperature boiler",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.returnTemperatureBoiler,
				desc: "Return temperature boiler"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.TankWaterTemperature, {
			type: "state",
			common: {
				name: "Tank water temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: false,
				def: this.tankWaterTemperature,
				desc: "Tank water temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.LastCommunication, {
			type: "state",
			common: {
				name: "Last communication",
				type: "string",
				role: "date",
				read: true,
				write: false,
				def: this.lastCommunication,
				desc: "Last communication date/time (MELCloud to device)"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.NextCommunication, {
			type: "state",
			common: {
				name: "Next communication",
				type: "string",
				role: "date",
				read: true,
				write: false,
				def: this.nextCommunication,
				desc: "Next communication date/time (MELCloud to device)"
			},
			native: {}
		});

		await gthat.extendObjectAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceOnline, {
			type: "state",
			common: {
				name: "Is device online",
				type: "boolean",
				role: "indicator.reachable",
				read: true,
				write: false,
				def: this.deviceOnline,
				desc: "Indicates if device is reachable"
			},
			native: {}
		});
		//#endregion

		//#region CONTROL
		let controlPrefix = `${devicePrefix  }.${  commonDefines.AdapterDatapointIDs.Control}`;
		await gthat.extendObjectAsync(controlPrefix, {
			type: "channel",
			common: {
				name: "Device control"
			},
			native: {}
		});

		controlPrefix += ".";

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.Power, {
			type: "state",
			common: {
				name: "Power",
				type: "boolean",
				role: "switch.power",
				read: true,
				write: true,
				def: this.power,
				desc: "Power switch"
			},
			native: {}
		});

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.ForcedHotWaterMode, {
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
					true: "FORCEDHOTWATERMODE"
				}
			},
			native: {}
		});

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone1, {
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
					4: "COOLFLOW"
				}
			},
			native: {}
		});

		if (this.hasZone2) {
			await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone2, {
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
						4: "COOLFLOW"
					}
				},
				native: {}
			});
		}

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTankWaterTemperature, {
			type: "state",
			common: {
				name: "Set tank water temperature",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: true,
				def: this.setTankWaterTemperature,
				desc: "Set tank water temperature"
			},
			native: {}
		});

		await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone1, {
			type: "state",
			common: {
				name: "Set temperature zone 1",
				type: "number",
				role: "value.temperature",
				unit: this.platform.UseFahrenheit ? "°F" : "°C",
				read: true,
				write: true,
				def: this.setTemperatureZone1,
				desc: "Set temperature for zone 1"
			},
			native: {}
		});

		if (this.hasZone2) {
			await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone2, {
				type: "state",
				common: {
					name: "Set temperature zone 2",
					type: "number",
					role: "value.temperature",
					unit: this.platform.UseFahrenheit ? "°F" : "°C",
					read: true,
					write: true,
					def: this.setTemperatureZone2,
					desc: "Set temperature for zone 2"
				},
				native: {}
			});
		}

		if (this.canHeat) {
			await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone1, {
				type: "state",
				common: {
					name: "Set heat flow temperature zone 1",
					type: "number",
					role: "value.temperature",
					unit: this.platform.UseFahrenheit ? "°F" : "°C",
					read: true,
					write: true,
					def: this.setHeatFlowTemperatureZone1,
					desc: "Set heat flow temperature for zone 1"
				},
				native: {}
			});

			if (this.hasZone2) {
				await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone2, {
					type: "state",
					common: {
						name: "Set heat flow temperature zone 2",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: true,
						def: this.setHeatFlowTemperatureZone2,
						desc: "Set heat flow temperature for zone 2"
					},
					native: {}
				});
			}
		}

		if (this.canCool) {
			await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone1, {
				type: "state",
				common: {
					name: "Set cool flow temperature zone 1",
					type: "number",
					role: "value.temperature",
					unit: this.platform.UseFahrenheit ? "°F" : "°C",
					read: true,
					write: true,
					def: this.setCoolFlowTemperatureZone1,
					desc: "Set cool flow temperature for zone 1"
				},
				native: {}
			});

			if (this.hasZone2) {
				await gthat.extendObjectAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone2, {
					type: "state",
					common: {
						name: "Set cool flow temperature zone 2",
						type: "number",
						role: "value.temperature",
						unit: this.platform.UseFahrenheit ? "°F" : "°C",
						read: true,
						write: true,
						def: this.setCoolFlowTemperatureZone2,
						desc: "Set cool flow temperature for zone 2"
					},
					native: {}
				});
			}
		}
		//#endregion

		gthat.log.debug(`Created and saved ATW device ${  this.id  } (${  this.name  })`);
		this.hasBeenCreated = true;
	}

	// Only writes changed device data into the DB
	async UpdateDeviceData(deviceOption) {
		//#region INFO
		const infoPrefix = `${commonDefines.AdapterDatapointIDs.Devices  }.${  this.id  }.${  commonDefines.AdapterDatapointIDs.Info  }.`;

		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceName, this.name, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.SerialNumber, this.serialNumber, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.MacAddress, this.macAddress, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.BuildingId, this.buildingId, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.FloorId, this.floorId, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.CanCool, this.canCool, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.CanHeat, this.canHeat, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.RoomTemperatureZone1, this.roomTemperatureZone1, true);
		if (this.hasZone2) await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.RoomTemperatureZone2, this.roomTemperatureZone2, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.MixingTankWaterTemperature, this.mixingTankWaterTemperature, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.CondensingTemperature, this.condensingTemperature, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.OutdoorTemperature, this.outdoorTemperature, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperature, this.flowTemperature, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureZone1, this.flowTemperatureZone1, true);
		if (this.hasZone2) await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureZone2, this.flowTemperatureZone2, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.FlowTemperatureBoiler, this.flowTemperatureBoiler, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperature, this.returnTemperature, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureZone1, this.returnTemperatureZone1, true);
		if (this.hasZone2) await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureZone2, this.ReturnTemperatureZone2, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.ReturnTemperatureBoiler, this.returnTemperatureBoiler, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.AtwDeviceStateIDs.TankWaterTemperature, this.tankWaterTemperature, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.LastCommunication, this.lastCommunication, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.NextCommunication, this.nextCommunication, true);
		await gthat.setStateChangedAsync(infoPrefix + commonDefines.CommonDeviceStateIDs.DeviceOnline, this.deviceOnline, true);
		//#endregion

		//#region CONTROL
		const controlPrefix = `${commonDefines.AdapterDatapointIDs.Devices  }.${  this.id  }.${  commonDefines.AdapterDatapointIDs.Control  }.`;

		switch (deviceOption) {
			case commonDefines.AtwDeviceOptions.PowerState:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.Power, this.power, true);
				break;
			case commonDefines.AtwDeviceOptions.ForcedHotWaterMode:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.ForcedHotWaterMode, this.forcedHotWaterMode, true);
				break;
			case commonDefines.AtwDeviceOptions.OperationModeZone1:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone1, this.operationModeZone1, true);
				break;
			case commonDefines.AtwDeviceOptions.OperationModeZone2:
				if (this.hasZone2) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone2, this.operationModeZone2, true);
				break;
			case commonDefines.AtwDeviceOptions.SetTankWaterTemperature:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTankWaterTemperature, this.setTankWaterTemperature, true);
				break;
			case commonDefines.AtwDeviceOptions.SetTemperatureZone1:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone1, this.setTemperatureZone1, true);
				break;
			case commonDefines.AtwDeviceOptions.SetTemperatureZone2:
				if (this.hasZone2) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone2, this.setTemperatureZone2, true);
				break;
			case commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone1:
				if(this.canHeat) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone1, this.setHeatFlowTemperatureZone1, true);
				break;
			case commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone2:
				if (this.canHeat && this.hasZone2) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone2, this.setHeatFlowTemperatureZone2, true);
				break;
			case commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone1:
				if (this.canCool) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone1, this.setCoolFlowTemperatureZone1, true);
				break;
			case commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone2:
				if (this.canCool && this.hasZone2) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone2, this.setCoolFlowTemperatureZone2, true);
				break;

			case "ALL":
			default:
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.Power, this.power, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.ForcedHotWaterMode, this.forcedHotWaterMode, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone1, this.operationModeZone1, true);
				if (this.hasZone2) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.OperationModeZone2, this.operationModeZone2, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTankWaterTemperature, this.setTankWaterTemperature, true);
				await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone1, this.setTemperatureZone1, true);
				if (this.hasZone2) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetTemperatureZone2, this.setTemperatureZone2, true);
				if(this.canHeat) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone1, this.setHeatFlowTemperatureZone1, true);
				if (this.canHeat && this.hasZone2) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetHeatFlowTemperatureZone2, this.setHeatFlowTemperatureZone2, true);
				if (this.canCool) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone1, this.setCoolFlowTemperatureZone1, true);
				if (this.canCool && this.hasZone2) await gthat.setStateChangedAsync(controlPrefix + commonDefines.AtwDeviceStateIDs.SetCoolFlowTemperatureZone2, this.setCoolFlowTemperatureZone2, true);
				break;
		}
		//#endregion

		gthat.log.debug(`Updated device data for device ${  this.id  } (${  this.name  })`);
	}

	getDeviceInfo(callback, deviceOption, value) {
		const gthis = this;

		if (gthis.airInfo != null) {
			gthat.log.debug(`Data already available for: ${  gthis.id  } (${  gthis.name  })`);
			callback && callback(deviceOption, value, gthis);

			if (gthis.deviceInfoRequestQueue.length) {
				const args = gthis.deviceInfoRequestQueue.shift();
				gthat.log.debug(`Dequeuing getDeviceInfo remote request for device option '${  args[1].id  }' with value '${  args[2].value != undefined ? args[2].value : args[2]  }'...`);
				gthis.getDeviceInfo.apply(gthis, args);
			}

			return;
		}

		gthat.log.debug(`Getting device data for ${  gthis.id  } (${  gthis.name  })`);

		if (gthis.currentDeviceInfoRequests < 1) {
			gthis.currentDeviceInfoRequests++;

			const url = `https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/Get?id=${  gthis.id  }&buildingID=${  gthis.buildingId}`;

			Axios.get(url, {
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey
				}
			}).then(function handleDeviceInfoResponse(response) {
				if (!response || !response.data || JSON.stringify(response.data).search("<!DOCTYPE html>") != -1) {
					gthat.log.error(`There was a problem receiving the response from: ${  url}`);
					gthis.airInfo = null;
				}
				else {
					const statusCode = response.status;
					gthat.log.debug(`Received response from: ${  url  } (status code: ${  statusCode  } - ${  response.statusText  })`);

					if (statusCode != HttpStatus.StatusCodes.OK) {
						gthis.airInfo = null;
						gthat.log.error(`Invalid HTTP status code (${  statusCode  } - ${  response.statusText  }). Getting device data failed!`);
						return;
					}

					gthat.log.debug(`Response from cloud: ${  JSON.stringify(response.data)}`);
					gthis.airInfo = response.data;

					// Cache airInfo data for 1 minute
					setTimeout(function clearAirInfo() {
						gthis.airInfo = null;
					}, 60 * 1000);
				}

				gthis.currentDeviceInfoRequests--;
				callback && callback(deviceOption, value, gthis);

				if (gthis.deviceInfoRequestQueue.length) {
					const args = gthis.deviceInfoRequestQueue.shift();
					gthat.log.debug(`Dequeuing getDeviceInfo remote request for device option '${  args[1].id  }' with value '${  args[2].value != undefined ? args[2].value : args[2]  }'`);
					gthis.getDeviceInfo.apply(gthis, args);
				}
			}).catch(error => {
				gthat.log.error(`There was a problem getting device data from: ${  url}`);
				gthat.log.error(`Error: ${  error}`);
				gthis.airInfo = null;

				gthis.currentDeviceInfoRequests--;

				if (gthis.deviceInfoRequestQueue.length) {
					const args = gthis.deviceInfoRequestQueue.shift();
					gthat.log.debug(`Dequeuing getDeviceInfo remote request for device option '${  args[1].id  }' with value '${  args[2].value != undefined ? args[2].value : args[2]  }'`);
					gthis.getDeviceInfo.apply(gthis, args);
				}
			});
		}
		else {
			gthat.log.debug(`Queueing getDeviceInfo remote request for '${  deviceOption.id  }' with value '${  value.value != undefined ? value.value : value  }'...`);
			gthis.deviceInfoRequestQueue.push(arguments);
		}
	}

	setDevice(deviceOption, value, gthis) {
		if (gthis.currentDeviceSetRequests < 1) {
			gthis.currentDeviceSetRequests++;

			gthat.log.debug(`Changing device option '${  deviceOption.id  }' to '${  value.value != undefined ? value.value : value  }'...`);
			const r = gthis.airInfo;

			if (deviceOption == commonDefines.AtwDeviceOptions.PowerState) {
				switch (value) {
					case commonDefines.DevicePowerStates.OFF:
						r.Power = commonDefines.DevicePowerStates.OFF.value;
						r.EffectiveFlags = commonDefines.DevicePowerStates.OFF.effectiveFlags;
						break;
					case commonDefines.DevicePowerStates.ON:
						r.Power = commonDefines.DevicePowerStates.ON.value;
						r.EffectiveFlags = commonDefines.DevicePowerStates.ON.effectiveFlags;
						break;
					default:
						gthat.log.error("Unsupported value for device option - please report this to the developer!");
						return;
				}
			}
			else if (deviceOption == commonDefines.AtwDeviceOptions.ForcedHotWaterMode) {
				r.ForcedHotWaterMode = value;
				r.EffectiveFlags = commonDefines.AtwDeviceOptions.ForcedHotWaterMode.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtwDeviceOptions.OperationModeZone1 || deviceOption == commonDefines.AtwDeviceOptions.OperationModeZone2) {
				const isZone1 = deviceOption == commonDefines.AtwDeviceOptions.OperationModeZone1;

				if (!isZone1 && !gthis.hasZone2) {
					gthat.log.error("Unsupported operation mode. This device has no zone 2.");
					return;
				}

				if ((value == commonDefines.AtwDeviceZoneOperationModes.COOLFLOW.value || value == commonDefines.AtwDeviceZoneOperationModes.COOLTHERMOSTAT.value) && !gthis.canCool) {
					gthat.log.error("Unsupported operation mode. Device can not cool!");
					return;
				}

				if ((value == commonDefines.AtwDeviceZoneOperationModes.HEATFLOW.value || value == commonDefines.AtwDeviceZoneOperationModes.HEATFLOW.value || value == commonDefines.AtwDeviceZoneOperationModes.CURVE.value) && !gthis.canHeat) {
					gthat.log.error("Unsupported operation mode. Device can not heat!");
					return;
				}

				r.EffectiveFlags = isZone1 ? commonDefines.AtwDeviceOptions.OperationModeZone1.effectiveFlags : commonDefines.AtwDeviceOptions.OperationModeZone2.effectiveFlags;

				switch (value) {
					case commonDefines.AtwDeviceZoneOperationModes.HEATTHERMOSTAT:
						r.OperationMode = commonDefines.AtwDeviceZoneOperationModes.HEATTHERMOSTAT.value;
						break;
					case commonDefines.AtwDeviceZoneOperationModes.HEATFLOW:
						r.OperationMode = commonDefines.AtwDeviceZoneOperationModes.HEATFLOW.value;
						break;
					case commonDefines.AtwDeviceZoneOperationModes.CURVE:
						r.OperationMode = commonDefines.AtwDeviceZoneOperationModes.CURVE.value;
						break;
					case commonDefines.AtwDeviceZoneOperationModes.COOLTHERMOSTAT:
						r.OperationMode = commonDefines.AtwDeviceZoneOperationModes.COOLTHERMOSTAT.value;
						break;
					case commonDefines.AtwDeviceZoneOperationModes.COOLFLOW:
						r.OperationMode = commonDefines.AtwDeviceZoneOperationModes.COOLFLOW.value;
						break;
					default:
						gthat.log.error("Unsupported value for device option - please report this to the developer!");
						return;
				}
			}
			else if (deviceOption == commonDefines.AtwDeviceOptions.SetTankWaterTemperature) {
				r.SetTankWaterTemperature = value;
				r.EffectiveFlags = commonDefines.AtwDeviceOptions.SetTankWaterTemperature.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtwDeviceOptions.SetTemperatureZone1) {
				r.SetTemperatureZone1 = value;
				r.EffectiveFlags = commonDefines.AtwDeviceOptions.SetTemperatureZone1.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtwDeviceOptions.SetTemperatureZone2) {
				if (!gthis.hasZone2) {
					gthat.log.error("Unsupported device option. This device has no zone 2.");
					return;
				}

				r.SetTemperatureZone2 = value;
				r.EffectiveFlags = commonDefines.AtwDeviceOptions.SetTemperatureZone2.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone1) {
				r.SetHeatFlowTemperatureZone1 = value;
				r.EffectiveFlags = commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone1.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone2) {
				if (!gthis.hasZone2) {
					gthat.log.error("Unsupported device option. This device has no zone 2.");
					return;
				}

				r.SetHeatFlowTemperatureZone2 = value;
				r.EffectiveFlags = commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone2.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone1) {
				r.SetCoolFlowTemperatureZone1 = value;
				r.EffectiveFlags = commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone1.effectiveFlags;
			}
			else if (deviceOption == commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone2) {
				if (!gthis.hasZone2) {
					gthat.log.error("Unsupported device option. This device has no zone 2.");
					return;
				}

				r.SetCoolFlowTemperatureZone2 = value;
				r.EffectiveFlags = commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone2.effectiveFlags;
			}
			else {
				gthat.log.error("Unsupported device option - please report this to the developer!");
				return;
			}

			r.HasPendingCommand = true;
			const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetAtw";
			const body = JSON.stringify(gthis.airInfo);
			gthat.log.silly(`Request body: ${  body}`);

			Axios.post(url, body, {
				headers: {
					"X-MitsContextKey": gthis.platform.contextKey,
					"content-type": "application/json"
				}
			}).then(function handleSetDeviceResponse(response) {
				if (!response) {
					gthat.log.error(`There was a problem receiving the response from: ${  url}`);
					gthis.airInfo = null;
				}
				else {
					const statusCode = response.status;
					const statusText = response.statusText;
					gthat.log.debug(`Received response from: ${  url  } (status code: ${  statusCode  } - ${  statusText  })`);

					if (statusCode != HttpStatus.StatusCodes.OK) {
						gthis.airInfo = null;
						gthat.log.error(`Invalid HTTP status code (${  statusCode  } - ${  statusText  }). Changing device option failed!`);
						return;
					}

					const responseData = response.data;
					gthat.log.debug(`Response from cloud: ${  JSON.stringify(responseData)}`);

					gthis.lastCommunication = responseData.LastCommunication;
					gthis.nextCommunication = responseData.NextCommunication;
					gthis.roomTemp = responseData.RoomTemperature;
					gthis.deviceOnline = !responseData.Offline;

					switch (deviceOption) {
						case commonDefines.AtwDeviceOptions.PowerState:
							gthis.power = responseData.Power;
							break;
						case commonDefines.AtwDeviceOptions.ForcedHotWaterMode:
							gthis.forcedHotWaterMode = responseData.ForcedHotWaterMode;
							break;
						case commonDefines.AtwDeviceOptions.OperationModeZone1:
							gthis.operationModeZone1 = responseData.OperationModeZone1;
							break;
						case commonDefines.AtwDeviceOptions.OperationModeZone2:
							if (gthis.hasZone2) gthis.operationModeZone2 = responseData.OperationModeZone2;
							break;
						case commonDefines.AtwDeviceOptions.SetTankWaterTemperature:
							gthis.setTankWaterTemperature = responseData.SetTankWaterTemperature;
							break;
						case commonDefines.AtwDeviceOptions.SetTemperatureZone1:
							gthis.setTemperatureZone1 = responseData.SetTemperatureZone1;
							break;
						case commonDefines.AtwDeviceOptions.SetTemperatureZone2:
							if (gthis.hasZone2) gthis.setTemperatureZone2 = responseData.SetTemperatureZone2;
							break;
						case commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone1:
							if(gthis.canHeat) gthis.setHeatFlowTemperatureZone1 = responseData.SetHeatFlowTemperatureZone1;
							break;
						case commonDefines.AtwDeviceOptions.SetHeatFlowTemperatureZone2:
							if (gthis.canHeat && gthis.hasZone2) gthis.setHeatFlowTemperatureZone2 = responseData.SetHeatFlowTemperatureZone2;
							break;
						case commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone1:
							if(gthis.canCool) gthis.setCoolFlowTemperatureZone1 = responseData.SetCoolFlowTemperatureZone1;
							break;
						case commonDefines.AtwDeviceOptions.SetCoolFlowTemperatureZone2:
							if (gthat.canCool && gthis.hasZone2) gthis.setCoolFlowTemperatureZone2 = responseData.SetCoolFlowTemperatureZone2;
							break;
						default:
							break;
					}

					gthis.UpdateDeviceData(deviceOption); // write updated values

					gthis.currentDeviceSetRequests--;

					if (gthis.deviceSetRequestQueue.length) {
						const args = gthis.deviceSetRequestQueue.shift();
						gthat.log.debug(`Dequeuing setDevice remote request for device option '${  args[0].id  }' with value '${  args[1].value != undefined ? args[1].value : args[1]  }'`);
						gthis.setDevice.apply(gthis, args);
					}
				}
			}).catch(error => {
				gthat.log.error(`There was a problem setting info to: ${  url}`);
				gthat.log.error(error);

				gthis.currentDeviceSetRequests--;

				if (gthis.deviceSetRequestQueue.length) {
					const args = gthis.deviceSetRequestQueue.shift();
					gthat.log.debug(`Dequeuing setDevice remote request for device option '${  args[0].id  }' with value '${  args[1].value != undefined ? args[1].value : args[1]  }'`);
					gthis.setDevice.apply(gthis, args);
				}
			});
		}
		else {
			gthat.log.debug(`Queueing setDevice remote request for '${  deviceOption.id  }' with value '${  value.value != undefined ? value.value : value  }'...`);
			gthis.deviceSetRequestQueue.push(arguments);
		}
	}
}

exports.MelCloudDevice = MelcloudAtwDevice;