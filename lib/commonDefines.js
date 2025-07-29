"use strict";

exports.AdapterDatapointIDs = Object.freeze({
	Info: "info",
	Devices: "devices",
	Control: "control",
	Reports: "reports",
	LastReportData: "lastReportData",
});

exports.AdapterStateIDs = Object.freeze({
	// root
	Connection: "connection",
});

exports.CommonDeviceStateIDs = Object.freeze({
	// device.XXX.info
	DeviceName: "deviceName",
	DeviceType: "deviceType",
	SerialNumber: "serialNumber",
	MacAddress: "macAddress",
	BuildingId: "buildingId",
	FloorId: "floorId",
	LastCommunication: "lastCommunication",
	NextCommunication: "nextCommunication",
	DeviceOnline: "deviceOnline",
	DeviceHasError: "hasError",
	ErrorMessages: "errorMessages",
	ErrorCode: "errorCode",
	CanCool: "canCool",
	CanHeat: "canHeat",
	// device.XXX.control
	TimerToogle: "timerToggle",
	// reports
	GetCumulatedPowerConsumptionReport: "getCumulatedPowerConsumptionReport",
	// device.XXX.reports
	PowerConsumptionReportStartDate: "startDate",
	PowerConsumptionReportEndDate: "endDate",
	GetPowerConsumptionReport: "getPowerConsumptionReport",
	// device.XXX.reports.lastReportData
	TotalPowerConsumptionPrefix: "totalPowerConsumption",
	TotalPowerProductionPrefix: "totalPowerProduction",
	TotalReportedMinutes: "totalMinutes",
	RawPowerConsumptionData: "rawPowerConsumptionData",
});

exports.AtaDeviceStateIDs = Object.freeze({
	// device.XXX.info
	CanDry: "canDry",
	MinTempCoolDry: "minTempCoolDry",
	MaxTempCoolDry: "maxTempCoolDry",
	MinTempHeat: "minTempHeat",
	MaxTempHeat: "maxTempHeat",
	MinTempAuto: "minTempAuto",
	MaxTempAuto: "maxTempAuto",
	RoomTemp: "roomTemp",
	FanSpeedAuto: "actualFanSpeed",
	NumberOfFanSpeeds: "numberOfFanSpeeds",
	// device.XXX.control
	Power: "power",
	Mode: "mode",
	TargetTemp: "targetTemp",
	FanSpeedManual: "fanSpeed",
	VaneHorizontalDirection: "vaneHorizontalDirection",
	VaneVerticalDirection: "vaneVerticalDirection",
});

exports.AtwDeviceStateIDs = Object.freeze({
	// device.XXX.info
	HasZone2: "hasZone2",
	RoomTemperatureZone1: "roomTemperatureZone1",
	RoomTemperatureZone2: "roomTemperatureZone2",
	MixingTankWaterTemperature: "mixingTankWaterTemperature",
	CondensingTemperature: "condensingTemperature",
	OutdoorTemperature: "outdoorTemperature",
	FlowTemperature: "flowTemperature",
	FlowTemperatureZone1: "flowTemperatureZone1",
	FlowTemperatureZone2: "flowTemperatureZone2",
	FlowTemperatureBoiler: "flowTemperatureBoiler",
	ReturnTemperature: "returnTemperature",
	ReturnTemperatureZone1: "returnTemperatureZone1",
	ReturnTemperatureZone2: "ReturnTemperatureZone2",
	ReturnTemperatureBoiler: "returnTemperatureBoiler",
	TankWaterTemperature: "tankWaterTemperature",
	HeatPumpFrequency: "heatPumpFrequency",
	OperationState: "operationState",
	// device.XXX.control
	Power: "power",
	ForcedHotWaterMode: "forcedHotWaterMode",
	OperationModeZone1: "operationModeZone1",
	OperationModeZone2: "operationModeZone2",
	SetTankWaterTemperature: "setTankWaterTemperature",
	SetTemperatureZone1: "setTemperatureZone1",
	SetTemperatureZone2: "setTemperatureZone2",
	SetHeatFlowTemperatureZone1: "setHeatFlowTemperatureZone1",
	SetHeatFlowTemperatureZone2: "setHeatFlowTemperatureZone2",
	SetCoolFlowTemperatureZone1: "setCoolFlowTemperatureZone1",
	SetCoolFlowTemperatureZone2: "setCoolFlowTemperatureZone2",
});

exports.ErvDeviceStateIDs = Object.freeze({
	// device.XXX.info
	MinTempCoolDry: "minTempCoolDry",
	MaxTempCoolDry: "maxTempCoolDry",
	MinTempHeat: "minTempHeat",
	MaxTempHeat: "maxTempHeat",
	MinTempAuto: "minTempAuto",
	MaxTempAuto: "maxTempAuto",
	RoomTemp: "roomTemp",
	OutdoorTemp: "outdoorTemp",
	SupplyFanSpeed: "actualSupplyFanSpeed",
	ExhaustFanSpeed: "actualExhaustFanSpeed",
	NumberOfFanSpeeds: "numberOfFanSpeeds",
	// device.XXX.control
	Power: "power",
	Mode: "mode",
	FanSpeed: "fanSpeed",
});

exports.DeviceTypes = Object.freeze({
	AirToAir: 0, // Luft-Luft-Wärmepumpen / Klimaanlagen
	AirToWater: 1, // Luft-Wasser-Wärmepumpen
	EnergyRecoveryVentilation: 3, // Lüftungsanlagen
});

