'use strict';

let request = require('./data/request.json');
const config = require('./data/test-config.json');
const assert = require('assert');
const DXserver = require('../controllers/eth-dxservice.js');
const dxserver = new DXserver(config);

async function main() {
  let response = await dxserver.CreateNewDirectory();
  console.log('DirectoryID: ' + response.directoryID);
  assert.strictEqual(response.message, 'A new directory is created and deployed.');
  request.directoryID = response.directoryID;
}

module.exports = main;
if (!module.parent)
  main();
