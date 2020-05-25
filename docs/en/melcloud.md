# MELCloud - User guide

## Prerequisites

In order to use this adapter, there are a few things you have to prepare in advance:

* Mitsubishi air conditioning system with Wi-Fi-Adapter MAC-567IF
* MELCloud account at the [official webpage](https://app.melcloud.com/)
* All devices registered and set-up in your MELCloud account

## Configuration

![Adapter settings](img/adapter_settings.png)

Here you can configure your adapter instance. Mandatory for the adapter to work are your MELCloud credentials (email address and password). Additionally you need to specify your account region.
Apart from that you can configure the time interval when your device data is polled and updated from MELCloud (minimum 1 minute).

## Objects

After successful start of the adapter instance (X) your devices are queried from MELCloud. For each device (Y) there will be a separate node.

### melcoud.X.info

| id | read | write | comment |
|--- |--- |--- |--- |
| connection | X | - | Indicates the connection to MELCloud |

### melcloud.X.device.Y.info

TODO

| id | read | write | comment |
|--- |--- |--- |--- |
| buildingId | X | - | Assigned building ID |

### melcloud.X.device.Y.control

TODO

| id | read | write | comment |
|--- |--- |--- |--- |
| fanSpeed | X | X | Current fan speed of your device (0=auto, 1...'numberOfFanSpeeds'= low to max fan speed) |
