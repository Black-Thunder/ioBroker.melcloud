"use strict";

exports.AdapterDatapointIDs = Object.freeze({
	Info: "info",
	Devices: "devices"
});

exports.AdapterStateIDs = Object.freeze({
	Connection: "connection",
	ContextKey: "contextKey",
	DeviceName: "deviceName"
});

exports.DeviceOperationModes = Object.freeze({
	UNDEF: { power: false, value: -1, effectiveFlags: -1 },
	OFF: { power: false, value: 0, effectiveFlags: 1 },
	HEAT: { power: true, value: 1, effectiveFlags: 1 + 2 },
	COOL: { power: true, value: 3, effectiveFlags: 1 + 2 },
	AUTO: { power: true, value: 8, effectiveFlags: 1 + 2 }
});

exports.DeviceOptions = Object.freeze({
	TargetHeatingCoolingState : {},
	TargetTemperature: { effectiveFlags: 4 },
	RotationSpeed: { effectiveFlags: 8 },
	TargetHorizontalTiltAngle: { effectiveFlags: 256 },
	TargetVerticalTiltAngle: { effectiveFlags: 16 }
});