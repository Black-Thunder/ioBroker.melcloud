"use strict";

let gthat = null;

class MelcloudDevice {
	constructor(that) {  
		gthat = that;
		this.id = "";
		this.name = "";
		this.serialNumber = "";
		this.buildingId = "";
	}

	async Save() {
		await gthat.setObjectNotExistsAsync("devices." + this.id + ".deviceName", {
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
		await gthat.setStateAsync("devices." + this.id + ".deviceName", this.name, true);

		await gthat.setObjectNotExistsAsync("devices." + this.id + ".buildingId", {
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
		await gthat.setStateAsync("devices." + this.id + ".buildingId", this.buildingId, true);

		await gthat.setObjectNotExistsAsync("devices." + this.id + ".serialNumber", {
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
		await gthat.setStateAsync("devices." + this.id + ".serialNumber", this.serialNumber, true);

		gthat.log.debug("Created new device: " + this.id + " (" + this.name + ")");
	}
}

exports.MelCloudDevice = MelcloudDevice;