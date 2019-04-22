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

  options.url = url + apiList.UserRegistration;
  options.form.userType = 'provider';
  options.form.userID = 'provider1';
  await request.post(options, (error, res, body) => {
    assert.strictEqual(JSON.parse(res.body).result.message, 'Register user successfully.');
  });

  options.form.userType = 'consumer';
  options.form.userID = 'consumer1';
  await request.post(options, (error, res, body) => {
    assert.strictEqual(JSON.parse(res.body).result.message, 'Register user successfully.');
  });

  options.form.userType = 'consumer';
  options.form.userID = 'consumer2';
  await request.post(options, (error, res, body) => {
    assert.strictEqual(JSON.parse(res.body).result.message, 'Register user successfully.');
  });
}

module.exports = main;
if (!module.parent)
  main();