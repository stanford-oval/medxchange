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
const rlp = require('rlp');
const debug = require('debug')('medx-server:eth-dxservice');
const stack = require('debug')('medx-server-stack:eth-dxservice');
const moment = require('moment');
const transactionConfig = require('./transaction-config.json');

const medxDatabase = require('./database');

module.exports = class MedXserver {
  constructor(config, socketServer = {}) {
    this.socketServer = socketServer;
    this._config = config;
    this._web3 = new Web3(new Web3.providers.WebsocketProvider(config.ETHWS_IP_PORT));
    this.directoryID = config.Directory.CONTRACT_ADDR;
    this.UR_Database = new medxDatabase.UserRegistration(config.UR_dbPath);
    this.DIR_Database = new medxDatabase.DataDirectory(config.DIR_dbPath);
    this.AGR_Database = new medxDatabase.DataEntryAgreement(config.AGR_dbPath);
    this.EAS_Database = new medxDatabase.ExecutableAgreementScript(config.EAS_dbPath);
    this.EASI_Database = new medxDatabase.EASInvocation(config.EASI_dbPath);
    this.ATL_Database = new medxDatabase.AuditTrailLog(config.ATL_dbPath);
    this.SF_Datebase = new medxDatabase.SmartFilter(config.SF_dbPath);
    this.deleteDueEntry = this.deleteDueEntry.bind(this);
    this.revokeExpiredEAS = this.revokeExpiredEAS.bind(this);
  }

  /*
    POST /user/register/
      --> UserRegistration()
  */
  async UserRegistration(request) {
    debug('UserRegistration(0): ' + util.inspect(request));
    try {
      // Step1: check whether the data directory exists
      if (await this.checkContractExist(this.directoryID)) {
        // Step2: retrieve the data directory contract instance
        const contract = await this.accessContract('Directory', this.directoryID);
        // Step3: check whether the incoming user acccount exists
        if (!await this.checkUserExist(request)) {
          let DBresult, DTLresult, ATLresult, LOGresult = {};
          if (request.userType === 'provider' || request.userType === 'consumer') {
            // Step4a: unlock admin account to send UR-TX
            await this.unlockEthAccount(this._config.COINBASE_ACCOUNT, this._config.PASSPHRASE);
            // Step5a: send UR-TX to Ethereum
            DTLresult = await this._register(request.userType === 'provider', contract, request.userID, request.userAddress);
            // Step6a: write user (provider or consumer) account information to DB
            request.userAddress = request.userAddress.toLowerCase();
            DBresult = await this.UR_Database.writeUserInformation(this.directoryID, request.userType, request, DTLresult.data.txHash);
            debug('UserRegistration(1): ' + util.inspect(DTLresult));
            debug('UserRegistration(1): ' + util.inspect(DBresult));
            LOGresult.message = DTLresult.message;
            LOGresult.txHash = DTLresult.data.txHash;
          } else if (request.userType === 'auditor') {
            // Step4b: write user (auditor) account information to DB
            DBresult = await this.UR_Database.writeUserInformation(this.directoryID, request.userType, request);
            debug('UserRegistration(2): ' + util.inspect(DBresult));
            LOGresult.message = DBresult.message;
            LOGresult.txHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
          } else {
            debug('UserRegistration(3): ' + 'The userType is not defined.');
            throw Error('The userType is not defined.');
          }
          // Step7: write audit trail log with the UR-TX to DB
          ATLresult = await this.ATL_Database.writeAuditTrailLog(
            this.directoryID,
            undefined,
            new Date(),
            LOGresult.message,
            LOGresult.txHash
          );
          debug('UserRegistration(4): ' + util.inspect(ATLresult));
          return DBresult;
        } else {
          debug('UserRegistration(5): ' + 'The user has been registered.');
          throw Error('The user has been registered.');
        }
      } else {
        debug('UserRegistration(6): ' + 'The directory ID does not exist.');
        throw Error('The directory ID does not exist.');
      }
    } catch (error) {
      debug('UserRegistration(7): ' + (error.message));
      stack('UserRegistration(7): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  /*
    POST /user/login/
      --> UserLogin()
  */
  async UserLogin(request) {
    debug('checkUserPassword(0): ' + util.inspect(request));
    try {
      // Step1: check the hashed user password for login authentication
      const result = await this.UR_Database.checkUserPassword(this.directoryID, request.userType, request);
      debug('checkUserPassword(1): ' + util.inspect(result));
      // Step2: write audit trail log with the login result to DB
      const LOGresult = await this.ATL_Database.writeAuditTrailLog(
        this.directoryID,
        undefined,
        new Date(),
        result.message,
        JSON.stringify(result.data)
      );
      debug('checkUserPassword(1): ' + util.inspect(LOGresult));
      return result;
    } catch (error) {
      debug('checkUserPassword(2): ' + (error.message));
      stack('checkUserPassword(2): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  /*
    POST /entry/create/
      --> DataEntryCreation()
  */
  async DataEntryCreation(request) {
    debug('DataEntryCreation(0): ' + util.inspect(request));
    try {
      // Step1: parse signed transaction
      let signedTX = await this.parseSignedTX(request);
      signedTX.data.userType = 'provider';
      // Step2: check whether the data directory exists
      if (await this.checkContractExist(this.directoryID) && signedTX.data.to === this.directoryID.toLowerCase().slice(2)) {
        // Step3: retrieve incoming user account
        const account = await this.UR_Database.retrieveByConditions(this.directoryID, 'provider', signedTX.data);
        signedTX.data.userID = account.data[0].userID;
        // Step4: check whether the incoming user acccount exists
        if (account.data.length) {
          // Step5: check whether the data entry exists by data certificate
          const dataEntry = await this.DIR_Database.retrieveByConditions(this.directoryID, { dataKey: signedTX.data.decodedTransaction.dataKey }, { checkDueDate: true });
          if (!dataEntry.data.length) {
            // Step6: send DEC-TX to Ethereum
            const DTLresult = await this._sendSignedTX('DEC', JSON.parse(request.signedTX).rawTransaction);
            const DBresult = await this.writeTransactionData(signedTX.data, DTLresult.data.txHash);
            debug('DataEntryCreation(1): ' + util.inspect(DTLresult));
            debug('DataEntryCreation(1): ' + util.inspect(DBresult));
            // Step7: write audit trail log with the DEC-TX to DB
            const LOGresult = await this.ATL_Database.writeAuditTrailLog(
              this.directoryID,
              JSON.parse(signedTX.data.decodedTransaction.dataSummary).dataCertificate,
              new Date(),
              DTLresult.message,
              DTLresult.data.txHash
            );
            debug('DataEntryCreation(2): ' + util.inspect(LOGresult));
            return DBresult;
          } else {
            debug('DataEntryCreation(3): ' + 'The data certificate has been used.');
            throw Error('The data certificate has been used.');
          }
        } else {
          debug('DataEntryCreation(4): ' + 'The userID is not registered as a provider.');
          throw Error('The userID is not registered as a provider.');
        }
      } else {
        debug('DataEntryCreation(5): ' + 'The directory ID does not exist.');
        throw Error('The directory ID does not exist.');
      }
    } catch (error) {
      debug('DataEntryCreation(6): ' + (error.message));
      stack('DataEntryCreation(6): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async DataEntryDeletion(request) {
    debug('DataEntryDeletion(0): ' + util.inspect(request));
    try {
      // Step1: parse signed transaction
      let signedTX = await this.parseSignedTX(request);
      // Step2: check whether the data directory exists
      if (await this.checkContractExist(this.directoryID) && signedTX.data.to === this.directoryID.toLowerCase().slice(2)) {
        // Step3: check whether the incoming user acccount exists
        signedTX.data.userType = 'provider';
        if (await this.checkUserExist(signedTX.data)) {
          // Step5: retrieve data entry by data certificate
          const dataEntry = await this.DIR_Database.retrieveByConditions(this.directoryID, { dataKey: signedTX.data.decodedTransaction.dataKey }, { checkDueDate: false });
          // Step4: check whether the data entry exists by data certificate
          if (dataEntry.data.length) {
            debug('DataEntryDeletion(1): ' + util.inspect(dataEntry));
            debug('DataEntryDeletion(1): ' + util.inspect(signedTX.data.userAddress));
            if (signedTX.data.userAddress === dataEntry.data[0].dataProviderAddress) {
              if (dataEntry.data[0].isOffered) {
                // Step7: send DED-TX to Ethereum
                const DTLresult = await this._sendSignedTX('DED', JSON.parse(request.signedTX).rawTransaction);
                const DBresult = await this.writeTransactionData(signedTX.data, DTLresult.data.txHash);
                debug('DataEntryDeletion(2): ' + util.inspect(DTLresult));
                debug('DataEntryDeletion(2): ' + util.inspect(DBresult));
                // Step8: write audit trail log with the DED-TX to DB
                const LOGresult = await this.ATL_Database.writeAuditTrailLog(
                  this.directoryID,
                  dataEntry.data[0].dataCertificate,
                  new Date(),
                  DTLresult.message,
                  DTLresult.data.txHash
                );
                debug('DataEntryDeletion(2): ' + util.inspect(LOGresult));
                return DBresult;
              } else {
                debug('DataEntryDeletion(3): ' + 'The data entry has been deleted.');
                throw Error('The data entry has been deleted.');
              }
            } else {
              debug('DataEntryDeletion(4): ' + 'The userID is not the data provider of the entry.');
              throw Error('The userID is not the data provider of the entry.');
            }
          } else {
            debug('DataEntryDeletion(5): ' + 'Wrong data certificate: the data entry does not exist.');
            throw Error('Wrong data certificate: the data entry does not exist.');
          }
        } else {
          debug('DataEntryDeletion(6): ' + 'The userID is not registered as a provider.');
          throw Error('The userID is not registered as a provider.');
        }
      } else {
        debug('DataEntryDeletion(7): ' + 'The directory ID does not exist.');
        throw Error('The directory ID does not exist.');
      }
    } catch (error) {
      debug('DataEntryDeletion(8): ' + (error.message));
      stack('DataEntryDeletion(8): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  /*
    POST /entry/agreement/
      --> DataEntryAgreement()
  */
  async DataEntryAgreement(signedAgreement) {
    debug('DataEntryAgreement(0): ' + util.inspect(signedAgreement));
    try {
      // Step1: parse input fields in signedAgreement
      //        set targetUserType and put signedAgreement as acknowledgement
      const request = JSON.parse(signedAgreement.message);
      signedAgreement.message = JSON.parse(signedAgreement.message);
      request.acknowledgement = signedAgreement;
      if (request.userType === 'provider') { request.targetUserType = 'consumer'; }
      else if (request.userType === 'consumer') { request.targetUserType = 'provider'; }
      else {
        debug('DataEntryAgreement(1): ' + 'The userType is not defined.');
        throw Error('The userType is not defined.');
      }
      // Step2: retrieve incoming user account 
      const userAccount = await this.UR_Database.retrieveByConditions(
        this.directoryID,
        request.userType,
        { userID: request.userID }
      );
      if (!userAccount.data.length) {
        debug('DataEntryAgreement(2): ' + request.userType + ' ID does not exist.');
        throw Error(request.userType + ' ID does not exist.');
      }
      if (!userAccount.data[0].isConfirmed) {
        debug('DataEntryAgreement(3): ' + 'Waiting for ' + request.userType + ': ' + request.userID + ' registration to be confirmed');
        throw Error('Waiting for ' + request.userType + ': ' + request.userID + ' registration to be confirmed');
      }
      const userAddress = userAccount.data[0].userAddress;
      debug('DataEntryAgreement(4): ' + userAddress);
      // Step3: retrieve target user account
      const targetUserAccount = await this.UR_Database.retrieveByConditions(
        this.directoryID,
        request.targetUserType,
        { userID: request.targetUserID }
      );
      if (!userAccount.data.length) {
        debug('DataEntryAgreement(5): ' + request.targetUserType + ' ID does not exist.');
        throw Error(request.targetUserType + ' ID does not exist.');
      }
      if (!userAccount.data[0].isConfirmed) {
        debug('DataEntryAgreement(6): ' + 'Waiting for ' + request.userType + ': ' + request.userID + ' registration to be confirmed');
        throw Error('Waiting for ' + request.userType + ': ' + request.userID + ' registration to be confirmed');
      }
      const targetUserAddress = targetUserAccount.data[0].userAddress;
      debug('DataEntryAgreement(7): ' + targetUserAddress);
      // Step4: recover the signed data entry agreement to compare signingAddress and userAddress
      const signingAddress = await this._web3.eth.accounts.recover(signedAgreement);
      debug('DataEntryAgreement(8): ' + signingAddress);
      if (signingAddress.toLowerCase() !== userAddress.toLowerCase()) {
        debug('DataEntryAgreement(9): ' + 'signingAddress is not identical with userAddress.');
        throw (Error('signingAddress is not identical with userAddress.'));
      }
      // Step5: check whether the data entry exist described in the agreement
      request.dataKey = request.dataEntryCreationDate.toString() + request.dataCertificate;
      const dataEntry = await this.DIR_Database.retrieveByConditions(this.directoryID, { dataKey: request.dataKey });
      await this.checkAgreementInfo(request, dataEntry);

      if ('consumer' === request.userType) {
        request.targetUserType = 'provider';
        request.userAddress = userAddress;
        request.targetUserAddress = targetUserAddress;
        // Step6a: check whether consumer's agreement exists or not
        const Agreement = await this.AGR_Database.retrieveByConditions(this.directoryID, request);
        if (Agreement.data.length) {
          // Step7a: find the agreement that is not rejected
          let pendingAgreement = await Agreement.data.find((agreement) => {
            return !agreement.isRejected;
          });
          // Step8a: if there is any consumer's agreement which is not rejected
          if (pendingAgreement) {
            debug('DataEntryAgreement(10): ' + "Waiting for provider's agreement!");
            throw Error("Waiting for provider's agreement!");
          }
        }
        // Step9a: write data entry agreement to DB (consumer)
        const DBresult = await this.AGR_Database.writeDataEntryAgreement(this.directoryID, userAddress, targetUserAddress, request);
        this.socketServer.update && this.socketServer.update('AGR', 'provider', targetUserAccount.data[0].userID, 'A new consumer agreement has been received.');
        debug('DataEntryAgreement(11): ' + util.inspect(DBresult));
        // Step10a: write audit trail log with the agreement to DB
        const LOGresult = await this.ATL_Database.writeAuditTrailLog(
          this.directoryID,
          request.dataCertificate,
          new Date(),
          DBresult.message,
          JSON.stringify(DBresult.data)
        );
        debug('DataEntryAgreement(12): ' + util.inspect(LOGresult));
        return DBresult;
      } else if ('provider' === request.userType) {
        request.targetUserType = 'consumer';
        // Step6b: check whether consumer's agreement exists or not
        const consumerAgreementSearchConditions = {
          userID: request.targetUserID,
          userAddress: targetUserAddress,
          targetUserID: request.userID,
          targetUserAddress: userAddress,
          dataKey: request.dataKey
        };
        const targetAgreement = await this.AGR_Database.retrieveByConditions(this.directoryID, consumerAgreementSearchConditions);
        if (!targetAgreement.data.length) {
          debug('DataEntryAgreement(13): ' + "No matching consumer's agreement exists.");
          throw Error("No matching consumer's agreement exists.");
        }
        // Step7b: find the agreement that is not rejected
        let pendingTargetAgreement = await targetAgreement.data.find((agreement) => {
          return !agreement.isRejected;
        });
        // Step8b: if there is no consumer's agreement which is not rejected
        if (!pendingTargetAgreement) {
          debug('DataEntryAgreement(14): ' + "All agreements are rejected, waiting for new consumer's agreement.");
          throw Error("All agreements are rejected, waiting for new consumer's agreement.");
        }
        // Step9b: check the dataOfferPrice of agreements are matched.
        if (request.dataBiddingPrice.toString() === pendingTargetAgreement.dataBiddingPrice.toString()) {
          // Step10b: check the dataExpirationDate of agreements are matched.
          if (request.EASExpirationDate.toString() === moment(pendingTargetAgreement.EASExpirationDate).unix().toString()) {
            // Step11b: write data entry agreement to DB (provider).
            const DBresult = await this.AGR_Database.writeDataEntryAgreement(this.directoryID, userAddress, targetUserAddress, request);
            // Step12b: write audit trail log with the agreement to DB
            const LOGresult = await this.ATL_Database.writeAuditTrailLog(
              this.directoryID,
              request.dataCertificate,
              new Date(),
              DBresult.message,
              JSON.stringify(DBresult.data)
            );
            debug('DataEntryAgreement(15): ' + util.inspect(DBresult));
            debug('DataEntryAgreement(15): ' + util.inspect(LOGresult));
            // Step13b: send EAS to blockchain
            const EASD_DBresult = await this.EASDeployment(request, pendingTargetAgreement.acknowledgement, targetUserAccount);
            debug('DataEntryAgreement(16): ' + util.inspect(EASD_DBresult));
            return EASD_DBresult;
          } else {
            debug('DataEntryAgreement(17): ' + "EASExpirationDate doesn't match");
            throw Error("EASExpirationDate doesn't match.");
          }
        } else {
          debug('DataEntryAgreement(18): ' + "dataOfferPrice doesn't match");
          throw Error("dataOfferPrice doesn't match.");
        }
      }
    } catch (error) {
      debug('DataEntryAgreement(19): ' + (error.message));
      stack('DataEntryAgreement(19): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async DataEntryAgreementRejection(signedAgreement) {
    debug('DataEntryAgreementRejection(0)' + util.inspect(signedAgreement));
    try {
      const request = JSON.parse(signedAgreement.message);

      if (request.userType === 'provider') { request.targetUserType = 'consumer'; }
      else if (request.userType === 'consumer') { request.targetUserType = 'provider'; }
      else {
        debug('DataEntryAgreementRejection(1): ' + 'The userType is not defined.');
        throw Error('The userType is not defined.');
      }
      // Step1: retrieve incoming user account 
      const userAccount = await this.UR_Database.retrieveByConditions(
        this.directoryID,
        request.userType,
        { userID: request.userID }
      );
      if (!userAccount.data.length) {
        debug('DataEntryAgreementRejection(2): ' + request.userType + ' ID does not exist.');
        throw Error(request.userType + ' ID does not exist.');
      }
      if (!userAccount.data[0].isConfirmed) {
        debug('DataEntryAgreementRejection(3): ' + 'Waiting for ' + request.userType + ': ' + request.userID + ' registration to be confirmed');
        throw Error('Waiting for ' + request.userType + ': ' + request.userID + ' registration to be confirmed');
      }
      const userAddress = userAccount.data[0].userAddress;
      debug('DataEntryAgreementRejection(4): ' + userAddress);
      // Step2: retrieve target user account
      const targetUserAccount = await this.UR_Database.retrieveByConditions(
        this.directoryID,
        request.targetUserType,
        { userID: request.targetUserID }
      );
      if (!targetUserAccount.data.length) {
        debug('DataEntryAgreementRejection(5): ' + request.targetUserType + ' ID does not exist.');
        throw Error(request.userType + ' ID does not exist.');
      }
      if (!targetUserAccount.data[0].isConfirmed) {
        debug('DataEntryAgreementRejection(6): ' + 'Waiting for ' + request.targetUserType + ': ' + request.targetUserID + ' registration to be confirmed');
        throw Error('Waiting for ' + request.targetUserType + ': ' + request.targetUserID + ' registration to be confirmed');
      }
      const targetUserAddress = targetUserAccount.data[0].userAddress;
      debug('DataEntryAgreementRejection(7): ' + targetUserAddress);
      // Step3: recover the signed data entry agreement to compare signingAddress and userAddress
      const signingAddress = await this._web3.eth.accounts.recover(signedAgreement);
      debug('DataEntryAgreementRejection(8): ' + signingAddress);
      if (signingAddress.toLowerCase() !== userAddress.toLowerCase()) {
        debug('DataEntryAgreementRejection(9): ' + 'signingAddress is not identical with userAddress.');
        throw (Error('signingAddress is not identical with userAddress.'));
      }
      // Step4: check whether target agreement exists or not
      const targetAgreementSearchConditions = {
        userID: request.targetUserID,
        targetUserID: request.userID,
        dataKey: request.dataEntryCreationDate.toString() + request.dataCertificate
      };
      const targetAgreement = await this.AGR_Database.retrieveByConditions(this.directoryID, targetAgreementSearchConditions);
      if (!targetAgreement.data.length) {
        debug('DataEntryAgreementRejection(10): ' + "No matching consumer's agreement exists.");
        throw Error("No matching consumer's agreement exists.");
      }
      // Step5: find the agreement that is not rejected
      const pendingTargetAgreement = await targetAgreement.data.find((agreement) => {
        return !agreement.isRejected;
      });
      // Step6: if there is a consumer's agreement which is not rejected, set isRejected to false 
      if (pendingTargetAgreement) {
        const DBresult = await this.AGR_Database.rejectDataEntryAgreement(this.directoryID, pendingTargetAgreement);
        debug('DataEntryAgreementRejection(11): ' + util.inspect(DBresult));
        this.socketServer.update && this.socketServer.update('AGR', 'consumer', targetUserAccount.data[0].userID, 'An agreement has been rejected.');
        return DBresult;
      } else {
        debug('DataEntryAgreementRejection(12): ' + "All agreements are rejected.");
        throw Error("All agreements are rejected.");
      }
    } catch (error) {
      debug('DataEntryAgreementRejection(13): ' + (error.message));
      stack('DataEntryAgreementRejection(13): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  /*
    GET /entry/count/
      --> DataEntryCount()
  */
  async DataEntryCount() {
    debug('DataEntryCount(0)');
    try {
      const dataEntryList = await this.DIR_Database.retrieveAll();

      const response = {
        message: 'Data entry count is retrieved.',
        data: {
          entryCount: dataEntryList.data.length
        }
      };
      debug('DataEntryCount(1): ' + util.inspect(response));
      return response;
    } catch (error) {
      debug('DataEntryCount(2): ' + (error.message));
      stack('DataEntryCount(2): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  /*
    GET /entry/:userType/:userID/
      --> DataEntryRetrievalByUserID()
  */
  async DataEntryRetrievalByUserID(request) {
    debug('DataEntryRetrievalByUserID(0): ' + util.inspect(request));
    try {
      let dataEntryList, AGRlist, EASlist, invocationList, response;
      if ('provider' === request.userType) {
        // retrieve dataEntry by userID (provider)
        dataEntryList = await this.DIR_Database.retrieveByConditions(
          this.directoryID, { userID: request.userID }, { checkDueDate: false });
        // retrieve AGR and EAS for each data entry
        for (let entry of dataEntryList.data) {
          if (entry.isOffered) {
            // retrieve AGR by dataCertificate
            AGRlist = await this.AGR_Database.retrieveByConditions(
              this.directoryID, { dataKey: entry.dataKey }
            );
            entry.AGRlist = AGRlist.data;
          } else {
            entry.AGRlist = [];
          }
          // retrieve EAS by dataCertificate
          EASlist = await this.EAS_Database.retrieveByConditions(
            this.directoryID, { dataKey: entry.dataKey }, { checkExpirationDate: false }
          );
          entry.EASlist = EASlist.data;
          // retrieve invocation record by dataCertificate
          invocationList = await this.EASI_Database.retrieveByConditions(
            this.directoryID, { dataKey: entry.dataKey }
          );
          entry.invocationList = invocationList.data;
        }
        response = {
          message: 'Data entry list is retrieved by userID.',
          data: dataEntryList.data
        };
      } else if ('consumer' === request.userType) {
        // the object mapping the dataKey to the data entry index of dataEntryList
        let dataKeyList = {};
        dataEntryList = [];
        // retrieve AGR by userID (consumer)
        AGRlist = await this.AGR_Database.retrieveByConditions(
          this.directoryID, {
            userID: request.userID,
            userType: 'consumer'
          }
        );
        // for each AGR associated with the consumer,
        // use the data key of the AGR to find the corresponding data entry
        for (let AGR of AGRlist.data) {
          // if the dataKey of AGR is not searched in dataKeyList, 
          // indicating that the data entry has not pushed into the dataEntryList,
          // find the data entry corresponding to the dataKey and push it into the dataEntryList
          if (!(AGR.dataKey in dataKeyList)) {
            let dataEntry = await this.DIR_Database.retrieveByConditions(
              this.directoryID, { dataKey: AGR.dataKey }, { checkDueDate: false }
            );
            // if data entry exists, put this dataKey into list and this dataEntry to list
            if (dataEntry.data.length) {
              // retrieve invocation record by dataKey
              invocationList = await this.EASI_Database.retrieveByConditions(
                this.directoryID, { dataKey: AGR.dataKey },
              );

              dataKeyList[AGR.dataKey] = dataEntryList.length;
              dataEntry.data[0].AGRlist = [AGR];
              dataEntry.data[0].EASlist = [];
              dataEntry.data[0].invocationList = invocationList.data;
              dataEntryList.push(dataEntry.data[0]);
            }
          } else {
            // if the dataKey of AGR is searched, 
            // indicating that the data entry has been pushed into the data entry list
            // push the AGR into the corresponding data entry AGRlist     
            const dataEntryIndexByDataKey = dataKeyList[AGR.dataKey];
            dataEntryList[dataEntryIndexByDataKey].AGRlist.push(AGR);
          }
        }
        // retrieve EAS by userID (consumer)
        EASlist = await this.EAS_Database.retrieveByConditions(
          this.directoryID, { dataConsumerID: request.userID }, { checkExpirationDate: false }
        );
        // for each EAS associated with the consumer,
        // push the data entry information in the EAS into dataEntryList
        for (let EAS of EASlist.data) {
          // if the dataKey of EAS is not searched in dataKeyList, 
          // indicating that the data entry has not pushed into the dataEntryList,
          // push the data entry information in the EAS into the dataEntryList
          if (!(EAS.dataKey in dataKeyList)) {
            let dataEntry = await this.DIR_Database.retrieveByConditions(
              this.directoryID, { dataKey: EAS.dataKey }, { checkDueDate: false }
            );
            // if data entry exists, put this dataKey into list and this dataEntry to list
            if (dataEntry.data.length) {
              invocationList = await this.EASI_Database.retrieveByConditions(
                this.directoryID, { dataKey: EAS.dataKey }
              );
              dataKeyList[EAS.dataKey] = dataEntryList.length;
              dataEntry.data[0].AGRlist = [];
              dataEntry.data[0].EASlist = [EAS];
              dataEntry.data[0].invocationList = invocationList.data;
              dataEntryList.push(dataEntry.data[0]);
            } else {
              // if the dataKey of EAS is searched, 
              // indicating that the data entry has been pushed into the data entry list 
              // push the EAS into the corresponding data entry EASlist    
              let dataEntryIndexByDataKey = dataKeyList[EAS.dataKey];
              dataEntryList[dataEntryIndexByDataKey].EASlist.push(EAS);
            }
          }
        }
        response = {
          message: 'Data entry list is retrieved by userID.',
          data: dataEntryList
        };
      } else {
        debug('DataEntryRetrievalByUserID(1): ' + 'The userType is not defined.');
        throw Error('The userType is not defined.');
      }

      debug('DataEntryRetrievalByUserID(2): ' + util.inspect(response));
      return response;
    } catch (error) {
      debug('DataEntryRetrievalByUserID(3): ' + (error.message));
      stack('DataEntryRetrievalByUserID(3): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  /*
    GET /query/
      --> DataQueryService()
  */
  async DataQueryService(request) {
    debug('DataQueryService(0)');
    try {
      if (request.filters)
        request.filters = JSON.parse(request.filters);
      const dataEntry = await this.DIR_Database.retrieveByConditions(this.directoryID, request);
      let AGRlist, EASlist, invocationList, dataEntryList = [];

      if ('consumer' === request.userType) {
        for (let entry of dataEntry.data) {
          if (entry.isOffered) {
            // retrieve AGR by dataKey and dataConsumerID
            AGRlist = await this.AGR_Database.retrieveByConditions(
              this.directoryID, { dataKey: entry.dataKey, userID: request.dataConsumerID }
            );
            entry.AGRlist = AGRlist.data;
            // retrieve EAS by dataKey and dataConsumerID
            EASlist = await this.EAS_Database.retrieveByConditions(
              this.directoryID, { dataKey: entry.dataKey, dataConsumerID: request.dataConsumerID }
            );
            entry.EASlist = EASlist.data;
            // retrieve EAS by dataKey
            invocationList = await this.EASI_Database.retrieveByConditions(
              this.directoryID, { dataKey: entry.dataKey }
            );
            entry.invocationList = invocationList.data;
            dataEntryList.push(entry);
          }
        }
      } else if ('provider' === request.userType) {
        for (let entry of dataEntry.data) {
          if (entry.isOffered) {
            // retrieve AGR by dataKey and dataProviderID
            AGRlist = await this.AGR_Database.retrieveByConditions(
              this.directoryID, { dataKey: entry.dataKey, targetUserID: request.dataProviderID }
            );
            entry.AGRlist = AGRlist.data;
            // retrieve EAS by dataKey and dataProviderID
            EASlist = await this.EAS_Database.retrieveByConditions(
              this.directoryID, { dataKey: entry.dataKey }
            );
            entry.EASlist = EASlist.data;
            // retrieve invocation record by dataKey
            invocationList = await this.EASI_Database.retrieveByConditions(
              this.directoryID, { dataKey: entry.dataKey }
            );
            entry.invocationList = invocationList.data;
            dataEntryList.push(entry);
          }
        }
      } else {
        for (let entry of dataEntry.data) {
          if (entry.isOffered) {
            entry.AGRlist = [];
            entry.EASlist = [];
            // retrieve invocation record by dataKey
            invocationList = await this.EASI_Database.retrieveByConditions(
              this.directoryID, { dataKey: entry.dataKey }
            );
            entry.invocationList = invocationList.data;
            dataEntryList.push(entry);
          }
        }
      }
      let filters = {};
      if (request.filters) {
        if (0 === Object.keys(request.filters).length) {
          const filter = await this.SF_Datebase.retrieveByConditions(request.dataEntryTitle);
          if (filter.data.length) filters = JSON.parse(filter.data[0].filters);
        }
      } else {
        const filter = await this.SF_Datebase.retrieveByConditions(request.dataEntryTitle);
        if (filter.data.length) filters = JSON.parse(filter.data[0].filters);
      }
      const response = {
        message: 'Data entry list is retrieved from DQS.',
        data: dataEntryList,
        filters: filters
      };
      debug('DataQueryService(1): ' + util.inspect(response));
      return response;
    } catch (error) {
      debug('DataQueryService(2): ' + (error.message));
      stack('DataQueryService(2): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  /*
    POST /audit/
      --> AuditTrailLogRetrieval()
  */
  async AuditTrailLogRetrieval(request) {
    debug('AuditTrailLogRetrieval(0)');
    try {
      if (await this.checkUserExist(request)) {
        const auditLogList = await this.ATL_Database.retrieveByConditions(this.directoryID, request);
        const response = {
          message: 'Audit Trail Logs are retrieved.',
          data: auditLogList.data
        };
        debug('AuditTrailLogRetrieval(1): ' + util.inspect(response));
        return response;
      }
      else { throw (Error('ATL: access denied')); }
    } catch (error) {
      debug('AuditTrailLogRetrieval(2): ' + (error.message));
      stack('AuditTrailLogRetrieval(2): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  /*
    POST /eas/revoke/
      --> EASRevocation()
  */
  async EASRevocation(request) {
    debug('EASRevocation(0): ' + util.inspect(request));
    try {
      // Step1: parse signed transaction
      const signedTX = await this.parseSignedTX(request);
      // Step2: check whether the data directory exists
      if (await this.checkContractExist(this.directoryID) && signedTX.data.to === this.directoryID.toLowerCase().slice(2)) {
        // Step3: retrieve EAS by the dataKey and dataConsumerAddress in the parsed signed transaction
        const contractFunc = transactionConfig[signedTX.data.contractFuncNameHash];
        if (contractFunc) {
          signedTX.data.decodedTransaction.dataConsumerAddress = ("revokeEASbyProvider" === contractFunc.functionABI.name) ?
            signedTX.data.decodedTransaction.consumerAddress.toLowerCase() : signedTX.data.userAddress;
          const EAS = await this.EAS_Database.retrieveByConditions(this.directoryID, signedTX.data.decodedTransaction, { checkExpirationDate: false });
          // Step4: check whether retrieved EAS exists
          if (EAS.data.length) {
            // Step5: check whether EAS is confirmed
            if (EAS.data[0].isConfirmed) {
              // Step6: check whether EAS is valid
              if (EAS.data[0].isValid) {
                // Step7: recognize the usertype (provider or consumer) by contractFuncNameHash in parsed signed transaction
                if ('revokeEASbyProvider' === contractFunc.functionABI.name) {
                  // Step8a: check whether the incoming user acccount exists
                  signedTX.data.userType = 'provider';
                  if (await this.checkUserExist(signedTX.data)) {
                    // Step9a: check whether the signed address of parsed signed transaction matches the providerAddress of EAS
                    const dataEntry = await this.DIR_Database.retrieveByConditions(this.directoryID, signedTX.data.decodedTransaction, { checkDueDate: false });
                    if (dataEntry.data[0].dataProviderAddress === signedTX.data.userAddress) {
                      // Step10a: check whether the consumer address in parsed signed transaction matches the consumerAddress in EAS 
                      if (EAS.data[0].dataConsumerAddress === signedTX.data.decodedTransaction.consumerAddress.toLowerCase()) {
                        signedTX.data.EASID = EAS.data[0].EASID;
                        // Step11a: send EASR-TX to Ethereum
                        const DTLresult = await this._sendSignedTX('EASR', JSON.parse(request.signedTX).rawTransaction);
                        // Step12a: set the dataValidityStatus in EAS to false in database
                        const DBresult = await this.writeTransactionData(signedTX.data, DTLresult.data.txHash);
                        debug('EASRevocation(1): ' + util.inspect(DTLresult));
                        debug('EASRevocation(1): ' + util.inspect(DBresult));
                        // Step13a: write audit trail log with the EASR-TX to DB
                        const LOGresult = await this.ATL_Database.writeAuditTrailLog(
                          this.directoryID,
                          EAS.data[0].dataCertificate,
                          new Date(),
                          DTLresult.message,
                          DTLresult.data.txHash
                        );
                        debug('EASRevocation(2): ' + util.inspect(LOGresult));
                        return DBresult;
                      } else {
                        debug('EASRevocation(3): ' + "The consumer doesn't match the consumer of the EAS.");
                        throw Error("The consumer doesn't match the consumer of the EAS.");
                      }
                    } else {
                      debug('EASRevocation(4): ' + "The user doesn't match the provider of the EAS.");
                      throw Error("The user doesn't match the provider of the EAS.");
                    }
                  } else {
                    debug('EASRevocation(5): ' + 'The user is not registered as a provider.');
                    throw Error('The user is not registered as a provider.');
                  }
                } else if ('revokeEASbyConsumer' === contractFunc.functionABI.name) {
                  signedTX.data.userType = 'consumer';
                  // Step8b: check whether the data is downloaded
                  if (!EAS.data[0].downloadCount) {
                    // Step9b: check whether the signing address in parsed signed transaction matches the consumerAddress in EAS
                    if (this.checkUserExist(signedTX.data)) {
                      // Step10b: check whether the signed address of parsed signed transaction matches the consumerAddress of EAS
                      if (EAS.data[0].dataConsumerAddress === signedTX.data.userAddress) {
                        signedTX.data.EASID = EAS.data[0].EASID;
                        // Step11b: send EASR-TX to Ethereum
                        const DTLresult = await this._sendSignedTX('EASR', JSON.parse(request.signedTX).rawTransaction);
                        // Step12b: set the dataValidityStatus in EAS to false in database
                        const DBresult = await this.writeTransactionData(signedTX.data, DTLresult.data.txHash);
                        debug('EASRevocation(6): ' + util.inspect(DTLresult));
                        debug('EASRevocation(6): ' + util.inspect(DBresult));
                        // Step13b: write audit trail log with the EASR-TX to DB
                        const LOGresult = await this.ATL_Database.writeAuditTrailLog(
                          this.directoryID,
                          EAS.data[0].dataCertificate,
                          new Date(),
                          DTLresult.message,
                          DTLresult.data.txHash
                        );
                        debug('EASRevocation(7): ' + util.inspect(LOGresult));
                        return DBresult;
                      } else {
                        debug('EASRevocation(8): ' + "The user doesn't match the consumer of the EAS.");
                        throw Error("The user doesn't match the consumer of the EAS.");
                      }
                    } else {
                      debug('EASRevocation(9): ' + 'The user is not registered as a consumer.');
                      throw Error('The user is not registered as a consumer.');
                    }
                  } else {
                    debug('EASRevocation(10): ' + "EAS can't be revoked after data file is downloaded.");
                    throw Error("EAS can't be revoked after data file is downloaded.");
                  }
                } else {
                  debug('EASRevocation(11): ' + 'The userType is not defined.');
                  throw Error('The userType is not defined.');
                }
              } else {
                debug('EASRevocation(12): ' + 'The EAS has been revoked.');
                throw Error('The EAS has been revoked.');
              }
            } else {
              debug('EASRevocation(13): ' + 'Waiting for EAS to be confirmed');
              throw Error('Waiting for EAS to be confirmed');
            }
          } else {
            debug('EASRevocation(14): ' + "The EAS doesn't exist");
            throw Error("The EAS doesn't exist");
          }
        } else {
          debug('EASRevocation(15): ' + 'Unknown transaction hash');
          throw Error('Unknown transaction hash');
        }
      } else {
        debug('EASRevocation(16): ' + 'The directory ID does not exist.');
        throw Error('The directory ID does not exist.');
      }
    } catch (error) {
      debug('EASRevocation(17): ' + (error.message));
      stack('EASRevocation(17): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async EASInvocation(request) {
    debug('EASInvocation(0): ' + util.inspect(request));
    try {
      // Step1: parse signed transaction
      const signedTX = await this.parseSignedTX(request);
      signedTX.data.userType = 'provider';
      // Step2: check whether the data directory exists
      if (await this.checkContractExist(this.directoryID) && signedTX.data.to === this.directoryID.toLowerCase().slice(2)) {
        // Step3: check whether the incoming user acccount exists
        if (await this.checkUserExist(signedTX.data)) {
          // Step4: check whether the data entry exists by data certificate
          const dataEntry = await this.DIR_Database.retrieveByConditions(this.directoryID, signedTX.data.decodedTransaction, { checkDueDate: false });
          if (dataEntry.data.length) {
            if (dataEntry.data[0].isConfirmed) {
              debug('EASInvocation(1): ' + util.inspect(dataEntry));
              debug('EASInvocation(1): ' + util.inspect(signedTX.data.userAddress));
              if (signedTX.data.userAddress === dataEntry.data[0].dataProviderAddress) {
                // Step5: send EASI-TX to Ethereum
                const DTLresult = await this._sendSignedTX('EASI', JSON.parse(request.signedTX).rawTransaction);
                // Step6: write audit trail log with the EASI-TX to DB
                const downlaodIsFailed = await signedTX.data.decodedTransaction.invocationRecord.search('failed');
                signedTX.data.decodedTransaction.downloadStatus = downlaodIsFailed === -1 ? true : false;
                signedTX.data.decodedTransaction.dataCertificate = dataEntry.data[0].dataCertificate;
                const DBresult = await this.writeTransactionData(signedTX.data, DTLresult.data.txHash);
                debug('EASInvocation(2): ' + util.inspect(DTLresult));
                debug('EASInvocation(2): ' + util.inspect(DBresult));
                const LOGresult = await this.ATL_Database.writeAuditTrailLog(
                  this.directoryID,
                  dataEntry.data[0].dataCertificate,
                  new Date(),
                  DTLresult.message,
                  DTLresult.data.txHash);
                debug('EASInvocation(3): ' + util.inspect(LOGresult));
                return DBresult;
              } else {
                debug('EASInvocation(4): ' + 'The userID is not the data provider of the entry.');
                throw Error('The userID is not the data provider of the entry.');
              }
            } else {
              debug('EASInvocation(5): ' + 'Waiting for data entry to be confirmed');
              throw Error('Waiting for data entry to be confirmed');
            }
          } else {
            debug('EASInvocation(6): ' + 'Wrong data certificate: the data entry does not exist.');
            throw Error('Wrong data certificate: the data entry does not exist.');
          }
        } else {
          debug('EASInvocation(7): ' + 'The userID is not registered as a provider.');
          throw Error('The userID is not registered as a provider.');
        }
      } else {
        debug('EASInvocation(8): ' + 'The directory ID does not exist.');
        throw Error('The directory ID does not exist.');
      }
    } catch (error) {
      debug('EASInvocation(9): ' + (error.message));
      stack('EASInvocation(9): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async EASDeployment(request, consumerAcknowledgement, consumerAccount) {
    debug('EASDeployment(0): ' + util.inspect(request));
    try {
      if (await this.checkContractExist(this.directoryID)) {
        request.dataConsumerID = consumerAccount.data[0].userID;
        request.dataConsumerAddress = consumerAccount.data[0].userAddress;
        request.dataProviderAcknowledgement = JSON.stringify(request.acknowledgement);
        request.dataConsumerAcknowledgement = consumerAcknowledgement;
        request.EASDeploymentDate = moment().unix();
        const contract = await this.accessContract('Directory', this.directoryID);
        await this.unlockEthAccount(this._config.COINBASE_ACCOUNT, this._config.PASSPHRASE);
        const acknowledgement = {
          dataProviderAcknowledgement: {
            messageHash: request.acknowledgement.messageHash,
            signature: request.acknowledgement.signature
          },
          dataConsumerAcknowledgement: {
            messageHash: JSON.parse(consumerAcknowledgement).messageHash,
            signature: JSON.parse(consumerAcknowledgement).signature
          }
        };
        debug('EASDeployment(1): ' + 'Acknowledgement: ' + acknowledgement);
        const DTLresult = await this._deployEAS(
          contract,
          request.targetUserAddress,
          request.EASDeploymentDate,
          request.EASExpirationDate,
          request.dataKey,
          JSON.stringify(acknowledgement)
        );
        const DBresult = await this.EAS_Database.writeEAS(this.directoryID, request, DTLresult.data.txHash);
        debug('EASDeployment(2): ' + util.inspect(DTLresult));
        debug('EASDeployment(2): ' + util.inspect(DBresult));
        const LOGresult = await this.ATL_Database.writeAuditTrailLog(
          this.directoryID,
          request.dataCertificate,
          new Date(),
          DTLresult.message,
          DTLresult.data.txHash
        );
        debug('EASDeployment(2): ' + util.inspect(LOGresult));
        return DBresult;
      } else {
        debug('EASDeployment(3): ' + 'The directory ID does not exist.');
        throw Error('The directory ID does not exist.');
      }
    } catch (error) {
      debug('EASDeployment(4): ' + (error.message));
      stack('EASDeployment(4): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async parseSignedTX(request) {
    debug('parseSignedTX(0)');
    try {
      const signedTX = JSON.parse(request.signedTX);
      const transaction = await rlp.decode(signedTX.rawTransaction);
      const transactionData = transaction[5].toString('hex');
      const contractFuncNameHash = transactionData.slice(0, 8);
      const decodedTransaction = await this._web3.eth.abi.decodeParameters(
        transactionConfig[contractFuncNameHash].functionABI.inputs,
        '0x' + transactionData.slice(8)
      );

      let result = {
        data: {
          userAddress: await this._web3.eth.accounts.recover(signedTX).toLowerCase(),
          nonce: transaction[0].toString('hex'),
          gasPrice: transaction[1].toString('hex'),
          gas: transaction[2].toString('hex'),
          to: transaction[3].toString('hex'),
          value: transaction[4].toString('hex'),
          contractFuncNameHash: contractFuncNameHash,
          decodedTransaction: decodedTransaction
        }
      };
      debug('parseSignedTX(1): parameters: ' + util.inspect(result.data));
      return result;
    } catch (error) {
      debug('parseSignedTX(2): ' + (error.message));
      stack('parseSignedTX(2): ' + (error.stack || error));
      return false;
    }
  }

  async writeTransactionData(request, txHash) {
    debug('writeTransactionData(0)');
    try {
      if (transactionConfig[request.contractFuncNameHash]) {
        switch (transactionConfig[request.contractFuncNameHash].functionABI.name) {
          case "createDataEntry":
            {
              const decodedDataSummary = JSON.parse(request.decodedTransaction.dataSummary);
              const inputData = {
                dataCertificate: decodedDataSummary.dataCertificate,
                dataOwnerCode: decodedDataSummary.dataOwnerCode,
                dataEntryTitle: decodedDataSummary.dataEntryTitle,
                dataDescription: decodedDataSummary.dataDescription,
                dataAccessPath: decodedDataSummary.dataAccessPath,
                dataOfferPrice: request.decodedTransaction.dataOfferPrice,
                dataEntryCreationDate: request.decodedTransaction.dataEntryCreationDate,
                dataEntryDueDate: request.decodedTransaction.dataEntryDueDate,
                ageLowerBound: decodedDataSummary.ageLowerBound,
                ageUpperBound: decodedDataSummary.ageUpperBound,
                gender: decodedDataSummary.gender,
              };
              const result = await this.DIR_Database.writeDataEntry(
                this.directoryID,
                request.userID,
                request.userAddress,
                inputData,
                txHash
              );
              return result;
            }
          case "deleteDataEntry":
            {
              const result = await this.DIR_Database.updateDataOfferStatus(this.directoryID, request.decodedTransaction.dataKey, txHash);
              return result;
            }
          case "invokeEAS":
            {
              const result = await this.EASI_Database.writeEASInvocation(
                this.directoryID,
                new Date(),
                request.decodedTransaction,
                txHash
              );
              let EAS, validityStatus;
              if (request.decodedTransaction.downloadStatus) {
                const invocationInformation = request.decodedTransaction.invocationRecord.split(',');
                const consumerID = invocationInformation[1];
                debug('writeTransactionData(1):invokeEAS(1): ' + consumerID);
                EAS = await this.EAS_Database.retrieveByConditions(this.directoryID, { dataConsumerID: consumerID, dataKey: request.decodedTransaction.dataKey }, { checkExpirationDate: false });
                if (EAS.data.length && EAS.data[0].isConfirmed && EAS.data[0].isValid) {
                  await this.EAS_Database.updateDownloadCount(this.directoryID, EAS.data[0].EASID);
                  validityStatus = true;
                } else {
                  validityStatus = false;
                }
              } else {
                if (EAS.data.length && EAS.data[0].isConfirmed && EAS.data[0].isValid) validityStatus = false;
                else validityStatus = true;
              }
              debug('writeTransactionData(1):invokeEAS(2): Download status: ' + request.decodedTransaction.downloadStatus);
              debug('writeTransactionData(1):invokeEAS(2): Validity status: ' + validityStatus);
              result.message += ` Download status: ${request.decodedTransaction.downloadStatus}, Validity status: ${validityStatus}`;
              return result;
            }
          case "revokeEASbyProvider":
            {
              const result = await this.EAS_Database.updateDataValidityStatus(this.directoryID, request.EASID, txHash);
              return result;
            }
          case "revokeEASbyConsumer":
            {
              const result = await this.EAS_Database.updateDataValidityStatus(this.directoryID, request.EASID, txHash);
              return result;
            }
        }
      } else {
        debug('writeTransactionData(1): ' + 'Unknown transaction hash');
        throw Error('Unknown transaction hash');
      }
    } catch (error) {
      debug('writeTransactionData(2): ' + (error.message));
      stack('writeTransactionData(2): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async getTransactionNonce(request) {
    debug('getTransactionNonce(0): ');
    try {
      const nonce = await this._web3.eth.getTransactionCount(request.userAddress);
      return '0x' + nonce.toString();
    } catch (error) {
      debug('getTransactionNonce(2): ' + (error.message));
      stack('getTransactionNonce(2): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async checkUserExist(request) {
    debug('checkUserExist(0): ' + util.inspect(request));
    try {
      const result = await this.UR_Database.checkUserExist(
        this.directoryID,
        request.userType,
        request.userID,
        request.userAddress
      );
      debug('checkUserExist(1): ' + util.inspect(result));
      return result;
    } catch (error) {
      debug('checkUserExist(2): ' + (error.message));
      stack('checkUserExist(2): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async checkContractExist(address) {
    debug('checkContractExist(0): ' + util.inspect(address));
    return new Promise((resolve, reject) => {
      try {
        this._web3.eth.getCode(address).then((addressCode) => {
          if (addressCode === '0x') {
            debug('checkContractExist(1): ' + 'address code is not found.');
            resolve(false);
          } else {
            debug('checkContractExist(2): ' + 'address code is found.');
            resolve(true);
          }
        });
      } catch (error) {
        debug('checkContractExist(2): ' + (error.message));
        stack('checkContractExist(2): ' + (error.stack || error));
        reject(Error(error.message));
      }
    });
  }

  async checkAgreementInfo(request, dataEntry) {
    debug('checkAgreementInfo(0): ' + util.inspect(request));
    try {
      if (dataEntry.data.length) {
        if (dataEntry.data[0].isConfirmed) {
          if (dataEntry.data[0].isOffered) {
            if (request.userType === 'provider' && dataEntry.data[0].dataProviderAddress === request.userAddress) {
              debug('checkAgreementInfo(1): true');
              return (true);
            } else if (request.userType === 'consumer' && dataEntry.data[0].dataProviderAddress === request.targetUserAddress) {
              debug('checkAgreementInfo(1): true');
              return (true);
            } else {
              debug('checkAgreementInfo(2): ' + 'The userID is not the data provider of the entry.');
              throw Error('The userID is not the data provider of the entry.');
            }
          } else {
            debug('checkAgreementInfo(3): ' + 'The data entry has been deleted.');
            throw Error('The data entry has been deleted.');
          }
        } else {
          debug('checkAgreementInfo(4): ' + 'Waiting for data entry to be confirmed');
          throw Error('Waiting for data entry to be confirmed');
        }
      } else {
        debug('checkAgreementInfo(4): ' + 'Wrong data certificate: the data entry does not exist.');
        throw Error('Wrong data certificate: the data entry does not exist.');
      }
    } catch (error) {
      debug('checkAgreementInfo(5): ' + (error.message));
      stack('checkAgreementInfo(5): ' + (error.stack || error));
      throw (Error(error.message));
    }
  }

  async unlockEthAccount(address, password) {
    debug('unlockEthAccount(0): ' + util.inspect(address));
    debug('unlockEthAccount(0): ' + util.inspect(password));
    if (address === '' || address === undefined) {
      throw Error('The administration account is not defined.');
    } else if (password === '' || password === undefined) {
      throw Error('The administration account password is not defined.');
    } else {
      try {
        const result = await this._web3.eth.personal.unlockAccount(address, password, 30);
        debug('unlockEthAccount(1): ' + util.inspect(result));
        return result;
      } catch (error) {
        debug('unlockEthAccount(2): ' + (error.message));
        stack('unlockEthAccount(2): ' + (error.stack || error));
        throw Error('Could not decrypt the key of administration account');
      }
    }
  }

  accessContract(name, address) {
    debug('accessContract(0): ' + util.inspect(address));
    debug('accessContract(0): ' + util.inspect(name));
    return new Promise((resolve, reject) => {
      const contract = new this._web3.eth.Contract(this._config[name].CONTRACT_ABI, address);
      debug('accessContract(1): ' + util.inspect(contract._address));
      if (contract._address) resolve(contract);
      else reject(Error('Failed to access ' + name + ' contract'));
    });
  }

  _register(userTypeIsProivder, contract, userID, userAddress) {
    return new Promise((resolve, reject) => {
      contract.methods.register(userTypeIsProivder, userID, userAddress).send({
        from: this._config.COINBASE_ACCOUNT,
        gas: this._config.registerUser.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        const response = {
          message: 'UR transaction is received.',
          data: {
            txHash: hash
          }
        };
        debug('_register(1): ' + util.inspect(response));
        resolve(response);
      }).on('receipt', (receipt) => {
        const response = {
          message: 'UR transaction is written.',
          data: {
            txHash: receipt.transactionHash
          }
        };
        debug('_register(2): ' + util.inspect(response));
        stack('_register(2): ' + util.inspect(receipt));
        //resolve(response);
      }).on('error', (error) => {
        debug('_register(3): ' + (error.message));
        stack('_register(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _deployEAS(contract, consumer, EASDeploymentDate, EASExpirationDate, dataKey, agreement) {
    return new Promise((resolve, reject) => {
      contract.methods.deployEAS(consumer, EASDeploymentDate, EASExpirationDate, dataKey, agreement).send({
        from: this._config.COINBASE_ACCOUNT,
        gas: this._config.deployEAS.GAS,
        gasPrice: this._config.GAS_PRICE
      }).on('transactionHash', (hash) => {
        const response = {
          message: 'EASD transaction is received.',
          data: {
            txHash: hash
          }
        };
        debug('_deployEAS(1): ' + util.inspect(response));
        resolve(response);
      }).on('receipt', (receipt) => {
        const response = {
          message: 'EASD transaction is written.',
          txHash: receipt.transactionHash,
        };
        debug('_deployEAS(2): ' + util.inspect(response));
        stack('_deployEAS(2): ' + util.inspect(receipt));
      }).on('error', (error) => {
        debug('_deployEAS(3): ' + (error.message));
        stack('_deployEAS(3): ' + (error.stack || error));
        reject(error);
      });
    });
  }

  _sendSignedTX(name, rawTransaction) {
    return new Promise((resolve, reject) => {
      this._web3.eth.sendSignedTransaction(rawTransaction)
        .on('transactionHash', (hash) => {
          const response = {
            message: name + ' transaction is received.',
            data: {
              txHash: hash
            }
          };
          debug('_sendSignedTX(1): ' + util.inspect(response));
          resolve(response);
        }).on('receipt', (receipt) => {
          const response = {
            message: name + ' transaction is written.',
            data: {
              txHash: receipt.transactionHash
            }
          };
          debug('_sendSignedTX(2): ' + util.inspect(response));
          stack('_sendSignedTX(2): ' + util.inspect(receipt));
          //resolve(response);
        }).on('error', (error) => {
          debug('_sendSignedTX(3): ' + (error.message));
          stack('_sendSignedTX(3): ' + (error.stack || error));
          reject(error);
        });
    });
  }

  async removeDueEntryAndExpiredEAS(timeInterval) {
    debug('deleteExpirationData(0): ');
    try {
      setInterval(this.deleteDueEntry, timeInterval);
      setInterval(this.revokeExpiredEAS, timeInterval);
    } catch (error) {
      debug('deleteExpirationData(1): ' + (error.message));
      stack('deleteExpirationData(1): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async deleteDueEntry() {
    debug('deleteDueEntry(0): ');
    try {
      await this.DIR_Database.updateDataOfferStatus(this.directoryID, 0, 0, { deleteDueEntry: true });
    } catch (error) {
      debug('deleteDueEntry(1): ' + (error.message));
      stack('deleteDueEntry(1): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async revokeExpiredEAS() {
    debug('revokeExpiredEAS(0): ');
    try {
      await this.EAS_Database.updateDataValidityStatus(this.directoryID, 0, 0, { revokeExpiredEAS: true });
    } catch (error) {
      debug('revokeExpiredEAS(1): ' + (error.message));
      stack('revokeExpiredEAS(1): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

};
