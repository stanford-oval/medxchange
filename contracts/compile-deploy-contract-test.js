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
// Author: Alison Lin <yslin1013@gmail.com>
//         Wesley Liu <Wesley_Liu@htc.com>

"use strict";

const minimist = require('minimist');
const Web3 = require('web3');
const solc = require('solc');
const fs = require('fs');
const debug = require('debug')('compile-contract');
const util = require('util');
let config = require('./test-config-samples.json');
/*
Choose a mode for contract compilation / deployment.
Compile contract: node compile-deploy-test-contract.js -c
Deploy & write config contract for Library testing: node compile-deploy-test-contract.js -l
Deploy & write config contract for API-Library testing: node compile-deploy-test-contract.js -a
*/
let args = minimist(process.argv.slice(1), {
  alias: {
    c: 'Compile',
    l: 'Library',
    a: 'API_Library'
  }
});
let directoryContractData, directoryContractABI;

const web3 = new Web3(new Web3.providers.HttpProvider(config.ETHRPC_IP_PORT));

if (args.Compile) {
  debug('contract compiling ... ');
  const source = fs.readFileSync('./contracts/MedX-Contract.sol', 'utf8');
  const output = solc.compile(source, 1);
  debug(util.inspect(output));
  directoryContractData = '0x' + output.contracts[':Directory'].bytecode;
  directoryContractABI = output.contracts[':Directory'].interface;
  config.Directory.CONTRACT_BYTECODE = directoryContractData;
  config.Directory.CONTRACT_ABI = directoryContractABI;
  config.EAS.CONTRACT_BYTECODE = '0x' + output.contracts[':EAS'].bytecode;
  config.EAS.CONTRACT_ABI = output.contracts[':EAS'].interface;
  directoryContractABI = JSON.parse(directoryContractABI);
} else {
  directoryContractData = config.Directory.CONTRACT_BYTECODE;
  directoryContractABI = config.Directory.CONTRACT_ABI;
}

web3.eth.personal.unlockAccount(config.COINBASE_ACCOUNT, config.PASSPHRASE, 0)
  .then((result) => {
    console.log('unlockAccount success');
    console.log('deploy contract');
    const Contract = new web3.eth.Contract(directoryContractABI);
    Contract.deploy({
      data: directoryContractData
    }).send({
      from: config.COINBASE_ACCOUNT,
      gas: config.createDirectory.GAS,
      gasPrice: config.GAS_PRICE,
      value: web3.utils.toWei("1000000", "ether")
    }).on('receipt', (receipt) => {
      console.log('receipt blockNumer:' + receipt.blockNumber);
      console.log('receipt contractAddress:' + receipt.contractAddress);
      config.BLOCK_TRACE_START = receipt.blockNumber;
      config.Directory.CONTRACT_ADDR = receipt.contractAddress.toLowerCase();
      let configStr = JSON.stringify(config, null, 2);
      configStr = configStr.replace(/\\/g, "");       // replace \g  -> 
      configStr = configStr.replace(/"\[\{/g, "[{");  // replace "[{ -> [{
      configStr = configStr.replace(/\}\]"/g, "}]");  // replace }]" -> }]
      if (args.Compile) {
        fs.writeFileSync('./tests/data/test-config.json', configStr, "utf8", (err) => {
          if (err) throw err;
          console.log('The config file has been saved (./tests/data/test-config.json)!');
        });
        fs.writeFileSync('./contracts/test-config-samples.json', configStr, "utf8", (err) => {
          if (err) throw err;
          console.log('The config file has been saved (./contracts/test-config-samples.json)!');
        });
        fs.writeFileSync('./controllers/medx-dev-config.json', configStr, "utf8", (err) => {
          if (err) throw err;
          console.log('The config file has been saved (./controllers/medx-dev-config.json)!');
        });
      } else if (args.Library) {
        fs.writeFileSync('./tests/data/test-config.json', configStr, "utf8", (err) => {
          if (err) throw err;
          console.log('The config file has been saved (./tests/data/test-config.json)!');
        });
      } else if (args.API_Library) {
        fs.writeFileSync('./controllers/medx-dev-config.json', configStr, "utf8", (err) => {
          if (err) throw err;
          console.log('The config file has been saved (./controllers/medx-dev-config.json)!');
        });
      } else {
        console.log('Choose a mode for contract compilation / deployment.');
        console.log('Compile contract: node compile-deploy-test-contract.js -c');
        console.log('Deploy & write config contract for Library testing: node compile-deploy-test-contract.js -l');
        console.log('Deploy & write config contract for API-Library testing: node compile-deploy-test-contract.js -a');
      }
    }).on('error', console.error);
  }).catch((error) => {
    console.log('unlockAccount fail, error: ' + error);
  });