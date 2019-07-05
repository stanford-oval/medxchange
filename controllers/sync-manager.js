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

'use strict';

const fs = require('fs');
const debug = require('debug')('medx-server:eth-dxservice');
const stack = require('debug')('medx-server-stack:eth-dxservice');
const transactionConfig = require('./transaction-config.json');

const medxDatabase = require('./database');
const syncBlockFilePath = './controllers/syncBlock.log';

module.exports = class SyncManager {
  constructor(config, MedXserver) {
    this.parseBlockWriteUpdate = this.parseBlockWriteUpdate.bind(this);
    this.checkBlockSyncing = this.checkBlockSyncing.bind(this);
    this.directoryID = config.Directory.CONTRACT_ADDR;
    this.MedXserver = MedXserver;
    this.socketServer = MedXserver.socketServer;
    this._config = MedXserver._config;
    this._web3 = MedXserver._web3;
    this.directoryID = this._config.Directory.CONTRACT_ADDR;
    this.UR_Database = MedXserver.UR_Database;
    this.DIR_Database = MedXserver.DIR_Database;
    this.AGR_Database = MedXserver.AGR_Database;
    this.EAS_Database = MedXserver.EAS_Database;
    this.EASI_Database = MedXserver.EASI_Database;
    this.ATL_Database = MedXserver.ATL_Database;
    this.BN_Database = new medxDatabase.BlockNumber(config.BN_dbPath);
  }

  async syncDirectoryStorage() {
    debug('syncDirectoryStorage(0)');
    try {
      // DDS is syncing with blockchain while a new block is commited.
      this.subscription = this._web3.eth.subscribe('newBlockHeaders')
        .on("data", this.parseBlockWriteUpdate);
      // DDS checks the syncing status at fixed intervals.
      // If there are any unsynced blocks, DDS will sync database with them.
      setInterval(this.checkBlockSyncing, this._config.BLOCK_SYNC_INTERVAL);
      const response = {
        message: "Successfully subscribed!"
      };
      return response;
    } catch (error) {
      debug('syncDirectoryStorage(1): ' + (error.message));
      stack('syncDirectoryStorage(1): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async checkBlockSyncing() {
    debug('checkBlockSyncing(0)');
    try {
      // Sync new blocks from the last synchronized one
      const currentSyncedBlock = fs.existsSync(syncBlockFilePath) ?
        parseInt(fs.readFileSync(syncBlockFilePath)) : this._config.BLOCK_TRACE_START;
      debug('currentSyncedBlock: ' + currentSyncedBlock);
      // The aim syncing block of DDS
      const aimSyncedBlockNumber = await this._web3.eth.getBlockNumber() - this._config.BLOCK_TRACE_OFFSET - 1;
      debug('aimSyncedBlockNumber: ' + aimSyncedBlockNumber);
      for (let syncedBlockNumber = currentSyncedBlock + 1; syncedBlockNumber <= aimSyncedBlockNumber; syncedBlockNumber++)
        await this.parseBlockWriteUpdate({ number: syncedBlockNumber }, { syncedCurrentBlock: true });
      fs.writeFileSync(syncBlockFilePath, aimSyncedBlockNumber, "utf8", (err) => {
        if (err) throw err;
        console.log('The sync block file has been saved (medx)!');
      });
    } catch (error) {
      debug('checkBlockSyncing(1): ' + (error.message));
      stack('checkBlockSyncing(1): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async stopSyncDirectoryStorage() {
    debug('stopSyncDirectoryStorage(0)');
    try {
      this.subscription.unsubscribe((error, success) => {
        if (success)
          console.log('Successfully unsubscribed!');
        const response = {
          message: "Successfully unsubscribed!"
        };
        return response;
      });
      const response = {
        message: "Direcory storage syncing with blockchain has been stopped."
      };
      return response;
    } catch (error) {
      debug('stopSyncDirectoryStorage(1): ' + (error.message));
      stack('stopSyncDirectoryStorage(1): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async parseBlockWriteUpdate(blockNumber, _opt = {}) {
    debug('parseBlockWriteUpdate(0)');
    try {
      const opt = Object.assign({ syncedCurrentBlock: false }, _opt);
      const syncedBlockNumber = opt.syncedCurrentBlock ? blockNumber.number :
        (blockNumber.number - this._config.BLOCK_TRACE_OFFSET);
      if (syncedBlockNumber >= this._config.BLOCK_TRACE_START) {
        // Check the block is synced or not
        const blockRecord = await this.BN_Database.retrieveByConditions({ blockNumber: syncedBlockNumber });
        if (!blockRecord.data.length) await this.BN_Database.writeBlockNumber(syncedBlockNumber);
        if (!blockRecord.data.length || !blockRecord.data[0].syncIsCompleted) {
          const block = await this._web3.eth.getBlock(syncedBlockNumber);
          for (let txHash of block['transactions']) {
            const TX = await this._web3.eth.getTransaction(txHash);
            const TXReceipt = await this._web3.eth.getTransactionReceipt(txHash);
            if (TX.to && TX.to.toLowerCase() === this.directoryID) {
              if (TXReceipt.status) {
                debug('parseBlockWriteUpdate(1): catch transaction');
                const transactionData = TX.input;
                const contractFuncNameHash = transactionData.slice(2, 10);
                debug('parseBlockWriteUpdate(1): contractFuncNameHash: ' + contractFuncNameHash);
                const decodedTransaction = await this._web3.eth.abi.decodeParameters(
                  transactionConfig[contractFuncNameHash].functionABI.inputs,
                  '0x' + transactionData.slice(10)
                );
                await this.confirmTxWriteUpdate(TX, contractFuncNameHash, decodedTransaction);
              } else {
                debug('parseBlockWriteUpdate(2): The status of transaction receipt is false.');
              }
            }
          }
          await this.BN_Database.updateSyncStatus(syncedBlockNumber);
        }
      }
    } catch (error) {
      debug('parseBlockWriteUpdate(3): ' + (error.message));
      stack('parseBlockWriteUpdate(3): ' + (error.stack || error));
      throw Error(error.message);
    }
  }

  async confirmTxWriteUpdate(TX, contractFuncNameHash, decodedTransaction) {
    debug('confirmTxWriteUpdate(0)');
    try {
      if (transactionConfig[contractFuncNameHash]) {
        switch (transactionConfig[contractFuncNameHash].functionABI.name) {
          case "register":
            {
              const request = {
                userType: decodedTransaction.userTypeIsProivder ? 'provider' : 'consumer',
                userID: decodedTransaction.userID,
                userAddress: decodedTransaction.userAddress.toLowerCase()
              };
              if (!await this.UR_Database.retrieveByConditions(this.directoryID, request.userType, { txHash: TX.hash }))
                await this.UR_Database.writeUserInfo(this.directoryID, request.userType, request, TX.hash);
              await this.UR_Database.updateConfirmation(this.directoryID, request.userType, TX.hash);
              let ATL_LOG = await this.ATL_Database.retrieveByConditions(this.directoryID, { txHash: TX.hash });
              if (!ATL_LOG.data.length) {
                await this.ATL_Database.writeAuditTrailLog(
                  this.directoryID,
                  undefined,
                  new Date(),
                  'New account is registered.',
                  TX.hash
                );
              }
              break;
            }
          case "createDataEntry":
            {
              const dataEntry = await this.DIR_Database.retrieveByConditions(this.directoryID, { DECTxHash: TX.hash }, { checkDueDate: false });
              const decodedDataSummary = JSON.parse(decodedTransaction.dataSummary);
              const account = await this.UR_Database.retrieveByConditions(this.directoryID, 'provider', {
                userAddress: TX.from.toLowerCase()
              });
              if (0 === dataEntry.data.length) {
                await this.DIR_Database.writeDataEntry(
                  this.directoryID,
                  account.data[0].userID,
                  TX.from,
                  {
                    dataCertificate: decodedDataSummary.dataCertificate,
                    dataOwnerCode: decodedDataSummary.dataOwnerCode,
                    dataEntryTitle: decodedDataSummary.dataEntryTitle,
                    dataDescription: decodedDataSummary.dataDescription,
                    dataAccessPath: decodedDataSummary.dataAccessPath,
                    dataOfferPrice: decodedTransaction.dataOfferPrice,
                    dataEntryCreationDate: decodedTransaction.dataEntryCreationDate,
                    dataEntryDueDate: decodedTransaction.dataEntryDueDate,
                    gender: decodedDataSummary.gender,
                    ageLowerBound: decodedDataSummary.ageLowerBound,
                    ageUpperBound: decodedDataSummary.ageUpperBound
                  },
                  TX.hash
                );
              }
              await this.DIR_Database.updateConfirmation(this.directoryID, TX.hash);
              this.socketServer.update && this.socketServer.update('DEC', 'provider', account.data[0].userID, 'A new data entry has been confirmed.');
              let ATL_LOG = await this.ATL_Database.retrieveByConditions(this.directoryID, { txHash: TX.hash });
              if (!ATL_LOG.data.length) {
                await this.ATL_Database.writeAuditTrailLog(
                  this.directoryID,
                  decodedDataSummary.dataCertificate,
                  new Date(),
                  'Data entry is created and written successfully.',
                  TX.hash
                );
              }
              break;
            }
          case "deleteDataEntry":
            {
              const dataEntry = await this.DIR_Database.retrieveByConditions(this.directoryID, { DEDTxHash: TX.hash }, { checkDueDate: false });
              if (dataEntry.data[0].isOffered)
                await this.DIR_Database.updateDataOfferStatus(this.directoryID, decodedTransaction.dataKey, TX.hash);
              let ATL_LOG = await this.ATL_Database.retrieveByConditions(this.directoryID, { txHash: TX.hash });
              if (!ATL_LOG.data.length) {
                await this.ATL_Database.writeAuditTrailLog(
                  this.directoryID,
                  dataEntry.data[0].dataCertificate,
                  new Date(),
                  'Data entry has been deleted.',
                  TX.hash
                );
              }
              break;
            }
          case "deployEAS":
            {
              decodedTransaction.dataConsumerAddress = decodedTransaction.consumerAddress.toLowerCase();
              const directoryContract = await this.MedXserver.accessContract('Directory', this.directoryID);
              // retrieve EAS index from directory contract
              const EASIndex = await directoryContract.methods.getEASIndex(decodedTransaction.dataKey, decodedTransaction.consumerAddress).call();
              // retrieve EAS address from directory contract
              const EASID = await directoryContract.methods.getDataEntryEASAddress(decodedTransaction.dataKey, EASIndex).call();
              // check whether EAS exists in database or not
              const EAS = await this.EAS_Database.retrieveByConditions(this.directoryID, { EASDTxHash: TX.hash });
              // get data entry information from DIR database
              const dataEntry = await this.DIR_Database.retrieveByConditions(this.directoryID, decodedTransaction, { checkDueDate: false });
              let dataConsumerID;
              // if EAS doesn't exist in database
              if (!EAS.data.length) {
                // get consumer information from UR database
                const consumerAccount = await this.UR_Database.retrieveByConditions(
                  this.directoryID,
                  'consumer',
                  { userAddress: decodedTransaction.dataConsumerAddress });
                dataConsumerID = consumerAccount.data[0].userAddress;
                // assign input data of EAS into request
                const agreement = JSON.parse(decodedTransaction.acknowledgement);
                const request = {
                  EASID: EASID,
                  dataConsumerID: consumerAccount.data[0].userID,
                  dataConsumerAddress: consumerAccount.data[0].userAddress,
                  dataKey: decodedTransaction.dataKey,
                  dataCertificate: dataEntry.data[0].dataCertificate,
                  // Todo: sync database under the blockchain
                  dataBiddingPrice: 0,
                  EASDeploymentDate: decodedTransaction.EASDeploymentDate,
                  EASExpirationDate: decodedTransaction.EASExpirationDate,
                  dataProviderAcknowledgement: JSON.stringify(agreement.dataProviderAcknowledgement),
                  dataConsumerAcknowledgement: JSON.stringify(agreement.dataConsumerAcknowledgement)
                };
                // write EAS into EAS database
                await this.EAS_Database.writeEAS(this.directoryID, request, TX.hash);
                // update EAS information
                await this.EAS_Database.updateConfirmation(this.directoryID, TX.hash);
                // remove associated agreement in data entry agreement database
                await this.AGR_Database.deleteDataEntryAgreement(
                  this.directoryID,
                  { dataKey: decodedTransaction.dataKey, userAddress: decodedTransaction.dataConsumerAddress }
                );
                await this.AGR_Database.deleteDataEntryAgreement(
                  this.directoryID,
                  { dataKey: decodedTransaction.dataKey, targetUserAddress: decodedTransaction.dataConsumerAddress }
                );
                // if EAS exists in database
              } else {
                dataConsumerID = EAS.data[0].dataConsumerID;
                // update EAS information
                await this.EAS_Database.updateEASID(this.directoryID, EAS.data[0].EASID, EASID);
                await this.EAS_Database.updateConfirmation(this.directoryID, TX.hash);
                // remove associated agreement in data entry agreement database
                await this.AGR_Database.deleteDataEntryAgreement(
                  this.directoryID,
                  { dataKey: decodedTransaction.dataKey, userAddress: decodedTransaction.dataConsumerAddress }
                );
                await this.AGR_Database.deleteDataEntryAgreement(
                  this.directoryID,
                  { dataKey: decodedTransaction.dataKey, targetUserAddress: decodedTransaction.dataConsumerAddress }
                );
              }
              this.socketServer.update && this.socketServer.update('EASD', 'provider', dataEntry.data[0].dataProviderID, 'An EAS has been confirmed.');
              this.socketServer.update && this.socketServer.update('EASD', 'consumer', dataConsumerID, 'An EAS has been confirmed.');
              let ATL_LOG = await this.ATL_Database.retrieveByConditions(this.directoryID, { txHash: TX.hash });
              if (!ATL_LOG.data.length) {
                await this.ATL_Database.writeAuditTrailLog(
                  this.directoryID,
                  dataEntry.data[0].dataCertificate,
                  new Date(),
                  'EAS is created and deployed successfully.',
                  TX.hash
                );
              }
              break;
            }
          case "invokeEAS":
            {
              const dataEntry = await this.DIR_Database.retrieveByConditions(this.directoryID, decodedTransaction, { checkDueDate: false });
              const downlaodIsFailed = await decodedTransaction.invocationRecord.search('failed');
              decodedTransaction.downloadStatus = downlaodIsFailed === -1 ? true : false;
              decodedTransaction.dataCertificate = dataEntry.data[0].dataCertificate;
              let auditMessage = 'EASI transaction is received.';
              if (!await this.EASI_Database.retrieveByConditions(this.directoryID, { txHash: TX.hash })) {
                await this.EASI_Database.writeEASInvocation(
                  this.directoryID,
                  new Date(),
                  decodedTransaction,
                  TX.hash
                );

                let EAS, validityStatus;
                if (decodedTransaction.downloadStatus) {
                  const invocationInformation = decodedTransaction.invocationRecord.split(',');
                  const consumerID = invocationInformation[1];
                  EAS = await this.EAS_Database.retrieveByConditions(this.directoryID, { dataConsumerID: consumerID, dataKey: decodedTransaction.dataKey }, { checkExpirationDate: false });
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
                auditMessage += ` Download status: ${decodedTransaction.downloadStatus}, Validity status: ${validityStatus}`;
              }
              await this.EASI_Database.updateConfirmation(this.directoryID, TX.hash);
              let ATL_LOG = await this.ATL_Database.retrieveByConditions(this.directoryID, { txHash: TX.hash });
              if (!ATL_LOG.data.length) {
                await this.ATL_Database.writeAuditTrailLog(
                  this.directoryID,
                  dataEntry.data[0].dataCertificate,
                  new Date(),
                  auditMessage,
                  TX.hash
                );
              }
              break;
            }
          case "revokeEASbyProvider":
            {
              decodedTransaction.dataConsumerAddress = decodedTransaction.consumerAddress.toLowerCase();
              const EAS = await this.EAS_Database.retrieveByConditions(this.directoryID, decodedTransaction, { checkExpirationDate: false });
              if (EAS.data[0].isValid && !EAS.data[0].downloadCount)
                await this.EAS_Database.updateDataValidityStatus(this.directoryID, EAS.data[0].EASID, TX.hash);
              let ATL_LOG = await this.ATL_Database.retrieveByConditions(this.directoryID, { txHash: TX.hash });
              if (!ATL_LOG.data.length) {
                await this.ATL_Database.writeAuditTrailLog(
                  this.directoryID,
                  EAS.data[0].dataCertificate,
                  new Date(),
                  'EASR transaction is received.',
                  TX.hash
                );
              }
              break;
            }
          case "revokeEASbyConsumer":
            {
              decodedTransaction.dataConsumerAddress = TX.from.toLowerCase();
              const EAS = await this.EAS_Database.retrieveByConditions(this.directoryID, decodedTransaction, { checkExpirationDate: false });
              if (EAS.data[0].isValid && !EAS.data[0].downloadCount)
                await this.EAS_Database.updateDataValidityStatus(this.directoryID, EAS.data[0].EASID, TX.hash);
              let ATL_LOG = await this.ATL_Database.retrieveByConditions(this.directoryID, { txHash: TX.hash });
              if (!ATL_LOG.data.length) {
                await this.ATL_Database.writeAuditTrailLog(
                  this.directoryID,
                  EAS.data[0].dataCertificate,
                  new Date(),
                  'EASR transaction is received.',
                  TX.hash
                );
              }
              break;
            }
        }
      } else {
        debug('confirmTxWriteUpdate(1): ' + 'Unknown transaction hash');
        throw Error('Unknown transaction hash');
      }
    } catch (error) {
      debug('confirmTxWriteUpdate(2): ' + (error.message));
      stack('confirmTxWriteUpdate(2): ' + (error.stack || error));
      throw Error(error.message);
    }
  }
};
