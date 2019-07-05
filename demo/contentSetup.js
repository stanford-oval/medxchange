// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 2 -*-
//
// This file is part of medx-server
//
// Copyright 2019 DeepQ
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Chihyen Liu <Chihyen_Liu@htc.com>

'use strict';

const Web3 = require('web3');
const sleep = require('system-sleep');
const request = require('request-promise');
const sha256 = require('crypto-js/sha256');

const account = require('./account.json');
const dataEntry = require('./fake-data-entry.json');
const config = require('../controllers/medx-config.json');
const apiList = require('../routes/apiList.json');
const medxDatabase = require('../controllers/database.js');

const web3 = new Web3(new Web3.providers.HttpProvider(config.ETHRPC_IP_PORT));
const contract = new web3.eth.Contract(config.Directory.CONTRACT_ABI, config.Directory.CONTRACT_ADDR);
const UR_Database = new medxDatabase.UserRegistration(config.UR_dbPath);
const DIR_Database = new medxDatabase.DataDirectory(config.DIR_dbPath);
const EAS_Database = new medxDatabase.DataDirectory(config.EAS_dbPath);

const url = "https://localhost:9000";

async function main() {
  try {
    console.log("Running User Registration.");
    for (let i = 0; i < 8; i++) {
      let userType = (i < 4) ? 'provider' : 'consumer';
      await userRegistration(userType, account[i]);
    }
    await checkConfirmation('UR', );

    console.log("Running Data Entry Creation.");
    for (let i = 0; i < 5; i++) {
      await dataEntryCreation(account[2], dataEntry[i]);
      await dataEntryCreation(account[1], dataEntry[100 + i]);
      await dataEntryCreation(account[0], dataEntry[200 + i]);
      await checkConfirmation('DEC', [i, 100 + i, 200 + i]);
    }

    console.log("Running Send Agreement & Deploy EAS.");
    for (let i = 0; i < 5; i++) {
      await sendAgreement(account[4], account[2], dataEntry[i]);
      await sendAgreement(account[5], account[2], dataEntry[i]);
      await sendAgreement(account[6], account[2], dataEntry[i]);
      await sendAgreement(account[7], account[2], dataEntry[i]);
      sleep(1000);
      await sendAgreement(account[2], account[4], dataEntry[i]);
      await checkConfirmation('EAS', account[2]);
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function userRegistration(userType, userInfo) {
  const options = {
    url: url + apiList.UserRegistration,
    rejectUnauthorized: false,
    form: {
      userType: userType,
      userID: userInfo.userID,
      userAddress: userInfo.userAddress,
      userPassword: sha256(userInfo.userPassword).toString()
    }
  };

  let response = await request.post(options);
  response = JSON.parse(response).result;
  return response;
}

async function dataEntryCreation(provider, dataEntry) {
  const dataSummary = {
    dataEntryTitle: dataEntry.dataEntryTitle,
    dataCertificate: dataEntry.dataCertificate,
    dataOwnerCode: dataEntry.dataOwnerCode,
    dataDescription: dataEntry.dataDescription,
    dataAccessPath: "https://localhost:9000/downloads/",
    ageLowerBound: dataEntry.ageLowerBound,
    ageUpperBound: dataEntry.ageUpperBound,
    gender: dataEntry.gender
  };

  const transaction_data = await contract.methods.createDataEntry(
    dataEntry.dataKey,
    JSON.stringify(dataSummary),
    dataEntry.dataOfferPrice,
    dataEntry.dataEntryDueDate,
    dataEntry.dataEntryCreationDate
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
    url: url + apiList.DataEntryCreation,
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

async function sendAgreement(from, to, dataEntry) {

  const inputFields = {
    userType: from.userType,
    userID: from.userID,
    targetUserID: to.userID,
    userAddress: from.userAddress,
    targetUserAddress: to.userAddress,
    dataCertificate: dataEntry.dataCertificate,
    dataOfferPrice: dataEntry.dataOfferPrice,
    dataBiddingPrice: "150",
    EASExpirationDate: "1700000000",
    dataEntryCreationDate: dataEntry.dataEntryCreationDate,
    dataKey: dataEntry.dataKey
  };

  const signedAgreement = await web3.eth.accounts.sign(JSON.stringify(inputFields), from.userPrivateKey);

  const options = {
    url: url + apiList.DataEntryAgreement,
    rejectUnauthorized: false,
    form: signedAgreement
  };

  let response = await request.post(options);
  response = JSON.parse(response).result;
  return response;
}

async function checkConfirmation(type, input) {
  let response;
  if (type === 'UR') {
    response = await UR_Database.retrieveProviderAll();
    while (!response.data[3].isConfirmed) {
      response = await UR_Database.retrieveProviderAll();
      sleep(1000);
    }
    response = await UR_Database.retrieveConsumerAll();
    while (!response.data[3].isConfirmed) {
      response = await UR_Database.retrieveConsumerAll();
      sleep(1000);
    }
  } else if (type === 'DEC') {

    for (let index of input) {
      response = await DIR_Database.retrieveByConditions(config.Directory.CONTRACT_ADDR, {
        dataKey: dataEntry[index].dataKey
      }, {});
      while (!response.data[0].isConfirmed) {
        sleep(1000);
        response = await DIR_Database.retrieveByConditions(config.Directory.CONTRACT_ADDR, {
          dataKey: dataEntry[index].dataKey
        }, {});
      }
    }

  } else if (type === 'EAS') {
    response = await EAS_Database.retrieveByConditions(config.Directory.CONTRACT_ADDR, {
      dataConsumerID: input.userID
    }, {});
    for (let index of response.data) {
      while (!response.data[index].isConfirmed) {
        sleep(1000);
        response = await EAS_Database.retrieveByConditions(config.Directory.CONTRACT_ADDR, {
          dataConsumerID: input.userID
        }, {});
      }
    }

  }
}

module.exports = main;
if (!module.parent)
  main();