'use strict';

const request = require('request-promise');
const sleep = require('system-sleep');
const assert = require('assert');
const Web3 = require('web3');
const moment = require('moment');

const config = require('../../controllers/medx-dev-config.json');
const apiList = require('../../routes/apiList.json');
const medxDatabase = require('../../controllers/database');
const reqbody = require('../data/request.json');

const web3 = new Web3(new Web3.providers.HttpProvider(config.ETHRPC_IP_PORT));
const DIR_Database = new medxDatabase.DataDirectory(config.DIR_dbPath);
const contract = new web3.eth.Contract(config.Directory.CONTRACT_ABI, config.Directory.CONTRACT_ADDR);

async function main() {
  const provider = reqbody.provider;
  const dataEntry = reqbody.dataEntry;
  const dataEntryCreationDate = reqbody.dataEntryCreationDate;
  let response;
  try {
    await deleteDIRDatabase();

    response = await dataEntryCreation(provider[0], dataEntry[0], dataEntryCreationDate[0]);
    assert.strictEqual(response.message, "Data entry is created and written successfully.");

    response = await dataQueryService(dataEntryCreationDate[0].toString() + dataEntry[0].dataCertificate);
    assert.strictEqual(response.message, "Data entry list is retrieved from DQS.");
    assert.strictEqual(response.data[0].isOffered, 1);
    await checkDataEntry(response, provider[0], dataEntry[0], dataEntryCreationDate[0]);

    response = await dataEntryRetrievalByUserID(provider[0]);
    assert.strictEqual(response.message, 'Data entry list is retrieved by userID.');
    assert.strictEqual(response.data[0].isOffered, 1);
    await checkDataEntry(response, provider[0], dataEntry[0], dataEntryCreationDate[0]);

    response = await dataEntryDeletion(provider[0], dataEntry[0], dataEntryCreationDate[0]);
    assert.strictEqual(response.message, 'Data entry has been deleted.');

    response = await dataQueryService(dataEntryCreationDate[0].toString() + dataEntry[0].dataCertificate);
    assert.strictEqual(response.message, "Data entry list is retrieved from DQS.");
    assert.strictEqual(response.data.length, 0);

    response = await dataEntryRetrievalByUserID(provider[0]);
    assert.strictEqual(response.message, 'Data entry list is retrieved by userID.');
    assert.strictEqual(response.data[0].isOffered, 0);
    await checkDataEntry(response, provider[0], dataEntry[0], dataEntryCreationDate[0]);

    for (let i = 1; i < 5; i++) {
      response = await dataEntryCreation(provider[0], dataEntry[0], dataEntryCreationDate[i]);
      assert.strictEqual(response.message, "Data entry is created and written successfully.");

      response = await dataQueryService(dataEntryCreationDate[i].toString() + dataEntry[0].dataCertificate);
      assert.strictEqual(response.message, "Data entry list is retrieved from DQS.");
      assert.strictEqual(response.data[0].isOffered, 1);
      await checkDataEntry(response, provider[0], dataEntry[0], dataEntryCreationDate[i]);
    }

    response = await dataEntryRetrievalByUserID(provider[0]);
    assert.strictEqual(response.message, 'Data entry list is retrieved by userID.');
    assert.strictEqual(response.data.length, 5);
    assert.strictEqual(response.data[0].isOffered, 0);
    assert.strictEqual(response.data[1].isOffered, 1);
    assert.strictEqual(response.data[2].isOffered, 1);
    assert.strictEqual(response.data[3].isOffered, 1);
    assert.strictEqual(response.data[4].isOffered, 1);
    sleep(500);
  } catch (error) {
    console.log(error.message);
  }
}

async function deleteDIRDatabase() {
  await DIR_Database.connect();
  await DIR_Database.db.run(`DELETE FROM dataDirectory`, (err) => {
    if (err) {
      console.log(err);
      throw (err);
    }
  });
}

