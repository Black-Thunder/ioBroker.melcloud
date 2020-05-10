"use strict";

const request = require("request");
const MelCloudDevice = require("./melcloudDevice");

let gthat = null; // pointer to "this" from main.js/MelCloud instance
let gthis = null; // pointer to "this" from MelcloudPlatform

class MelcloudPlatform {
	constructor(that) {
		gthat = that;
		gthis = this;
		this.language = that.config.melCloudLanguage;
		this.username = that.config.melCloudEmail;
		this.password = that.config.melCloudPassword;
		this.contextKey = "";
		//this.useFahrenheit = false;		
		/*this.CurrentHeatingCoolingStateUUID = (new Characteristic.CurrentHeatingCoolingState()).UUID;
        this.TargetHeatingCoolingStateUUID = (new Characteristic.TargetHeatingCoolingState()).UUID;
        this.CurrentTemperatureUUID = (new Characteristic.CurrentTemperature()).UUID;
        this.TargetTemperatureUUID = (new Characteristic.TargetTemperature()).UUID;
        this.TemperatureDisplayUnitsUUID = (new Characteristic.TemperatureDisplayUnits()).UUID;
        this.RotationSpeedUUID = (new Characteristic.RotationSpeed()).UUID;
        this.CurrentHorizontalTiltAngleUUID = (new Characteristic.CurrentHorizontalTiltAngle()).UUID;
        this.TargetHorizontalTiltAngleUUID = (new Characteristic.TargetHorizontalTiltAngle()).UUID;
        this.CurrentVerticalTiltAngleUUID = (new Characteristic.CurrentVerticalTiltAngle()).UUID;
        this.TargetVerticalTiltAngleUUID = (new Characteristic.TargetVerticalTiltAngle()).UUID;
        this.currentAirInfoExecution = 0;
        this.airInfoExecutionPending = [];*/
	}

	GetContextKey(callback) {
		gthat.log.info("Connecting to Melcloud and fetching context key...");
		gthat.log.debug("MELCloud email address: " + this.username + " - MELCloud password: " + this.password);

		// Login
		const loginUrl = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Login/ClientLogin";
		const method = "post";
		const form = {
			AppVersion: "1.9.3.0",
			CaptchaChallenge: "",
			CaptchaResponse: "",
			Email: gthis.username,
			Language: gthis.language,
			Password: gthis.password,
			Persist: "true"
		};

		request({
			url: loginUrl,
			form: form,
			method: method
		}, function (err, response) {
			if (err) {
				gthat.log.error("There was a problem sending login to: " + loginUrl);
				gthat.log.error(err);
			} else {
				const r = gthis.ParseCloudResponse(response.body);

				if (r.LoginData == null) {
					gthat.log.error("Login failed (error code: " + r.ErrorId + ")! Verify user name and password.");
				}
				else {
					//gthis.useFahrenheit = r.LoginData.UseFahrenheit;
					gthis.contextKey = r.LoginData.ContextKey;
					gthat.setAdapterConnectionState(true);
					gthat.log.debug("Login successful. ContextKey: " + gthis.contextKey);

					gthis.GetDevices(callback);
				}

			}
		});
	}

