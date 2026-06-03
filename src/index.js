"use strict";

const http = require('http');
const CONFIG = require('./config');

let Service, Characteristic;

module.exports = (api) => {
  Service = api.hap.Service;
  Characteristic = api.hap.Characteristic;
  api.registerAccessory('homebridge-meross-plug', 'Meross', MerossPlug);
};

class MerossPlug {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;

    this.name = config.name || CONFIG.DEFAULT_NAME;
    this.deviceUrl = config.deviceUrl;
    this.authToken = config.authToken;
    this.channel = (typeof config.channel === 'number') ? config.channel : CONFIG.DEFAULT_CHANNEL;

    if (!this.deviceUrl) {
      this.log.error('MerossPlug: missing required "deviceUrl" in config');
    }
    if (!this.authToken) {
      this.log.error('MerossPlug: missing required "authToken" in config');
    }

    this.service = new Service.Switch(this.name);

    this.informationService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, CONFIG.MANUFACTURER)
      .setCharacteristic(Characteristic.Model, CONFIG.MODEL)
      .setCharacteristic(Characteristic.SerialNumber, config.serialNumber || `channel-${this.channel}`);

    this.service.getCharacteristic(Characteristic.On)
      .onGet(this.getOn.bind(this))
      .onSet(this.setOn.bind(this));

    this.isOn = false;
  }

  getServices() {
    return [this.informationService, this.service];
  }

  _generateMessageId() {
    // 32-char hex id
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  _generateSign() {
    // Legacy static sign value that has worked for many Meross local API implementations.
    // Real signing requires a per-device secret from the initial handshake.
    // If your device firmware rejects this, you may need to capture a fresh sign.
    return CONFIG.SIGN;
  }

  async _doRequest(body) {
    if (!this.deviceUrl) {
      throw new Error('No deviceUrl configured');
    }

    let base = this.deviceUrl;
    if (!/^https?:\/\//i.test(base)) {
      base = `http://${base}`;
    }
    const url = new URL(CONFIG.ENDPOINT, base);
    const postData = JSON.stringify(body);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'AppVersion': CONFIG.APP_VERSION,
        'Authorization': this.authToken || '',
        'vendor': CONFIG.VENDOR
      }
    };

    return new Promise((resolve, reject) => {
      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (e) {
              resolve(data);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(postData);
      req.end();
    });
  }

  async _getStatus() {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = {
      payload: {},
      header: {
        messageId: this._generateMessageId(),
        method: 'GET',
        from: `${this.deviceUrl}${CONFIG.ENDPOINT}`,
        namespace: CONFIG.NAMESPACE,
        timestamp: timestamp,
        sign: this._generateSign(),
        payloadVersion: CONFIG.PAYLOAD_VERSION
      }
    };

    const response = await this._doRequest(body);
    const togglex = response && response.payload && response.payload.togglex;

    if (Array.isArray(togglex)) {
      const ch = togglex.find((c) => c.channel === this.channel);
      return ch ? !!ch.onoff : false;
    }
    if (togglex && typeof togglex.onoff !== 'undefined') {
      // single or matching channel
      if (typeof togglex.channel === 'undefined' || togglex.channel === this.channel) {
        return !!togglex.onoff;
      }
    }
    return this.isOn;
  }

  async setOn(value) {
    const onoff = value ? 1 : 0;
    const timestamp = Math.floor(Date.now() / 1000);
    const body = {
      payload: {
        togglex: {
          onoff: onoff,
          channel: this.channel
        }
      },
      header: {
        messageId: this._generateMessageId(),
        method: 'SET',
        from: `${this.deviceUrl}${CONFIG.ENDPOINT}`,
        namespace: CONFIG.NAMESPACE,
        timestamp: timestamp,
        sign: this._generateSign(),
        payloadVersion: CONFIG.PAYLOAD_VERSION
      }
    };

    this.log.debug(`SET channel ${this.channel} -> ${onoff}`);

    try {
      await this._doRequest(body);
      this.isOn = value;
      return value;
    } catch (err) {
      this.log.error(`Failed SET channel ${this.channel}: ${err.message}`);
      throw err;
    }
  }

  async getOn() {
    try {
      const current = await this._getStatus();
      this.isOn = current;
      this.log.debug(`GET channel ${this.channel} -> ${current}`);
      return current;
    } catch (err) {
      this.log.warn(`GET status failed for channel ${this.channel}, using cached: ${err.message}`);
      return this.isOn;
    }
  }
}
