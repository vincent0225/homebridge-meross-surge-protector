"use strict";

const test = require('node:test');
const assert = require('node:assert');
const MerossPlugin = require('../src/index.js');

// Lightweight mocks for HAP and Homebridge API
function createMocks() {
  const logs = [];

  const log = (...args) => { logs.push(args); };
  log.error = (...args) => { logs.push(['ERROR', ...args]); };
  log.warn = (...args) => { logs.push(['WARN', ...args]); };
  log.debug = (...args) => { logs.push(['DEBUG', ...args]); };

  const mockCharacteristic = {
    On: 'On',
    Manufacturer: 'Manufacturer',
    Model: 'Model',
    SerialNumber: 'SerialNumber'
  };

  function MockService(name) {
    this.name = name;
    this.characteristics = {};
    this.setCharacteristic = (char, value) => {
      this.characteristics[char] = value;
      return this;
    };
    this.getCharacteristic = (char) => {
      if (!this.characteristics[char]) {
        this.characteristics[char] = {};
      }
      const ch = this.characteristics[char];
      ch.onGet = (handler) => { ch.getHandler = handler; return ch; };
      ch.onSet = (handler) => { ch.setHandler = handler; return ch; };
      return ch;
    };
  }

  MockService.Switch = MockService;
  MockService.AccessoryInformation = MockService;

  const api = {
    hap: {
      Service: MockService,
      Characteristic: mockCharacteristic
    }
  };

  return { log, logs, api };
}

test('plugin exports a function and registers accessory', () => {
  assert.strictEqual(typeof MerossPlugin, 'function');
});

test('constructor creates services with default channel 0', () => {
  const { log, api } = createMocks();
  const config = {
    name: 'Test Plug',
    deviceUrl: 'http://192.168.1.100',
    authToken: 'Basic abc123'
  };

  let capturedClass = null;
  const testApi = {
    hap: api.hap,
    registerAccessory: (pluginName, accessoryName, cls) => {
      capturedClass = cls;
    }
  };

  // Call the plugin initializer (as homebridge does) to capture the class
  const pluginFn = require('../src/index.js');
  pluginFn(testApi);

  assert.ok(capturedClass, 'Should have captured MerossPlug class');
  const plug = new capturedClass(log, config, testApi);

  const services = plug.getServices();
  assert.strictEqual(services.length, 2, 'Should expose 2 services');
  assert.strictEqual(plug.channel, 0);
  assert.strictEqual(plug.name, 'Test Plug');
});

test('constructor uses provided channel and validates config', () => {
  const { log, logs, api } = createMocks();

  let capturedClass = null;
  const testApi = {
    hap: api.hap,
    registerAccessory: (p, a, cls) => { capturedClass = cls; }
  };
  require('../src/index.js')(testApi);

  const config = {
    name: 'Channel2',
    deviceUrl: 'http://192.168.1.101',
    authToken: 'Basic xyz',
    channel: 2
  };

  const plug = new capturedClass(log, config, testApi);

  assert.strictEqual(plug.channel, 2);
  // It should have logged errors only if missing fields, here we provided them
  const errorLogs = logs.filter(l => l[0] === 'ERROR');
  assert.strictEqual(errorLogs.length, 0);
});

test('setOn and getOn update and return state using mocked _doRequest', async () => {
  const { log, api } = createMocks();

  let capturedClass = null;
  const testApi = {
    hap: api.hap,
    registerAccessory: (p, a, cls) => { capturedClass = cls; }
  };
  require('../src/index.js')(testApi);

  const config = {
    name: 'Test',
    deviceUrl: 'http://192.168.1.100',
    authToken: 'Basic abc',
    channel: 1
  };

  const plug = new capturedClass(log, config, testApi);

  // Mock successful SET
  plug._doRequest = async (body) => {
    assert.ok(body.header.method === 'SET' || body.header.method === 'GET');
    assert.strictEqual(body.payload.togglex.channel, 1);
    return { payload: {} };
  };

  const result = await plug.setOn(true);
  assert.strictEqual(result, true);
  assert.strictEqual(plug.isOn, true);

  // Now mock a GET that returns off from device
  plug._doRequest = async () => ({
    payload: {
      togglex: [
        { channel: 0, onoff: 0 },
        { channel: 1, onoff: 0 }
      ]
    }
  });

  const current = await plug.getOn();
  assert.strictEqual(current, false);
  assert.strictEqual(plug.isOn, false);
});

test('getOn falls back to cached value on request failure', async () => {
  const { log, logs, api } = createMocks();

  let capturedClass = null;
  const testApi = {
    hap: api.hap,
    registerAccessory: (p, a, cls) => { capturedClass = cls; }
  };
  require('../src/index.js')(testApi);

  const config = { name: 'FailTest', deviceUrl: 'http://bad', authToken: 'x', channel: 0 };
  const plug = new capturedClass(log, config, testApi);

  plug.isOn = true;

  plug._doRequest = async () => {
    throw new Error('network down');
  };

  const value = await plug.getOn();
  assert.strictEqual(value, true); // fallback

  const warn = logs.find(l => l[0] === 'WARN');
  assert.ok(warn && warn[1].includes('GET status failed'));
});

test('handles array and single togglex responses in _getStatus', async () => {
  const { log, api } = createMocks();

  let capturedClass = null;
  const testApi = {
    hap: api.hap,
    registerAccessory: (p, a, cls) => { capturedClass = cls; }
  };
  require('../src/index.js')(testApi);

  const config = { name: 'ShapeTest', deviceUrl: 'http://x', authToken: 'x', channel: 3 };
  const plug = new capturedClass(log, config, testApi);

  // Array response
  plug._doRequest = async () => ({
    payload: { togglex: [{ channel: 3, onoff: 1 }] }
  });
  let val = await plug.getOn();
  assert.strictEqual(val, true);

  // Single object response
  plug._doRequest = async () => ({
    payload: { togglex: { channel: 3, onoff: 0 } }
  });
  val = await plug.getOn();
  assert.strictEqual(val, false);
});

test('logs error when required config fields are missing', () => {
  const { log, logs, api } = createMocks();

  let capturedClass = null;
  const testApi = {
    hap: api.hap,
    registerAccessory: (p, a, cls) => { capturedClass = cls; }
  };
  require('../src/index.js')(testApi);

  const incompleteConfig = {
    name: 'Incomplete'
    // no deviceUrl or authToken
  };

  new capturedClass(log, incompleteConfig, testApi);

  const errors = logs.filter(l => l[0] === 'ERROR');
  assert.ok(errors.length >= 2, 'Should log errors for missing deviceUrl and authToken');
  assert.ok(errors.some(e => e.join(' ').includes('deviceUrl')));
  assert.ok(errors.some(e => e.join(' ').includes('authToken')));
});
