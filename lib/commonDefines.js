"use strict";

exports.DatapointIDs = Object.freeze({
	Info: "info",
	Devices: "devices"
});

exports.StateIDs = Object.freeze({
	Connection: "connection",
	ContextKey: "contextKey",
	DeviceName: "deviceName"
});

exports.OperationModes = Object.freeze({
	UNDEF: { power: false, value: -1, effectiveFlags: -1 },
	OFF: { power: false, value: 0, effectiveFlags: 1 },
	HEAT: { power: true, value: 1, effectiveFlags: 1 + 2 },
	COOL: { power: true, value: 3, effectiveFlags: 1 + 2 },
	AUTO: { power: true, value: 8, effectiveFlags: 1 + 2 }
});