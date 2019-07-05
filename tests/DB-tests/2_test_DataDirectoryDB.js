"use strict";

const assert = require('assert');
const Database = require('../../controllers/database.js');
const sleep = require('system-sleep');
const dataDirectory = new Database.DataDirectory();
const directoryID = '0x33456780987987987';
const d = new Date();
const time = d.getTime();
const month = 2592000000;
const dataProviderID = ["provider1", "provider1", "provider1", "provider2", "provider2", "provider2"];
const dataProviderAddress = ["0x9014fa6e81ecf8d81af8b1a0965ed63f41c2bfe8", "0x9014fa6e81ecf8d81af8b1a0965ed63f41c2bfe8", "0x9014fa6e81ecf8d81af8b1a0965ed63f41c2bfe8", "0x9014fa6e81ecf8d81af8b1a0965ed63f41c2bfe9", "0x9014fa6e81ecf8d81af8b1a0965ed63f41c2bfe9", "0x9014fa6e81ecf8d81af8b1a0965ed63f41c2bfe9"];
const dataCertificate = ['certificate1', 'certificate2', 'certificate3', 'certificate4', 'certificate5', 'certificate6'];
const dataOwnerCode = ['owner1', 'owner2', 'owner3', 'owner4', 'owner5', 'owner6'];
const dataEntryTitle = ['dataEntryTitle1', 'dataEntryTitle2', 'dataEntryTitle3', 'dataEntryTitle4', 'dataEntryTitle5', 'dataEntryTitle6'];
const dataDescription = ['description1', 'description2', 'description3', 'description4', 'description5', 'description6'];
const dataAccessPath = ['accessPath1', 'accessPath2', 'accessPath3', 'accessPath4', 'accessPath5', 'accessPath6'];
const dataOfferPrice = [110, 115, 160, 165, 210, 215];
const dataEntryDueDate = [time + 1 * month, time + 2 * month, time + 3 * month, time + 4 * month, time + 5 * month, time + 6 * month];
const dataEntryCreationTime = [time + 1000, time + 2000, time + 3000, time + 4000, time + 5000, time + 6000];

