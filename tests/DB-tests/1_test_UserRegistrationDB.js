"use strict";

const sha256 = require('crypto-js/sha256');
const assert = require('assert');
const sleep = require('system-sleep');

const Database = require('../../controllers/database.js');
const userRegistration = new Database.UserRegistration();

const directoryID = '0x33456780987987987';
const userType = ["provider", "provider", "consumer", "consumer"];
const userID = ["provider1", "provider2", "consumer1", "consumer2"];
const userPassword = ["3f41c2bfe8", "3f41c2bfe9", "7908e1e5dd", "7908e1e5de"];
const userAddress = [
  "0x9014fa6e81ecf8d81af8b1a0965ed6",
  "0x9014fa6e81ecf8d81af8b1a0965ed5",
  "0x9379cfca25b87f1607ca8c43fe84d9",
  "0x9379cfca25b87f1607ca8c43fe84d0"
];

let response, condition;
let inputData = {};

async function main() {
  await deleteDatabaseTables();
  await checkAndWriteUserInfo();
  await checkRetrieval([0, 0, 0, 0]);
  await setConfirmation();
  await checkRetrieval([1, 1, 1, 1]);
}

async function deleteDatabaseTables() {
  // Delete database
  try {
    await userRegistration.connect();
    await userRegistration.db.run(`DELETE FROM provider`, (err) => {
      if (err) {
        console.log(err);
        throw (err);
      }
    });
    await userRegistration.db.run(`DELETE FROM consumer`, (err) => {
      if (err) {
        console.log(err);
        throw (err);
      }
    });
    sleep(1000);
  } catch (error) {
    console.log(error);
    process.exit();
  }
}

async function checkAndWriteUserInfo() {
  // check user existence before registration 
  for (let i = 0; i < 4; i++) {
    response = await userRegistration.checkUserExist(directoryID, userType[i], userID[i], userAddress[i]);
    assert.strictEqual(response, false);
    response = await userRegistration.checkUserExist(directoryID, userType[i], undefined, userAddress[i]);
    assert.strictEqual(response, false);
    response = await userRegistration.checkUserExist(directoryID, userType[i], userID[i], undefined);
    assert.strictEqual(response, false);
  }

  // write user info after checking user existence
  for (let i = 0; i < 4; i++) {
    inputData.userID = userID[i];
    inputData.userAddress = userAddress[i];
    inputData.userPassword = userPassword[i];
    response = await userRegistration.writeUserInfo(directoryID, userType[i], inputData);
    assert.strictEqual(response.message, 'New account is registered.');
    await checkData(response.data, directoryID, userType[i], userID[i], userAddress[i], undefined, undefined);
  }

  // check whether user info registered successfully
  for (let i = 0; i < 4; i++) {
    response = await userRegistration.checkUserExist(directoryID, userType[i], userID[i], userAddress[i]);
    assert.strictEqual(response, true);
    response = await userRegistration.checkUserExist(directoryID, userType[i], undefined, userAddress[i]);
    assert.strictEqual(response, true);
    response = await userRegistration.checkUserExist(directoryID, userType[i], userID[i], undefined);
    assert.strictEqual(response, true);
  }
}

async function checkRetrieval(checkingList) {
  // test retrieveProviderAll()
  response = await userRegistration.retrieveProviderAll();
  assert.strictEqual(response.message, 'All provider registration information is retrieved.');
  assert.strictEqual(response.data.length, 2);
  for (let i = 0; i < 2; i++) {
    await checkData(response.data[i], directoryID, undefined, userID[i], userAddress[i], sha256(userPassword[i]).toString(), 0);
  }

  // test retrieveConsumerAll()
  response = await userRegistration.retrieveConsumerAll();
  assert.strictEqual(response.message, 'All consumer registration information is retrieved.');
  assert.strictEqual(response.data.length, 2);
  for (let i = 0; i < 2; i++) {
    await checkData(response.data[i], directoryID, undefined, userID[i + 2], userAddress[i + 2], sha256(userPassword[i + 2]).toString(), 0);
  }

  // test retrieveByConditions()
  condition = {
    userID: undefined,
    userAddress: undefined
  };

  for (let i = 0; i < 2; i++) {
    response = await userRegistration.retrieveByConditions(directoryID, userType[2 * i], condition);
    assert.strictEqual(response.message, 'Registration information is retrieved conditionally.');
    assert.strictEqual(response.data.length, checkingList[0]);
  }

  for (let i = 0; i < 4; i++) {
    condition.userID = userID[i];
    condition.userAddress = undefined;
    response = await userRegistration.retrieveByConditions(directoryID, userType[i], condition);
    assert.strictEqual(response.message, 'Registration information is retrieved conditionally.');
    assert.strictEqual(response.data.length, checkingList[1]);
  }

  for (let i = 0; i < 4; i++) {
    condition.userID = undefined;
    condition.userAddress = userAddress[i];
    response = await userRegistration.retrieveByConditions(directoryID, userType[i], condition);
    assert.strictEqual(response.message, 'Registration information is retrieved conditionally.');
    assert.strictEqual(response.data.length, checkingList[2]);
  }

  for (let i = 0; i < 4; i++) {
    condition.userID = userID[i];
    condition.userAddress = userAddress[i];
    response = await userRegistration.retrieveByConditions(directoryID, userType[i], condition);
    assert.strictEqual(response.message, 'Registration information is retrieved conditionally.');
    assert.strictEqual(response.data.length, checkingList[3]);
  }
}

async function setConfirmation() {
  for (let i = 0; i < 4; i++) {
    try {
      response = await userRegistration.updateConfirmation(directoryID, userType[i], userID[i], userAddress[i]);
      assert.strictEqual(response.message, 'Account has been registered on blockchain.');
      assert.strictEqual(response.data.isConfirmed, true);
    } catch (error) {
      console.log(error);
      process.exit();
    }
  }
}

async function checkData(data, directoryID, userType, userID, userAddress, userPassword, isConfirmed) {
  assert.strictEqual(data.directoryID, directoryID);
  assert.strictEqual(data.userType, userType);
  assert.strictEqual(data.userID, userID);
  assert.strictEqual(data.userAddress, userAddress);
  assert.strictEqual(data.userPassword, userPassword);
  assert.strictEqual(data.isConfirmed, isConfirmed);
}

module.exports = main;
if (!module.parent)
  main();