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
// Author: Wesley Liu <Wesley_Liu@htc.com>
"use strict";

const minimist = require('minimist');
const Web3 = require('web3');
const solc = require('solc');
const fs = require('fs');
let config = require('../tests/data/test-config.json');
let args = minimist(process.argv.slice(1), {
  alias: {
    c: 'compile',
  }
});
let directoryContractData, directoryContractABI;

const web3 = new Web3(new Web3.providers.HttpProvider(config.ETHRPC_IP_PORT));

if (args.compile) {
  console.log('contract compiling...');
  const source = fs.readFileSync('./DXContract.sol', 'utf8');
  const output = solc.compile(source, 1);
  console.log(output);
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
      gas: config.GAS,
      gasPrice: config.GAS_PRICE
    }).on('receipt', (receipt) => {
      console.log('receipt contractAddress:' + receipt.contractAddress);
      config.CONTRACT_ADDR = receipt.contractAddress;
      config = JSON.stringify(config, null, 4);
      //replace \g  -> 
      //replace "[{ -> [{
      //replace }]" -> }]
      config = config.replace(/\\/g, "");
      config = config.replace(/"\[\{/g, "[{");
      config = config.replace(/\}\]"/g, "}]");
      fs.writeFileSync('../tests/data/test-config.json', config, "utf8", (err) => {
        if (err) throw err;
        console.log('The config file has been saved!');
      });
      fs.writeFileSync('../controllers/dxservice-config.json', config, "utf8", (err) => {
        if (err) throw err;
        console.log('The config file has been saved!');
      });
    }).on('error', console.error);
  }).catch((error) => {
    console.log('unlockAccount fail, error: ' + error);
  });