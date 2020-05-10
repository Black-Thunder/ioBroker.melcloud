"use strict";

let gthat = null;

class MelcloudDevice {
	constructor(that) {  
		gthat = that;
		
		// Info
		this.id = -1;
		this.name = "";
		this.serialNumber = "";
		this.buildingId = -1;
		this.floorId = -1;
		this.canCool = false;
		this.canHeat = false;
		this.canDry = false;

		// Control
		this.power = false;
	}

	async Save() {
		//// INFO
		const infoPrefix = "devices." + this.id + ".info.";
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

		//// END INFO

		//// CONTROL
		const controlPrefix = "devices." + this.id + ".control.";
		
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
		await gthat.setStateAsync(infoPrefix + "power", this.power, true);

		//// END CONTROL

		gthat.log.debug("Saved device: " + this.id + " (" + this.name + ")");
	}
}

exports.MelCloudDevice = MelcloudDevice;