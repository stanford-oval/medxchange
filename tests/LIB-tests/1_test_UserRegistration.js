'use strict';

const assert = require('assert');
const sleep = require('system-sleep');

const request = require('../data/request.json');
const config = require('../data/test-config.json');
const MedXserver = require('../../controllers/eth-dxservice.js');
const medxDatabase = require('../../controllers/database');
const SyncManager = require('../../controllers/sync-manager');

const medXServer = new MedXserver(config, {});
const UR_Database = new medxDatabase.UserRegistration(config.UR_dbPath);
const BN_Database = new medxDatabase.BlockNumber(config.BN_dbPath);
const SyncBlockchain = new SyncManager(config, medXServer);
SyncBlockchain.syncDirectoryStorage();

async function main() {
  let response;
  try {
    await deleteDatabaseTables();

    response = await userRegistration(request.provider[0]);
    assert.strictEqual(response.message, 'New account is registered.');

    response = await userLogin(request.provider[0]);
    assert.strictEqual(response.message, 'User logins successfully.');

    response = await userRegistration(request.provider[1]);
    assert.strictEqual(response.message, 'New account is registered.');

    response = await userLogin(request.provider[1]);
    assert.strictEqual(response.message, 'User logins successfully.');

    response = await userRegistration(request.consumer[0]);
    assert.strictEqual(response.message, 'New account is registered.');

    response = await userLogin(request.consumer[0]);
    assert.strictEqual(response.message, 'User logins successfully.');

    response = await userRegistration(request.consumer[1]);
    assert.strictEqual(response.message, 'New account is registered.');

    response = await userLogin(request.consumer[1]);
    assert.strictEqual(response.message, 'User logins successfully.');

    response = await userRegistration(request.auditor[0]);
    assert.strictEqual(response.message, 'New account is registered.');

    response = await userLogin(request.auditor[0]);
    assert.strictEqual(response.message, 'User logins successfully.');
    sleep(1000);
  } catch (error) {
    console.log(error.message);
  }
}

async function deleteDatabaseTables() {
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
  await BN_Database.db.run(`DELETE FROM blockNumber`, (err) => {
    if (err) {
      console.log(err);
      throw (err);
    }
  });
  sleep(1000);
}

async function userRegistration(userInfo) {
  try {
    const reqbody = {
      userType: userInfo.userType,
      userID: userInfo.userID,
      userAddress: userInfo.userAddress,
      userPassword: userInfo.userPassword
    };
    const response = await medXServer.UserRegistration(reqbody);
    sleep(1000);
    return response;
  } catch (error) {
    console.log(error.message);
  }
}

async function userLogin(userInfo) {
  try {
    const reqbody = {
      userType: userInfo.userType,
      userID: userInfo.userID,
      userPassword: userInfo.userPassword
    };
    const response = await medXServer.UserLogin(reqbody);
    sleep(1000);
    return response;
  } catch (error) {
    console.log(error.message);
  }
}
module.exports = main;
if (!module.parent)
  main();