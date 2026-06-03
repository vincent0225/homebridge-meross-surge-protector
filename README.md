# Homebridge Meross Plug

[![npm version](https://img.shields.io/npm/v/homebridge-meross-plug.svg)](https://www.npmjs.com/package/homebridge-meross-plug)
[![License](https://img.shields.io/npm/l/homebridge-meross-plug.svg)](https://github.com/vincent0225/homebridge-meross-surge-protector/blob/master/LICENSE)
[![Downloads](https://img.shields.io/npm/dt/homebridge-meross-plug.svg)](https://www.npmjs.com/package/homebridge-meross-plug)

A [Homebridge](https://homebridge.io) plugin for controlling Meross smart plugs and surge protectors (MSS110, MSS425E, and similar devices) using their local HTTP API.

This plugin supports multi-channel devices, allowing individual control of outlets on surge protectors.

> **Note:** This is a legacy accessory plugin that requires manual configuration in `config.json`. It does not yet support the Homebridge config UI.

## Features

- Control Meross devices directly on your local network (no cloud dependency after setup)
- Support for multiple channels/outlets on a single device (e.g. MSS425E surge protector)
- Simple switch accessory in HomeKit

## Installation

### Using Homebridge UI

1. Open the Homebridge UI
2. Go to the Plugins tab
3. Search for `homebridge-meross-plug`
4. Click **Install**

### Using NPM

```bash
npm install -g homebridge-meross-plug
```

## Configuration

This plugin registers as a static accessory. Add entries under `accessories` in your Homebridge `config.json`:

```json
{
  "accessories": [
    {
      "accessory": "Meross",
      "name": "Desk Lamp",
      "deviceUrl": "http://192.168.1.101",
      "authToken": "Basic YOUR_TOKEN_HERE",
      "channel": 0
    }
  ]
}
```

### Multi-Outlet Surge Protector Example (MSS425E)

```json
{
  "accessories": [
    {
      "accessory": "Meross",
      "name": "Surge Protector Outlet 1",
      "deviceUrl": "http://192.168.1.102",
      "authToken": "Basic YOUR_TOKEN_HERE",
      "channel": 1
    },
    {
      "accessory": "Meross",
      "name": "Surge Protector Outlet 2",
      "deviceUrl": "http://192.168.1.102",
      "authToken": "Basic YOUR_TOKEN_HERE",
      "channel": 2
    },
    {
      "accessory": "Meross",
      "name": "Surge Protector Outlet 3",
      "deviceUrl": "http://192.168.1.102",
      "authToken": "Basic YOUR_TOKEN_HERE",
      "channel": 3
    }
  ]
}
```

### Obtaining `deviceUrl` and `authToken`

1. **deviceUrl**: Log into your router's admin interface and locate the local IP address of your Meross device(s). Use `http://IP_ADDRESS` (no trailing slash).
2. **authToken**: Use a network proxy tool (such as Charles Proxy, mitmproxy, or Wireshark) to capture HTTP requests made by the official Meross mobile app. Look for the `Authorization` header in requests to your device (format is usually `Basic xxxxx`).

The same `deviceUrl` + `authToken` can be reused for each channel on a multi-outlet device.

## Supported Devices

- Meross MSS110 (single plug)
- Meross MSS425E / MSS425 (surge protector with 3+ outlets)
- Other Meross devices using the `Appliance.Control.ToggleX` local API (may require channel tuning)

## Notes & Limitations

- The plugin makes direct calls to the device's local API using Node's built-in `http` module (no external request libraries).
- State is queried live from the device on each HomeKit GET (no background polling).
- The legacy static `sign` value may need refreshing for newer device firmware (capture a real request if SET/GET fails).
- Requires recent Homebridge (1.6+ / 2.0+) and Node 18+.

## Credits

- Original development and testing by [Robdel12](https://github.com/robdel12)
- Multi-channel surge protector support and adaptations by contributors

## License

MIT © Robert DeLuca
