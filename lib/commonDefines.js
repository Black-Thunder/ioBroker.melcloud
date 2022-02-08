"use strict";

exports.AdapterDatapointIDs = Object.freeze({
	Info: "info",
	Devices: "devices",
	Control: "control",
	Reports: "reports"
});

exports.AdapterStateIDs = Object.freeze({
	// root
	Connection: "connection"
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
	DeviceOnline: "deviceOnline"
});

exports.AtaDeviceStateIDs = Object.freeze({
	// device.XXX.info
	CanCool: "canCool",
	CanHeat: "canHeat",
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
	// device.XXX.reports
	ReportStartDate: "startDate",
	ReportEndDate: "endDate",
	ReportedMonths: "reportedMonths",
	GetPowerConsumptionReport: "getPowerConsumptionReport",
	TotalPowerConsumptionPrefix: "totalPowerConsumption",
	TotalMinutes: "totalMinutes",
});

exports.AtwDeviceStateIDs = Object.freeze({
	// device.XXX.info
	CanCool: "canCool",
	CanHeat: "canHeat",
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
	// device.XXX.control
	Power: "power",
	ForcedHotWaterMode: "forcedHotWaterMode",
	OperationModeZone1: "operationModeZone1",
	OperationModeZone2: "operationModeZone2"
});

exports.DeviceTypes = Object.freeze({
	AirToAir: 0, // Luft-Luft-Wärmepumpen / Klimaanlagen
	AirToWater: 1 // Luft-Wasser-Wärmepumpen
});

exports.AtaDeviceOperationModes = Object.freeze({
	UNDEF: { id: "Undefined", value: -1, effectiveFlags: -1 },
	HEAT: { id: "Heat", value: 1, effectiveFlags: 1 + 2 },
	DRY: { id: "Dry", value: 2, effectiveFlags: 1 + 2 },
	COOL: { id: "Cool", value: 3, effectiveFlags: 1 + 2 },
	VENT: { id: "Vent", value: 7, effectiveFlags: 1 + 2 },
	AUTO: { id: "Auto", value: 8, effectiveFlags: 1 + 2 }
});

exports.AtwDeviceOperationModes = Object.freeze({
	UNDEF: { id: "Undefined", value: -1, effectiveFlags: -1 },
	AUTO: { id: "Auto", value: 0, effectiveFlags: 16 },
	FORCEDHOTWATERMODE: { id: "ForcedHotWaterMode", value: 1, effectiveFlags: 16 }
});

exports.AtwDeviceZoneOperationModes = Object.freeze({
	UNDEF: { id: "Undefined", value: -1, effectiveFlags: -1 },
	HEATTHERMOSTAT: { id: "HeatThermostat", value: 0, effectiveFlags: 1 + 2 },
	HEATFLOW: { id: "HeatFlow", value: 1, effectiveFlags: 1 + 2 },
	CURVE: { id: "Curve", value: 2, effectiveFlags: 1 + 2 },
	COOLTHERMOSTAT: { id: "CoolThermostat", value: 3, effectiveFlags: 1 + 2 },
	COOLFLOW: { id: "CoolFlow", value: 4, effectiveFlags: 1 + 2 }
});

exports.DevicePowerStates = Object.freeze({
	OFF: { value: false, effectiveFlags: 1 },
	ON: { value: true, effectiveFlags: 1 },
});

exports.AtaDeviceOptions = Object.freeze({
	PowerState: { id: "PowerState" },
	TargetHeatingCoolingState: { id: "TargetHeatingCoolingState" },
	TargetTemperature: { id: "TargetTemperature", effectiveFlags: 4 },
	FanSpeed: { id: "FanSpeed", effectiveFlags: 8 },
	VaneHorizontalDirection: { id: "VaneHorizontalDirection", effectiveFlags: 256 },
	VaneVerticalDirection: { id: "VaneVerticalDirection", effectiveFlags: 16 }
});

exports.AtwDeviceOptions = Object.freeze({
	PowerState: { id: "PowerState" },
	ForcedHotWaterMode: { id: "ForcedHotWaterMode", effectiveFlags: 65536 },
	OperationModeZone1: { id: "OperationModeZone1", effectiveFlags: 8 },
	OperationModeZone2: { id: "OperationModeZone2", effectiveFlags: 16 },
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
* @param {number} [precision=0] Number of decimal places (default = 0)
* @return {number} Rounded value
*/
exports.roundValue = function (value, precision = 0) {
	const multiplier = Math.pow(10, precision);
	return Math.round(value * multiplier) / multiplier;
};