exports.AtaDeviceOperationModes = Object.freeze({
	UNDEF: { id: "Undefined", value: -1, effectiveFlags: -1 },
	HEAT: { id: "Heat", value: 1, effectiveFlags: 1 + 2 },
	DRY: { id: "Dry", value: 2, effectiveFlags: 1 + 2 },
	COOL: { id: "Cool", value: 3, effectiveFlags: 1 + 2 },
	VENT: { id: "Vent", value: 7, effectiveFlags: 1 + 2 },
	AUTO: { id: "Auto", value: 8, effectiveFlags: 1 + 2 },
});

exports.AtwDeviceOperationModes = Object.freeze({
	UNDEF: { id: "Undefined", value: -1, effectiveFlags: -1 },
	AUTO: { id: "Auto", value: 0, effectiveFlags: 16 },
	FORCEDHOTWATERMODE: { id: "ForcedHotWaterMode", value: 1, effectiveFlags: 16 },
});

exports.AtwDeviceZoneOperationModes = Object.freeze({
	UNDEF: { id: "Undefined", value: -1, effectiveFlags: -1 },
	HEATTHERMOSTAT: { id: "HeatThermostat", value: 0, effectiveFlags: 1 + 2 },
	HEATFLOW: { id: "HeatFlow", value: 1, effectiveFlags: 1 + 2 },
	CURVE: { id: "Curve", value: 2, effectiveFlags: 1 + 2 },
	COOLTHERMOSTAT: { id: "CoolThermostat", value: 3, effectiveFlags: 1 + 2 },
	COOLFLOW: { id: "CoolFlow", value: 4, effectiveFlags: 1 + 2 },
});

exports.ErvDeviceOperationModes = Object.freeze({
	UNDEF: { id: "Undefined", value: -1, effectiveFlags: -1 },
	RECOVERY: { id: "Recovery", value: 0, effectiveFlags: 4 },
	BYPASS: { id: "Bypass", value: 1, effectiveFlags: 4 },
	AUTO: { id: "Auto", value: 2, effectiveFlags: 4 },
});

exports.DevicePowerStates = Object.freeze({
	OFF: { value: false, effectiveFlags: 1 },
	ON: { value: true, effectiveFlags: 1 },
});

exports.AtaDeviceOptions = Object.freeze({
	PowerState: { id: "PowerState" },
	TargetHeatingCoolingState: { id: "TargetHeatingCoolingState" },
	TargetTemperature: { id: "TargetTemperature", effectiveFlags: 4 /*0x04*/ },
	FanSpeed: { id: "FanSpeed", effectiveFlags: 8 /*0x08*/ },
	VaneHorizontalDirection: { id: "VaneHorizontalDirection", effectiveFlags: 256 /*0x100*/ },
	VaneVerticalDirection: { id: "VaneVerticalDirection", effectiveFlags: 16 /*0x10*/ },
});

exports.AtwDeviceOptions = Object.freeze({
	PowerState: { id: "PowerState" },
	ForcedHotWaterMode: { id: "ForcedHotWaterMode", effectiveFlags: 65536 /*0x1000000000020*/ },
	OperationModeZone1: { id: "OperationModeZone1", effectiveFlags: 8 /*0x08*/ },
	OperationModeZone2: { id: "OperationModeZone2", effectiveFlags: 16 /*0x10*/ },
	SetTemperatureZone1: { id: "SetTemperatureZone1", effectiveFlags: 8589934720 /*0x200000080*/ },
	SetTemperatureZone2: { id: "SetTemperatureZone2", effectiveFlags: 34359738880 /*0x800000200*/ },
	SetTankWaterTemperature: { id: "SetTankWaterTemperature", effectiveFlags: 281474976710688 /*0x1000000000020*/ },
	SetHeatFlowTemperatureZone1: {
		id: "SetHeatFlowTemperatureZone1",
		effectiveFlags: 281474976710656 /*0x1000000000000*/,
	},
	SetHeatFlowTemperatureZone2: {
		id: "SetHeatFlowTemperatureZone2",
		effectiveFlags: 281474976710656 /*0x1000000000000*/,
	},
	SetCoolFlowTemperatureZone1: {
		id: "SetCoolFlowTemperatureZone1",
		effectiveFlags: 281474976710656 /*0x1000000000000*/,
	},
	SetCoolFlowTemperatureZone2: {
		id: "SetCoolFlowTemperatureZone2",
		effectiveFlags: 281474976710656 /*0x1000000000000*/,
	},
});

exports.ErvDeviceOptions = Object.freeze({
	PowerState: { id: "PowerState" },
	OperationMode: { id: "OperationMode", effectiveFlags: 4 /*0x04*/ },
	FanSpeed: { id: "FanSpeed", effectiveFlags: 8 /*0x08*/ },
});

/**
 * @param {string | any[]} key
 * @param {string} value
 * @returns {string} decrypted value
 */
exports.decrypt = function (key, value) {
	let result = "";
	for (let i = 0; i < value.length; ++i) {
		result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
	}
	return result;
};

/**
 * @param {number} value Value to be rounded
 * @param {number} [precision] Number of decimal places (default = 0)
 * @returns {number} Rounded value
 */
exports.roundValue = function (value, precision = 0) {
	const multiplier = Math.pow(10, precision);
	return Math.round(value * multiplier) / multiplier;
};
