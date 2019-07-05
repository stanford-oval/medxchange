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

const Web3 = require('web3');
const fs = require('fs');
let config = require('./config-samples.json');

const web3 = new Web3(new Web3.providers.HttpProvider(config.ETHRPC_IP_PORT));

// MedX server configuration (needed when setup)
const MEDX_SERVER = 'https://localhost:9000';

web3.eth.personal.unlockAccount(config.COINBASE_ACCOUNT, config.PASSPHRASE, 0)
  .then((result) => {
    console.log('unlockAccount success');
    console.log('deploy contract');
    const Contract = new web3.eth.Contract(config.Directory.CONTRACT_ABI);
    Contract.deploy({
      data: config.Directory.CONTRACT_BYTECODE
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
      fs.writeFileSync('../controllers/medx-config.json', configStr, "utf8", (err) => {
        if (err) throw err;
        console.log('The config file has been saved (medx)!');
      });
      // MedX server configuration (needed when setup)
      config.MEDX_SERVER = MEDX_SERVER;
      delete config.SOCKET_PORT;
      delete config.COINBASE_ACCOUNT;
      delete config.PASSPHRASE;
      delete config.Directory.CONTRACT_BYTECODE;
      delete config.EAS.CONTRACT_BYTECODE;
      delete config.BLOCK_TRACE_OFFSET;
      delete config.BLOCK_TRACE_START;
      delete config.BLOCK_SYNC_INTERVAL;
      delete config.REMOVE_INTERVAL;
      config.createDataEntry.ABI = "createDataEntry(string,string,uint,uint,uint)";
      config.deleteDataEntry.ABI = "deleteDataEntry(string)";
      config.revokeEASbyProvider.ABI = "revokeEASbyProvider(string,address)";
      config.revokeEASbyConsumer.ABI = "revokeEASbyConsumer(string)";
      configStr = JSON.stringify(config, null, 2);
      configStr = configStr.replace(/\\/g, "");       // replace \g  -> 
      configStr = configStr.replace(/"\[\{/g, "[{");  // replace "[{ -> [{
      configStr = configStr.replace(/\}\]"/g, "}]");  // replace }]" -> }]
      fs.writeFileSync('../app/assets/medx.conf.json', configStr, "utf8", (err) => {
        if (err) throw err;
        console.log('The config file has been saved (web)!');
      });
      delete config.UR_dbPath;
      delete config.DIR_dbPath;
      delete config.AGR_dbPath;
      delete config.EAS_dbPath;
      delete config.EASI_dbPath;
      delete config.ATL_dbPath;
      delete config.BN_dbPath;
      delete config.COINBASE_ACCOUNT;
      delete config.PASSPHRASE;
      delete config.ETHRPC_IP_PORT;
      delete config.ETHWS_IP_PORT;
      delete config.BLOCK_TRACE_OFFSET;
      delete config.Directory.CONTRACT_BYTECODE;
      delete config.EAS.CONTRACT_BYTECODE;
      config.invokeEAS.ABI = "invokeEAS(string,string)";
      configStr = JSON.stringify(config, null, 2);
      configStr = configStr.replace(/\\/g, "");       // replace \g  -> 
      configStr = configStr.replace(/"\[\{/g, "[{");  // replace "[{ -> [{
      configStr = configStr.replace(/\}\]"/g, "}]");  // replace }]" -> }]
      fs.writeFileSync('../../medxchange-provider/controllers/dps-config.json', configStr, "utf8", (err) => {
        if (err) throw err;
        console.log('The config file has been saved (provider)!');
      });
    }).on('error', console.error);
  }).catch((error) => {
    console.log('unlockAccount fail, error: ' + error);
  });