	async GetDevices(callback) {
		gthat.log.info("Fetching devices...");

		const url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/User/ListDevices";
		const method = "get";

		request({
			url: url,
			method: method,
			headers: {
				"X-MitsContextKey": gthis.contextKey
			}
		}, function (err, response) {
			if (err) {
				gthat.log.error("There was a problem getting devices from: " + url);
				gthat.log.error(err);
			}
			else {
				const responseBody = response.body;
				/*const responseBody = "[\r\n\t{\r\n\t\t\"ID\": 112112,\r\n\t\t\"Name\": \"xxxxxxx\",\r\n\t\t\"AddressLine1\": \"xxxxxxxx xxx\",\r\n\t\t\"AddressLine2\": null,\r\n\t\t\"City\": \"xxxxxx\",\r\n\t\t\"Postcode\": \"xxxx\",\r\n\t\t\"Latitude\": \"xxxxxxx\",\r\n\t\t\"Longitude\": \"xxxxxxx\",\r\n\t\t\"District\": null,\r\n\t\t\"FPDefined\": false,\r\n\t\t\"FPEnabled\": false,\r\n\t\t\"FPMinTemperature\": 14,\r\n\t\t\"FPMaxTemperature\": 16,\r\n\t\t\"HMDefined\": false,\r\n\t\t\"HMEnabled\": false,\r\n\t\t\"HMStartDate\": null,\r\n\t\t\"HMEndDate\": null,\r\n\t\t\"BuildingType\": 2,\r\n\t\t\"PropertyType\": 1,\r\n\t\t\"DateBuilt\": \"1989-06-30T00:00:00\",\r\n\t\t\"HasGasSupply\": false,\r\n\t\t\"LocationLookupDate\": \"2019-07-24T16:53:44.327\",\r\n\t\t\"Country\": 218,\r\n\t\t\"TimeZoneContinent\": 3,\r\n\t\t\"TimeZoneCity\": 52,\r\n\t\t\"TimeZone\": 119,\r\n\t\t\"Location\": 4855,\r\n\t\t\"CoolingDisabled\": false,\r\n\t\t\"Expanded\": true,\r\n\t\t\"Structure\": {\r\n\t\t\t\"Floors\": [\r\n\t\t\t\t{\r\n\t\t\t\t\t\"ID\": 30332,\r\n\t\t\t\t\t\"Name\": \"OG\",\r\n\t\t\t\t\t\"BuildingId\": 112112,\r\n\t\t\t\t\t\"AccessLevel\": 4,\r\n\t\t\t\t\t\"DirectAccess\": false,\r\n\t\t\t\t\t\"EndDate\": \"2500-01-01T00:00:00\",\r\n\t\t\t\t\t\"Areas\": [\r\n\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\"ID\": 37254,\r\n\t\t\t\t\t\t\t\"Name\": \"Schlafzimmer\",\r\n\t\t\t\t\t\t\t\"BuildingId\": 112112,\r\n\t\t\t\t\t\t\t\"FloorId\": 30332,\r\n\t\t\t\t\t\t\t\"AccessLevel\": 4,\r\n\t\t\t\t\t\t\t\"DirectAccess\": false,\r\n\t\t\t\t\t\t\t\"EndDate\": \"2500-01-01T00:00:00\",\r\n\t\t\t\t\t\t\t\"MinTemperature\": 0,\r\n\t\t\t\t\t\t\t\"MaxTemperature\": 40,\r\n\t\t\t\t\t\t\t\"Expanded\": true,\r\n\t\t\t\t\t\t\t\"Devices\": [\r\n\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\"DeviceID\": 177841,\r\n\t\t\t\t\t\t\t\t\t\"DeviceName\": \"Schlafzimmer\",\r\n\t\t\t\t\t\t\t\t\t\"BuildingID\": 112112,\r\n\t\t\t\t\t\t\t\t\t\"BuildingName\": null,\r\n\t\t\t\t\t\t\t\t\t\"FloorID\": 30332,\r\n\t\t\t\t\t\t\t\t\t\"FloorName\": null,\r\n\t\t\t\t\t\t\t\t\t\"AreaID\": 37254,\r\n\t\t\t\t\t\t\t\t\t\"AreaName\": null,\r\n\t\t\t\t\t\t\t\t\t\"ImageID\": -10000,\r\n\t\t\t\t\t\t\t\t\t\"InstallationDate\": \"2019-06-30T00:00:00\",\r\n\t\t\t\t\t\t\t\t\t\"LastServiceDate\": \"2019-06-30T00:00:00\",\r\n\t\t\t\t\t\t\t\t\t\"Presets\": [\r\n\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\"SetTemperature\": 18.0,\r\n\t\t\t\t\t\t\t\t\t\t\t\"Power\": true,\r\n\t\t\t\t\t\t\t\t\t\t\t\"OperationMode\": 3,\r\n\t\t\t\t\t\t\t\t\t\t\t\"VaneHorizontal\": 5,\r\n\t\t\t\t\t\t\t\t\t\t\t\"VaneVertical\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\t\"FanSpeed\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\t\"ID\": 79060,\r\n\t\t\t\t\t\t\t\t\t\t\t\"Client\": 54423,\r\n\t\t\t\t\t\t\t\t\t\t\t\"DeviceLocation\": 177841,\r\n\t\t\t\t\t\t\t\t\t\t\t\"Number\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\t\"Configuration\": \"18true3150\",\r\n\t\t\t\t\t\t\t\t\t\t\t\"NumberDescription\": \"Vollk\u00FChlen\"\r\n\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\"SetTemperature\": 24.0,\r\n\t\t\t\t\t\t\t\t\t\t\t\"Power\": false,\r\n\t\t\t\t\t\t\t\t\t\t\t\"OperationMode\": 3,\r\n\t\t\t\t\t\t\t\t\t\t\t\"VaneHorizontal\": 5,\r\n\t\t\t\t\t\t\t\t\t\t\t\"VaneVertical\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\t\"FanSpeed\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\t\"ID\": 79063,\r\n\t\t\t\t\t\t\t\t\t\t\t\"Client\": 54423,\r\n\t\t\t\t\t\t\t\t\t\t\t\"DeviceLocation\": 177841,\r\n\t\t\t\t\t\t\t\t\t\t\t\"Number\": 2,\r\n\t\t\t\t\t\t\t\t\t\t\t\"Configuration\": \"24false3151\",\r\n\t\t\t\t\t\t\t\t\t\t\t\"NumberDescription\": \"Nachtbetrieb\"\r\n\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t],\r\n\t\t\t\t\t\t\t\t\t\"OwnerID\": null,\r\n\t\t\t\t\t\t\t\t\t\"OwnerName\": null,\r\n\t\t\t\t\t\t\t\t\t\"OwnerEmail\": null,\r\n\t\t\t\t\t\t\t\t\t\"AccessLevel\": 4,\r\n\t\t\t\t\t\t\t\t\t\"DirectAccess\": false,\r\n\t\t\t\t\t\t\t\t\t\"EndDate\": \"2500-01-01T00:00:00\",\r\n\t\t\t\t\t\t\t\t\t\"Zone1Name\": null,\r\n\t\t\t\t\t\t\t\t\t\"Zone2Name\": null,\r\n\t\t\t\t\t\t\t\t\t\"MinTemperature\": 0,\r\n\t\t\t\t\t\t\t\t\t\"MaxTemperature\": 40,\r\n\t\t\t\t\t\t\t\t\t\"HideVaneControls\": false,\r\n\t\t\t\t\t\t\t\t\t\"HideDryModeControl\": false,\r\n\t\t\t\t\t\t\t\t\t\"HideRoomTemperature\": false,\r\n\t\t\t\t\t\t\t\t\t\"HideSupplyTemperature\": false,\r\n\t\t\t\t\t\t\t\t\t\"HideOutdoorTemperature\": false,\r\n\t\t\t\t\t\t\t\t\t\"BuildingCountry\": null,\r\n\t\t\t\t\t\t\t\t\t\"OwnerCountry\": null,\r\n\t\t\t\t\t\t\t\t\t\"AdaptorType\": -1,\r\n\t\t\t\t\t\t\t\t\t\"LinkedDevice\": null,\r\n\t\t\t\t\t\t\t\t\t\"Type\": 0,\r\n\t\t\t\t\t\t\t\t\t\"MacAddress\": \"xxxxxxxx\",\r\n\t\t\t\t\t\t\t\t\t\"SerialNumber\": \"xxxxxxxx\",\r\n\t\t\t\t\t\t\t\t\t\"Device\": {\r\n\t\t\t\t\t\t\t\t\t\t\"ListHistory24Formatters\": [\r\n\t\t\t\t\t\t\t\t\t\t\tnull,\r\n\t\t\t\t\t\t\t\t\t\t\tnull,\r\n\t\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"Delegate\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"target0\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"method0\": {\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Name\": \"<.cctor>b__352_0\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"AssemblyName\": \"Mitsubishi.Wifi.Data, Version=1.20.0.5, Culture=neutral, PublicKeyToken=xxxxxxxxxxxx\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"ClassName\": \"Mitsubishi.Wifi.Data.Entities.Device.AtaDeviceSettings+<>c\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature\": \"System.String <.cctor>b__352_0(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature2\": \"System.String <.cctor>b__352_0(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"MemberType\": 8,\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"GenericArguments\": null\r\n\t\t\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"Delegate\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"target0\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"method0\": {\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Name\": \"<.cctor>b__352_1\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"AssemblyName\": \"Mitsubishi.Wifi.Data, Version=1.20.0.5, Culture=neutral, PublicKeyToken=xxxxxxxxxxx\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"ClassName\": \"Mitsubishi.Wifi.Data.Entities.Device.AtaDeviceSettings+<>c\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature\": \"System.String <.cctor>b__352_1(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature2\": \"System.String <.cctor>b__352_1(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"MemberType\": 8,\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"GenericArguments\": null\r\n\t\t\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"Delegate\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"target0\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"method0\": {\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Name\": \"<.cctor>b__352_2\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"AssemblyName\": \"Mitsubishi.Wifi.Data, Version=1.20.0.5, Culture=neutral, PublicKeyToken= xxxxxxxxxxx \",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"ClassName\": \"Mitsubishi.Wifi.Data.Entities.Device.AtaDeviceSettings+<>c\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature\": \"System.String <.cctor>b__352_2(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature2\": \"System.String <.cctor>b__352_2(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"MemberType\": 8,\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"GenericArguments\": null\r\n\t\t\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"Delegate\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"target0\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"method0\": {\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Name\": \"<.cctor>b__352_3\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"AssemblyName\": \"Mitsubishi.Wifi.Data, Version=1.20.0.5, Culture=neutral, PublicKeyToken= xxxxxxxxxxx \",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"ClassName\": \"Mitsubishi.Wifi.Data.Entities.Device.AtaDeviceSettings+<>c\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature\": \"System.String <.cctor>b__352_3(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature2\": \"System.String <.cctor>b__352_3(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"MemberType\": 8,\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"GenericArguments\": null\r\n\t\t\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"Delegate\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"target0\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"method0\": {\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Name\": \"<.cctor>b__352_4\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"AssemblyName\": \"Mitsubishi.Wifi.Data, Version=1.20.0.5, Culture=neutral, PublicKeyToken= xxxxxxxxxxx \",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"ClassName\": \"Mitsubishi.Wifi.Data.Entities.Device.AtaDeviceSettings+<>c\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature\": \"System.String <.cctor>b__352_4(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature2\": \"System.String <.cctor>b__352_4(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"MemberType\": 8,\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"GenericArguments\": null\r\n\t\t\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t\tnull,\r\n\t\t\t\t\t\t\t\t\t\t\tnull,\r\n\t\t\t\t\t\t\t\t\t\t\tnull,\r\n\t\t\t\t\t\t\t\t\t\t\tnull,\r\n\t\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"Delegate\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"target0\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"method0\": {\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Name\": \"<.cctor>b__352_5\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"AssemblyName\": \"Mitsubishi.Wifi.Data, Version=1.20.0.5, Culture=neutral, PublicKeyToken= xxxxxxxxxxx \",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"ClassName\": \"Mitsubishi.Wifi.Data.Entities.Device.AtaDeviceSettings+<>c\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature\": \"System.String <.cctor>b__352_5(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature2\": \"System.String <.cctor>b__352_5(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"MemberType\": 8,\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"GenericArguments\": null\r\n\t\t\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"Delegate\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"target0\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"method0\": {\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Name\": \"<.cctor>b__352_6\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"AssemblyName\": \"Mitsubishi.Wifi.Data, Version=1.20.0.5, Culture=neutral, PublicKeyToken= xxxxxxxxxxx \",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"ClassName\": \"Mitsubishi.Wifi.Data.Entities.Device.AtaDeviceSettings+<>c\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature\": \"System.String <.cctor>b__352_6(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature2\": \"System.String <.cctor>b__352_6(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"MemberType\": 8,\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"GenericArguments\": null\r\n\t\t\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"Delegate\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"target0\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"method0\": {\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Name\": \"<.cctor>b__352_7\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"AssemblyName\": \"Mitsubishi.Wifi.Data, Version=1.20.0.5, Culture=neutral, PublicKeyToken= xxxxxxxxxxx \",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"ClassName\": \"Mitsubishi.Wifi.Data.Entities.Device.AtaDeviceSettings+<>c\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature\": \"System.String <.cctor>b__352_7(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature2\": \"System.String <.cctor>b__352_7(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"MemberType\": 8,\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"GenericArguments\": null\r\n\t\t\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"Delegate\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"target0\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"method0\": {\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Name\": \"<.cctor>b__352_8\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"AssemblyName\": \"Mitsubishi.Wifi.Data, Version=1.20.0.5, Culture=neutral, PublicKeyToken= xxxxxxxxxxx \",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"ClassName\": \"Mitsubishi.Wifi.Data.Entities.Device.AtaDeviceSettings+<>c\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature\": \"System.String <.cctor>b__352_8(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature2\": \"System.String <.cctor>b__352_8(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"MemberType\": 8,\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"GenericArguments\": null\r\n\t\t\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t\t{\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"Delegate\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"target0\": {},\r\n\t\t\t\t\t\t\t\t\t\t\t\t\"method0\": {\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Name\": \"<.cctor>b__352_9\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"AssemblyName\": \"Mitsubishi.Wifi.Data, Version=1.20.0.5, Culture=neutral, PublicKeyToken= xxxxxxxxxxx \",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"ClassName\": \"Mitsubishi.Wifi.Data.Entities.Device.AtaDeviceSettings+<>c\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature\": \"System.String <.cctor>b__352_9(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"Signature2\": \"System.String <.cctor>b__352_9(System.Object)\",\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"MemberType\": 8,\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t\"GenericArguments\": null\r\n\t\t\t\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\t\tnull,\r\n\t\t\t\t\t\t\t\t\t\t\tnull,\r\n\t\t\t\t\t\t\t\t\t\t\tnull\r\n\t\t\t\t\t\t\t\t\t\t],\r\n\t\t\t\t\t\t\t\t\t\t\"DeviceType\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"CanCool\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"CanHeat\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"CanDry\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"HasAutomaticFanSpeed\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"AirDirectionFunction\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"SwingFunction\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"NumberOfFanSpeeds\": 5,\r\n\t\t\t\t\t\t\t\t\t\t\"UseTemperatureA\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"TemperatureIncrementOverride\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"TemperatureIncrement\": 0.5,\r\n\t\t\t\t\t\t\t\t\t\t\"MinTempCoolDry\": 16.0,\r\n\t\t\t\t\t\t\t\t\t\t\"MaxTempCoolDry\": 31.0,\r\n\t\t\t\t\t\t\t\t\t\t\"MinTempHeat\": 10.0,\r\n\t\t\t\t\t\t\t\t\t\t\"MaxTempHeat\": 31.0,\r\n\t\t\t\t\t\t\t\t\t\t\"MinTempAutomatic\": 16.0,\r\n\t\t\t\t\t\t\t\t\t\t\"MaxTempAutomatic\": 31.0,\r\n\t\t\t\t\t\t\t\t\t\t\"LegacyDevice\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"UnitSupportsStandbyMode\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"HasWideVane\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelIsAirCurtain\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelSupportsFanSpeed\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelSupportsAuto\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelSupportsHeat\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelSupportsDry\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelSupportsVaneVertical\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelSupportsVaneHorizontal\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelSupportsWideVane\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelDisableEnergyReport\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelSupportsStandbyMode\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"ModelSupportsEnergyReporting\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"ProhibitSetTemperature\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"ProhibitOperationMode\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"ProhibitPower\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"Power\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"RoomTemperature\": 24.0,\r\n\t\t\t\t\t\t\t\t\t\t\"SetTemperature\": 23.0,\r\n\t\t\t\t\t\t\t\t\t\t\"ActualFanSpeed\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"FanSpeed\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\"AutomaticFanSpeed\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"VaneVerticalDirection\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\"VaneVerticalSwing\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"VaneHorizontalDirection\": 5,\r\n\t\t\t\t\t\t\t\t\t\t\"VaneHorizontalSwing\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"OperationMode\": 3,\r\n\t\t\t\t\t\t\t\t\t\t\"EffectiveFlags\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"LastEffectiveFlags\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"InStandbyMode\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"DefaultCoolingSetTemperature\": 24.0,\r\n\t\t\t\t\t\t\t\t\t\t\"DefaultHeatingSetTemperature\": 24.0,\r\n\t\t\t\t\t\t\t\t\t\t\"RoomTemperatureLabel\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"HeatingEnergyConsumedRate1\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"HeatingEnergyConsumedRate2\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"CoolingEnergyConsumedRate1\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"CoolingEnergyConsumedRate2\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"AutoEnergyConsumedRate1\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"AutoEnergyConsumedRate2\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"DryEnergyConsumedRate1\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"DryEnergyConsumedRate2\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"FanEnergyConsumedRate1\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"FanEnergyConsumedRate2\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"OtherEnergyConsumedRate1\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"OtherEnergyConsumedRate2\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"HasEnergyConsumedMeter\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"CurrentEnergyConsumed\": 7200,\r\n\t\t\t\t\t\t\t\t\t\t\"CurrentEnergyMode\": 3,\r\n\t\t\t\t\t\t\t\t\t\t\"CoolingDisabled\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"MinPcycle\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\"MaxPcycle\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\"EffectivePCycle\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\"MaxOutdoorUnits\": 255,\r\n\t\t\t\t\t\t\t\t\t\t\"MaxIndoorUnits\": 255,\r\n\t\t\t\t\t\t\t\t\t\t\"MaxTemperatureControlUnits\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"DeviceID\": 177841,\r\n\t\t\t\t\t\t\t\t\t\t\"MacAddress\": \"10:98:c3:e8:a4:17\",\r\n\t\t\t\t\t\t\t\t\t\t\"SerialNumber\": \"1903193341\",\r\n\t\t\t\t\t\t\t\t\t\t\"TimeZoneID\": 119,\r\n\t\t\t\t\t\t\t\t\t\t\"DiagnosticMode\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"DiagnosticEndDate\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"ExpectedCommand\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\"Owner\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"DetectedCountry\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"AdaptorType\": -1,\r\n\t\t\t\t\t\t\t\t\t\t\"FirmwareDeployment\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"FirmwareUpdateAborted\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"LinkedDevice\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"WifiSignalStrength\": -47,\r\n\t\t\t\t\t\t\t\t\t\t\"WifiAdapterStatus\": \"NORMAL\",\r\n\t\t\t\t\t\t\t\t\t\t\"Position\": \"Unknown\",\r\n\t\t\t\t\t\t\t\t\t\t\"PCycle\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\"RecordNumMax\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"LastTimeStamp\": \"2020-05-05T09:59:00\",\r\n\t\t\t\t\t\t\t\t\t\t\"ErrorCode\": 8000,\r\n\t\t\t\t\t\t\t\t\t\t\"HasError\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"LastReset\": \"2019-07-24T16:46:41.14\",\r\n\t\t\t\t\t\t\t\t\t\t\"FlashWrites\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"Scene\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"SSLExpirationDate\": \"2037-12-31T00:00:00\",\r\n\t\t\t\t\t\t\t\t\t\t\"SPTimeout\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\"Passcode\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"ServerCommunicationDisabled\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"ConsecutiveUploadErrors\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"DoNotRespondAfter\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"OwnerRoleAccessLevel\": 1,\r\n\t\t\t\t\t\t\t\t\t\t\"OwnerCountry\": 218,\r\n\t\t\t\t\t\t\t\t\t\t\"HideEnergyReport\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"ExceptionHash\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"ExceptionDate\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"ExceptionCount\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"Rate1StartTime\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"Rate2StartTime\": null,\r\n\t\t\t\t\t\t\t\t\t\t\"ProtocolVersion\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"UnitVersion\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"FirmwareAppVersion\": 15000,\r\n\t\t\t\t\t\t\t\t\t\t\"FirmwareWebVersion\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"FirmwareWlanVersion\": 0,\r\n\t\t\t\t\t\t\t\t\t\t\"HasErrorMessages\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"HasZone2\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"Offline\": false,\r\n\t\t\t\t\t\t\t\t\t\t\"Units\": []\r\n\t\t\t\t\t\t\t\t\t},\r\n\t\t\t\t\t\t\t\t\t\"DiagnosticMode\": 0,\r\n\t\t\t\t\t\t\t\t\t\"DiagnosticEndDate\": null,\r\n\t\t\t\t\t\t\t\t\t\"Location\": 4855,\r\n\t\t\t\t\t\t\t\t\t\"DetectedCountry\": null,\r\n\t\t\t\t\t\t\t\t\t\"Registrations\": 93,\r\n\t\t\t\t\t\t\t\t\t\"LocalIPAddress\": null,\r\n\t\t\t\t\t\t\t\t\t\"TimeZone\": 119,\r\n\t\t\t\t\t\t\t\t\t\"RegistReason\": \"CONFIG\",\r\n\t\t\t\t\t\t\t\t\t\"ExpectedCommand\": 1,\r\n\t\t\t\t\t\t\t\t\t\"RegistRetry\": 0,\r\n\t\t\t\t\t\t\t\t\t\"DateCreated\": \"2019-07-24T16:46:41.137\",\r\n\t\t\t\t\t\t\t\t\t\"FirmwareDeployment\": null,\r\n\t\t\t\t\t\t\t\t\t\"FirmwareUpdateAborted\": false,\r\n\t\t\t\t\t\t\t\t\t\"Permissions\": {\r\n\t\t\t\t\t\t\t\t\t\t\"CanSetOperationMode\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"CanSetFanSpeed\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"CanSetVaneDirection\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"CanSetPower\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"CanSetTemperatureIncrementOverride\": true,\r\n\t\t\t\t\t\t\t\t\t\t\"CanDisableLocalController\": true\r\n\t\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t\t}\r\n\t\t\t\t\t\t\t]\r\n\t\t\t\t\t\t}\r\n\t\t\t\t\t],\r\n\t\t\t\t\t\"Devices\": [],\r\n\t\t\t\t\t\"MinTemperature\": 0,\r\n\t\t\t\t\t\"MaxTemperature\": 40,\r\n\t\t\t\t\t\"Expanded\": true\r\n\t\t\t\t}\r\n\t\t\t],\r\n\t\t\t\"Areas\": [],\r\n\t\t\t\"Devices\": [],\r\n\t\t\t\"Clients\": []\r\n\t\t},\r\n\t\t\"AccessLevel\": 4,\r\n\t\t\"DirectAccess\": true,\r\n\t\t\"MinTemperature\": 0,\r\n\t\t\"MaxTemperature\": 40,\r\n\t\t\"Owner\": null,\r\n\t\t\"EndDate\": \"2500-01-01T00:00:00\",\r\n\t\t\"iDateBuilt\": null,\r\n\t\t\"QuantizedCoordinates\": {\r\n\t\t\t\"Latitude\": \"xxx\",\r\n\t\t\t\"Longitude\": \"xxx\"\r\n\t\t}\r\n\t}\r\n]"
				*/

				gthat.log.debug("Response from cloud: " + responseBody);
				const jsonObject = gthis.ParseCloudResponse(responseBody);

				if (jsonObject == null) return;

				const foundDevices = [];

				for (let b = 0; b < jsonObject.length; b++) {
					const building = jsonObject[b];
					const devices = building.Structure.Devices;
					gthis.CreateDevices(building, devices, foundDevices);

					for (let f = 0; f < building.Structure.Floors.length; f++) {
						const devices = building.Structure.Floors[f].Devices;
						gthis.CreateDevices(building, devices, foundDevices);

						for (let a = 0; a < building.Structure.Floors[f].Areas.length; a++) {
							const devices = building.Structure.Floors[f].Areas[a].Devices;
							gthis.CreateDevices(building, devices, foundDevices);
						}
					}

					for (let a = 0; a < building.Structure.Areas.length; a++) {
						const devices = building.Structure.Areas[a].Devices;
						gthis.CreateDevices(building, devices, foundDevices);
					}
				}

				callback && callback(foundDevices);
			}
		});
	}