async function main() {

  let response;
  let condition;
  let inputData;

  //Delete database.
  await dataDirectory.connect();
  try {
    await dataDirectory.db.run(`DELETE FROM dataDirectory`);
  } catch (error) {
    console.log(error);
  }
  sleep(1000);

  for (let i = 0; i < 6; i++) {
    response = await dataDirectory.checkExistByDataCertificate(directoryID, dataCertificate[i]);
    assert.strictEqual(response, false);
  }

  //testing writeDataEntry.
  for (let i = 0; i < 6; i++) {
    inputData = {
      dataCertificate: dataCertificate[i],
      dataOwnerCode: dataOwnerCode[i],
      dataEntryTitle: dataEntryTitle[i],
      dataDescription: dataDescription[i],
      dataAccessPath: dataAccessPath[i],
      dataOfferPrice: dataOfferPrice[i],
      dataEntryDueDate: dataEntryDueDate[i],
      dataEntryCreationTime: dataEntryCreationTime[i]
    }
    response = await dataDirectory.writeDataEntry(directoryID, dataProviderID[i], dataProviderAddress[i], inputData);
    assert.strictEqual(response.message, 'Data entry is created and written successfully.');
    await checkData(response.data, directoryID, dataProviderID[i], dataProviderAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i],
      dataDescription[i], dataAccessPath[i], dataOfferPrice[i], dataEntryDueDate[i], dataEntryCreationTime[i], true, false);
  }

  //check dataCertificate existence after writeDataEntry. 
  for (let i = 0; i < 6; i++) {
    response = await dataDirectory.checkExistByDataCertificate(directoryID, dataCertificate[i]);
    assert.strictEqual(response, true);
  }

  //testing retrieveAll. 
  response = await dataDirectory.retrieveAll();
  assert.strictEqual(response.message, 'All data entry information is retrieved.');
  for (let i = 0; i < 6; i++) {
    await checkData(response.data[i], directoryID, dataProviderID[i], dataProviderAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i],
      dataDescription[i], dataAccessPath[i], dataOfferPrice[i], dataEntryDueDate[i], dataEntryCreationTime[i], 1, 0);
  }

  //testing retrieveByDataCertificate. 
  for (let i = 0; i < 6; i++) {
    response = await dataDirectory.retrieveByDataCertificate(directoryID, dataCertificate[i]);
    assert.strictEqual(response.message, 'Data entry information is retrieved by data certificate.');
    assert.strictEqual(response.data.length, 1);
    await checkData(response.data[0], directoryID, dataProviderID[i], dataProviderAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i],
      dataDescription[i], dataAccessPath[i], dataOfferPrice[i], dataEntryDueDate[i], dataEntryCreationTime[i], 1, 0);
  }

  //testing updateConfirmation
  for (let i = 0; i < 6; i++) {
    try {
      response = await dataDirectory.updateConfirmation(directoryID, dataCertificate[i]);
      assert.strictEqual(response.message, 'Data entry has been created on blockchain.');
      assert.strictEqual(response.data.isConfirmed, true);
    } catch (error) {
      // console.log(error)
    }
  }

  //testing retrieveByConditions after updateConfirmation. 
  condition = {
    userID: undefined,
    userAddress: undefined,
    dataCertificate: undefined,
    dataOwnerCode: undefined,
    dataDescription: undefined,
    priceLowerBound: undefined,
    priceUpperBound: undefined
  }

  response = await dataDirectory.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.message, 'Data entry information is retrieved conditionally.');
  assert.strictEqual(response.data.length, 0);

  for (let i = 0; i < 2; i++) {
    condition.userID = dataProviderID[3 * i];
    response = await dataDirectory.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.message, 'Data entry information is retrieved conditionally.');
    assert.strictEqual(response.data.length, 3);
    for (let j = 0; j < response.data.length; j++) {
      await checkData(response.data[j], directoryID, dataProviderID[j + 3 * i], dataProviderAddress[j + 3 * i], dataCertificate[j + 3 * i], dataOwnerCode[j + 3 * i], dataEntryTitle[j + 3 * i],
        dataDescription[j + 3 * i], dataAccessPath[j + 3 * i], dataOfferPrice[j + 3 * i], dataEntryDueDate[j + 3 * i], dataEntryCreationTime[j + 3 * i], 1, 1);
    }
  }

  for (let i = 0; i < 2; i++) {
    condition.userID = undefined;
    condition.userAddress = dataProviderAddress[3 * i];
    response = await dataDirectory.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.message, 'Data entry information is retrieved conditionally.');
    assert.strictEqual(response.data.length, 3);
    for (let j = 0; j < response.data.length; j++) {
      await checkData(response.data[j], directoryID, dataProviderID[j + 3 * i], dataProviderAddress[j + 3 * i], dataCertificate[j + 3 * i], dataOwnerCode[j + 3 * i], dataEntryTitle[j + 3 * i],
        dataDescription[j + 3 * i], dataAccessPath[j + 3 * i], dataOfferPrice[j + 3 * i], dataEntryDueDate[j + 3 * i], dataEntryCreationTime[j + 3 * i], 1, 1);;
    }
  }

  for (let i = 0; i < 6; i++) {
    condition.userAddress = undefined;
    condition.dataCertificate = dataCertificate[i];
    response = await dataDirectory.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.message, 'Data entry information is retrieved conditionally.');
    assert.strictEqual(response.data.length, 1);
    await checkData(response.data[0], directoryID, dataProviderID[i], dataProviderAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i],
      dataDescription[i], dataAccessPath[i], dataOfferPrice[i], dataEntryDueDate[i], dataEntryCreationTime[i], 1, 1);
  }

  for (let i = 0; i < 6; i++) {
    condition.dataCertificate = undefined;
    condition.dataOwnerCode = dataOwnerCode[i];
    response = await dataDirectory.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.message, 'Data entry information is retrieved conditionally.');
    assert.strictEqual(response.data.length, 1);
    await checkData(response.data[0], directoryID, dataProviderID[i], dataProviderAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i],
      dataDescription[i], dataAccessPath[i], dataOfferPrice[i], dataEntryDueDate[i], dataEntryCreationTime[i], 1, 1);
  }

  for (let i = 0; i < 6; i++) {
    condition.dataOwnerCode = undefined;
    condition.dataDescription = dataDescription[i];
    response = await dataDirectory.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.message, 'Data entry information is retrieved conditionally.');
    assert.strictEqual(response.data.length, 1);
    await checkData(response.data[0], directoryID, dataProviderID[i], dataProviderAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i],
      dataDescription[i], dataAccessPath[i], dataOfferPrice[i], dataEntryDueDate[i], dataEntryCreationTime[i], 1, 1);
  }

  condition.dataDescription = undefined;
  condition.priceLowerBound = 116;
  response = await dataDirectory.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.message, 'Data entry information is retrieved conditionally.');
  assert.strictEqual(response.data.length, 4);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, dataProviderID[i + 2], dataProviderAddress[i + 2], dataCertificate[i + 2], dataOwnerCode[i + 2], dataEntryTitle[i + 2],
      dataDescription[i + 2], dataAccessPath[i + 2], dataOfferPrice[i + 2], dataEntryDueDate[i + 2], dataEntryCreationTime[i + 2], 1, 1);
  }

  condition.priceUpperBound = 166;
  response = await dataDirectory.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.message, 'Data entry information is retrieved conditionally.');
  assert.strictEqual(response.data.length, 2);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, dataProviderID[i + 2], dataProviderAddress[i + 2], dataCertificate[i + 2], dataOwnerCode[i + 2], dataEntryTitle[i + 2],
      dataDescription[i + 2], dataAccessPath[i + 2], dataOfferPrice[i + 2], dataEntryDueDate[i + 2], dataEntryCreationTime[i + 2], 1, 1);
  }

  condition.priceLowerBound = undefined;
  response = await dataDirectory.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.message, 'Data entry information is retrieved conditionally.');
  assert.strictEqual(response.data.length, 4);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, dataProviderID[i], dataProviderAddress[i], dataCertificate[i], dataOwnerCode[i], dataEntryTitle[i],
      dataDescription[i], dataAccessPath[i], dataOfferPrice[i], dataEntryDueDate[i], dataEntryCreationTime[i], 1, 1);
  }
  condition.priceUpperBound = undefined;

  //testing updateDataOfferStatus, retrieveAll and  retrieveByConditions simultaneously.
  for (let i = 0; i < 6; i++) {
    try {
      response = await dataDirectory.updateDataOfferStatus(directoryID, dataCertificate[i]);
      assert.strictEqual(response.message, 'Data entry has been deleted.');
      assert.strictEqual(response.data.dataOfferStatus, false);
      response = await dataDirectory.retrieveAll();
      assert.strictEqual(response.message, 'All data entry information is retrieved.');
      assert.strictEqual(response.data.length, 6);
      response = await dataDirectory.retrieveByConditions(directoryID, condition);
      assert.strictEqual(response.message, 'Data entry information is retrieved conditionally.');
      assert.strictEqual(response.data.length, 5 - i);
    } catch (error) {
      // console.log(error)
    }
  }
}

