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
	}

	async checkSettings() {
		this.log.debug("Checking adapter settings...");

		// decrypt password
		const sysConfigObject = (await this.getForeignObjectAsync("system.config"));
		if (!this.supportsFeature || !this.supportsFeature("ADAPTER_AUTO_DECRYPT_NATIVE")) {
			if (sysConfigObject && sysConfigObject.native && sysConfigObject.native.secret) {
				this.config.melCloudPassword = decrypt(sysConfigObject.native.secret, this.config.melCloudPassword);
			} else {
				this.config.melCloudPassword = decrypt("Zgfr56gFe87jJOM", this.config.melCloudPassword);
			}
		}

		if (this.config.melCloudEmail == null || this.config.melCloudEmail == "") {
			this.log.error("MELCloud username empty! Check settings.");
			return false;
		}

		if (this.config.melCloudPassword == null || this.config.melCloudPassword == "") {
			this.log.error("MELCloud password empty! Check settings.");
			return false;
		}

		// if pollingInterval <= 0 than set to 1 
		if (this.config.pollingInterval <= 0) {
			this.config.pollingInterval = 1;
			this.log.warn("Polling interval was set to less than 1 minute. Now set to 1 minute.");
		}

		return true;
	}

	async setAdapterConnectionState(isConnected) {
		await this.setStateAsync(commonDefines.AdapterDatapointIDs.Info + "." + commonDefines.AdapterStateIDs.Connection, isConnected, true);
	}

	async saveKnownDeviceIDs() {
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

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.setAdapterConnectionState(false);
		this.subscribeStates("*"); // all states changes inside the adapters namespace are subscribed

		if (!this.checkSettings()) return;
		await this.initObjects();
		await this.saveKnownDeviceIDs();

		// Connect to cloud and retrieve/update registered devices initially
		const CloudPlatform = new cloudPlatform.MelCloudPlatform(gthis);
		CloudPlatform.GetContextKey(CloudPlatform.SaveDevices);

		// Update data regularly according to pollingInterval
		const jobInterval = this.config.pollingInterval * 60000; // polling interval in milliseconds
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
			this.log.debug(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.debug(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.debug(`state ${id} deleted`);
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