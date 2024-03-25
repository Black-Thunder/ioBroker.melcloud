const path = require("path");
const { tests } = require("@iobroker/testing");

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, ".."), {
	//            ~~~~~~~~~~~~~~~~~~~~~~~~~
	// This should be the adapter's root directory

	// To test against a different version of JS-Controller, you can change the version or dist-tag here.
	// Make sure to remove this setting when you're done testing.
	controllerVersion: "latest", // or a specific version like "4.0.1"
});