async function checkData(data, directoryID, dataProviderID, dataProviderAddress, dataCertificate, dataOwnerCode, dataEntryTitle,
  dataDescription, dataAccessPath, dataOfferPrice, dataEntryDueDate, dataEntryCreationTime, dataOfferStatus, isConfirmed) {
  assert.strictEqual(data.directoryID, directoryID);
  assert.strictEqual(data.dataProviderID, dataProviderID);
  assert.strictEqual(data.dataProviderAddress, dataProviderAddress);
  assert.strictEqual(data.dataCertificate, dataCertificate);
  assert.strictEqual(data.dataOwnerCode, dataOwnerCode);
  assert.strictEqual(data.dataEntryTitle, dataEntryTitle);
  assert.strictEqual(data.dataDescription, dataDescription);
  assert.strictEqual(data.dataAccessPath, dataAccessPath);
  assert.strictEqual(data.dataOfferPrice, dataOfferPrice);
  assert.strictEqual(data.dataEntryDueDate, dataEntryDueDate);
  assert.strictEqual(data.dataEntryCreationTime, dataEntryCreationTime);
  assert.strictEqual(data.dataOfferStatus, dataOfferStatus);
  assert.strictEqual(data.isConfirmed, isConfirmed);
}

module.exports = main;
if (!module.parent)
  main();