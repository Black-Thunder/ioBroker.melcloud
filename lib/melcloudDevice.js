"use strict";

const commonDefines = require("./commonDefines");

let gthat = null; // pointer to "this" from main.js/MelCloud instance

class MelcloudDevice {
	constructor(that) {
		gthat = that;
		this.platform = null;
		this.airInfo = null;

		// Info
		this.id = -1;
		this.name = "";
		this.serialNumber = "";
		this.buildingId = -1;
		this.floorId = -1;
		this.canCool = false;
		this.canHeat = false;
		this.canDry = false;
		this.minTempCoolDry = 0;
		this.maxTempCoolDry = 0;
		this.minTempHeat = 0;
		this.maxTempHeat = 0;
		this.minTempAuto = 0;
		this.maxTempAuto = 0;

		// Control
		this.power = false;
		this.operationMode = commonDefines.OperationModes.UNDEF;
	}

	async Save() {
		//// INFO
		const infoPrefix = commonDefines.DatapointIDs.Devices + "." + this.id + ".info.";
		await gthat.setObjectNotExistsAsync(infoPrefix + "deviceName", {
			type: "state",
			common: {
				name: "Device name",
				type: "string",
				role: "value",
				read: true,
				write: false,
				desc: "MELCloud device name"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "deviceName", this.name, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "serialNumber", {
			type: "state",
			common: {
				name: "Serial number",
				type: "string",
				role: "value",
				read: true,
				write: false,
				desc: "Serial number of the device"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "serialNumber", this.serialNumber, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "buildingId", {
			type: "state",
			common: {
				name: "Building ID",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "MELCloud building ID"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "buildingId", this.buildingId, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "floorId", {
			type: "state",
			common: {
				name: "Floor ID",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "MELCloud floor ID"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "floorId", this.floorId, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "canCool", {
			type: "state",
			common: {
				name: "Ability to cool",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				desc: "Ability to cool"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "canCool", this.canCool, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "canHeat", {
			type: "state",
			common: {
				name: "Ability to heat",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				desc: "Ability to heat"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "canHeat", this.canHeat, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "canDry", {
			type: "state",
			common: {
				name: "Ability to dry",
				type: "boolean",
				role: "value",
				read: true,
				write: false,
				desc: "Ability to dry"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "canDry", this.canDry, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "minTempCoolDry", {
			type: "state",
			common: {
				name: "MinTempCoolDry",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Minimal temperature in cool/dry-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "minTempCoolDry", this.minTempCoolDry, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "maxTempCoolDry", {
			type: "state",
			common: {
				name: "MaxTempCoolDry",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Maximal temperature in cool/dry-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "maxTempCoolDry", this.maxTempCoolDry, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "minTempHeat", {
			type: "state",
			common: {
				name: "MinTempHeat",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Minimal temperature in heat-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "minTempHeat", this.minTempHeat, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "maxTempHeat", {
			type: "state",
			common: {
				name: "MaxTempHeat",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Maximal temperature in heat-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "maxTempHeat", this.maxTempHeat, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "minTempAuto", {
			type: "state",
			common: {
				name: "MinTempAuto",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Minimal temperature in auto-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "minTempAuto", this.minTempAuto, true);

		await gthat.setObjectNotExistsAsync(infoPrefix + "maxTempAuto", {
			type: "state",
			common: {
				name: "MaxTempAuto",
				type: "number",
				role: "value",
				read: true,
				write: false,
				desc: "Maximal temperature in auto-mode"
			},
			native: {}
		});
		await gthat.setStateAsync(infoPrefix + "maxTempAuto", this.maxTempAuto, true);

		//// END INFO

		//// CONTROL
		const controlPrefix = commonDefines.DatapointIDs.Devices + "." + this.id + ".control.";

		await gthat.setObjectNotExistsAsync(controlPrefix + "power", {
			type: "state",
			common: {
				name: "Power",
				type: "boolean",
				role: "switch",
				read: true,
				write: true,
				desc: "Power switch"
			},
			native: {}
		});
		await gthat.setStateAsync(controlPrefix + "power", this.power, true);

		await gthat.setObjectNotExistsAsync(controlPrefix + "mode", {
			type: "state",
			common: {
				name: "Operation mode",
				type: "number",
				role: "value",
				read: true,
				write: true,
				desc: "Operation mode of the device",
				"states": {
					0: "OFF",
					1: "HEAT",
					3: "COOL",
					8: "AUTO"
				}
			},
			native: {}
		});
		await gthat.setStateAsync(controlPrefix + "mode", this.operationMode, true);

		//// END CONTROL

		gthat.log.debug("Saved device: " + this.id + " (" + this.name + ")");
	}
}

exports.MelCloudDevice = MelcloudDevice;