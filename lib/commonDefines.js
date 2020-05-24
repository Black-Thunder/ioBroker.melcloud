"use strict";

exports.AdapterDatapointIDs = Object.freeze({
	Info: "info",
	Devices: "devices",
	Control: "control"
});

exports.AdapterStateIDs = Object.freeze({
	// info
	Connection: "connection",
	ContextKey: "contextKey",
	// device.XXX.info
	DeviceName: "deviceName",
	SerialNumber: "serialNumber",
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
	LastCommunication: "lastCommunication",
	NextCommunication: "nextCommunication",
	// device.XXX.control
	Power: "power",
	Mode: "mode",
	TargetTemp: "targetTemp"
});

exports.DeviceOperationModes = Object.freeze({
	UNDEF: { power: false, value: -1, effectiveFlags: -1 },
	OFF: { power: false, value: 0, effectiveFlags: 1 },
	HEAT: { power: true, value: 1, effectiveFlags: 1 + 2 },
	COOL: { power: true, value: 3, effectiveFlags: 1 + 2 },
	AUTO: { power: true, value: 8, effectiveFlags: 1 + 2 }
});

exports.DeviceOptions = Object.freeze({
	TargetHeatingCoolingState : { id: "TargetHeatingCoolingState" },
	TargetTemperature: { id: "TargetTemperature", effectiveFlags: 4 },
	RotationSpeed: { id: "RotationSpeed", effectiveFlags: 8 },
	TargetHorizontalTiltAngle: { id: "TargetHorizontalTiltAngle", effectiveFlags: 256 },
	TargetVerticalTiltAngle: { id: "TargetVerticalTiltAngle", effectiveFlags: 16 }
});