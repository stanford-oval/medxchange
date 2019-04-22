'use strict';

const assert = require('assert');
const request = require('request-promise');
const url = 'https://localhost:5000';
const apiList = require('../routes/apiList.json');
let reqbody = require('./data/api-request.json');
let directoryID;

async function main() {
  let options = {
    url: url,
    rejectUnauthorized: false,
    form: reqbody
  };

  options.url = url + apiList.CreateNewDirectory;
  await request.post(options, (error, res, body) => {
    directoryID = JSON.parse(res.body).result.directoryID;
    console.log('DirectoryID: ' + directoryID);
    assert.strictEqual(JSON.parse(res.body).result.message, 'A new directory is created and deployed.');
  });
  reqbody.directoryID = directoryID;
}

module.exports = main;
if (!module.parent)
  main();