async function dataEntryCreation(provider, dataEntry, dataEntryCreationDate) {

  const transaction_data = await contract.methods.createDataEntry(
    dataEntryCreationDate.toString() + dataEntry.dataCertificate,
    JSON.stringify(dataEntry.dataSummary),
    dataEntry.dataOfferPrice,
    dataEntry.dataEntryDueDate,
    dataEntryCreationDate
  ).encodeABI();

  const transcaction_rawTx = {
    from: provider.userAddress,
    to: config.Directory.CONTRACT_ADDR,
    nonce: await web3.eth.getTransactionCount(provider.userAddress),
    gasPrice: config.GAS_PRICE,
    gas: config.createDataEntry.GAS,
    data: transaction_data
  };

  const options = {
    url: reqbody.url + apiList.DataEntryCreation,
    rejectUnauthorized: false,
    form: {
      userID: provider.userID,
      signedTX: JSON.stringify(await web3.eth.accounts.signTransaction(transcaction_rawTx, provider.userPrivateKey))
    }
  };

  let response = await request.post(options);
  response = JSON.parse(response).result;
  return response;
}

async function dataEntryDeletion(provider, dataEntry, dataEntryCreationDate) {
  const transaction_data = await contract.methods.deleteDataEntry(
    dataEntryCreationDate.toString() + dataEntry.dataCertificate,
  ).encodeABI();

  const transcaction_rawTx = {
    from: provider.userAddress,
    to: config.Directory.CONTRACT_ADDR,
    nonce: await web3.eth.getTransactionCount(provider.userAddress),
    gasPrice: config.GAS_PRICE,
    gas: config.deleteDataEntry.GAS,
    data: transaction_data
  };

  const options = {
    url: reqbody.url + apiList.DataEntryDeletion,
    rejectUnauthorized: false,
    form: {
      userID: provider.userID,
      signedTX: JSON.stringify(await web3.eth.accounts.signTransaction(transcaction_rawTx, provider.userPrivateKey))
    }
  };

  let response = await request.post(options);
  response = JSON.parse(response).result;
  return response;
}

async function dataQueryService(dataKey) {
  const options = {
    url: reqbody.url + apiList.DataQueryService + '?dataKey=' + dataKey,
    rejectUnauthorized: false,
    form: {}
  };

  let response = await request.get(options);
  response = JSON.parse(response).result;
  return response;
}

async function dataEntryRetrievalByUserID(provider) {
  const options = {
    url: reqbody.url + apiList.DataEntryRetrievalByUserID + '?userID=' + provider.userID + '&userType=' + provider.userType,
    rejectUnauthorized: false,
    form: {
      userID: provider.userID,
      userType: provider.userType,
    }
  };

  let response = await request.get(options);
  response = JSON.parse(response).result;
  return response;
}

async function checkDataEntry(response, provider, dataEntry, dataEntryCreationDate) {
  assert.strictEqual(response.data[0].dataProviderID, provider.userID);
  assert.strictEqual(response.data[0].dataProviderAddress, provider.userAddress);
  assert.strictEqual(response.data[0].dataKey, dataEntryCreationDate.toString() + dataEntry.dataCertificate);
  assert.strictEqual(response.data[0].dataCertificate, dataEntry.dataCertificate);
  assert.strictEqual(response.data[0].dataOwnerCode, dataEntry.dataOwnerCode);
  assert.strictEqual(response.data[0].dataEntryTitle, dataEntry.dataEntryTitle);
  assert.strictEqual(response.data[0].dataDescription, dataEntry.dataDescription);
  assert.strictEqual(response.data[0].dataAccessPath, dataEntry.dataAccessPath);
  assert.strictEqual(response.data[0].dataEntryCreationDate.toString(), moment.unix(parseInt(dataEntryCreationDate)).format('YYYY-MM-DD HH:mm:ss'));
  assert.strictEqual(response.data[0].dataOfferPrice.toString(), dataEntry.dataOfferPrice.toString());
  assert.strictEqual(response.data[0].dataEntryDueDate.toString(), moment.unix(parseInt(dataEntry.dataEntryDueDate)).format('YYYY-MM-DD HH:mm:ss'));
}
module.exports = main;
if (!module.parent)
  main();