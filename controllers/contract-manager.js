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
const util = require('util');
const fs = require('fs');
const debug = require('debug')('test:contract-manager');

module.exports = class ContractManager {
  constructor(config) {
    this._config = config;
    this._web3 = new Web3(new Web3.providers.HttpProvider(config.ETHRPC_IP_PORT));
  }

  async deployContract(options) {
    try {
      await this.unlockEthAccount(this._config.COINBASE_ACCOUNT, this._config.PASSPHRASE);
      const web3 = await this._web3;
      let result = await this._deployContract(
        web3, options.CONTRACT_ABI, 
        options.CONTRACT_BYTECODE, 
        options.GAS, 
        web3.utils.toWei(options.value, "ether")
      );
      debug('deployContract(1): ' + util.inspect(result));
      return result;
    } catch (error) {
      debug('deployContract(2): ' + (error.message));
      throw (error);
    }
  }

  async saveAddress(options) {
    try {
      let file = require(options.filePath);
      file[options.contractName].CONTRACT_ADDR = options.contractAddress;
      debug('saveAddress(1): ' + JSON.stringify(file));
      fs.writeFileSync(options.savePath, JSON.stringify(file, null, 2), "utf8", (err) => {
        if (err) throw err;
        debug('saveAddress(2): The contract address has been saved!');
      });
      let result = {
        message : "The contract address has been saved in " + options.savePath
      };
      return result;
    } catch (error) {
      debug('saveAddress(3): ' + (error.message));
      throw (error);
    }
  }

  async unlockEthAccount(address, password) {
    if (address === '' || address === undefined) {
      throw Error('The account of administrator is not defined.');
    } else if (password === '' || password === undefined) {
      throw Error('The account of administrator password is not defined.');
    } else {
      try {
        let web3 = await this._web3;
        let result = await web3.eth.personal.unlockAccount(address, password, 90);
        debug('unlockEthAccount(1): ' + util.inspect(result));
        return result;
      } catch (error) {
        debug('unlockEthAccount(2): ' + (error.message));
        throw Error('Could not decrypt key with given password');
      }
    }
  }

  _deployContract(web3, CONTRACT_ABI, CONTRACT_BYTECODE, GAS, value) {
    return new Promise((resolve, reject) => {
      const Contract = new web3.eth.Contract(CONTRACT_ABI);
      Contract.deploy({
        data: CONTRACT_BYTECODE
      }).send({
        from: this._config.COINBASE_ACCOUNT,
        gas: GAS,
        gasPrice: this._config.GAS_PRICE,
        value: value
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'Contract deployment transaction is received.',
          txHash: hash
        };
        debug('_deployContract(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'The contract is deployed successfully.',
          txHash: receipt.transactionHash,
          contractAddress: receipt.contractAddress
        };
        debug('_deployContract(2): ' + util.inspect(response));
        resolve(response);
      }).on('error', (error) => {
        debug('_deployContract(3): ' + (error.message));
        reject(error);
      });
    });
  }
};