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

  let consumer1EASID, consumer2EASID;
  options.url = url + apiList.EASDeployment;
  options.form.dataCertificate = '49b45u9gm9042mg04b24jbj2=bj2=bj';
  options.form.userID = 'consumer1';
  await request.post(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.message, 'EASD transaction is written.');
    console.log('EASID: ' + result.EASID);
    consumer1EASID = result.EASID;
  });

  options.url = url + apiList.EASDeployment;
  options.form.userID = 'consumer2';
  await request.post(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.message, 'EASD transaction is written.');
    console.log('EASID: ' + result.EASID);
    consumer2EASID = result.EASID;
  });

  options.url = url + apiList.EASRetrieval + '?EASID=' + consumer2EASID;
  await request.get(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    checkEAS(result, options.form, 'consumer2');
  });

  options.url = url + apiList.EASRetrieval + '?EASID=' + consumer1EASID;
  await request.get(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    checkEAS(result, options.form, 'consumer1');
  });

  options.url = url + apiList.EASInvocation;
  options.form.userID = 'provider1';
  options.form.EASID = consumer1EASID;
  await request.post(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.message, 'EASI transaction is written.');
  });

  ////EASID = consumer1EASID;
  options.url = url + apiList.EASRevocation;
  options.form.userType = 'provider';
  options.form.userID = 'provider1';
  await request.post(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.message, 'EASR transaction (provider) is written.');
  });

  options.url = url + apiList.EASRetrieval + '?EASID=' + consumer1EASID;
  await request.get(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.isValid, false);
  });
  reqbody.consumer1EASID = consumer1EASID; 

  options.url = url + apiList.EASRevocation;
  options.form.userType = 'consumer';
  options.form.userID = 'consumer2';
  options.form.EASID = consumer2EASID;
  await request.post(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.message, 'EASR transaction (consumer) is written.');
  });

  options.url = url + apiList.EASRetrieval + '?EASID=' + consumer2EASID;
  await request.get(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    assert.strictEqual(result.isValid, false);
  });

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