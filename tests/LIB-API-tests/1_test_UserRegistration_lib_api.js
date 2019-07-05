'use strict';

const assert = require('assert');
const request = require('request-promise');
const sleep = require('system-sleep');

const apiList = require('../../routes/apiList.json');
const config = require('../../controllers/medx-dev-config.json');
const reqbody = require('../data/request.json');
const medxDatabase = require('../../controllers/database');

const UR_Database = new medxDatabase.UserRegistration(config.UR_dbPath);

async function main() {
  try {
    let response;
    await deleteURDatabaseTables();

    response = await userRegistration(reqbody.provider[0]);
    assert.strictEqual(response.message, 'New account is registered.');

    response = await userRegistration(reqbody.provider[1]);
    assert.strictEqual(response.message, 'New account is registered.');

    response = await userRegistration(reqbody.consumer[0]);
    assert.strictEqual(response.message, 'New account is registered.');

    response = await userRegistration(reqbody.consumer[1]);
    assert.strictEqual(response.message, 'New account is registered.');

    response = await userRegistration(reqbody.auditor[0]);
    assert.strictEqual(response.message, 'New account is registered.');
    sleep(2000);

  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function deleteURDatabaseTables() {
  await UR_Database.connect();
  await UR_Database.db.run(`DELETE FROM provider`, (err) => {
    if (err) {
      console.log(err);
      throw (err);
    }
  });
  await UR_Database.db.run(`DELETE FROM consumer`, (err) => {
    if (err) {
      console.log(err);
      throw (err);
    }
  });
  await UR_Database.db.run(`DELETE FROM auditor`, (err) => {
    if (err) {
      console.log(err);
      throw (err);
    }
  });
}

async function userRegistration(user) {
  const options = {
    url: reqbody.url + apiList.UserRegistration,
    rejectUnauthorized: false,
    form: {
      userType: user.userType,
      userID: user.userID,
      userAddress: user.userAddress,
      userPassword: user.userPassword
    }
  };

  let response = await request.post(options);
  response = JSON.parse(response).result;
  return response;
}
module.exports = main;
if (!module.parent)
  main();