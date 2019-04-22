'use strict';

const assert = require('assert');
const request = require('request-promise');
const url = 'https://localhost:5000';
const apiList = require('../routes/apiList.json');
let reqbody = require('./data/api-request.json');

async function main() {
  let options = {
    url: url,
    rejectUnauthorized: false,
    form: reqbody
  };

  options.url = url + apiList.DataEntryCreation;
  options.form.userID = 'provider1';
  await request.post(options, (error, res, body) => {
    assert.strictEqual(JSON.parse(res.body).result.message, 'DEC transaction is written.');
  });

  options.url = url + apiList.DataEntryCount + '?directoryID=' + options.form.directoryID;
  await request.get(options, (error, res, body) => {
    assert.strictEqual(JSON.parse(res.body).result.message, 'Data entry count is retrieved.');
    assert.strictEqual(JSON.parse(res.body).result.entryCount, '1');
  });

  options.url = url + apiList.DataEntryRetrievalByIndex + '?directoryID=' + options.form.directoryID + '&index=0';
  await request.get(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.message, 'Data entry is retrieved by index.');
    checkDEC(result, options.form);
  });

  options.url = url + apiList.DataEntryRetrievalByDataCertificate + '?directoryID=' + options.form.directoryID + '&dataCertificate=' + options.form.dataCertificate;
  await request.get(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.message, 'Data entry is retrieved by data certificate.');
    checkDEC(result, options.form);
  });

  options.url = url + apiList.DataEntryCreation;
  options.form.dataCertificate = 'ek4df/7ka4opg48ag89484=d2334';
  await request.post(options, (error, res, body) => {
    assert.strictEqual(JSON.parse(res.body).result.message, 'DEC transaction is written.');
  });

  options.url = url + apiList.DataEntryCount + '?directoryID=' + options.form.directoryID;
  await request.get(options, (error, res, body) => {
    assert.strictEqual(JSON.parse(res.body).result.message, 'Data entry count is retrieved.');
    assert.strictEqual(JSON.parse(res.body).result.entryCount, '2');
  });

  options.url = url + apiList.DataEntryRetrievalByIndex + '?directoryID=' + options.form.directoryID + '&index=1';
  await request.get(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.message, 'Data entry is retrieved by index.');
    checkDEC(result, options.form);
  });

  options.url = url + apiList.DataEntryRetrievalByDataCertificate + '?directoryID=' + options.form.directoryID + '&dataCertificate=' + options.form.dataCertificate;
  await request.get(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.message, 'Data entry is retrieved by data certificate.');
    checkDEC(result, options.form);
  });

  options.url = url + apiList.DataEntryDeletion;
  options.form.dataCertificate = 'ek4df/7ka4opg48ag89484=d2334';
  await request.post(options, (error, res, body) => {
    assert.strictEqual(JSON.parse(res.body).result.message, 'DED transaction is written.');
  });

  options.url = url + apiList.DataEntryRetrievalByDataCertificate + '?directoryID=' + options.form.directoryID + '&dataCertificate=' + options.form.dataCertificate;
  await request.get(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.message, 'Data entry is retrieved by data certificate.');
    assert.strictEqual(result.isSearched, false);
  });
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