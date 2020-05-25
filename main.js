"use strict";

/*
 * Created with @iobroker/create-adapter v1.24.1
 */

// The adapter-core module gives you access to the core ioBroker functions
const utils = require("@iobroker/adapter-core");

// Needed modules
const cloudPlatform = require("./lib/melcloudPlatform");
const commonDefines = require("./lib/commonDefines");

const currentKnownDeviceIDs = []; // array of all current known device IDs, updated on adapter start
let pollingJob = null;
let gthis = null;

function decrypt(key, value) {
	let result = "";
	for (let i = 0; i < value.length; ++i) {
		result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
	}
	return result;
}

class Melcloud extends utils.Adapter {
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		// @ts-ignore
		super({
			...options,
			name: "melcloud",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("objectChange", this.onObjectChange.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
		gthis = this;
		this.deviceObjects = []; // array of all device objects
	}

	async decryptPassword() {
		const sysConfigObject = (await this.getForeignObjectAsync("system.config"));
		if (!this.supportsFeature || !this.supportsFeature("ADAPTER_AUTO_DECRYPT_NATIVE")) {
			if (sysConfigObject && sysConfigObject.native && sysConfigObject.native.secret) {
				this.config.melCloudPassword = decrypt(sysConfigObject.native.secret, this.config.melCloudPassword);
			} else {
				this.config.melCloudPassword = decrypt("Zgfr56gFe87jJOM", this.config.melCloudPassword);
			}
		}
	}

	async checkSettings() {
		this.log.debug("Checking adapter settings...");

		this.decryptPassword();

		if (this.config.melCloudEmail == null || this.config.melCloudEmail == "") {
			throw new Error("MELCloud username empty! Check settings.");
		}

		if (this.config.melCloudPassword == null || this.config.melCloudPassword == "") {
			throw new Error("MELCloud password empty! Check settings.");
		}

		// if pollingInterval <= 0 than set to 1 
		if (this.config.pollingInterval <= 0) {
			this.config.pollingInterval = 1;
			this.log.warn("Polling interval was set to less than 1 minute. Now set to 1 minute.");
		}
	}

	async setAdapterConnectionState(isConnected) {
		await this.setStateAsync(commonDefines.AdapterDatapointIDs.Info + "." + commonDefines.AdapterStateIDs.Connection, isConnected, true);
	}

	async saveKnownDeviceIDs(callback) {
		this.log.debug("Getting current known devices...");
		const prefix = this.namespace + "." + commonDefines.AdapterDatapointIDs.Devices + ".";
		const objects = await this.getAdapterObjectsAsync();

		for (const id of Object.keys(objects)) {
			if (!id.startsWith(prefix)) {
				continue;
			}

			const deviceIdTemp = id.replace(prefix, "");
			const deviceId = parseInt(deviceIdTemp.substring(0, deviceIdTemp.lastIndexOf(".")), 10);

			// Add each device only one time
			if (!currentKnownDeviceIDs.includes(deviceId)) {
				currentKnownDeviceIDs.push(deviceId);
				this.log.debug("Found known device: " + deviceId);
			}
		}

		callback && callback();
	}

	getCurrentKnownDeviceIDs() {
		return currentKnownDeviceIDs;
	}

	async deleteMelDevice(id) {
		const prefix = this.namespace + "." + commonDefines.AdapterDatapointIDs.Devices + "." + id;
		const objects = await this.getAdapterObjectsAsync();

		for (const id of Object.keys(objects)) {
			if (id.startsWith(prefix)) {
				const objID = id.replace(this.namespace + ".", "");
				this.log.debug("Trying to delete device: " + objID);
				await this.delObjectAsync(objID);
				this.log.debug("Deleted device!");
			}
		}
	}

	async initObjects() {
		this.log.debug("Initializing objects...");
		await this.setObjectNotExistsAsync(commonDefines.AdapterDatapointIDs.Info + "." + commonDefines.AdapterStateIDs.Connection, {
			type: "state",
			common: {
				name: "Connection to cloud",
				type: "boolean",
				role: "indicator",
				read: true,
				write: false,
				desc: "Indicates if connection to MELCloud was successful or not"
			},
			native: {}
		});
	}

	mapDeviceOperationMode(value) {
		switch (value) {
			case (commonDefines.DeviceOperationModes.OFF.value):
				return commonDefines.DeviceOperationModes.OFF;
			case (commonDefines.DeviceOperationModes.HEAT.value):
				return commonDefines.DeviceOperationModes.HEAT;
			case (commonDefines.DeviceOperationModes.DRY.value):
				return commonDefines.DeviceOperationModes.DRY;
			case (commonDefines.DeviceOperationModes.COOL.value):
				return commonDefines.DeviceOperationModes.COOL;
			case (commonDefines.DeviceOperationModes.VENT.value):
				return commonDefines.DeviceOperationModes.VENT;
			case (commonDefines.DeviceOperationModes.AUTO.value):
				return commonDefines.DeviceOperationModes.AUTO;
			default:
				this.log.error("Unsupported operation mode: " + value + " - Please report this to the developer!");
				return commonDefines.DeviceOperationModes.UNDEF;
		}
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.setAdapterConnectionState(false);
		this.subscribeStates("*"); // all states changes inside the adapters namespace are subscribed

		this.checkSettings()
			.then(() => this.initObjects()
				.then(() => this.saveKnownDeviceIDs(this.connectToCloud)))
			.catch(err => this.log.error(err));
	}

	connectToCloud() {
		// Connect to cloud and retrieve/update registered devices initially
		const CloudPlatform = new cloudPlatform.MelCloudPlatform(gthis);
		CloudPlatform.GetContextKey(CloudPlatform.SaveDevices);

		// Update data regularly according to pollingInterval
		const jobInterval = gthis.config.pollingInterval * 60000; // polling interval in milliseconds
		pollingJob = setInterval(async function () {
			CloudPlatform.GetContextKey(CloudPlatform.SaveDevices);
		}, jobInterval);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.setAdapterConnectionState(false);
			this.deviceObjects.length = 0;
			clearInterval(pollingJob);

			this.log.info("cleaned everything up...");
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 * @param {string} id
	 * @param {ioBroker.Object | null | undefined} obj
	 */
	onObjectChange(id, obj) {
		if (obj) {
			// The object was changed
			this.log.silly(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.silly(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		// The state was changed
		if (state) {
			this.log.silly(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

			// ack is true when state was updated by MELCloud --> in this case, we don't need to send it again
			if (state.ack) {
				this.log.silly("Updated data was retrieved from MELCloud. No need to process changed data.");
				return;
			}

			// listen for changes at "devices.XXX.control" --> device settings/modes are changed
			if (id.startsWith(this.namespace + "." + commonDefines.AdapterDatapointIDs.Devices) && id.includes("." + commonDefines.AdapterDatapointIDs.Control + ".")) {

				if(this.deviceObjects == [] || this.deviceObjects.length == 0) {
					this.log.error("No objects for MELCloud devices constructed yet. Try again in a few seconds...");
					return;
				}

				let deviceId = id.replace(this.namespace + "." + commonDefines.AdapterDatapointIDs.Devices + ".", "");
				deviceId = deviceId.substring(0, deviceId.indexOf("."));

				// Get the device object that should be changed
				this.log.debug("Trying to get device object with id " + deviceId + "...");
				const device = this.deviceObjects.find(obj => {
					return obj.id === parseInt(deviceId);
				});

				if(device == null) {
					this.log.debug("Failed to get device object. Known object ids:");
					this.deviceObjects.forEach(obj => this.log.debug(obj.id));
					return;
				}
				this.log.debug("Processing change for device object with id " + device.id + " (" + device.name + ")...");

				const controlOption = id.substring(id.lastIndexOf(".") + 1, id.length);
				switch (controlOption) {
					case (commonDefines.AdapterStateIDs.Power):
						if (state.val) {
							// switch on using current operation mode
							device.getDeviceInfo(device.setDevice, commonDefines.DeviceOptions.TargetHeatingCoolingState, this.mapDeviceOperationMode(device.operationMode));
						}
						else {
							// switch off
							device.getDeviceInfo(device.setDevice, commonDefines.DeviceOptions.TargetHeatingCoolingState, commonDefines.DeviceOperationModes.OFF);
						}
						break;
					case (commonDefines.AdapterStateIDs.Mode):
						device.getDeviceInfo(device.setDevice, commonDefines.DeviceOptions.TargetHeatingCoolingState, this.mapDeviceOperationMode(state.val));
						break;
					case (commonDefines.AdapterStateIDs.TargetTemp):
						device.getDeviceInfo(device.setDevice, commonDefines.DeviceOptions.TargetTemperature, state.val);
						break;
					case (commonDefines.AdapterStateIDs.FanSpeed):
						device.getDeviceInfo(device.setDevice, commonDefines.DeviceOptions.FanSpeed, state.val);
						break;
					case (commonDefines.AdapterStateIDs.VaneVerticalDirection):
						device.getDeviceInfo(device.setDevice, commonDefines.DeviceOptions.VaneVerticalDirection, state.val);
						break;
					case (commonDefines.AdapterStateIDs.VaneHorizontalDirection):
						device.getDeviceInfo(device.setDevice, commonDefines.DeviceOptions.VaneHorizontalDirection, state.val);
						break;
					default:
						this.log.error("Unsupported control option: " + controlOption + " - Please report this to the developer!");
						break;
				}

			}
		}
		// The state was deleted 
		else {
			this.log.silly(`state ${id} deleted`);
		}
	}

	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.message" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Melcloud(options);
} else {
	// otherwise start the instance directly
	new Melcloud();
}