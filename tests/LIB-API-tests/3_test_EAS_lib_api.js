'use strict';

const request = require('request-promise');
const assert = require('assert');
const Web3 = require('web3');
const sleep = require('system-sleep');

const reqbody = require('../data/request.json');
const apiList = require('../../routes/apiList.json');
const config = require('../../controllers/medx-dev-config.json');
const medxDatabase = require('../../controllers/database');


const web3 = new Web3(new Web3.providers.HttpProvider(config.ETHRPC_IP_PORT));
const contract = new web3.eth.Contract(config.Directory.CONTRACT_ABI, config.Directory.CONTRACT_ADDR);
const AGR_Database = new medxDatabase.DataEntryAgreement(config.DIR_dbPath);
const EAS_Database = new medxDatabase.ExecutableAgreementScript(config.EAS_dbPath);

async function main() {
  const consumer = reqbody.consumer[0];
  const provider = reqbody.provider[0];
  const dataEntry = reqbody.dataEntry[0];
  const dataEntryCreationDate = reqbody.dataEntryCreationDate;
  let response;

  await deleteAGRAndEASDatabaseTables();

  response = await sendAgreement(consumer, provider, dataEntry, dataEntryCreationDate[1]);
  assert.strictEqual(response.message, 'Data entry agreement is created and written successfully.');

  response = await rejectAgreement(provider, consumer, dataEntry, dataEntryCreationDate[1]);
  assert.strictEqual(response.message, 'Data entry agreement is rejected successfully.');

  for (let i = 1; i < 5; i++) {
    response = await sendAgreement(consumer, provider, dataEntry, dataEntryCreationDate[i]);
    assert.strictEqual(response.message, 'Data entry agreement is created and written successfully.');

    response = await sendAgreement(provider, consumer, dataEntry, dataEntryCreationDate[i]);
    assert.strictEqual(response.message, 'EAS is created and deployed successfully.');
    sleep(500);
  }

  response = await revokeEAS(provider, consumer, dataEntry, dataEntryCreationDate[1]);
  assert.strictEqual(response.message, 'EAS has been revoked.');

  response = await revokeEAS(consumer, provider, dataEntry, dataEntryCreationDate[2]);
  assert.strictEqual(response.message, 'EAS has been revoked.');

  response = await invokeEAS(provider, consumer, dataEntry, dataEntryCreationDate[2], 'Failed');
  assert.strictEqual(response.message, 'Invocation log is written successfully. Download status: true, Validity status: false');

  response = await invokeEAS(provider, consumer, dataEntry, dataEntryCreationDate[3], 'downloaded');
  assert.strictEqual(response.message, 'Invocation log is written successfully. Download status: true, Validity status: true');

  sleep(1000);
  throw Error('Finish!');
}

async function deleteAGRAndEASDatabaseTables() {
  await AGR_Database.connect();
  await AGR_Database.db.run(`DELETE FROM dataEntryAgreement`, (err) => {
    if (err) {
      console.log(err);
      throw (err);
    }
  });

  await EAS_Database.connect();
  await EAS_Database.db.run(`DELETE FROM EAS`, (err) => {
    if (err) {
      console.log(err);
      throw (err);
    }
  });
  sleep(1000);
}

async function sendAgreement(from, to, dataEntry, dataEntryCreationDate) {
  const inputFields = {
    userType: from.userType,
    userID: from.userID,
    targetUserID: to.userID,
    userAddress: from.userAddress,
    targetUserAddress: to.userAddress,
    dataCertificate: dataEntry.dataCertificate,
    dataOfferPrice: dataEntry.dataOfferPrice,
    dataBiddingPrice: "100000000",
    EASExpirationDate: "2000000000",
    dataEntryCreationDate: dataEntryCreationDate,
    dataKey: dataEntryCreationDate.toString() + dataEntry.dataCertificate
  };

  const signedAgreement = await web3.eth.accounts.sign(JSON.stringify(inputFields), from.userPrivateKey);

  const options = {
    url: reqbody.url + apiList.DataEntryAgreement,
    rejectUnauthorized: false,
    form: signedAgreement
  };

  let response = await request.post(options);
  response = JSON.parse(response).result;
  return response;
}

async function rejectAgreement(from, to, dataEntry, dataEntryCreationDate) {
  const inputFields = {
    userType: from.userType,
    userID: from.userID,
    targetUserID: to.userID,
    userAddress: from.userAddress,
    targetUserAddress: to.userAddress,
    dataCertificate: dataEntry.dataCertificate,
    dataOfferPrice: dataEntry.dataOfferPrice,
    dataBiddingPrice: "100000000",
    EASExpirationDate: "2000000000",
    dataEntryCreationDate: dataEntryCreationDate,
    dataKey: dataEntryCreationDate.toString() + dataEntry.dataCertificate
  };

  const signedAgreement = await web3.eth.accounts.sign(JSON.stringify(inputFields), from.userPrivateKey);

  const options = {
    url: reqbody.url + apiList.DataEntryAgreementRejection,
    rejectUnauthorized: false,
    form: signedAgreement
  };

  let response = await request.post(options);
  response = JSON.parse(response).result;
  return response;
}

async function revokeEAS(from, to, dataEntry, dataEntryCreationDate) {
  let transaction_data;
  if (from.userType === 'provider') {
    transaction_data = await contract.methods.revokeEASbyProvider(
      dataEntryCreationDate.toString() + dataEntry.dataCertificate,
      to.userAddress
    ).encodeABI();
  } else if (from.userType === 'consumer') {
    transaction_data = await contract.methods.revokeEASbyConsumer(
      dataEntryCreationDate.toString() + dataEntry.dataCertificate
    ).encodeABI();
  } else {
    console.log('??');
  }

  const transcaction_rawTx = {
    from: from.userAddress,
    to: config.Directory.CONTRACT_ADDR,
    nonce: await web3.eth.getTransactionCount(from.userAddress),
    gasPrice: config.GAS_PRICE,
    gas: config.revokeEASbyProvider.GAS,
    data: transaction_data
  };

  const signedTX = JSON.stringify(await web3.eth.accounts.signTransaction(transcaction_rawTx, from.userPrivateKey));

  const options = {
    url: reqbody.url + apiList.EASRevocation,
    rejectUnauthorized: false,
    form: {
      userID: from.userID,
      signedTX: signedTX
    }
  };

  let response = await request.post(options);
  response = JSON.parse(response).result;
  return response;
}

async function invokeEAS(from, to, dataEntry, dataEntryCreationDate, downloadStatus) {
  const invocationRecord = new Date() + ',' + to.userID + ',' + dataEntryCreationDate.toString() + dataEntry.dataCertificate + ',' + downloadStatus;
  const transaction_data = await contract.methods.invokeEAS(
    dataEntryCreationDate.toString() + dataEntry.dataCertificate,
    invocationRecord
  ).encodeABI();

  const transcaction_rawTx = {
    from: from.userAddress,
    to: config.Directory.CONTRACT_ADDR,
    nonce: await web3.eth.getTransactionCount(from.userAddress),
    gasPrice: config.GAS_PRICE,
    gas: config.invokeEAS.GAS,
    data: transaction_data
  };

  dataEntry.signedTX = JSON.stringify(await web3.eth.accounts.signTransaction(transcaction_rawTx, from.userPrivateKey));

  const options = {
    url: reqbody.url + apiList.EASInvocation,
    rejectUnauthorized: false,
    form: dataEntry
  };

  let response = await request.post(options);
  response = JSON.parse(response).result;
  return response;
}
module.exports = main;
if (!module.parent)
  main();