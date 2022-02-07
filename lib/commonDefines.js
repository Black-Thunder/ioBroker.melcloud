"use strict";

exports.AdapterDatapointIDs = Object.freeze({
	Info: "info",
	Devices: "devices",
	Control: "control",
	Reports: "reports"
});

exports.AdapterStateIDs = Object.freeze({
	// root
	Connection: "connection",
	// device.XXX.info
	DeviceName: "deviceName",
	DeviceType: "deviceType",
	SerialNumber: "serialNumber",
	MacAddress: "macAddress",
	BuildingId: "buildingId",
	FloorId: "floorId",
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
	FanSpeedAuto: "actualFanSpeed",
	NumberOfFanSpeeds: "numberOfFanSpeeds",
	LastCommunication: "lastCommunication",
	NextCommunication: "nextCommunication",
	DeviceOnline: "deviceOnline",
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

exports.DeviceTypes = Object.freeze({
	AirToAir: 0, // Luft-Luft-Wärmepumpen / Klimaanlagen
	AirToWater: 1 // Luft-Wasser-Wärmepumpen
});

exports.DeviceOperationModes = Object.freeze({
	UNDEF: { id: "Undefined", value: -1, effectiveFlags: -1 },
	HEAT: { id: "Heat", value: 1, effectiveFlags: 1 + 2 },
	DRY: { id: "Dry", value: 2, effectiveFlags: 1 + 2 },
	COOL: { id: "Cool", value: 3, effectiveFlags: 1 + 2 },
	VENT: { id: "Vent", value: 7, effectiveFlags: 1 + 2 },
	AUTO: { id: "Auto", value: 8, effectiveFlags: 1 + 2 }
});

exports.DevicePowerStates = Object.freeze({
	OFF: { value: false, effectiveFlags: 1 },
	ON: { value: true, effectiveFlags: 1 },
});

exports.DeviceOptions = Object.freeze({
	PowerState: { id: "PowerState" },
	TargetHeatingCoolingState: { id: "TargetHeatingCoolingState" },
	TargetTemperature: { id: "TargetTemperature", effectiveFlags: 4 },
	FanSpeed: { id: "FanSpeed", effectiveFlags: 8 },
	VaneHorizontalDirection: { id: "VaneHorizontalDirection", effectiveFlags: 256 },
	VaneVerticalDirection: { id: "VaneVerticalDirection", effectiveFlags: 16 }
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