"use strict";

class JSONHelper {
	static ParseCloudResponse(raw, loggingInstance) {
		try {
			loggingInstance.log.debug("Response from cloud: " + raw);
			const parsedRaw = JSON.parse(raw);
			loggingInstance.log.debug("Parsed response from cloud: " + JSON.stringify(parsedRaw));
			return parsedRaw;
		}
		catch (err) {
			loggingInstance.log.error("Failed to parse response from cloud: " + err);
			return null;
		}
	}
}

exports.JSONHelper = JSONHelper;