	ParseCloudResponse(raw) {
		try {
			const parsedRaw = JSON.parse(raw);
			gthat.log.silly("Parsed response from cloud: " + JSON.stringify(parsedRaw));
			return parsedRaw;
		}
		catch (err) {
			gthat.log.error("Failed to parse response from cloud: " + err);
			return null;
		}
	}

	CreateDevices(building, devices, foundDevices) {
		for (let d = 0; d < devices.length; d++) {
			const device = devices[d];
			const newDevice = new MelCloudDevice.MelCloudDevice(gthat);

			newDevice.id = device.DeviceID;
			newDevice.name = device.DeviceName;
			newDevice.serialNumber = device.SerialNumber;
			newDevice.buildingId = building.ID;
			newDevice.floorId = device.FloorID;
			newDevice.power = device.Device.Power;
			newDevice.canCool = device.Device.CanCool;
			newDevice.canDry = device.Device.CanDry;
			newDevice.canHeat = device.Device.CanHeat;

			gthat.log.debug("Got device from cloud: " + device.DeviceID + " (" + device.DeviceName + ")");
			foundDevices.push(newDevice);
		}
	}

	async SaveDevices(newDevices) {
		const currentDeviceIDs = gthat.getCurrentKnownDeviceIDs();
		const newDeviceIDs = [];
		for (let i = 0; i < newDevices.length; i++) {
			const newDevice = newDevices[i];
			newDeviceIDs.push(newDevice.id);
		}

		const deviceIDsToAdd = newDeviceIDs.filter(x => !currentDeviceIDs.includes(x));
		const deviceIDsToDelete = currentDeviceIDs.filter(x => !newDeviceIDs.includes(x));

		for (let d = 0; d < deviceIDsToDelete.length; d++) {
			const deviceID = deviceIDsToDelete[d];
			gthat.deleteMelDevice(deviceID);
		}

		for (let d = 0; d < newDevices.length; d++) {
			const device = newDevices[d];
			if (!deviceIDsToAdd.includes(device.id)) {
				gthat.log.debug("Device already known: " + device.id + " (" + device.name + ")");
				//continue;
			}			
			await device.Save();
		}
	}
}

exports.MelCloudPlatform = MelcloudPlatform;
