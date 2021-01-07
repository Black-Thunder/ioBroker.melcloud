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
	GetPowerConsumptionReport: "getPowerConsumptionReport",
	TotalPowerConsumptionCooling: "totalPowerConsumptionCooling",
});

exports.DeviceOperationModes = Object.freeze({
	UNDEF: { value: -1, effectiveFlags: -1 },
	HEAT: { value: 1, effectiveFlags: 1 + 2 },
	DRY: { value: 2, effectiveFlags: 1 + 2 },
	COOL: { value: 3, effectiveFlags: 1 + 2 },
	VENT: { value: 7, effectiveFlags: 1 + 2 },
	AUTO: { value: 8, effectiveFlags: 1 + 2 }
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

exports.decrypt = function(key, value) {
	let result = "";
	for (let i = 0; i < value.length; ++i) {
		result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
	}
	return result;
}
