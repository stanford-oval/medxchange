'use strict';

const request = require('./data/request.json');
const config = require('./data/test-config.json');
const assert = require('assert');
const DXserver = require('../controllers/eth-dxservice.js');
const dxserver = new DXserver(config);

async function main() {
  let response;
  request.userID = 'provider1';

  response = await dxserver.DataEntryCreation(request);
  assert.strictEqual(response.message, 'DEC transaction is written.');
  
  response = await dxserver.DataEntryCount(request);
  assert.strictEqual(response.message, 'Data entry count is retrieved.');
  assert.strictEqual(response.entryCount, '1');
  
  response = await dxserver.DataEntryRetrievalByIndex(request);
  assert.strictEqual(response.message, 'Data entry is retrieved by index.');
  await checkDEC(response, request);

  response = await dxserver.DataEntryRetrievalByDataCertificate(request);
  assert.strictEqual(response.message, 'Data entry is retrieved by data certificate.');
  await checkDEC(response, request);

  request.dataCertificate = 'ek4df/7ka4opg48ag89484=d2334';
  response = await dxserver.DataEntryCreation(request);
  assert.strictEqual(response.message, 'DEC transaction is written.');

  response = await dxserver.DataEntryCount(request);
  assert.strictEqual(response.message, 'Data entry count is retrieved.');
  assert.strictEqual(response.entryCount, '2');

  request.index = '1';
  response = await dxserver.DataEntryRetrievalByIndex(request);
  assert.strictEqual(response.message, 'Data entry is retrieved by index.');
  await checkDEC(response, request);
  
  response = await dxserver.DataEntryRetrievalByDataCertificate(request);
  assert.strictEqual(response.message, 'Data entry is retrieved by data certificate.');
  await checkDEC(response, request);

  request.dataCertificate = 'ek4df/7ka4opg48ag89484=d2334';
  response = await dxserver.DataEntryDeletion(request);
  assert.strictEqual(response.message, 'DED transaction is written.');
  
  response = await dxserver.DataEntryRetrievalByDataCertificate(request);
  assert.strictEqual(response.message, 'Data entry is retrieved by data certificate.');
  assert.strictEqual(response.isSearched, false);
}

async function checkDEC(response, request) {
  assert.strictEqual(response.providerID, 'provider1');
  assert.strictEqual(response.offerPrice, request.offerPrice);
  assert.strictEqual(response.dataOwner, request.dataOwner);
  assert.strictEqual(response.dataCertificate, request.dataCertificate);
  assert.strictEqual(response.dataDescription, request.dataDescription);
  assert.strictEqual(response.dataAccessPath, request.dataAccessPath);
  assert.strictEqual(response.isSearched, true);
  assert.strictEqual(response.dueDate, request.dueDate);
}

module.exports = main;
if (!module.parent)
  main();