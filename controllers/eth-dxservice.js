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
const debug = require('debug')('dxserver:eth-dxservice');
const stack = require('debug')('dxserver-stack:eth-dxservice');

const SQLiteDatabase = require('./sqlite-database');
const providerDatabase = new SQLiteDatabase.RegistrationDatabase('provider');
const consumerDatabase = new SQLiteDatabase.RegistrationDatabase('consumer');

module.exports = class DXserver {
  constructor(config) {
    this._config = config;
    this._web3 = new Web3(new Web3.providers.HttpProvider(config.ETHRPC_IP_PORT));
  }

  /*
    POST /directory/new/
      --> CreateNewDirectory()
        --> unlockEthAccount()
        --> _createNewDirectory()
        --> Contract.deploy() --> [ETHEREUM]
        --> result = { message, txHash, directoryID };
  */
  async CreateNewDirectory() {
    try {
      await this.unlockEthAccount(this._config.COINBASE_ACCOUNT, this._config.PASSPHRASE);
      const result = await this._createNewDirectory(this._web3);
      debug('CreateNewDirectory(1): ' + util.inspect(result));
      return result;
    } catch (error) {
      debug('CreateNewDirectory(2): ' + (error.message));
      stack('CreateNewDirectory(2): ' + (error.stack || error));
      throw Error(error);
    }
  }

  /*
    POST /user/register/
      --> UserRegistration()
        --> checkRegistrationFields() (REVISE NEEDED)
          --> (incorrect)
            --> error = xxxx is not defined.'
          --> (correct)
            --> checkContractExist()
            --> connectAndAccessDirectoryContract()
                --> (provider)
                  --> checkUserIdExist()
                  --> checkUserExistByUserId() --> [DATABASE]
                  --> (user does not exist)
                    --> createNewEthAccount()
                    --> unlockEthAccount()
                    --> _registerProvider()
                    --> contract.methods.registerProvider --> [ETHEREUM]
                    --> _sendETHToUser()
                    --> storeUserAccountInLocal()
                    --> result = { message };
                  --> (user exists)
                    --> error = 'user is already registered.'
                --> (consumer)
                  --> (user does not exist)
                    --> createNewEthAccount()
                    --> unlockEthAccount()
                    --> _registerConsumer()
                    --> contract.methods.registerConsumer --> [ETHEREUM]
                    --> _sendETHToUser()
                    --> storeUserAccountInLocal()
                    --> result = { message };
                  --> (user exists)
                    --> error = 'userID is already registered.'
                --> (otherwise)
                  --> error = 'user type is not defined.'
  */
  async UserRegistration(request) {
    if (request.directoryID === '' || request.directoryID === undefined) {
      throw Error('directoryID is not defined.');
    } else if (request.userType === '' || request.userType === undefined) {
      throw Error('userType is not defined.');
    } else if (request.userID === '' || request.userID === undefined) {
      throw Error('userID is not defined.');
    } else if (request.password === '' || request.password === undefined) {
      throw Error('password is not defined.');
    } else {
      try {
        await this.checkContractExist(request.directoryID, 'directory');
        let contract = await this.connectAndAccessDirectoryContract(request.directoryID);
        if (request.userType === 'provider') {
          if (!await this.checkUserIdExist(request)) {
            let newUserAddress = await this.createNewEthAccount(request);
            await this.unlockEthAccount(this._config.COINBASE_ACCOUNT, this._config.PASSPHRASE);
            let result = await this._registerProvider(contract, newUserAddress, request.userID);
            debug('UserRegistration(1): ' + util.inspect(result));
            await this._sendETHToUser(this._web3, newUserAddress, '10000');
            result = await this.storeUserAccountInLocal(request, newUserAddress);
            debug('UserRegistration(2): ' + util.inspect(result));
            return result;
          } else {
            debug('UserRegistration(3): ' + 'This userID is already registered as a provider.');
            throw Error('The userID is already registered as a provider.');
          }
        } else if (request.userType === 'consumer') {
          if (!await this.checkUserIdExist(request)) {
            let newUserAddress = await this.createNewEthAccount(request);
            await this.unlockEthAccount(this._config.COINBASE_ACCOUNT, this._config.PASSPHRASE);
            let result = await this._registerConsumer(contract, newUserAddress, request.userID);
            debug('UserRegistration(4): ' + util.inspect(result));
            await this._sendETHToUser(this._web3, newUserAddress, '100');
            result = await this.storeUserAccountInLocal(request, newUserAddress);
            debug('UserRegistration(5): ' + util.inspect(result));
            return result;
          } else {
            debug('UserRegistration(6): ' + 'This userID is already registered as a consumer.');
            throw Error('The userID is already registered as a consumer.');
          }
        } else {
          debug('UserRegistration(7): ' + 'The userType is not defined.');
          throw Error('The userType is not defined.');
        }
      } catch (error) {
        debug('UserRegistration(8): ' + (error.message));
        stack('UserRegistration(8): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  /*
    POST /entry/create/
      --> DataEntryCreation()
        --> checkCreationFields() (REVISE NEEDED)
          --> (incorrect)
            --> error = xxxx is not defined.'
          --> (correct)
            --> *set user type to provider
            --> checkContractExist()
            --> connectAndAccessDirectoryContract()
              --> checkUserIdExist()
              --> checkUserExistByUserId() --> [DATABASE]
                --> (user exists)
                  --> contract.methods.getDataEntryLocationByCertificate()
                    --> (data entry does not exist)
                      --> providerDatabase.retrieveUserAddressByDirectoryIdUserId() --> [DATABASE]
                      --> unlockEthAccount()
                      --> _createDataEntry()
                      --> contract.methods.createDataEntry() --> [ETHEREUM]
                      --> result = { message, txHash };
                    --> (data entry exists)
                      --> error = 'data certificate has been used.'
                --> (user does not exist)
                  --> error = 'user ID is not registered.'
  */
  async DataEntryCreation(request) {
    if (request.directoryID === '' || request.directoryID === undefined) {
      throw Error('directoryID is not defined.');
    } else if (request.userID === '' || request.userID === undefined) {
      throw Error('userID is not defined.');
    } else if (request.password === '' || request.password === undefined) {
      throw Error('password is not defined.');
    } else if (request.offerPrice === '' || request.offerPrice === undefined) {
      throw Error('offerPrice is not defined.');
    } else if (request.dueDate === '' || request.dueDate === undefined) {
      throw Error('dueDate is not defined.');
    } else if (request.dataCertificate === '' || request.dataCertificate === undefined) {
      throw Error('dataCertificate is not defined.');
    } else if (request.dataOwner === '' || request.dataOwner === undefined) {
      throw Error('dataOwner is not defined.');
    } else if (request.dataDescription === '' || request.dataDescription === undefined) {
      throw Error('dataDescription is not defined.');
    } else if (request.dataAccessPath === '' || request.dataAccessPath === undefined) {
      throw Error('accessPath is not defined.');
    } else {
      try {
        request.userType = 'provider';
        await this.checkContractExist(request.directoryID, 'directory');
        let contract = await this.connectAndAccessDirectoryContract(request.directoryID);
        if (await this.checkUserIdExist(request)) {
          let dataEntryExist = await contract.methods.getDataEntryLocationByCertificate(request.dataCertificate).call();
          if (dataEntryExist === '115792089237316195423570985008687907853269984665640564039457584007913129639935') {
            debug('dataEntryExist: ' + dataEntryExist);
            let account = await providerDatabase.retrieveUserAddressByDirectoryIdUserId(request.directoryID, request.userID);
            let userAddress = account[0].userAddress;
            let passphrase = request.userID + request.password;
            await this.unlockEthAccount(userAddress, passphrase);
            const description = {
              "dataOwner": request.dataOwner,
              "dataCertificate": request.dataCertificate,
              "dataDescription": request.dataDescription,
              "dataAccessPath": request.dataAccessPath
            };
            debug('DataEntryCreation(1)(description): ' + JSON.stringify(description));
            let result = await this._createDataEntry(
              contract,
              userAddress,
              request.offerPrice,
              request.dataCertificate,
              JSON.stringify(description),
              request.dueDate
            );
            debug('DataEntryCreation(2): ' + util.inspect(result));
            return result;
          } else {
            debug('DataEntryCreation(3): ' + 'The data certificate has been used.');
            throw Error('The data certificate has been used.');
          }
        } else {
          debug('DataEntryCreation(4): ' + 'The userID is not registered as a provider.');
          throw Error('The userID is not registered as a provider.');
        }
      } catch (error) {
        debug('DataEntryCreation(5): ' + (error.message));
        stack('DataEntryCreation(5): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  /*
    POST /entry/delete/
      --> DataEntryDeletion()
        --> checkCreationFields() (REVISE NEEDED)
          --> (incorrect)
            --> error = xxxx is not defined.'
          --> (correct)
            --> *set user type to provider
            --> checkContractExist()
            --> connectAndAccessDirectoryContract()
              --> checkUserIdExist()
              --> checkUserExistByUserId() --> [DATABASE]
                --> (user exists)
                  --> contract.methods.getDataEntryLocationByCertificate()
                    --> (data entry does not exist)
                      --> error = 'Wrong data certificate: the data entry does not exist.'
                    --> (data entry exists)
                      --> providerDatabase.retrieveUserAddressByDirectoryIdUserId() --> [DATABASE]
                      --> contract.methods.getDataEntryInfoByCertificate()
                      --> (user address is the data provider of the entry)
                        --> contract.methods.getDataEntryAdditionInfoByCertificate()
                        --> (the data entry is not deleted)
                          --> unlockEthAccount()
                          --> _deleteDataEntry()
                          --> contract.methods.deleteDataEntry() --> [ETHEREUM]
                          --> result = { message, txHash };
                        --> (the data entry is deleted)
                          --> error = 'The data entry  has been deleted.'
                      --> (user address is not the data provider of the entry)
                        --> error = 'The userID is not the data provider of the entry.'
                --> (user does not exist)
                  --> error = 'The userID is not registered as a provider.'
  */
  async DataEntryDeletion(request) {
    if (request.directoryID === '' || request.directoryID === undefined) {
      throw Error('directoryID is not defined.');
    } else if (request.userID === '' || request.userID === undefined) {
      throw Error('userID is not defined.');
    } else if (request.password === '' || request.password === undefined) {
      throw Error('password is not defined.');
    } else if (request.dataCertificate === '' || request.dataCertificate === undefined) {
      throw Error('dataCertificate is not defined.');
    } else {
      try {
        request.userType = 'provider';
        await this.checkContractExist(request.directoryID, 'directory');
        let contract = await this.connectAndAccessDirectoryContract(request.directoryID);
        if (await this.checkUserIdExist(request)) {
          let dataEntryExist = await contract.methods.getDataEntryLocationByCertificate(request.dataCertificate).call();
          if (dataEntryExist === '115792089237316195423570985008687907853269984665640564039457584007913129639935') {
            debug('DataEntryDeletion(1): ' + 'Wrong data certificate: the data entry does not exist.');
            throw Error('Wrong data certificate: the data entry does not exist.');
          } else {
            let account = await providerDatabase.retrieveUserAddressByDirectoryIdUserId(request.directoryID, request.userID);
            let userAddress = account[0].userAddress;
            let dataEntryInfo = await contract.methods.getDataEntryInfoByCertificate(request.dataCertificate).call();
            if (userAddress === dataEntryInfo[0]) {
              let dataEntryAdditionInfo = await contract.methods.getDataEntryAdditionInfoByCertificate(request.dataCertificate).call();
              if (dataEntryAdditionInfo[0]) {
                let passphrase = request.userID + request.password;
                await this.unlockEthAccount(userAddress, passphrase);
                let result = await this._deleteDataEntry(contract, userAddress, request.dataCertificate);
                debug('DataEntryDeletion(2): ' + util.inspect(result));
                return result;
              } else {
                debug('DataEntryDeletion(3): ' + 'The data entry has been deleted.');
                throw Error('The data entry has been deleted.');
              }
            } else {
              debug('DataEntryDeletion(4): ' + 'The userID is not the data provider of the entry.');
              throw Error('The userID is not the data provider of the entry.');
            }
          }
        } else {
          debug('DataEntryDeletion(5): ' + 'The userID is not registered as a provider.');
          throw Error('The userID is not registered as a provider.');
        }
      } catch (error) {
        debug('DataEntryDeletion(6): ' + (error.message));
        stack('DataEntryDeletion(7): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  /*
    POST /eas/deploy/
      --> EASDeployment()
        --> checkDeploymentFields() (REVISE NEEDED)
          --> (incorrect)
            --> error = xxxx is not defined.'
          --> (correct)
            --> *set user type to consumer
            --> checkContractExist()
            --> connectAndAccessDirectoryContract()
              --> checkUserIdExist()
              --> checkUserExistByUserId() --> [DATABASE]
                --> (user exists)
                  --> contract.methods.getDataEntryLocationByCertificate()
                    --> (data entry does not exist)
                      --> error = 'data entry does not exist.'
                    --> (data entry exists)
                      --> consumerDatabase.retrieveUserAddressByDirectoryIdUserId() --> [DATABASE]
                      --> unlockEthAccount()
                      --> _deployEAS()
                      --> contract.methods.deployEAS() --> [ETHEREUM]
                      --> contract.methods.getConsumerEASLocation() --> [ETHEREUM]
                      --> contract.methods.getDataEntryEASAddress() --> [ETHEREUM]
                      --> result = { message, txHash, EASID };
                --> (user does not exist)
                  --> error = 'user ID is not registered.'
  */
  async EASDeployment(request) {
    if (request.directoryID === '' || request.directoryID === undefined) {
      throw Error('directoryID is not defined.');
    } else if (request.userID === '' || request.userID === undefined) {
      throw Error('userID is not defined.');
    } else if (request.dataCertificate === '' || request.dataCertificate === undefined) {
      throw Error('dataCertificate is not defined.');
    } else if (request.expirationDate === '' || request.expirationDate === undefined) {
      throw Error('expirationDate is not defined.');
    } else if (request.providerAgreement === '' || request.providerAgreement === undefined) {
      throw Error('providerAgreement is not defined.');
    } else if (request.consumerAgreement === '' || request.consumerAgreement === undefined) {
      throw Error('consumerAgreement is not defined.');
    } else {
      try {
        request.userType = 'consumer';
        await this.checkContractExist(request.directoryID, 'directory');
        let contract = await this.connectAndAccessDirectoryContract(request.directoryID);
        if (await this.checkUserIdExist(request)) {
          let dataEntryExist = await contract.methods.getDataEntryLocationByCertificate(request.dataCertificate).call();
          if (dataEntryExist === '115792089237316195423570985008687907853269984665640564039457584007913129639935') {
            debug('DataEntryCreation(1): ' + 'Wrong data certificate: the data entry does not exist.');
            throw Error('Wrong data certificate: the data entry does not exist.');
          } else {
            let account = await consumerDatabase.retrieveUserAddressByDirectoryIdUserId(request.directoryID, request.userID);
            let userAddress = account[0].userAddress;
            await this.unlockEthAccount(this._config.COINBASE_ACCOUNT, this._config.PASSPHRASE);
            let result = await this._deployEAS(
              contract,
              userAddress,
              request.expirationDate,
              request.dataCertificate,
              request.providerAgreement,
              request.consumerAgreement
            );
            debug('EASDeployment(2): ' + util.inspect(result));
            let EASSN = await contract.methods.getConsumerEASLocation(request.dataCertificate, userAddress).call();
            debug('EASDeployment(3): ' + EASSN);
            let EASID = await contract.methods.getDataEntryEASAddress(request.dataCertificate, EASSN).call();
            debug('EASDeployment(4): ' + EASID);
            result['EASID'] = EASID;
            return result;
          }
        } else {
          debug('EASDeployment(5): ' + 'The userID is not registered as a consumer.');
          throw Error('The userID is not registered as a consumer.');
        }
      } catch (error) {
        debug('EASDeployment(6): ' + (error.message));
        stack('EASDeployment(6): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  /*
    POST /eas/invoke/
      --> EASInvocation()
        --> checkInvocationFields() (REVISE NEEDED)
          --> (incorrect)
            --> error = xxxx is not defined.'
          --> (correct)
            --> *set user type to provider
              --> checkUserIdExist()
              --> checkUserExistByUserId() --> [DATABASE]
                --> (user exists)
                  --> EASRetrievalAdditionInfo()
                  --> EASContract.methods.getDataEntryInfo() --> [ETHEREUM]
                  --> EASContract.methods.consumer() --> [ETHEREUM]
                  --> EASContract.methods.isValid() --> [ETHEREUM]
                  --> providerDatabase.retrieveUserAddressByDirectoryIdUserId() --> [DATABASE]
                    --> (user address is the data provider of the EAS)
                      --> checkContractExist()
                      --> connectAndAccessDirectoryContract()
                      --> unlockEthAccount()
                      --> _invokeEAS()
                      --> contract.methods.invokeEAS() --> [ETHEREUM]
                      --> result = { message, txHash };
                    --> (user address is not the data provider of the EAS)
                      --> error = 'user is not the data provider.'
                --> (user does not exist)
                  --> error = 'user ID is not registered.'

    [Example]
    EASInfo = {
    '0': '0x1d575c9163f8CC3CecaF53784d0D733B2Aa09308',         (providerAddress)
    '1': '100',                                                (offerPrice)
    '2': '{"dataOwner":"djv24-vj8942-49hv2hv58924vh-fv294v",   (dataEntryInfo)
          "dataCertificate":"49b45u9gm9042mg04b24jbj2=bj2=bj",
          "dataDescription":"pneumonia",
          "dataAccessPath":"https://directory/test/sql"}'
          }
    '3': '0x1e575c9163f8CC3CecaF53784d0D733B2Aa0933'           (consumerAddress)
  */
  async EASInvocation(request) {
    if (request.directoryID === '' || request.directoryID === undefined) {
      throw Error('directoryID is not defined.');
    } else if (request.userID === '' || request.userID === undefined) {
      throw Error('userID is not defined.');
    } else if (request.password === '' || request.password === undefined) {
      throw Error('password is not defined.');
    } else if (request.EASID === '' || request.EASID === undefined) {
      throw Error('EASID is not defined.');
    } else if (request.invocationLog === '' || request.invocationLog === undefined) {
      throw Error('invocationLog is not defined.');
    } else {
      try {
        request.userType = 'provider';
        await this.checkContractExist(request.directoryID, 'directory');
        let contract = await this.connectAndAccessDirectoryContract(request.directoryID);
        await this.checkContractExist(request.EASID, 'EAS');
        let EASInfo = await this.EASRetrievalAdditionInfo(request.EASID);
        if (await this.checkUserIdExist(request)) {
          let account = await providerDatabase.retrieveUserAddressByDirectoryIdUserId(request.directoryID, request.userID);
          let userAddress = account[0].userAddress;
          if (userAddress === EASInfo[0]) {
            let passphrase = request.userID + request.password;
            await this.unlockEthAccount(userAddress, passphrase);
            let result = await this._invokeEAS(contract, userAddress, JSON.parse(EASInfo[2]).dataCertificate, request.invocationLog);
            debug('EASInvocation(1): ' + util.inspect(result));
            return result;
          } else {
            throw Error('The user is not the data provider of the entry.');
          }
        } else {
          debug('EASInvocation(2): ' + 'The userID is not registered as a provider.');
          throw Error('The userID is not registered as a provider.');
        }
      } catch (error) {
        debug('EASInvocation(3): ' + (error.message));
        stack('EASInvocation(3): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  /*
    POST /eas/revoke/
      --> EASRevocation()
        --> checkRevocationFields() (REVISE NEEDED)
          --> (incorrect)
            --> error = xxxx is not defined.'
          --> (correct)
            --> EASRetrievalAdditionInfo()
            --> EASContract.methods.getDataEntryInfo() --> [ETHEREUM]
            --> EASContract.methods.consumer() --> [ETHEREUM]
            --> EASContract.methods.isValid() --> [ETHEREUM]
              --> (EAS is valid)
                --> checkContractExist()
                --> connectAndAccessDirectoryContract()
                --> (provider)
                  --> checkUserIdExist()
                  --> checkUserExistByUserId() --> [DATABASE]
                    --> (user exists)
                      --> providerDatabase.retrieveUserAddressByDirectoryIdUserId() --> [DATABASE]
                      --> (user address is the data provider of the EAS)
                        --> unlockEthAccount()
                        --> _revokeEASbyProvider()
                        --> contract.methods.revokeEASbyProvider() --> [ETHEREUM]
                        --> result = { message, txHash };
                      --> (user address is not the data provider of the EAS)
                        --> error = 'user is not the data provider.'
                    --> (user does not exist)
                      --> error = 'user ID is not registered as a provider.'
                --> (consumer)
                  --> checkUserIdExist()
                  --> checkUserExistByUserId() --> [DATABASE]
                    --> (user exists)
                      --> consumerDatabase.retrieveUserAddressByDirectoryIdUserId() --> [DATABASE]
                      --> (user address is the data consumer of the EAS)
                        --> unlockEthAccount()
                        --> _revokeEASbyConsumer()
                        --> contract.methods.revokeEASbyConsumer() --> [ETHEREUM]
                        --> result = { message, txHash };
                      --> (user address is not the data consumer of the EAS)
                        --> error = 'user is not the data consumer.'
                    --> (user does not exist)
                      --> error = 'user ID is not registered as a consumer.'
                --> (otherwise)
                  --> error = 'user type is not defined.'                
              --> (EAS is not valid)
                --> error = 'EAS has been revoked.'
  */
  async EASRevocation(request) {
    if (request.directoryID === '' || request.directoryID === undefined) {
      throw Error('directoryID is not defined.');
    } else if (request.userType === '' || request.userType === undefined) {
      throw Error('userType is not defined.');
    } else if (request.userID === '' || request.userID === undefined) {
      throw Error('userID is not defined.');
    } else if (request.password === '' || request.password === undefined) {
      throw Error('password is not defined.');
    } else if (request.EASID === '' || request.EASID === undefined) {
      throw Error('EASID is not defined.');
    } else {
      try {
        let userAddress;
        await this.checkContractExist(request.EASID, 'EAS');
        let EASInfo = await this.EASRetrievalAdditionInfo(request.EASID);
        if (EASInfo[4]) {
          await this.checkContractExist(request.directoryID, 'directory');
          let contract = await this.connectAndAccessDirectoryContract(request.directoryID);
          if (request.userType === 'provider') {
            if (await this.checkUserIdExist(request)) {
              let account = await providerDatabase.retrieveUserAddressByDirectoryIdUserId(request.directoryID, request.userID);
              userAddress = account[0].userAddress;
              if (userAddress === EASInfo[0]) {
                let passphrase = request.userID + request.password;
                await this.unlockEthAccount(userAddress, passphrase);
                let result = await this._revokeEASbyProvider(contract, userAddress, JSON.parse(EASInfo[2]).dataCertificate, EASInfo[3]);
                debug('EASRevocation(1): ' + util.inspect(result));
                return result;
              } else {
                debug('EASRevocation(2): ' + 'The userID is not the provider of the EAS.');
                throw Error('The userID is not the provider of the EAS.');
              }
            } else {
              debug('EASRevocation(3): ' + 'This userID is not registered as a provider');
              throw Error('The userID is not registered as a provider');
            }
          } else if (request.userType === 'consumer') {
            if (await this.checkUserIdExist(request)) {
              let account = await consumerDatabase.retrieveUserAddressByDirectoryIdUserId(request.directoryID, request.userID);
              userAddress = account[0].userAddress;
              if (userAddress === EASInfo[3]) {
                let passphrase = request.userID + request.password;
                await this.unlockEthAccount(userAddress, passphrase);
                let result = await this._revokeEASbyConsumer(contract, userAddress, JSON.parse(EASInfo[2]).dataCertificate);
                debug('EASRevocation(4): ' + util.inspect(result));
                return result;
              } else {
                debug('EASRevocation(5): ' + 'The userID is not the consumer of the EAS.');
                throw Error('The userID is not the consumer of the EAS.');
              }
            } else {
              debug('EASRevocation(6): ' + 'This userID is not registered as a consumer.');
              throw Error('The userID is not registered as a consumer.');
            }
          } else {
            debug('EASRevocation(7): ' + 'The userType is not defined.');
            throw Error('The userType is not defined.');
          }
        } else {
          throw Error('The EAS has been revoked.');
        }
      } catch (error) {
        debug('EASRevocation(9): ' + (error.message));
        stack('EASRevocation(9): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }


  /*
    GET /entry/count/
      --> DataEntryCount()
        --> checkCountFields() (REVISE NEEDED)
          --> (incorrect)
            --> error = xxxx is not defined.'
          --> (correct)
            --> checkContractExist()
              --> (contract exists)
                --> connectAndAccessDirectoryContract()
                --> contract.methods.getDataEntryCount() --> [ETHEREUM]
                --> result = { message, entryCount };
              --> (contract does not exist)
                --> error = 'directory ID does not exist.'
  */
  async DataEntryCount(request) {
    if (request.directoryID === '' || request.directoryID === undefined) {
      throw Error('directoryID is not defined.');
    } else {
      try {
        await this.checkContractExist(request.directoryID, 'directory');
        let contract = await this.connectAndAccessDirectoryContract(request.directoryID);
        let entryCount = await contract.methods.getDataEntryCount().call();
        let response = {
          message: 'Data entry count is retrieved.',
          entryCount: entryCount
        };
        debug('DataEntryCount(1): ' + util.inspect(response));
        return response;
      } catch (error) {
        debug('DataEntryCount(2): ' + (error.message));
        stack('DataEntryCount(2): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  /*
    GET /entry/index/
      --> DataEntryRetrievalByIndex()
        --> checkIndexFields() (REVISE NEEDED)
          --> (incorrect)
            --> error = xxxx is not defined.'
          --> (correct)
            --> checkContractExist()
              --> (contract exists)
                --> connectAndAccessDirectoryContract()
                --> DataEntryCount()
                  --> contract.methods.getDataEntryCount() --> [ETHEREUM]
                    --> (data entry index is in the boundary)
                      --> contract.methods.getDataEntryByIndex() --> [ETHEREUM]
                      --> providerDatabase.retrieveUserIdByDirectoryIdUserAddress --> [DATABASE]
                      --> result = { message, ... };
                    --> (data entry index is out of the boundary)
                      --> error = 'data entry index is out of boundary.'
              --> (contract does not exist)
                --> error = 'directory ID does not exist.'
  */
  async DataEntryRetrievalByIndex(request) {
    if (request.directoryID === '' || request.directoryID === undefined) {
      throw Error('directoryID is not defined.');
    } else if (request.index === '' || request.index === undefined) {
      throw Error('index is not defined.');
    } else {
      try {
        await this.checkContractExist(request.directoryID, 'directory');
        let contract = await this.connectAndAccessDirectoryContract(request.directoryID);
        let dataEntryCount = await this.DataEntryCount(request);
        if (parseInt(request.index) <= parseInt(dataEntryCount.entryCount) - 1) {
          let dataEntryInfo = await contract.methods.getDataEntryByIndex(request.index).call();
          let providerID = await providerDatabase.retrieveUserIdByDirectoryIdUserAddress(request.directoryID, dataEntryInfo[0]);
          let description = JSON.parse(dataEntryInfo[2]);
          let response = {
            message: 'Data entry is retrieved by index.',
            providerID: providerID[0].userID,
            offerPrice: dataEntryInfo[1],
            dataCertificate: description.dataCertificate,
            dataOwner: description.dataOwner,
            dataDescription: description.dataDescription,
            dataAccessPath: description.dataAccessPath,
            isSearched: dataEntryInfo[3],
            dueDate: dataEntryInfo[4],
            commitTime: dataEntryInfo[5]
          };
          debug('dataEntryRetrievalByIndex(1): ' + util.inspect(response));
          return response;
        } else {
          debug('dataEntryRetrievalByIndex(2): ' + 'Index of data entry is out of boundary.');
          throw Error('Index of data entry is out of boundary.');
        }
      } catch (error) {
        debug('dataEntryRetrievalByIndex(3): ' + (error.message));
        stack('dataEntryRetrievalByIndex(3): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  /*
    GET /entry/dctf/
      --> DataEntryRetrievalByDataCertificate()
        --> checkCertificateFields() (REVISE NEEDED)
          --> (incorrect)
            --> error = xxxx is not defined.'
          --> (correct)
            --> checkContractExist()
              --> (contract exists)
                --> connectAndAccessDirectoryContract()
                --> contract.methods.getDataEntryLocationByCertificate() --> [ETHEREUM]
                  --> (data entry does not exist)
                    --> error = 'data entry does not exist'
                  --> (data entry exists)
                    --> contract.methods.getDataEntryInfoByCertificate() --> [ETHEREUM]
                    --> contract.methods.getDataEntryAdditionInfoByCertificate() --> [ETHEREUM]
                    --> providerDatabase.retrieveUserIdByDirectoryIdUserAddress --> [DATABASE]
                    --> result = { message, ... };
              --> (contract does not exist)
                --> error = 'directory ID does not exist.'
  */
  async DataEntryRetrievalByDataCertificate(request) {
    if (request.directoryID === '' || request.directoryID === undefined) {
      throw Error('directoryID is not defined.');
    } else if (request.dataCertificate === '' || request.dataCertificate === undefined) {
      throw Error('dataCertificate is not defined.');
    } else {
      try {
        await this.checkContractExist(request.directoryID, 'directory');
        let contract = await this.connectAndAccessDirectoryContract(request.directoryID);
        let dataEntryExist = await contract.methods.getDataEntryLocationByCertificate(request.dataCertificate).call();
        if (dataEntryExist === '115792089237316195423570985008687907853269984665640564039457584007913129639935') {
          debug('DataEntryRetrievalByDataCertificate(1): ' + 'Wrong data certificate: the data entry does not exist.');
          throw Error('Wrong data certificate: the data entry does not exist.');
        } else {
          let dataEntryInfo = await contract.methods.getDataEntryInfoByCertificate(request.dataCertificate).call();
          let dataEntryAdditionInfo = await contract.methods.getDataEntryAdditionInfoByCertificate(request.dataCertificate).call();
          let providerID = await providerDatabase.retrieveUserIdByDirectoryIdUserAddress(request.directoryID, dataEntryInfo[0]);
          let description = JSON.parse(dataEntryInfo[2]);
          let response = {
            message: 'Data entry is retrieved by data certificate.',
            providerID: providerID[0].userID,
            offerPrice: dataEntryInfo[1],
            dataCertificate: description.dataCertificate,
            dataOwner: description.dataOwner,
            dataDescription: description.dataDescription,
            dataAccessPath: description.dataAccessPath,
            isSearched: dataEntryAdditionInfo[0],
            dueDate: dataEntryAdditionInfo[1],
            commitTime: dataEntryAdditionInfo[2],
          };
          debug('DataEntryRetrievalByDataCertificate(2): ' + util.inspect(response));
          return response;
        }
      } catch (error) {
        debug('DataEntryRetrievalByDataCertificate(3): ' + (error.message));
        stack('DataEntryRetrievalByDataCertificate(3): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  /*
    GET /eas/sid/
      --> EASRetrieval()
        --> checkEASFields() (REVISE NEEDED)
          --> (incorrect)
            --> error = xxxx is not defined.'
          --> (correct)
            --> checkContractExist()
              --> (contract exists)
                --> connectAndAccessEASContract()
                --> EASContract.methods.getDataEntryInfo() --> [ETHEREUM]
                --> EASContract.methods.directoryContractAddress() --> [ETHEREUM]
                --> EASContract.methods.getDataEntryAdditionInfoByCertificate() --> [ETHEREUM]
                --> providerDatabase.retrieveUserIdByDirectoryIdUserAddress --> [DATABASE]
                --> EASContract.methods.consumer() --> [ETHEREUM]
                --> consumerDatabase.retrieveUserIdByDirectoryIdUserAddress --> [DATABASE]
                --> result = { message, ... };
              --> (contract does not exist)
                --> error = 'directory ID does not exist.'
  */
  async EASRetrieval(request) {
    if (request.EASID === '' || request.EASID === undefined) {
      throw Error('EASID is not defined.');
    } else {
      try {
        await this.checkContractExist(request.EASID, 'EAS');
        let EASContract = await this.connectAndAccessEASContract(request.EASID);
        let EASInfo = await EASContract.methods.getDataEntryInfo().call();
        let directoryID = await EASContract.methods.directoryContractAddress().call();
        let consumerAddress = await EASContract.methods.consumer().call();
        let consumerID = await consumerDatabase.retrieveUserIdByDirectoryIdUserAddress(directoryID, consumerAddress);
        let providerID = await providerDatabase.retrieveUserIdByDirectoryIdUserAddress(directoryID, EASInfo[0]);
        let description = JSON.parse(EASInfo[2]);
        let response = {
          message: 'EAS is retrieved by EASID.',
          consumerID: consumerID[0].userID,
          providerID: providerID[0].userID,
          offerPrice: EASInfo[1],
          dataCertificate: description.dataCertificate,
          dataOwner: description.dataOwner,
          dataDescription: description.dataDescription,
          dataAccessPath: description.dataAccessPath,
          expirationDate: await EASContract.methods.EASExpiration().call(),
          deploymentTime: await EASContract.methods.deploymentTime().call(),
          providerAgreement: await EASContract.methods.providerAgreement().call(),
          consumerAgreement: await EASContract.methods.consumerAgreement().call(),
          isValid: await EASContract.methods.isValid().call()
        };
        debug('EASRetrieval(1): ' + util.inspect(response));
        return response;
      } catch (error) {
        debug('EASRetrieval(2): ' + (error.message));
        stack('EASRetrieval(2): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  async EASRetrievalAdditionInfo(EASID) {
    try {
      let EASContract = await this.connectAndAccessEASContract(EASID);
      let EASInfo = await EASContract.methods.getDataEntryInfo().call();
      let consumer = await EASContract.methods.consumer().call();
      let isValid = await EASContract.methods.isValid().call();
      EASInfo[3] = consumer;
      EASInfo[4] = isValid;
      debug('EASRetrievalAdditionInfo(1): ' + util.inspect(EASInfo));
      return EASInfo;
    } catch (error) {
      debug('EASRetrievalAdditionInfo(2): ' + (error.message));
      stack('EASRetrievalAdditionInfo(2): ' + (error.stack || error));
      throw Error(error);
    }
  }

  async RetriveLocalDatabase() {
    try {
      const providerResult = await providerDatabase.retrieveAll();
      const consumerResult = await consumerDatabase.retrieveAll();
      debug('RetriveLocalDatabase(1): ' + util.inspect(providerResult));
      debug('RetriveLocalDatabase(1): ' + util.inspect(consumerResult));
      return {
        providers: providerResult,
        consumers: consumerResult
      };
    } catch (error) {
      debug('RetriveLocalDatabase(2): ' + (error.message));
      stack('RetriveLocalDatabase(2): ' + (error.stack || error));
      throw Error(error);
    }
  }

  // ----------------------------------------------------------

  _createNewDirectory(web3) {
    return new Promise((resolve, reject) => {
      const Contract = new web3.eth.Contract(this._config.Directory.CONTRACT_ABI);
      Contract.deploy({
        data: this._config.Directory.CONTRACT_BYTECODE
      }).send({
        from: this._config.COINBASE_ACCOUNT,
        gas: this._config.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'Directory creation transaction is received.',
          txHash: hash
        };
        debug('_createNewDirectory(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'A new directory is created and deployed.',
          txHash: receipt.transactionHash,
          directoryID: receipt.contractAddress
        };
        debug('_createNewDirectory(2): ' + util.inspect(response));
        stack('_createNewDirectory(2): ' + util.inspect(receipt));
        resolve(response);
      }).on('error', (error) => {
        debug('_createNewDirectory(3): ' + (error.message));
        stack('_createNewDirectory(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _sendETHToUser(web3, userAddress, value) {
    return new Promise((resolve, reject) => {
      web3.eth.sendTransaction({
        from: this._config.COINBASE_ACCOUNT,
        to: userAddress,
        value: web3.utils.toWei(value, "ether")
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'ETH transaction is received.',
          txHash: hash
        };
        debug('_sendETHToUser(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'ETH transaction is written.',
          txHash: receipt.transactionHash
        };
        debug('_sendETHToUser(2): ' + util.inspect(response));
        stack('_sendETHToUser(2): ' + util.inspect(receipt));
        resolve(response);
      }).on('error', (error) => {
        debug('_sendETHToUser(3): ' + (error.message));
        stack('_sendETHToUser(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _registerProvider(contract, userAddress, userID) {
    return new Promise((resolve, reject) => {
      contract.methods.registerProvider(userAddress, userID).send({
        from: this._config.COINBASE_ACCOUNT,
        gas: this._config.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'UR transaction is received.',
          txHash: hash
        };
        debug('_registerProvider(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'UR transaction is written.',
          txHash: receipt.transactionHash
        };
        debug('_registerProvider(2): ' + util.inspect(response));
        stack('_registerProvider(2): ' + util.inspect(receipt));
        resolve(response);
      }).on('error', (error) => {
        debug('_registerProvider(3): ' + (error.message));
        stack('_registerProvider(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _registerConsumer(contract, userAddress, userID) {
    return new Promise((resolve, reject) => {
      contract.methods.registerConsumer(userAddress, userID).send({
        from: this._config.COINBASE_ACCOUNT,
        gas: this._config.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'UR transaction is received.',
          txHash: hash
        };
        debug('_registerConsumer(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'UR transaction is written.',
          txHash: receipt.transactionHash
        };
        debug('_registerConsumer(2): ' + util.inspect(response));
        stack('_registerConsumer(2): ' + util.inspect(receipt));
        resolve(response);
      }).on('error', (error) => {
        debug('_registerConsumer(3): ' + (error.message));
        stack('_registerConsumer(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _createDataEntry(contract, userAddress, offerPrice, dataCertificate, dataDescription, dueDate) {
    return new Promise((resolve, reject) => {
      const myDate = new Date();
      contract.methods.createDataEntry(offerPrice, dataCertificate, dataDescription, dueDate, myDate.getTime()).send({
        from: userAddress,
        gas: this._config.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'DEC transaction is received.',
          txHash: hash
        };
        debug('_createDataEntry(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'DEC transaction is written.',
          txHash: receipt.transactionHash
        };
        debug('_createDataEntry(2): ' + util.inspect(response));
        stack('_createDataEntry(2): ' + util.inspect(receipt));
        resolve(response);
      }).on('error', (error) => {
        debug('_createDataEntry(3): ' + (error.message));
        stack('_createDataEntry(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _deleteDataEntry(contract, userAddress, dataCertificate) {
    return new Promise((resolve, reject) => {
      contract.methods.deleteDataEntry(dataCertificate).send({
        from: userAddress,
        gas: this._config.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'DED transaction is received.',
          txHash: hash
        };
        debug('_deleteDataEntry(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'DED transaction is written.',
          txHash: receipt.transactionHash
        };
        debug('_deleteDataEntry(2): ' + util.inspect(response));
        stack('_deleteDataEntry(2): ' + util.inspect(receipt));
        resolve(response);
      }).on('error', (error) => {
        debug('_deleteDataEntry(3): ' + (error.message));
        stack('_deleteDataEntry(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _deployEAS(contract, consumer, EASExpiration, dataCertificate, providerAgreement, consumerAgreement) {
    return new Promise((resolve, reject) => {
      contract.methods.deployEAS(consumer, EASExpiration, dataCertificate, providerAgreement, consumerAgreement).send({
        from: this._config.COINBASE_ACCOUNT,
        gas: this._config.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'EASD transaction is received.',
          txHash: hash
        };
        debug('_deployEAS(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'EASD transaction is written.',
          txHash: receipt.transactionHash,
        };
        debug('_deployEAS(2): ' + util.inspect(response));
        stack('_deployEAS(2): ' + util.inspect(receipt));
        resolve(response);
      }).on('error', (error) => {
        debug('_deployEAS(3): ' + (error.message));
        stack('_deployEAS(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _invokeEAS(contract, provider, dataCertificate, invocationLog) {
    return new Promise((resolve, reject) => {
      contract.methods.invokeEAS(dataCertificate, invocationLog).send({
        from: provider,
        gas: this._config.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'EASI transaction is received.',
          txHash: hash
        };
        debug('_invokeEAS(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'EASI transaction is written.',
          txHash: receipt.transactionHash
        };
        debug('_invokeEAS(2): ' + util.inspect(response));
        stack('_invokeEAS(2): ' + util.inspect(receipt));
        resolve(response);
      }).on('error', (error) => {
        debug('_invokeEAS(3): ' + (error.message));
        stack('_invokeEAS(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _revokeEASbyProvider(contract, provider, dataCertificate, consumer) {
    return new Promise((resolve, reject) => {
      contract.methods.revokeEASbyProvider(dataCertificate, consumer).send({
        from: provider,
        gas: this._config.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'EASR transaction (provider) is received.',
          txHash: hash
        };
        debug('_revokeEASbyProvider(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'EASR transaction (provider) is written.',
          txHash: receipt.transactionHash
        };
        debug('_revokeEASbyProvider(2): ' + util.inspect(response));
        stack('_revokeEASbyProvider(2): ' + util.inspect(receipt));
        resolve(response);
      }).on('error', (error) => {
        debug('_revokeEASbyProvider(3): ' + (error.message));
        stack('_revokeEASbyProvider(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _revokeEASbyConsumer(contract, consumer, dataCertificate) {
    return new Promise((resolve, reject) => {
      contract.methods.revokeEASbyConsumer(dataCertificate).send({
        from: consumer,
        gas: this._config.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        let response = {
          message: 'EASR transaction (consumer) is received.',
          txHash: hash
        };
        debug('_revokeEASbyConsumer(1): ' + util.inspect(response));
      }).on('receipt', (receipt) => {
        let response = {
          message: 'EASR transaction (consumer) is written.',
          txHash: receipt.transactionHash
        };
        debug('_revokeEASbyConsumer(2): ' + util.inspect(response));
        stack('_revokeEASbyConsumer(2): ' + util.inspect(receipt));
        resolve(response);
      }).on('error', (error) => {
        debug('_revokeEASbyConsumer(3): ' + (error.message));
        stack('_revokeEASbyConsumer(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  // -----------------------------------

  async checkUserIdExist(request) {
    if (request.directoryID === '' || request.userID === '' || request.userType === '' ||
      request.directoryID === undefined || request.userID === undefined || request.userType === undefined) {
      throw Error('directoryID or userID or userType is not defined.');
    } else {
      try {
        if (request.userType === 'provider') {
          let result = await providerDatabase.checkUserExistByUserId(request.directoryID, request.userID);
          debug('checkUserIdExist(1): ' + util.inspect(result));
          return result;
        } else if (request.userType === 'consumer') {
          let result = await consumerDatabase.checkUserExistByUserId(request.directoryID, request.userID);
          debug('checkUserIdExist(2): ' + util.inspect(result));
          return result;
        }
      } catch (error) {
        debug('checkUserIdExist(3): ' + (error.message));
        stack('checkUserIdExist(3): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  async createNewEthAccount(request) {
    if (request.userID === '' || request.password === '' ||
      request.userID === undefined || request.password === undefined) {
      throw Error('userID or password is not defined.');
    } else {
      try {
        let passphrase = request.userID + request.password;
        let web3 = await this.connectAndObtainWeb3Obj();
        let result = await web3.eth.personal.newAccount(passphrase);
        debug('createNewEthAccount(1): ' + util.inspect(result));
        return result;
      } catch (error) {
        debug('createNewEthAccount(2): ' + (error.message));
        stack('createNewEthAccount(2): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  async storeUserAccountInLocal(request, newUserAddress) {
    if (request.directoryID === '' || request.userType === '' ||
      request.userID === '' || newUserAddress === '' ||
      request.directoryID === undefined || request.userType === undefined ||
      request.userID === undefined || newUserAddress === undefined) {
      throw Error('directoryID or userID or userType or newUserAddress is not defined.');
    } else {
      try {
        if (request.userType === 'provider') {
          if (!await providerDatabase.checkUserExistByUserAddress(request.directoryID, newUserAddress)) {
            let result = await providerDatabase.writeUserInfo(request.directoryID, request.userID, newUserAddress);
            let response = {
              message: result
            };
            debug('storeUserAccountInLocal(1): ' + util.inspect(response));
            return response;
          } else {
            throw Error('This provider address is already registered.');
          }
        } else if (request.userType === 'consumer') {
          if (!await consumerDatabase.checkUserExistByUserAddress(request.directoryID, newUserAddress)) {
            let result = await consumerDatabase.writeUserInfo(request.directoryID, request.userID, newUserAddress);
            let response = {
              message: result
            };
            debug('storeUserAccountInLocal(2): ' + util.inspect(response));
            return response;
          } else {
            throw Error('This consumer address is already registered.');
          }
        } else {
          throw Error('The userType is not defined.');
        }
      } catch (error) {
        debug('storeUserAccountInLocal(3): ' + (error.message));
        stack('storeUserAccountInLocal(3): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  async unlockEthAccount(address, password) {
    if (address === '' || address === undefined) {
      throw Error('account is not defined.');
    } else if (password === '' || password === undefined) {
      throw Error('password is not defined.');
    } else {
      try {
        let web3 = await this.connectAndObtainWeb3Obj();
        let result = await web3.eth.personal.unlockAccount(address, password, 90);
        debug('unlockEthAccount(1): ' + util.inspect(result));
        return result;
      } catch (error) {
        debug('unlockEthAccount(2): ' + (error.message));
        stack('unlockEthAccount(2): ' + (error.stack || error));
        throw Error('Could not decrypt key with given password');
      }
    }
  }

  checkContractExist(address, name) {
    return new Promise((resolve, reject) => {
      let web3 = this._web3;
      web3.eth.getCode(address).then((addressCode) => {
        if (addressCode === '0x') {
          debug('checkContractExist(1): ' + 'address code is not found.');
          reject(Error('Wrong ' + name + 'ID'));
        }
        else {
          debug('checkContractExist(2): ' + 'address code is found.');
          resolve(true);
        }
      });
    });
  }

  connectAndObtainWeb3Obj() {
    return new Promise((resolve, reject) => {
      let web3 = this._web3;
      debug('connectAndObtainWeb3Obj(1): ' + util.inspect(web3.version));
      if (!web3.version) reject(Error('Web3 object error'));
      else resolve(web3);
    });
  }

  connectAndAccessDirectoryContract(address) {
    return new Promise((resolve, reject) => {
      if (this._config.Directory.CONTRACT_ABI === '' || this._config.Directory.CONTRACT_ABI === undefined) {
        reject(Error('CONTRACT_ABI is not defined.'));
      } else if (address === '' || address === undefined) {
        reject(Error('CONTRACT_ADDR is not defined.'));
      } else {
        let web3 = this._web3;
        let contract = new web3.eth.Contract(this._config.Directory.CONTRACT_ABI, address);
        debug('connectAndAccessDirectoryContract(1): ' + util.inspect(contract._address));
        resolve(contract);
      }
    });
  }

  connectAndAccessEASContract(address) {
    return new Promise((resolve, reject) => {
      if (this._config.EAS.CONTRACT_ABI === '' || this._config.EAS.CONTRACT_ABI === undefined) {
        reject(Error('CONTRACT_ABI is not defined.'));
      } else if (address === '' || address === undefined) {
        reject(Error('CONTRACT_ADDR is not defined.'));
      } else {
        let web3 = this._web3;
        let contract = new web3.eth.Contract(this._config.EAS.CONTRACT_ABI, address);
        debug('connectAndAccessEASContract(1): ' + util.inspect(contract._address));
        resolve(contract);
      }
    });
  }



  // -----------------------------------------------------------

  async retrieveEthAccounts() {
    try {
      let web3 = await this.connectAndObtainWeb3Obj();
      let result = await web3.eth.getAccounts();
      debug('retrieveEthAccounts(1): ' + util.inspect(result));
      return result;
    } catch (error) {
      debug('retrieveEthAccounts(2): ' + (error.message));
      stack('retrieveEthAccounts(2): ' + (error.stack || error));
      throw Error(error);
    }
  }

  async generateKeystoreFile(request) {
    if (request.userID === '' || request.password === '' ||
      request.userID === undefined || request.password === undefined) {
      throw Error('userID or password is not defined.');
    } else {
      try {
        let passphrase = request.password;
        let web3 = await this.connectAndObtainWeb3Obj();
        let account = await web3.eth.accounts.create();
        debug('generateKeystoreFile(1): ' + util.inspect(account.address));
        let keyStore = await web3.eth.accounts.encrypt(account.privateKey, passphrase);
        let result = await this.writeKeystoreFile(keyStore);
        debug('generateKeystoreFile(2): ' + util.inspect(result));
        return result;
      } catch (error) {
        debug('generateKeystoreFile(3): ' + (error.message));
        stack('generateKeystoreFile(3): ' + (error.stack || error));
        throw Error(error);
      }
    }
  }

  writeKeystoreFile(keyStore) {
    const gethNodePath = './storages/';
    return new Promise((resolve, reject) => {
      fs.writeFile(gethNodePath + 'UTC--' +
        (new Date()).toISOString().replace(':', '-') +
        '--' + keyStore.address, keyStore, (error) => {
          if (error) reject(error);
          else {
            debug('generateKeystoreFile(1): the keystore file has been saved.');
            resolve('New account is created successfully.');
          }
        });
    });
  }
};