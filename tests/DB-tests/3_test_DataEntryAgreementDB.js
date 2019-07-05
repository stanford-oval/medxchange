"use strict";

const assert = require('assert');
const Database = require('../../controllers/database.js');
const sleep = require('system-sleep');
const dataEntryAgreement = new Database.DataEntryAgreement();
const d = new Date();
const time = d.getTime();
const month = 2592000000;
const directoryID = '0x33456780987987987';
const userType = ["provider", "provider", "provider", "provider", "consumer", "consumer", "consumer", "consumer"];
const userID = ['fe8', 'fe8', 'fe9', 'fe9', '5dd', '5dd', '5de', '5de'];
const userAddress = ['0x9fe8', '0x9fe8', '0x9fe9', '0x9fe9', '0x95dd', '0x95dd', '0x95de', '0x95de'];
const targetUserID = ['5dd', '5de', '5dd', '5de', 'fe8', 'fe9', 'fe8', 'fe9'];
const targetUserAddress = ['0x95dd', '0x95de', '0x95dd', '0x95de', '0x9fe8', '0x9fe9', '0x9fe8', '0x9fe9'];
const dataCertificate = ['certificate2', 'certificate3', 'certificate4', 'certificate5', 'certificate2', 'certificate4', 'certificate3', 'certificate5'];
const dataOfferPrice = [115, 160, 165, 210, 115, 165, 160, 210];
const dataEntryCreationTime = [time + 2000, time + 3000, time + 4000, time + 5000, time + 2000, time + 4000, time + 3000, time + 5000];
const dataExpirationDate = [time + 2 * month, time + 3 * month, time + 4 * month, time + 5 * month, time + 2 * month, time + 4 * month, time + 3 * month, time + 5 * month];
const acknowledgement = 'I agree.';

async function main() {

  let response;
  let inputData;
  let condition;

  //Delete database.
  await dataEntryAgreement.connect();
  try {
    await dataEntryAgreement.db.run(`DELETE FROM dataEntryAgreement`);
  } catch (error) {
    console.log(error);
  }
  sleep(1000);

  //testing writeDataEntry.
  for (let i = 0; i < 8; i++) {
    inputData = await genInput(userID[i], targetUserID[i], userType[i], dataCertificate[i], dataOfferPrice[i], dataExpirationDate[i], dataEntryCreationTime[i], acknowledgement);
    response = await dataEntryAgreement.writeDataEntryAgreement(directoryID, userAddress[i], targetUserAddress[i], inputData);
    assert.strictEqual(response.message, 'Data entry agreement is created and written successfully.');
    await checkData(response.data, userAddress[i], targetUserAddress[i], inputData);
  }

  //testing retrieveAll.
  response = await dataEntryAgreement.retrieveAll();
  assert.strictEqual(response.message, 'All data entry agreements are retrieved.');
  assert.strictEqual(response.data.length, 8);
  for (let i = 0; i < response.data.length; i++) {
    inputData = await genInput(userID[i], targetUserID[i], userType[i], dataCertificate[i], dataOfferPrice[i], dataExpirationDate[i], dataEntryCreationTime[i], acknowledgement);
    await checkData(response.data[i], userAddress[i], targetUserAddress[i], inputData);
  }

  //testing retrieveByconditions.

  condition = {
    userAddress: undefined,
    targetUserAddress: undefined,
    userType: undefined,
    dataCertificate: undefined
  };

  response = await dataEntryAgreement.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.message, 'Data entry agreement is retrieved conditionally.');
  assert.strictEqual(response.data.length, 8);
  for (let i = 0; i < response.data.length; i++) {
    inputData = await genInput(userID[i], targetUserID[i], userType[i], dataCertificate[i], dataOfferPrice[i], dataExpirationDate[i], dataEntryCreationTime[i], acknowledgement);
    await checkData(response.data[i], userAddress[i], targetUserAddress[i], inputData);
  }

  for (let i = 0; i < 4; i++) {
    condition.userAddress = userAddress[2 * i];
    response = await dataEntryAgreement.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.message, 'Data entry agreement is retrieved conditionally.');
    assert.strictEqual(response.data.length, 2);
    for (let j = 0; j < response.data.length; j++) {
      inputData = await genInput(userID[2 * i + j], targetUserID[2 * i + j], userType[2 * i + j], dataCertificate[2 * i + j], dataOfferPrice[2 * i + j], dataExpirationDate[2 * i + j], dataEntryCreationTime[2 * i + j], acknowledgement);
      await checkData(response.data[j], userAddress[2 * i + j], targetUserAddress[2 * i + j], inputData);
    }
  }

  // for (let i = 0; i < 4; i++) {
  //   condition.userAddress = undefined;
  //   condition.targetUserAddress = targetUserAddress[i],
  //   response = await dataEntryAgreement.retrieveByConditions(directoryID, condition);
  //   assert.strictEqual(response.message, 'Data entry agreement is retrieved conditionally.');
  //   assert.strictEqual(response.data.length, 2);
  //   for (let j = 0; j < response.data.length; j++) {
  //     console.log(i);
  //     console.log(j);
  //     inputData = await genInput(userID[2 * i + j], targetUserID[2 * i + j], userType[2 * i + j], dataCertificate[2 * i + j], dataOfferPrice[2 * i + j], dataExpirationDate[2 * i + j], dataEntryCreationTime[2 * i + j], acknowledgement);
  //     await checkData(response.data[j], userAddress[2 * i + j], targetUserAddress[2 * i + j], inputData);
  //   }
  // }

 



}

async function checkData(data, userAddress, targetUserAddress, inputData) {
  assert.strictEqual(data.userID, inputData.userID);
  assert.strictEqual(data.targetUserID, inputData.targetUserID);
  assert.strictEqual(data.userAddress, userAddress);
  assert.strictEqual(data.targetUserAddress, targetUserAddress);
  assert.strictEqual(data.userType, inputData.userType);
  assert.strictEqual(data.dataCertificate, inputData.dataCertificate);
  assert.strictEqual(data.dataOfferPrice, inputData.dataOfferPrice);
  assert.strictEqual(data.dataExpirationDate, inputData.dataExpirationDate);
  assert.strictEqual(data.dataEntryCreationTime, inputData.dataEntryCreationTime);
  // assert.strictEqual(data.acknowledgement, inputData.acknowledgement);
}

async function genInput(userID, targetUserID, userType, dataCertificate, dataOfferPrice, dataExpirationDate, dataEntryCreationTime, acknowledgement) {
  let inputData = {
    userID: userID,
    targetUserID: targetUserID,
    userType: userType,
    dataCertificate: dataCertificate,
    dataOfferPrice: dataOfferPrice,
    dataExpirationDate: dataExpirationDate,
    dataEntryCreationTime: dataEntryCreationTime,
    acknowledgement: acknowledgement,
  };

  return inputData;
}

module.exports = main;
if (!module.parent)
  main();