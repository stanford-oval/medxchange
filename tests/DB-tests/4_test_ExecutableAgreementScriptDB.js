"use strict";

const sha256 = require('crypto-js/sha256');
const assert = require('assert');
const Database = require('../../controllers/database.js');
const sleep = require('system-sleep');
const EAS = new Database.ExecutableAgreementScript();
const directoryID = '0x33456780987987987';
const d = new Date();
const time = d.getTime();
const month = 2592000000;
const dataProviderID = ['fe8', 'fe8', 'fe9', 'fe9', '5dd', '5de', '5dd', '5de'];
const dataProviderAddress = ['0x9014fa6e81ecf8d81af8b1a0965ed63f41c2bfe8', '0x9014fa6e81ecf8d81af8b1a0965ed63f41c2bfe8', '0x9014fa6e81ecf8d81af8b1a0965ed63f41c2bfe9', '0x9014fa6e81ecf8d81af8b1a0965ed63f41c2bfe9'];
const dataConsumerID = ['5dd', '5de', '5dd', '5de', 'fe8', 'fe8', 'fe9', 'fe9'];
const dataConsumerAddress = ['0x9379cfca25b87f1607ca8c43fe84d97908e1e5dd', '0x9379cfca25b87f1607ca8c43fe84d97908e1e5de', '0x9379cfca25b87f1607ca8c43fe84d97908e1e5dd', '0x9379cfca25b87f1607ca8c43fe84d97908e1e5de'];
let oldEasId = ['', '', '', ''];
const newEasId = ['0x11', '0x12', '0x21', '0x22'];
const dataCertificate = ['certificate2', 'certificate3', 'certificate4', 'certificate5'];
const dataOwnerCode = ['owner2', 'owner3', 'owner4', 'owner5'];
const dataEntryTitle = ['dataEntryTitle2', 'dataEntryTitle3', 'dataEntryTitle4', 'dataEntryTitle5'];
const dataDescription = ['description2', 'description3', 'description4', 'description5'];
const dataAccessPath = ['accessPath2', 'accessPath3', 'accessPath4', 'accessPath5'];
const dataProviderAgreement = ['provider1Agreement', 'provider1Agreement', 'provider2Agreement', 'provider2Agreement'];
const dataConsumerAgreement = ['consumer1Agreement', 'consumer2Agreement', 'consumer1Agreement', 'consumer2Agreement'];
const dataOfferPrice = [115, 160, 165, 210];
const dataExpirationDate = [time + 2 * month, time + 3 * month, time + 4 * month, time + 5 * month];
const easDeploymentTime = [time + 2000, time + 3000, time + 4000, time + 5000];
for (let i = 0; i < 4; i++) {
  oldEasId[i] = sha256(dataProviderAddress[i] + dataConsumerAddress[i] + dataCertificate[i]).toString();
}

