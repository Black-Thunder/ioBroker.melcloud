![Logo](admin/melcloud.png)
# ioBroker.melcloud

[![NPM version](http://img.shields.io/npm/v/iobroker.melcloud.svg)](https://www.npmjs.com/package/iobroker.melcloud)
[![Downloads](https://img.shields.io/npm/dm/iobroker.melcloud.svg)](https://www.npmjs.com/package/iobroker.melcloud)
![Number of Installations (latest)](http://iobroker.live/badges/melcloud-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/melcloud-stable.svg)
[![Dependency Status](https://img.shields.io/david/Black-Thunder/iobroker.melcloud.svg)](https://david-dm.org/Black-Thunder/iobroker.melcloud)
[![Known Vulnerabilities](https://snyk.io/test/github/Black-Thunder/ioBroker.melcloud/badge.svg)](https://snyk.io/test/github/Black-Thunder/ioBroker.melcloud)

[![NPM](https://nodei.co/npm/iobroker.melcloud.png?downloads=true)](https://nodei.co/npm/iobroker.melcloud/)

**Tests:**: [![Build Status](https://travis-ci.com/Black-Thunder/ioBroker.melcloud.svg?branch=master)](https://travis-ci.com/Black-Thunder/ioBroker.melcloud)

## melcloud adapter for ioBroker

This adapter integrates Mitsubishi air conditioning systems via MELCloud (https://www.melcloud.com/) into ioBroker.

Documentation:

* [English](https://github.com/Black-Thunder/ioBroker.melcloud/tree/master/docs/en/melcloud.md)
* [Deutsche Beschreibung](https://github.com/Black-Thunder/ioBroker.melcloud/tree/master/docs/de/melcloud.md)

## Changelog

### 0.0.3 XX.XX.2020
* (Black-Thunder) added indicator if device is reachable

### 0.0.2-alpha9 25.05.2020
* (Black-Thunder) fixed crash when devices are assigned to different floors/areas

### 0.0.2-alpha8 25.05.2020
* (Black-Thunder) fixed "Swing" of vanes

### 0.0.2-alpha7 25.05.2020
* (Black-Thunder) fix "power" state

### 0.0.2-alpha6 25.05.2020
* (Black-Thunder) create object folders as channels so that enums can be assigned
* (Black-Thunder) predefined states for fan speed, vane horizontal/vertical, "Swing" added
* (Black-Thunder) changing operation mode doesn't power on device anymore
* (Black-Thunder) min/max for setTemperature added

### 0.0.2-alpha5 25.05.2020
* (Black-Thunder) added more error logging

### 0.0.2-alpha4 25.05.2020
* (Black-Thunder) operation modes "Dry" and "Vent" added, removed confusing mode "Off" (device state is now only controlled by "power")
* (Black-Thunder) control of fan speed, horizontal and vertical vane direction added
* (Black-Thunder) reduced amount of logging entries

### 0.0.2-alpha3 24.05.2020
* (Black-Thunder) fixed 'request' dependency

### 0.0.2-alpha2 24.05.2020
* (Black-Thunder) fixed check of adapter settings
* (Black-Thunder) added more logging

### 0.0.2 24.05.2020
* (Black-Thunder) first implementation of device control (all states under "device.XXX.control")
* (Black-Thunder) added more device options
* (Black-Thunder) extended and optimized logging (e.g. when logging into MelCloud)
* (Black-Thunder) implemented polling of cloud data

### 0.0.1-alpha4 11.05.2020
* (Black-Thunder) fixed password encryption

### 0.0.1-alpha3 11.05.2020
* (Black-Thunder) refactored code
* (Black-Thunder) prepared device control

### 0.0.1-alpha2 11.05.2020
* (Black-Thunder) password stored encrypted
* (Black-Thunder) fixed username check
* (Black-Thunder) implemented adapter connection state based on cloud connection
* (Black-Thunder) handled connection failures to cloud better
* (Black-Thunder) optimized logging

### 0.0.1
* (Black-Thunder) initial release

## License
MIT License

Copyright (c) 2020 Black-Thunder <glwars@aol.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
