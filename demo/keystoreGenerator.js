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

const Web3 = require('web3');
const fs = require('fs');

const seed = require('./fakeDataSeed.json');
const name = seed.keystoreUser;
const web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:54546"));

async function main() {
  console.log("Generating keystore file.");
  let temp, keystore, account = [];
  for (let i = 0; i < name.length; i++) {
    temp = web3.eth.accounts.create();
    keystore = web3.eth.accounts.encrypt(temp.privateKey, name[i] + name[i]);
    account[i] = {
      userType: (i < 4) ? 'provider' : 'consumer',
      userID: name[i],
      userAddress: temp.address.toLowerCase(),
      userPrivateKey: temp.privateKey.toLowerCase(),
      userPassword: name[i],
    };
    let userType = (i < 4) ? 'provider' : 'consumer';

    fs.writeFileSync('./demo/keystore/' + userType + '_' + `${name[i]}` + '.json', JSON.stringify(keystore, null, 2));
  }

  fs.writeFileSync('./demo/account.json', JSON.stringify(account, null, 2));
}

module.exports = main;
if (!module.parent)
  main();
web3.currentProvider.connection.close();