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

"use strict";

const sha256 = require('crypto-js/sha256');
const assert = require('assert');
const fs = require('fs');

const seed = require('./fakeDataSeed.json');
const medxDatabase = require('../controllers/database.js');
const medx_config = require('../controllers/medx-config.json');

const SF_Database = new medxDatabase.SmartFilter(medx_config.SF_dbPath);
const DIR_Database = new medxDatabase.DataDirectory(medx_config.DIR_dbPath);

const directoryID = medx_config.Directory.CONTRACT_ADDR;
let fakeDataEntry = [];

async function main() {
  console.log("Generating fake data.");
  await generateFakeData();
  await writeDataEntry();
  await writeSmartFilter();
  await updateConfirmation();
  await checkDEC();
}

async function generateFakeData() {
  const dataAccessPath = seed.dataAccessPath;
  const diseaseObj = seed.disease;
  const userID = seed.userID;
  const gender = seed.gender;
  const M = 100;

  for (let diseaseName in diseaseObj) {
    const _disease = diseaseObj[diseaseName];
    const now = Math.ceil(new Date().getTime() / 1000);
    for (let i = 0; i < M; i++) {

      let newData = {
        userID: userID[rand(userID.length, 0)],
        dataAccessPath: dataAccessPath[rand(dataAccessPath.length, 0)] + now,
        dataOfferPrice: 100 + rand(100, 0),
        dataEntryDueDate: now + 100000000,
        dataEntryCreationDate: now + 1000 * i,
        dataEntryTitle: diseaseName + " 2016/" + rand(12, 1) + "/" + rand(28, 1) + "~2018/" + rand(12, 1) + "/" + rand(28, 1),
        ageLowerBound: 25 + rand(60, 0),
        gender: gender[rand(3, 0)]
      };

      newData.userAddress = "0x" + sha256(newData.userID).toString();
      newData.dataCertificate = sha256(newData.userAddress + i + diseaseName).toString();
      newData.dataOwnerCode = sha256(newData.userID).toString();
      newData.dataKey = newData.dataEntryCreationDate.toString() + newData.dataCertificate;
      newData.ageUpperBound = newData.ageLowerBound + rand(30, 0);
      newData.dataDescription = "";

      for (let filterName in _disease) {
        const _smartFilter = _disease[filterName];
        newData.dataDescription += filterName + ": " + _smartFilter[rand(_smartFilter.length, 0)] + ", ";
      }

      newData.dataDescription = newData.dataDescription.slice(0, -2);
      fakeDataEntry.push(newData);
    }
  }

  fs.writeFileSync('./demo/fake-data-entry.json', JSON.stringify(fakeDataEntry, null, 2));
}

async function writeDataEntry() {

  for (let i = 5; i < 100; i++) {
    try {
      await DIR_Database.writeDataEntry(
        directoryID,
        fakeDataEntry[i].userID,
        fakeDataEntry[i].userAddress,
        fakeDataEntry[i],
        "0x" + i
      );
    } catch (error) {
      console.log(error);
    }
  }
  for (let i = 105; i < 200; i++) {
    try {
      await DIR_Database.writeDataEntry(
        directoryID,
        fakeDataEntry[i].userID,
        fakeDataEntry[i].userAddress,
        fakeDataEntry[i],
        "0x" + i
      );
    } catch (error) {
      console.log(error);
    }
  }
  for (let i = 205; i < 300; i++) {
    try {
      await DIR_Database.writeDataEntry(
        directoryID,
        fakeDataEntry[i].userID,
        fakeDataEntry[i].userAddress,
        fakeDataEntry[i],
        "0x" + i
      );
    } catch (error) {
      console.log(error);
    }
  }
}

async function writeSmartFilter() {
  const smartFilterList = seed.smartFilterList;
  try {
    for (let disease in smartFilterList) {
      const filters = smartFilterList[disease];
      await SF_Database.writeSmartFilter(disease, filters);
    }
  } catch (error) {
    console.log(error);
  }
}

async function updateConfirmation() {
  for (let i = 5; i < 100; i++) {
    try {
      await DIR_Database.updateConfirmation(
        directoryID,
        "0x" + i
      );
    } catch (error) {
      console.log(error);
    }
  }
  for (let i = 105; i < 200; i++) {
    try {
      await DIR_Database.updateConfirmation(
        directoryID,
        "0x" + i
      );
    } catch (error) {
      console.log(error);
    }
  }
  for (let i = 205; i < 300; i++) {
    try {
      await DIR_Database.updateConfirmation(
        directoryID,
        "0x" + i
      );
    } catch (error) {
      console.log(error);
    }
  }
}

async function checkDEC() {
  const response = await DIR_Database.retrieveAll();
  assert.strictEqual(response.message, 'All data entry information is retrieved.');
  for (let i = 0; i < response.data.length; i++)
    assert.strictEqual(response.data[i].isConfirmed, 1);
}

function rand(input, startFrom) {
  const response = (Math.floor(Math.random() * input) + startFrom);
  return response;
}

module.exports = main;
if (!module.parent)
  main();