'use strict';

const assert = require('assert');
const sleep = require('system-sleep');
const Web3 = require('web3');
const moment = require('moment');

const request = require('../data/request.json');
const config = require('../data/test-config.json');
const MedXserver = require('../../controllers/eth-dxservice.js');
const medxDatabase = require('../../controllers/database');
const SyncManager = require('../../controllers/sync-manager');

const web3 = new Web3(new Web3.providers.HttpProvider(config.ETHRPC_IP_PORT));
const medXServer = new MedXserver(config, {});
const DIR_Database = new medxDatabase.DataDirectory(config.DIR_dbPath);
const SyncBlockchain = new SyncManager(config, medXServer);
const contract = new web3.eth.Contract(config.Directory.CONTRACT_ABI, config.Directory.CONTRACT_ADDR);

SyncBlockchain.syncDirectoryStorage();

async function main() {
  const provider = request.provider;
  const dataEntry = request.dataEntry;
  const dataEntryCreationDate = request.dataEntryCreationDate;
  let response;
  try {
    await deleteDIRDatabaseTables();

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
    sleep(1000);
  } catch (error) {
    console.log(error.message);
  }
}

async function deleteDIRDatabaseTables() {
  await DIR_Database.connect();
  await DIR_Database.db.run(`DELETE FROM dataDirectory`, (err) => {
    if (err) {
      console.log(err);
      throw (err);
    }
  });
  sleep(1000);
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

  dataEntry.signedTX = JSON.stringify(await web3.eth.accounts.signTransaction(transcaction_rawTx, provider.userPrivateKey));
  let response = await medXServer.DataEntryCreation(dataEntry);
  sleep(1000);
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

  request.signedTX = JSON.stringify(await web3.eth.accounts.signTransaction(transcaction_rawTx, provider.userPrivateKey));
  let response = await medXServer.DataEntryDeletion(request);
  assert.strictEqual(response.message, "Data entry has been deleted.");
  assert.strictEqual(response.data.isOffered, false);
  sleep(1000);
  return response;
}

async function dataQueryService(dataKey) {
  let response = await medXServer.DataQueryService({
    dataKey: dataKey
  });
  sleep(1000);
  return response;
}

async function dataEntryRetrievalByUserID(provider) {
  let response = await medXServer.DataEntryRetrievalByUserID({
    userID: provider.userID,
    userType: provider.userType
  });
  sleep(1000);
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