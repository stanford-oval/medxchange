'use strict';

let request = require('./data/request.json');
const config = require('./data/test-config.json');
const assert = require('assert');
const DXserver = require('../controllers/eth-dxservice.js');
const dxserver = new DXserver(config);

async function main() {
  let response;
  request.dataCertificate = '49b45u9gm9042mg04b24jbj2=bj2=bj';
  request.userID = 'consumer1';
  response = await dxserver.EASDeployment(request);
  assert.strictEqual(response.message, 'EASD transaction is written.');
  console.log('EASID: ' + response.EASID);
  const consumer1EASID = response.EASID;

  request.userID = 'consumer2';
  response = await dxserver.EASDeployment(request);
  assert.strictEqual(response.message, 'EASD transaction is written.');
  console.log('EASID: ' + response.EASID);
  const consumer2EASID = response.EASID;

  request.EASID = consumer2EASID;
  response = await dxserver.EASRetrieval(request);
  await checkEAS(response, request, 'consumer2');

  request.EASID = consumer1EASID;
  response = await dxserver.EASRetrieval(request);
  await checkEAS(response, request, 'consumer1');

  ////EASID = consumer1EASID;
  request.userID = 'provider1';
  response = await dxserver.EASInvocation(request);
  assert.strictEqual(response.message, 'EASI transaction is written.');

  ////EASID = consumer1EASID;
  request.userType = 'provider';
  request.userID = 'provider1';
  response = await dxserver.EASRevocation(request);
  assert.strictEqual(response.message, 'EASR transaction (provider) is written.');

  ////EASID = consumer1EASID;
  response = await dxserver.EASRetrieval(request);
  assert.strictEqual(response.isValid, false);

  request.userType = 'consumer';
  request.userID = 'consumer2';
  request.EASID = consumer2EASID;
  response = await dxserver.EASRevocation(request);
  assert.strictEqual(response.message, 'EASR transaction (consumer) is written.');

  ////EASID = consumer2EASID;
  response = await dxserver.EASRetrieval(request);
  assert.strictEqual(response.isValid, false);
}

async function checkEAS(response, request, consumerID) {
  assert.strictEqual(response.message, 'EAS is retrieved by EASID.');
  assert.strictEqual(response.providerID, 'provider1');
  assert.strictEqual(response.offerPrice, request.offerPrice);
  assert.strictEqual(response.dataOwner, request.dataOwner);
  assert.strictEqual(response.dataCertificate, request.dataCertificate);
  assert.strictEqual(response.dataDescription, request.dataDescription);
  assert.strictEqual(response.dataAccessPath, request.dataAccessPath);
  assert.strictEqual(response.consumerID, consumerID);
  assert.strictEqual(response.isValid, true);
  assert.strictEqual(response.expirationDate, request.expirationDate);
  assert.strictEqual(response.providerAgreement, request.providerAgreement);
  assert.strictEqual(response.consumerAgreement, request.consumerAgreement);
}

module.exports = main;
if (!module.parent)
  main();

