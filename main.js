"use strict";

/*
 * Created with @iobroker/create-adapter v1.24.1
 */

// The adapter-core module gives you access to the core ioBroker functions
const utils = require("@iobroker/adapter-core");

// Needed modules
const cloudPlatform = require("./lib/melcloudPlatform");

const currentKnownDeviceIDs = []; // array of all current known device IDs, updated on adapter start

const DATAPOINT_IDS = {
	Info: "info",
	Devices: "devices"
};

const STATE_IDS = {
	Connection: "connection",
	ContextKey: "contextKey",
	DeviceName: "deviceName"
};

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
	}

	async checkSettings() {
		await this.getForeignObjectAsync("system.config", (err, obj) => {
			if (!this.supportsFeature || !this.supportsFeature("ADAPTER_AUTO_DECRYPT_NATIVE")) {
				if (obj && obj.native && obj.native.secret) {
					this.config.melCloudPassword = decrypt(obj.native.secret, this.config.melCloudPassword);
				} else {
					this.config.melCloudPassword = decrypt("Zgfr56gFe87jJOM", this.config.melCloudPassword);
				}
			}
		});

		if (this.config.melCloudEmail == null || this.config.melCloudEmail == "") {
			this.log.error("MELCloud username empty! Check settings.");
			return false;
		}

		if (this.config.melCloudPassword == null || this.config.melCloudPassword == "") {
			this.log.error("MELCloud password empty! Check settings.");
			return false;
		}
		return true;
	}

	async setAdapterConnectionState(isConnected) {
		await this.setStateAsync(DATAPOINT_IDS.Info + "." + STATE_IDS.Connection, isConnected, true);
	}

	async setContextKey(key) {
		await this.setStateAsync(DATAPOINT_IDS.Info + "." + STATE_IDS.ContextKey, key, true);
	}

	async getContextKey() {
		return await this.getStateAsync(DATAPOINT_IDS.Info + "." + STATE_IDS.ContextKey);
	}

	async saveKnownDeviceIDs() {
		this.log.debug("Getting current known devices...");
		const objects = await this.getAdapterObjectsAsync();

		for (const id of Object.keys(objects)) {
			const prefix = this.namespace + "." + DATAPOINT_IDS.Devices + ".";
			if (!id.startsWith(prefix)) {
				continue;
			}
			const deviceIdTemp = id.replace(prefix, "");
			const deviceId = parseInt(deviceIdTemp.substring(0, deviceIdTemp.lastIndexOf(".")), 10);

			// Add each device only one time
			if (!currentKnownDeviceIDs.includes(deviceId)) {
				const deviceName = await this.getStateAsync(prefix + deviceId + "." + STATE_IDS.DeviceName);
				currentKnownDeviceIDs.push(deviceId);
				this.log.debug("Found known device: " + deviceId + " (" + deviceName.val + ")");
			}
		}
	}

	getCurrentKnownDeviceIDs() {
		return currentKnownDeviceIDs;
	}

	async deleteMelDevice(id) {
		const prefix = this.namespace + "." + DATAPOINT_IDS.Devices + "." + id;
		const deviceName = await this.getStateAsync(prefix + "." + STATE_IDS.DeviceName);
		const objects = await this.getAdapterObjectsAsync();

		for (const id of Object.keys(objects)) {
			if (id.startsWith(prefix)) {
				const objID = id.replace(this.namespace + ".", "");
				this.log.debug("Trying to delete device: " + objID + " (" + deviceName.val + ")");
				await this.delObjectAsync(objID);
				this.log.debug("Deleted device!");
			}
		}
	}

	async initObjects() {
		this.log.debug("Initializing objects...");
		await this.setObjectNotExistsAsync(DATAPOINT_IDS.Info + "." + STATE_IDS.Connection, {
			type: "state",
			common: {
				name: "Connection to cloud",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
				desc: "Indicates if connection to MELCloud was successful or not"
			},
			native: {}
		});

		await this.setObjectNotExistsAsync(DATAPOINT_IDS.Info + "." + STATE_IDS.ContextKey, {
			type: "state",
			common: {
				name: "Context key",
				type: "string",
				role: "value",
				read: true,
				write: false,
				desc: "Key necessary for communication with MELCloud"
			},
			native: {}
		});
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.setAdapterConnectionState(false);
		await this.saveKnownDeviceIDs();
		await this.initObjects();

		if (await !this.checkSettings()) return;

		// Initialize your adapter here
		const CloudPlatform = new cloudPlatform.MelCloudPlatform(this);
		CloudPlatform.GetContextKey(CloudPlatform.SaveDevices);

		// all states changes inside the adapters namespace are subscribed
		this.subscribeStates("*");

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		/*await this.setObjectAsync("testVariable", {
			type: "state",
			common: {
				name: "testVariable",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});*/

		/*
		setState examples
		you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		//await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		//await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		//await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		//let result = await this.checkPasswordAsync("admin", "iobroker");
		//this.log.info("check user admin pw iobroker: " + result);

		//result = await this.checkGroupAsync("admin", "admin");
		//this.log.info("check group user admin group admin: " + result);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.setContextKey("");
			this.setAdapterConnectionState(false);

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
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
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
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
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