async function main() {

  let response;
  let condition;
  let request;

  //Delete database.
  await EAS.connect();
  try {
    await EAS.db.run(`DELETE FROM EAS`);
  } catch (error) {
    console.log(error);
  }
  sleep(1000);

  //testing writeEas
  for (let i = 0; i < 4; i++) {
    request = {
      easId: oldEasId[i],
      dataProviderID: dataProviderID[i],
      dataProviderAddress: dataProviderAddress[i],
      dataConsumerID: dataConsumerID[i],
      dataConsumerAddress: dataConsumerAddress[i],
      dataCertificate: dataCertificate[i],
      dataOwnerCode: dataOwnerCode[i],
      dataEntryTitle: dataEntryTitle[i],
      dataDescription: dataDescription[i],
      dataAccessPath: dataAccessPath[i],
      dataOfferPrice: dataOfferPrice[i],
      dataExpirationDate: dataExpirationDate[i],
      dataProviderAgreement: dataProviderAgreement[i],
      dataConsumerAgreement: dataConsumerAgreement[i],
      easDeploymentTime: easDeploymentTime[i]
    };

    response = await EAS.writeEas(directoryID, request);
    assert.strictEqual(response.message, 'EAS is created and deployed successfully.');
    await checkData(response.data, directoryID, oldEasId[i], dataProviderID[i], dataProviderAddress[i], dataConsumerID[i], dataConsumerAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i], dataDescription[i],
      dataAccessPath[i], dataOfferPrice[i], dataExpirationDate[i], dataProviderAgreement[i], dataConsumerAgreement[i], easDeploymentTime[i], true, false);
  }

  //testing retrieveAll. 
  response = await EAS.retrieveAll();
  assert.strictEqual(response.message, 'All EAS information is retrieved.');
  assert.strictEqual(response.data.length, 4);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, oldEasId[i], dataProviderID[i], dataProviderAddress[i], dataConsumerID[i], dataConsumerAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i], dataDescription[i],
      dataAccessPath[i], dataOfferPrice[i], dataExpirationDate[i], dataProviderAgreement[i], dataConsumerAgreement[i], easDeploymentTime[i], 1, 0);
  }

  //testing updateEasId. 
  for (let i = 0; i < 4; i++) {
    try {
      response = await EAS.updateEasId(directoryID, oldEasId[i], newEasId[i]);
      assert.strictEqual(response.message, 'EasId has been updated in database.');
      assert.strictEqual(response.data.isUpdated, true);
    } catch (error) {
      // console.log(error);
    }
  }

  //testing updateConfirmation. 
  for (let i = 0; i < 4; i++) {
    try {
      response = await EAS.updateConfirmation(directoryID, newEasId[i]);
      assert.strictEqual(response.message, 'EAS has been created on blockchain.');
      assert.strictEqual(response.data.isConfirmed, true);
    } catch (error) {
      // console.log(error);
    }
  }

  //testing retrieveByConditions. 
  condition = {
    dataProviderAddress: undefined,
    dataConsumerAddress: undefined,
    dataCertificate: undefined,
    easId: undefined,
  };

  response = await EAS.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.message, 'EAS information is retrieved conditionally.');
  assert.strictEqual(response.data.length, 4);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, newEasId[i], dataProviderID[i], dataProviderAddress[i], dataConsumerID[i], dataConsumerAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i], dataDescription[i],
      dataAccessPath[i], dataOfferPrice[i], dataExpirationDate[i], dataProviderAgreement[i], dataConsumerAgreement[i], easDeploymentTime[i], 1, 1);
  }

  for (let j = 0; j < 2; j++) {
    condition.dataProviderAddress = dataProviderAddress[2 * j];
    response = await EAS.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.message, 'EAS information is retrieved conditionally.');
    assert.strictEqual(response.data.length, 2);
    for (let i = 0; i < response.data.length; i++) {
      await checkData(response.data[i], directoryID, newEasId[2 * j + i], dataProviderID[2 * j + i], dataProviderAddress[2 * j + i], dataConsumerID[2 * j + i], dataConsumerAddress[2 * j + i], dataCertificate[2 * j + i], dataOwnerCode[2 * j + i], dataEntryTitle[2 * j + i], dataDescription[2 * j + i],
        dataAccessPath[2 * j + i], dataOfferPrice[2 * j + i], dataExpirationDate[2 * j + i], dataProviderAgreement[2 * j + i], dataConsumerAgreement[2 * j + i], easDeploymentTime[2 * j + i], 1, 1);
    }
  }

  for (let j = 0; j < 2; j++) {
    condition.dataProviderAddress = undefined;
    condition.dataConsumerAddress = dataConsumerAddress[j];
    response = await EAS.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.message, 'EAS information is retrieved conditionally.');
    assert.strictEqual(response.data.length, 2);
    for (let i = 0; i < response.data.length; i++) {
      await checkData(response.data[i], directoryID, newEasId[j + 2 * i], dataProviderID[j + 2 * i], dataProviderAddress[j + 2 * i], dataConsumerID[j + 2 * i], dataConsumerAddress[j + 2 * i], dataCertificate[j + 2 * i], dataOwnerCode[j + 2 * i], dataEntryTitle[j + 2 * i], dataDescription[j + 2 * i],
        dataAccessPath[j + 2 * i], dataOfferPrice[j + 2 * i], dataExpirationDate[j + 2 * i], dataProviderAgreement[j + 2 * i], dataConsumerAgreement[j + 2 * i], easDeploymentTime[j + 2 * i], 1, 1);
    }
  }

  for (let i = 0; i < 4; i++) {
    condition.dataConsumerAddress = undefined;
    condition.dataCertificate = dataCertificate[i];
    response = await EAS.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.message, 'EAS information is retrieved conditionally.');
    assert.strictEqual(response.data.length, 1);
    await checkData(response.data[0], directoryID, newEasId[i], dataProviderID[i], dataProviderAddress[i], dataConsumerID[i], dataConsumerAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i], dataDescription[i],
      dataAccessPath[i], dataOfferPrice[i], dataExpirationDate[i], dataProviderAgreement[i], dataConsumerAgreement[i], easDeploymentTime[i], 1, 1);
  }

  for (let i = 0; i < 4; i++) {
    condition.dataCertificate = undefined;
    condition.easId = newEasId[i];
    response = await EAS.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.message, 'EAS information is retrieved conditionally.');
    assert.strictEqual(response.data.length, 1);
    await checkData(response.data[0], directoryID, newEasId[i], dataProviderID[i], dataProviderAddress[i], dataConsumerID[i], dataConsumerAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i], dataDescription[i],
      dataAccessPath[i], dataOfferPrice[i], dataExpirationDate[i], dataProviderAgreement[i], dataConsumerAgreement[i], easDeploymentTime[i], 1, 1);
  }

  //testing updateDataValidityStatus retrieveByConditions retrieveAll simultaneously.
  for (let i = 0; i < 4; i++) {
    try {
      response = await EAS.updateDataValidityStatus(directoryID, newEasId[i]);
      assert.strictEqual(response.message, 'EAS has been revoked.');
      assert.strictEqual(response.data.dataValidityStatus, false);
      condition.easId = newEasId[i];
      response = await EAS.retrieveByConditions(directoryID, condition);
      assert.strictEqual(response.message, 'EAS information is retrieved conditionally.');
      assert.strictEqual(response.data.length, 0);
      response = await EAS.retrieveAll();
      assert.strictEqual(response.message, 'All EAS information is retrieved.');
      assert.strictEqual(response.data[i].dataValidityStatus, 0);
    } catch (error) {
      // console.log(error)
    }
  }
}

