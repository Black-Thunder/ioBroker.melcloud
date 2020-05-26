"use strict";

exports.AdapterDatapointIDs = Object.freeze({
	Info: "info",
	Devices: "devices",
	Control: "control"
});

exports.AdapterStateIDs = Object.freeze({
	// info
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
	VaneVerticalDirection: "vaneVerticalDirection"
});

exports.DeviceOperationModes = Object.freeze({
	UNDEF: { power: false, value: -1, effectiveFlags: -1 },
	OFF: { power: false, value: 0, effectiveFlags: 1 },
	ON: { power: true, value: -2, effectiveFlags: 1}, // just power on without changing the mode
	HEAT: { power: true, value: 1, effectiveFlags: 1 + 2 },
	DRY: { power: true, value: 2, effectiveFlags: 1 + 2 },
	COOL: { power: true, value: 3, effectiveFlags: 1 + 2 },
	VENT: { power: true, value: 7, effectiveFlags: 1 + 2 },
	AUTO: { power: true, value: 8, effectiveFlags: 1 + 2 }
});

exports.DeviceOptions = Object.freeze({
	TargetHeatingCoolingState : { id: "TargetHeatingCoolingState" },
	TargetTemperature: { id: "TargetTemperature", effectiveFlags: 4 },
	FanSpeed: { id: "FanSpeed", effectiveFlags: 8 },
	VaneHorizontalDirection: { id: "VaneHorizontalDirection", effectiveFlags: 256 },
	VaneVerticalDirection: { id: "VaneVerticalDirection", effectiveFlags: 16 }
});