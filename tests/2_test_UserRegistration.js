'use strict';

let request = require('./data/request.json');
const config = require('./data/test-config.json');
const assert = require('assert');
const DXserver = require('../controllers/eth-dxservice.js');
const dxserver = new DXserver(config);

async function main() {
  let response;
  request.userType = 'provider';
  request.userID = 'provider1';
  response = await dxserver.UserRegistration(request);
  assert.strictEqual(response.message, 'Register user successfully.');
  request.userType = 'consumer';
  request.userID = 'consumer1';
  response = await dxserver.UserRegistration(request);
  assert.strictEqual(response.message, 'Register user successfully.');
  request.userType = 'consumer';
  request.userID = 'consumer2';
  response = await dxserver.UserRegistration(request);
  assert.strictEqual(response.message, 'Register user successfully.');
}

module.exports = main;
if (!module.parent)
  main();