async function checkData(data, directoryID, easId, dataProviderID, dataProviderAddress, dataConsumerID, dataConsumerAddress, dataCertificate, dataOwnerCode, dataEntryTitle, dataDescription,
  dataAccessPath, dataOfferPrice, dataExpirationDate, dataProviderAgreement, dataConsumerAgreement, easDeploymentTime, dataValidityStatus, isConfirmed) {
  assert.strictEqual(data.directoryID, directoryID);
  assert.strictEqual(data.easId, easId);
  assert.strictEqual(data.dataProviderID, dataProviderID);
  assert.strictEqual(data.dataProviderAddress, dataProviderAddress);
  assert.strictEqual(data.dataConsumerID, dataConsumerID);
  assert.strictEqual(data.dataConsumerAddress, dataConsumerAddress);
  assert.strictEqual(data.dataCertificate, dataCertificate);
  assert.strictEqual(data.dataOwnerCode, dataOwnerCode);
  assert.strictEqual(data.dataEntryTitle, dataEntryTitle);
  assert.strictEqual(data.dataDescription, dataDescription);
  assert.strictEqual(data.dataAccessPath, dataAccessPath);
  assert.strictEqual(data.dataOfferPrice, dataOfferPrice);
  assert.strictEqual(data.dataExpirationDate, dataExpirationDate);
  assert.strictEqual(data.dataProviderAgreement, dataProviderAgreement);
  assert.strictEqual(data.dataConsumerAgreement, dataConsumerAgreement);
  assert.strictEqual(data.easDeploymentTime, easDeploymentTime);
  assert.strictEqual(data.dataValidityStatus, dataValidityStatus);
  assert.strictEqual(data.isConfirmed, isConfirmed);
}

module.exports = main;
if (!module.parent)
  main();