// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 2 -*-
//
// This file is part of ethereum-audit
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
// See the License for the specific language governing permissions AND
// limitations under the License.
//
// Author: Alison Lin <yslin1013@gmail.com>
//         Chihyen Liu <Chihyen_Liu@htc.com>

"use strict";

const sqlite3 = require('sqlite3').verbose();
const sha256 = require('crypto-js/sha256');
const debug = require('debug')('medx-server:database');
const moment = require('moment');

module.exports = {

  UserRegistration: class {

    constructor(UR_dbPath) {
      this.UR_dbPath = UR_dbPath;
      this.db = new sqlite3.Database(UR_dbPath, (err) => {
        if (err) { debug(err); }
        else {
          debug('Connected to the SQLite database');
          this.db.run(`CREATE TABLE IF NOT EXISTS provider (
            directoryID TEXT NOT NULL, 
            userID TEXT NOT NULL, 
            userAddress TEXT PRIMARY KEY,
            userPassword TEXT NOT NULL,
            isConfirmed BOOLEAN DEFAULT false NOT NULL,
            txHash TEXT NOT NULL)`, (err) => {
              if (err) debug(err);
              else debug('Table of Provider Registration is ready.');
            });
          this.db.run(`CREATE TABLE IF NOT EXISTS consumer (
            directoryID TEXT NOT NULL, 
            userID TEXT NOT NULL, 
            userAddress TEXT PRIMARY KEY,
            userPassword TEXT NOT NULL,
            isConfirmed BOOLEAN DEFAULT false NOT NULL,
            txHash TEXT NOT NULL)`, (err) => {
              if (err) debug(err);
              else debug('Table of Consumer Registration is ready.');
            });
          this.db.run(`CREATE TABLE IF NOT EXISTS auditor (
            directoryID TEXT NOT NULL, 
            userID TEXT NOT NULL, 
            userAddress TEXT PRIMARY KEY, 
            userPassword TEXT NOT NULL,
            isConfirmed BOOLEAN DEFAULT true NOT NULL,
            txHash TEXT)`, (err) => {
              if (err) debug(err);
              else debug('Table of auditor Registration is ready.');
            });
        }
      });
    }

    writeUserInformation(directoryID, userType, inputData, txHash) {
      debug('UserRegistration:writeUserInfo()');
      return new Promise((resolve, reject) => {
        this.connect();
        if (userType === 'auditor') {
          inputData.userAddress = sha256(JSON.stringify(inputData)).toString();
          inputData.txHash = inputData.userAddress;
        }
        inputData.userPassword = sha256(inputData.userPassword).toString(); // double hashed
        this.db.run(`INSERT INTO ${userType} VALUES (?,?,?,?,?,?)`,
          [directoryID,
            inputData.userID,
            inputData.userAddress,
            inputData.userPassword,
            false,
            txHash
          ], (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              const result = {
                message: 'New account is registered.',
                data: {
                  userType: userType,
                  userID: inputData.userID,
                  userAddress: inputData.userAddress
                }
              };
              debug(result);
              resolve(result);
            }
          });
        //this.close();
      });
    }

    updateConfirmation(directoryID, userType, txHash) {
      debug('UserRegistration:updateConfirmation()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(
          `UPDATE ${userType} SET isConfirmed=true WHERE directoryID=? AND txHash=?`,
          directoryID, txHash, (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              this.db.all(`SELECT changes()`, (err, rows) => {
                if (err) {
                  debug(err);
                  reject(err);
                } else {
                  debug(rows);
                  if (rows[0]['changes()'] > 0) {
                    const result = {
                      message: 'Account has been registered on blockchain.',
                      data: {
                        isConfirmed: true
                      }
                    };
                    debug(result);
                    resolve(result);
                  } else { reject(Error('No confirmation is updated.')); }
                }
              });
            }
          });
        //this.close();
      });
    }

    retrieveProviderAll() {
      debug('UserRegistration:retrieveProviderAll()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM provider`, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'All provider registration information is retrieved.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    retrieveConsumerAll() {
      debug('UserRegistration:retrieveConsumerAll()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM consumer`, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'All consumer registration information is retrieved.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    retrieveAuditorAll() {
      debug('UserRegistration:retrieveAuditorAll()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM auditor`, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'All auditor registration information is retrieved.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    retrieveByConditions(directoryID, userType, condition) {
      debug('UserRegistration:retrieveByConditions()');
      return new Promise((resolve, reject) => {
        this.connect();
        let query = `SELECT * FROM ${userType} WHERE directoryID='${directoryID}'`;
        //let query = `SELECT * FROM ${userType} WHERE directoryID='${directoryID}' `;
        if (condition.userID) query += `AND userID='${condition.userID}' `;
        if (condition.userAddress) query += `AND userAddress='${condition.userAddress}' `;
        if (condition.txHash) query += `AND txHash='${condition.txHash}' `;
        this.db.all(query, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'Registration information is retrieved conditionally.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    checkUserExist(directoryID, userType, userID, userAddress) {
      debug('UserRegistration:checkUserExist()');
      return new Promise((resolve, reject) => {
        this.connect();
        let query;
        if (userID && userAddress)
          query = `SELECT * FROM ${userType} WHERE directoryID='${directoryID}' AND (userID='${userID}' OR userAddress='${userAddress}')`;
        else if (userID)
          query = `SELECT * FROM ${userType} WHERE directoryID='${directoryID}' AND userID='${userID}'`;
        else if (userAddress)
          query = `SELECT * FROM ${userType} WHERE directoryID='${directoryID}' AND userAddress='${userAddress}'`;
        else reject(Error('Both userID and userAddress are not defined.'));
        this.db.all(query, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            debug(rows);
            if (rows.length > 0) resolve(true);
            else resolve(false);
          }
        });
        //this.close();
      });
    }

    checkUserPassword(directoryID, userType, condition) {
      debug('UserRegistration:checkUserPassword()');
      return new Promise((resolve, reject) => {
        this.connect();
        let query = `SELECT * FROM ${userType} WHERE directoryID='${directoryID}' `;
        query += `AND userID='${condition.userID}'`;
        this.db.all(query, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            debug(rows);
            const hashedPassword = sha256(condition.userPassword).toString();
            if (rows.length > 0 && hashedPassword === rows[0].userPassword) { // double hashed
              const result = {
                message: 'User logins successfully.',
                data: {
                  userType: userType,
                  userID: condition.userID,
                  userAddress: rows[0].userAddress
                }
              };
              debug(result);
              resolve(result);
            } else {
              const error = Error('Wrong user ID or password.');
              debug(error);
              reject(error);
            }
          }
        });
        //this.close();
      });
    }

    connect() {
      if (this.db && !this.db.open) {
        this.db = new sqlite3.Database(this.UR_dbPath, (err) => {
          if (err) debug(err);
          else debug('Connected to User Registration database');
        });
      }
    }

    close() {
      if (this.db && this.db.open) {
        this.db.close((err) => {
          if (err) debug(err);
          else debug('Closed User Registration database connection');
        });
      }
    }

  },

  DataDirectory: class {

    constructor(DIR_dbPath) {
      this.DIR_dbPath = DIR_dbPath;
      this.db = new sqlite3.Database(DIR_dbPath, (err) => {
        if (err) { debug(err); }
        else {
          debug('Connected to the SQLite database');
          this.db.run(`CREATE TABLE IF NOT EXISTS dataDirectory (
            directoryID TEXT NOT NULL,
            dataProviderID TEXT NOT NULL, 
            dataProviderAddress TEXT NOT NULL,
            dataKey TEXT PRIMARY KEY, 
            dataCertificate TEXT NOT NULL,
            dataOwnerCode TEXT NOT NULL, 
            dataEntryTitle TEXT NOT NULL, 
            dataDescription TEXT NOT NULL, 
            dataAccessPath TEXT NOT NULL,
            dataOfferPrice INTEGER NOT NULL,
            dataEntryCreationDate TEXT NOT NULL,
            dataEntryDueDate TEXT NOT NULL,
            ageLowerBound INTEGER NOT NULL,
            ageUpperBound INTEGER NOT NULL,
            gender TEXT NOT NULL,
            isOffered BOOLEAN DEFAULT true NOT NULL,
            isConfirmed BOOLEAN DEFAULT false NOT NULL,
            DECTxHash TEXT NOT NULL,
            DEDTxHash TEXT)`, (err) => {
              if (err) debug(err);
              else debug('Table of Data Directory is ready.');
            });
        }
      });
    }

    writeDataEntry(directoryID, dataProviderID, dataProviderAddress, inputData, DECTxHash) {
      debug('DataDirectory:writeDataEntry()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`INSERT INTO dataDirectory VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [directoryID,
            dataProviderID,
            dataProviderAddress,
            inputData.dataEntryCreationDate.toString() + inputData.dataCertificate,
            inputData.dataCertificate,
            inputData.dataOwnerCode,
            inputData.dataEntryTitle,
            inputData.dataDescription,
            inputData.dataAccessPath,
            inputData.dataOfferPrice,
            moment.unix(parseInt(inputData.dataEntryCreationDate)).format('YYYY-MM-DD HH:mm:ss'),
            moment.unix(parseInt(inputData.dataEntryDueDate)).format('YYYY-MM-DD HH:mm:ss'),
            inputData.ageLowerBound,
            inputData.ageUpperBound,
            inputData.gender,
            true,
            false,
            DECTxHash,
            0
          ], (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              const result = {
                message: 'Data entry is created and written successfully.',
                data: {
                  directoryID: directoryID,
                  dataProviderID: dataProviderID,
                  dataProviderAddress: dataProviderAddress,
                  dataCertificate: inputData.dataCertificate,
                  dataOwnerCode: inputData.dataOwnerCode,
                  dataEntryTitle: inputData.dataEntryTitle,
                  dataDescription: inputData.dataDescription,
                  dataAccessPath: inputData.dataAccessPath,
                  dataOfferPrice: inputData.dataOfferPrice,
                  dataEntryCreationDate: moment.unix(parseInt(inputData.dataEntryCreationDate)).format('YYYY-MM-DD HH:mm:ss'),
                  dataEntryDueDate: moment.unix(parseInt(inputData.dataEntryDueDate)).format('YYYY-MM-DD HH:mm:ss'),
                  ageLowerBound: inputData.ageLowerBound,
                  ageUpperBound: inputData.ageUpperBound,
                  gender: inputData.gender,
                  isOffered: true,
                  isConfirmed: false,
                  DECTxHash: DECTxHash
                }
              };
              debug(result);
              resolve(result);
            }
          });
        //this.close();
      });
    }

    updateDataOfferStatus(directoryID, dataKey, DEDTxHash, _mode = {}) {
      debug('DataDirectory:updateDataOfferStatus()');
      const mode = Object.assign({ deleteDueEntry: false }, _mode);
      return new Promise((resolve, reject) => {
        this.connect();
        let deleteOrder = `UPDATE dataDirectory SET isOffered=false, DEDTxHash='${DEDTxHash}' WHERE directoryID='${directoryID}' AND dataKey='${dataKey}'`;
        const offset_GMT = new Date().getTimezoneOffset();
        if (mode.deleteDueEntry) deleteOrder = `UPDATE dataDirectory SET isOffered=false WHERE directoryID='${directoryID}' AND isOffered=true AND strftime('%s',dataEntryDueDate)<='${moment().unix() - offset_GMT * 60}' `;
        this.db.run(deleteOrder, (err) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            this.db.all(`SELECT changes()`, (err, rows) => {
              if (err) {
                debug(err);
                reject(err);
              } else {
                debug(rows);
                if (rows[0]['changes()'] > 0) {
                  const result = {
                    message: 'Data entry has been deleted.',
                    data: {
                      isOffered: false
                    }
                  };
                  debug(result);
                  resolve(result);
                } else { resolve('No data valid status is updated.'); }
              }
            });
          }
        });
        //this.close();
      });
    }

    updateConfirmation(directoryID, DECTxHash) {
      debug('DataDirectory:updateConfirmation()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(
          `UPDATE dataDirectory SET isConfirmed=true WHERE directoryID=? AND DECTxHash=?`,
          directoryID, DECTxHash, (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              this.db.all(`SELECT changes()`, (err, rows) => {
                if (err) {
                  debug(err);
                  reject(err);
                } else {
                  debug(rows);
                  if (rows[0]['changes()'] > 0) {
                    const result = {
                      message: 'Data entry has been created on blockchain.',
                      data: {
                        isConfirmed: true
                      }
                    };
                    debug(result);
                    resolve(result);
                  } else { reject(Error('No confirmation is updated.')); }
                }
              });
            }
          });
        //this.close();
      });
    }

    retrieveAll() {
      debug('DataDirectory:retrieveAll()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM dataDirectory`, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'All data entry information is retrieved.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    retrieveByConditions(directoryID, condition, _opt = {}) {
      debug('DataDirectory:retrieveByConditions()');
      const opt = Object.assign({ checkDueDate: true }, _opt);
      return new Promise((resolve, reject) => {
        this.connect();
        let query = `SELECT * FROM dataDirectory WHERE directoryID='${directoryID}'`;
        const baseQuery = query;
        if (condition.userID) query += `AND dataProviderID='${condition.userID}' `;
        if (condition.userAddress) query += `AND dataProviderAddress='${condition.userAddress}' `;
        if (condition.dataKey) query += `AND dataKey='${condition.dataKey}' `;
        if (condition.dataCertificate) query += `AND dataCertificate='${condition.dataCertificate}' `;
        if (condition.dataOwnerCode) query += `AND dataOwnerCode='${condition.dataOwnerCode}' `;
        if (condition.dataEntryTitle && condition.dataDescription) {
          query += `AND (dataEntryTitle LIKE '%${condition.dataEntryTitle}%' OR dataDescription LIKE '%${condition.dataDescription}%') `;
        } else {
          if (condition.dataEntryTitle) query += `AND dataEntryTitle LIKE '%${condition.dataEntryTitle}%' `;
          if (condition.dataDescription) query += `AND dataDescription LIKE '%${condition.dataDescription}%' `;
        }
        if (condition.gender) query += `AND (gender='${condition.gender}' OR gender='Both')`;
        if (condition.ageLowerBound && condition.ageUpperBound) {
          query += `AND NOT ageLowerBound > '${condition.ageUpperBound}' AND
            NOT ageUpperBound < '${condition.ageLowerBound}'`;
        }
        if (condition.filters) {
          let queryCondition;
          for (let filter in condition.filters) {
            queryCondition = filter + ': ' + condition.filters[filter].value;
            query += `AND dataDescription LIKE '%${queryCondition}%' `;
          }
        }
        if (condition.priceLowerBound && condition.priceLowerBound > 0)
          query += `AND dataOfferPrice>=${condition.priceLowerBound} `;
        if (condition.priceUpperBound && condition.priceUpperBound > 0)
          query += `AND dataOfferPrice<=${condition.priceUpperBound} `;
        if (condition.DECTxHash) query += `AND DECTxHash='${condition.DECTxHash}' `;
        if (condition.DEDTxHash) query += `AND DEDTxHash='${condition.DEDTxHash}' `;
        const offset_GMT = new Date().getTimezoneOffset();
        if (opt.checkDueDate) query += `AND strftime('%s',dataEntryDueDate)>='${moment().unix() - offset_GMT * 60}' `;
        if (query !== baseQuery) {
          this.db.all(query, (err, rows) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              debug(rows);
              const result = {
                message: 'Data entry information is retrieved conditionally.',
                data: rows
              };
              debug(result);
              resolve(result);
            }
          });
        } else {
          const result = {
            message: 'Data entry information is retrieved conditionally.',
            data: []
          };
          debug(result);
          resolve(result);
        }
        //this.close();
      });
    }

    connect() {
      if (this.db && !this.db.open) {
        this.db = new sqlite3.Database(this.DIR_dbPath, (err) => {
          if (err) debug(err);
          else debug('Connected to Data Directory database');
        });
      }
    }

    close() {
      if (this.db && this.db.open) {
        this.db.close((err) => {
          if (err) debug(err);
          else debug('Closed Data Directory database connection');
        });
      }
    }

  },

  DataEntryAgreement: class {

    constructor(AGR_dbPath) {
      this.AGR_dbPath = AGR_dbPath;
      this.db = new sqlite3.Database(AGR_dbPath, (err) => {
        if (err) { debug(err); }
        else {
          debug('Connected to the SQLite database');
          this.db.run(`CREATE TABLE IF NOT EXISTS dataEntryAgreement (
            directoryID TEXT NOT NULL,
            userID TEXT NOT NULL, 
            targetUserID TEXT NOT NULL, 
            userAddress TEXT NOT NULL, 
            targetUserAddress TEXT NOT NULL, 
            userType TEXT NOT NULL,
            dataKey TEXT NOT NULL, 
            dataBiddingPrice INTEGER NOT NULL,
            EASExpirationDate TEXT NOT NULL,
            acknowledgement TEXT NOT NULL,
            isRejected BOOLEAN NOT NULL)`, (err) => {
              if (err) debug(err);
              else debug('Table of data entry agreement is ready.');
            });
        }
      });
    }

    writeDataEntryAgreement(directoryID, userAddress, targetUserAddress, inputData) {
      debug('DataEntryAgreement:writeDataEntryAgreement()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`INSERT INTO dataEntryAgreement VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [directoryID,
            inputData.userID,
            inputData.targetUserID,
            userAddress,
            targetUserAddress,
            inputData.userType,
            inputData.dataKey,
            inputData.dataBiddingPrice,
            moment.unix(parseInt(inputData.EASExpirationDate)).format('YYYY-MM-DD HH:mm:ss'),
            JSON.stringify(inputData.acknowledgement),
            false,
          ], (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              const result = {
                message: 'Data entry agreement is created and written successfully.',
                data: {
                  userID: inputData.userID,
                  targetUserID: inputData.targetUserID,
                  userAddress: userAddress,
                  targetUserAddress: targetUserAddress,
                  userType: inputData.userType,
                  dataBiddingPrice: inputData.dataBiddingPrice,
                  EASExpirationDate: moment.unix(parseInt(inputData.EASExpirationDate)).format('YYYY-MM-DD HH:mm:ss'),
                  acknowledgement: inputData.acknowledgement
                }
              };
              debug(result);
              resolve(result);
            }
          });
        //this.close();
      });
    }


    rejectDataEntryAgreement(directoryID, inputData) {
      debug('DataEntryAgreement:rejectDataEntryAgreement()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(
          `UPDATE dataEntryAgreement SET isRejected=true WHERE directoryID=? AND dataKey=? AND userID=? AND targetUserID=?`,
          directoryID, inputData.dataKey, inputData.userID, inputData.targetUserID, (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              this.db.all(`SELECT changes()`, (err, rows) => {
                if (err) {
                  debug(err);
                  reject(err);
                } else {
                  debug(rows);
                  if (rows[0]['changes()'] > 0) {
                    const result = {
                      message: 'Data entry agreement is rejected successfully.',
                      data: {
                        isRejected: true
                      }
                    };
                    debug(result);
                    resolve(result);
                  } else { reject(Error('No rejected status is updated.')); }
                }
              });
            }
          });
      });
    }

    deleteDataEntryAgreement(directoryID, condition) {
      debug('DataEntryAgreement:removeDataEntryAgreement()');
      return new Promise((resolve, reject) => {
        this.connect();
        if (!condition.dataKey) {
          const result = {
            message: 'Require a dataKey to delete agreement'
          };
          resolve(result);
        }
        let deleteOrder = `DELETE FROM dataEntryAgreement WHERE directoryID='${directoryID}' AND dataKey='${condition.dataKey}'`;
        if (condition.userAddress) deleteOrder += `AND userAddress='${condition.userAddress}' `;
        if (condition.targetUserAddress) deleteOrder += `AND targetUserAddress='${condition.targetUserAddress}' `;
        this.db.run(deleteOrder, (err) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'Data entry agreement is deleted successfully.',
              data: {
                dataKey: condition.dataKey
              }
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    retrieveAll() {
      debug('DataEntryAgreement:retrieveAll()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM dataEntryAgreement`, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'All data entry agreements are retrieved.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    retrieveByConditions(directoryID, condition) {
      debug('DataEntryAgreement:retrieveByConditions()');
      return new Promise((resolve, reject) => {
        this.connect();
        let query = `SELECT * FROM dataEntryAgreement WHERE directoryID='${directoryID}' `;
        //let query = `SELECT * FROM dataDirectory WHERE directoryID='${directoryID}' AND isOffered=true `;
        if (condition.userID) query += `AND userID='${condition.userID}' `;
        if (condition.targetUserID) query += `AND targetUserID='${condition.targetUserID}' `;
        if (condition.userAddress) query += `AND userAddress='${condition.userAddress}' `;
        if (condition.targetUserAddress) query += `AND targetUserAddress='${condition.targetUserAddress}' `;
        if (condition.userType) query += `AND userType='${condition.userType}' `;
        if (condition.dataKey) query += `AND dataKey='${condition.dataKey}' `;
        this.db.all(query, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'Data entry agreement is retrieved conditionally.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    connect() {
      if (this.db && !this.db.open) {
        this.db = new sqlite3.Database(this.AGR_dbPath, (err) => {
          if (err) debug(err);
          else debug('Connected to Agreement database');
        });
      }
    }

    close() {
      if (this.db && this.db.open) {
        this.db.close((err) => {
          if (err) debug(err);
          else debug('Closed Agreement database connection');
        });
      }
    }

  },

  ExecutableAgreementScript: class {

    constructor(EAS_dbPath) {
      this.EAS_dbPath = EAS_dbPath;
      this.db = new sqlite3.Database(EAS_dbPath, (err) => {
        if (err) { debug(err); }
        else {
          debug('Connected to the SQLite database');
          this.db.run(`CREATE TABLE IF NOT EXISTS EAS (
            directoryID TEXT NOT NULL,
            EASID TEXT NOT NULL, 
            dataConsumerID TEXT NOT NULL,
            dataConsumerAddress TEXT NOT NULL,
            dataKey TEXT NOT NULL, 
            dataCertificate TEXT NOT NULL, 
            dataBiddingPrice INTERER NOT NULL,
            EASDeploymentDate TEXT NOT NULL,
            EASExpirationDate TEXT NOT NULL,
            dataProviderAcknowledgement TEXT NOT NULL,
            dataConsumerAcknowledgement TEXT NOT NULL,
            isValid BOOLEAN DEFAULT true NOT NULL,
            isConfirmed BOOLEAN DEFAULT false NOT NULL,
            downloadCount INTEGER NOT NULL,
            EASDTxHash TEXT PRIMARY KEY,
            EASRTxHash TEXT NOT NULL)`, (err) => {
              if (err) debug(err);
              else debug('Table of EAS is ready.');
            });
        }
      });
    }

    writeEAS(directoryID, inputData, EASDTxHash) {
      debug('ExecutableAgreementScript:writeEas()');
      return new Promise((resolve, reject) => {
        this.connect();
        if (!inputData.EASID)
          inputData.EASID = sha256(inputData.dataProviderAddress + inputData.dataConsumerAddress + inputData.dataKey).toString();
        this.db.run(`INSERT INTO EAS VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [directoryID,
            inputData.EASID,
            inputData.dataConsumerID,
            inputData.dataConsumerAddress,
            inputData.dataKey,
            inputData.dataCertificate,
            inputData.dataBiddingPrice,
            moment.unix(parseInt(inputData.EASDeploymentDate)).format('YYYY-MM-DD HH:mm:ss'),
            moment.unix(parseInt(inputData.EASExpirationDate)).format('YYYY-MM-DD HH:mm:ss'),
            inputData.dataProviderAcknowledgement,
            inputData.dataConsumerAcknowledgement,
            true,
            false,
            0,
            EASDTxHash,
            0
          ], (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              const result = {
                message: 'EAS is created and deployed successfully.',
                data: {
                  directoryID: directoryID,
                  dataConsumerID: inputData.dataConsumerID,
                  dataConsumerAddress: inputData.dataConsumerAddress,
                  dataKey: inputData.dataKey,
                  dataCertificate: inputData.dataCertificate,
                  dataBiddingPrice: inputData.dataBiddingPrice,
                  EASDeploymentDate: moment.unix(parseInt(inputData.EASDeploymentDate)).format('YYYY-MM-DD HH:mm:ss'),
                  EASExpirationDate: moment.unix(parseInt(inputData.EASExpirationDate)).format('YYYY-MM-DD HH:mm:ss'),
                  dataProviderAcknowledgement: inputData.dataProviderAcknowledgement,
                  dataConsumerAcknowledgement: inputData.dataConsumerAcknowledgement,
                  isValid: true,
                  isConfirmed: false,
                  EASDTxHash: EASDTxHash
                }
              };
              debug(result);
              resolve(result);
            }
          });
        //this.close();
      });
    }

    updateDataValidityStatus(directoryID, EASID, EASRTxHash, _mode = {}) {
      const mode = Object.assign({ revokeExpiredEAS: false }, _mode);
      debug('ExecutableAgreementScript:updateDataValidityStatus()');
      return new Promise((resolve, reject) => {
        this.connect();
        let revokeOrder = `UPDATE EAS SET isValid=false, EASRTxHash='${EASRTxHash}' WHERE directoryID='${directoryID}' AND EASID='${EASID}'`;
        if (mode.revokeExpiredEAS) {
          const offset_GMT = new Date().getTimezoneOffset();
          revokeOrder = `UPDATE EAS SET isValid=false WHERE directoryID='${directoryID}' AND isValid=true AND strftime('%s',EASExpirationDate)<='${moment().unix() - offset_GMT * 60}' `;
        }
        this.db.run(revokeOrder, (err) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            this.db.all(`SELECT changes()`, (err, rows) => {
              if (err) {
                debug(err);
                reject(err);
              } else {
                debug(rows);
                if (rows[0]['changes()'] > 0) {
                  const result = {
                    message: 'EAS has been revoked.',
                    data: {
                      isValid: false
                    }
                  };
                  debug(result);
                  resolve(result);
                } else { resolve('No data valid status is updated.'); }
              }
            });
          }
        });
        //this.close();
      });
    }

    updateEASID(directoryID, oldEASID, newEASID) {
      debug('ExecutableAgreementScript:updateEASID()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`UPDATE EAS SET EASID=? WHERE directoryID=? AND EASID=?`, newEASID, directoryID, oldEASID, (err) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            this.db.all(`SELECT changes()`, (err, rows) => {
              if (err) {
                debug(err);
                reject(err);
              } else {
                debug(rows);
                if (rows[0]['changes()'] > 0) {
                  const result = {
                    message: 'EASID has been updated in database.',
                    data: {
                      EASID: newEASID
                    }
                  };
                  debug(result);
                  resolve(result);
                } else { reject(Error('No EASID is updated.')); }
              }
            });
          }
        });
        //this.close();
      });
    }

    updateDownloadCount(directoryID, EASID) {
      debug('ExecutableAgreementScript:updateDownloadCount()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`UPDATE EAS SET downloadCount=downloadCount+1 WHERE directoryID=? AND EASID=?`, directoryID, EASID, (err) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            this.db.all(`SELECT changes()`, (err, rows) => {
              if (err) {
                debug(err);
                reject(err);
              } else {
                debug(rows);
                if (rows[0]['changes()'] > 0) {
                  const result = {
                    message: 'downloadCount has been updated in database.'
                  };
                  debug(result);
                  resolve(result);
                } else { reject(Error('No downloadCount is updated.')); }
              }
            });
          }
        });
        //this.close();
      });
    }

    updateConfirmation(directoryID, EASDTxHash) {
      debug('ExecutableAgreementScript:updateConfirmation()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`UPDATE EAS SET isConfirmed=true WHERE directoryID=? AND EASDTxHash=?`, directoryID, EASDTxHash, (err) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            this.db.all(`SELECT changes()`, (err, rows) => {
              if (err) {
                debug(err);
                reject(err);
              } else {
                debug(rows);
                if (rows[0]['changes()'] > 0) {
                  const result = {
                    message: 'EAS has been created on blockchain.',
                    data: {
                      isConfirmed: true
                    }
                  };
                  debug(result);
                  resolve(result);
                } else { reject(Error('No confirmation is updated.')); }
              }
            });
          }
        });
        //this.close();
      });
    }

    retrieveAll() {
      debug('ExecutableAgreementScript:retrieveAll()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM EAS`, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'All EAS information is retrieved.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    retrieveByConditions(directoryID, condition, _opt = {}) {
      debug('ExecutableAgreementScript:retrieveByConditions()');
      const opt = Object.assign({ checkExpirationDate: true }, _opt);
      return new Promise((resolve, reject) => {
        this.connect();
        let query = `SELECT * FROM EAS WHERE directoryID='${directoryID}'`;
        if (condition.dataConsumerID) query += `AND dataConsumerID='${condition.dataConsumerID}' `;
        if (condition.dataConsumerAddress) query += `AND dataConsumerAddress='${condition.dataConsumerAddress}' `;
        if (condition.dataKey) query += `AND dataKey='${condition.dataKey}' `;
        if (condition.dataCertificate) query += `AND dataCertificate='${condition.dataCertificate}' `;
        if (condition.EASID) query += `AND EASID='${condition.EASID}' `;
        if (condition.EASDTxHash) query += `AND EASDTxHash='${condition.EASDTxHash}' `;
        if (condition.EASRTxHash) query += `AND EASRTxHash='${condition.EASRTxHash}' `;
        const offset_GMT = new Date().getTimezoneOffset();
        if (opt.checkExpirationDate) query += `AND strftime('%s',EASExpirationDate)>='${moment().unix() - offset_GMT * 60}' `;
        this.db.all(query, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            debug(rows);
            const result = {
              message: 'EAS information is retrieved conditionally.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    connect() {
      if (this.db && !this.db.open) {
        this.db = new sqlite3.Database(this.EAS_dbPath, (err) => {
          if (err) debug(err);
          else debug('Connected to EAS database');
        });
      }
    }

    close() {
      if (this.db && this.db.open) {
        this.db.close((err) => {
          if (err) debug(err);
          else debug('Closed EAS database connection');
        });
      }
    }

  },

  EASInvocation: class {
    constructor(EASI_dbPath) {
      this.EASI_dbPath = EASI_dbPath;
      this.db = new sqlite3.Database(EASI_dbPath, (err) => {
        if (err) { debug(err); }
        else {
          debug('Connected to the SQLite database');
          this.db.run(`CREATE TABLE IF NOT EXISTS EASInvocation (
            directoryID TEXT NOT NULL,
            dataKey TEXT NOT NULL,
            dataCertificate TEXT NOT NULL,
            invocationDate TEXT NOT NULL, 
            invocationRecord TEXT NOT NULL,
            isConfirmed BOOLEAN DEFAULT false NOT NULL,
            downloadStatus BOOLEAN NOT NULL,
            txHash TEXT PRINARY KEY )`, (err) => {
              if (err) debug(err);
              else debug('Table of invoke record is ready.');
            });
        }
      });
    }

    writeEASInvocation(directoryID, invocationDate, inputData, txHash) {
      debug('EASInvocation:writeEASInvocation()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`INSERT INTO EASInvocation VALUES (?,?,?,?,?,?,?,?)`,
          [directoryID,
            inputData.dataKey,
            inputData.dataCertificate,
            moment.unix(parseInt(invocationDate)).format('YYYY-MM-DD HH:mm:ss'),
            inputData.invocationRecord,
            false,
            inputData.downloadStatus,
            txHash
          ], (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              const result = {
                message: 'Invocation log is written successfully.',
                data: {
                  directoryID: directoryID,
                  dataCertificate: inputData.dataCertificate,
                  invocationDate: moment(invocationDate).format('YYYY-MM-DD HH:mm:ss'),
                  invocationRecord: inputData.invocationRecord,
                  downloadStatus: inputData.downloadStatus,
                  txHash: txHash
                }
              };
              debug(result);
              resolve(result);
            }
          });
        //this.close();
      });
    }

    updateConfirmation(directoryID, txHash) {
      debug('EASInvocation:updateConfirmation()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(
          `UPDATE EASInvocation SET isConfirmed=true WHERE directoryID=? AND txHash=?`,
          directoryID, txHash, (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              this.db.all(`SELECT changes()`, (err, rows) => {
                if (err) {
                  debug(err);
                  reject(err);
                } else {
                  debug(rows);
                  if (rows[0]['changes()'] > 0) {
                    const result = {
                      message: 'Invocation record has been logged on blockchain.',
                      data: {
                        isConfirmed: true
                      }
                    };
                    debug(result);
                    resolve(result);
                  } else { reject(Error('No confirmation is updated.')); }
                }
              });
            }
          });
        //this.close();
      });
    }

    retrieveByConditions(directoryID, condition) {
      debug('EASInvocation:retrieveByConditions()');
      return new Promise((resolve, reject) => {
        this.connect();
        let query = `SELECT * FROM EASInvocation WHERE directoryID='${directoryID}'`;
        if (condition.dataKey) query += `AND dataKey='${condition.dataKey}' `;
        if (condition.dataCertificate) query += `AND dataCertificate='${condition.dataCertificate}' `;
        if (condition.txHash) query += `AND txHash='${condition.txHash}' `;
        this.db.all(query, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'EAS invocation record is retrieved by conditions.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
      });
    }

    connect() {
      if (this.db && !this.db.open) {
        this.db = new sqlite3.Database(this.EASI_dbPath, (err) => {
          if (err) debug(err);
          else debug('Connected to EASI database');
        });
      }
    }

    close() {
      if (this.db && this.db.open) {
        this.db.close((err) => {
          if (err) debug(err);
          else debug('Closed EASI database connection');
        });
      }
    }

  },

  AuditTrailLog: class {

    constructor(ATL_dbPath) {
      this.ATL_dbPath = ATL_dbPath;
      this.db = new sqlite3.Database(ATL_dbPath, (err) => {
        if (err) { debug(err); }
        else {
          debug('Connected to the SQLite database');
          this.db.run(`CREATE TABLE IF NOT EXISTS auditTrailLog (
            directoryID TEXT NOT NULL,
            dataCertificate TEXT,
            loggingDate TEXT NOT NULL, 
            loggingMessage TEXT NOT NULL,
            txHash TEXT NOT NULL)`, (err) => {
              if (err) debug(err);
              else debug('Table of Audit Log is ready.');
            });
        }
      });
    }

    writeAuditTrailLog(directoryID, dataCertificate, loggingDate, loggingMessage, txHash) {
      debug('AuditTrailLog:writeAuditTrailLog()');
      return new Promise((resolve, reject) => {
        this.connect();
        const loggingDateTEXT = moment(loggingDate).format('YYYY-MM-DD HH:mm:ss');
        this.db.run(`INSERT INTO auditTrailLog VALUES (?,?,?,?,?)`,
          [directoryID,
            dataCertificate,
            loggingDateTEXT,
            loggingMessage,
            txHash
          ], (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              const result = {
                message: 'Audit log is written successfully.',
                data: {
                  directoryID: directoryID,
                  dataCertificate: dataCertificate,
                  loggingDate: loggingDateTEXT,
                  loggingMessage: loggingMessage,
                  txHash: txHash
                }
              };
              debug(result);
              resolve(result);
            }
          });
        //this.close();
      });
    }

    retrieveAll() {
      debug('AuditTrailLog:retrieveAll()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM auditTrailLog`, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'All audit logs are retrieved.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    retrieveByConditions(directoryID, condition) {
      debug('AuditTrailLog:retrieveByConditions()');
      return new Promise((resolve, reject) => {
        this.connect();
        let query = `SELECT * FROM auditTrailLog WHERE directoryID='${directoryID}' `;
        if (condition.dataCertificate) query += `AND dataCertificate='${condition.dataCertificate}' `;
        if (condition.loggingMessage) query += `AND loggingMessage LIKE '%${condition.loggingMessage}%' `;
        const offset_GMT = new Date().getTimezoneOffset();
        if (condition.dateLowerBound) query += `AND strftime('%s',loggingDate)>='${condition.dateLowerBound - offset_GMT * 60}' `;
        if (condition.dateUpperBound) query += `AND strftime('%s',loggingDate)<='${condition.dateUpperBound - offset_GMT * 60}' `;
        if (condition.txHash) query += `AND txHash='${condition.txHash}' `;
        query += `ORDER BY loggingDate DESC`;
        debug('query: ' + query);
        this.db.all(query, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'Audit logs are retrieved conditionally.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    connect() {
      if (this.db && !this.db.open) {
        this.db = new sqlite3.Database(this.ATL_dbPath, (err) => {
          if (err) debug(err);
          else debug('Connected to Audit Log database');
        });
      }
    }

    close() {
      if (this.db && this.db.open) {
        this.db.close((err) => {
          if (err) debug(err);
          else debug('Closed Audit Log database connection');
        });
      }
    }

  },

  BlockNumber: class {

    constructor(BN_dbPath) {
      this.BN_dbPath = BN_dbPath;
      this.db = new sqlite3.Database(BN_dbPath, (err) => {
        if (err) { debug(err); }
        else {
          debug('Connected to the SQLite database');
          this.db.run(`CREATE TABLE IF NOT EXISTS blockNumber (
            number UNSIGNED BIG INT NOT NULL,
            syncIsCompleted bool NOT NULL)`, (err) => {
              if (err) debug(err);
              else debug('Table of Block Number is ready.');
            });
        }
      });
    }

    writeBlockNumber(blockNumber) {
      debug('BlockNumber:writeBlockNumber()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`INSERT INTO blockNumber VALUES (?,?)`, blockNumber, false, (err) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'Block number is written successfully.',
              data: {
                blockNumber: blockNumber
              }
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    updateSyncStatus(blockNumber) {
      debug('BlockNumber:updateSyncStatus()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`UPDATE blockNumber SET syncIsCompleted=true WHERE number=?`, blockNumber, (err) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            this.db.all(`SELECT changes()`, (err, rows) => {
              if (err) {
                debug(err);
                reject(err);
              } else {
                debug(rows);
                if (rows[0]['changes()'] > 0) {
                  const result = {
                    message: 'Database has been synchronized with the new blocks.',
                    data: {
                      blockNumber: blockNumber
                    }
                  };
                  debug(result);
                  resolve(result);
                } else { reject(Error('Failed to synchronize database with the new blocks.')); }
              }
            });
          }
        });
        //this.close();
      });
    }

    retrieveByConditions(condition) {
      debug('BlockNumber:retrieveByConditions()');
      return new Promise((resolve, reject) => {
        this.connect();
        let query = `SELECT * FROM blockNumber`;
        if (condition.syncIsCompleted || condition.blockNumber || condition.blockLowerBound) query += ` WHERE `;
        if (condition.syncIsCompleted) query += `syncIsCompleted='${condition.syncIsCompleted}' `;
        if (condition.blockNumber) query += `number='${condition.blockNumber}'`;
        if (condition.blockLowerBound) query += `number>='${condition.blockLowerBound}'`;
        this.db.all(query, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'Block number is retrieved.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    connect() {
      if (this.db && !this.db.open) {
        this.db = new sqlite3.Database(this.BN_dbPath, (err) => {
          if (err) debug(err);
          else debug('Connected to Block Number database');
        });
      }
    }

    close() {
      if (this.db && this.db.open) {
        this.db.close((err) => {
          if (err) debug(err);
          else debug('Closed Block Number database connection');
        });
      }
    }

  },

  SmartFilter: class {
    constructor(SF_dbPath) {
      this.SF_dbPath = SF_dbPath;
      this.db = new sqlite3.Database(SF_dbPath, (err) => {
        if (err) { debug(err); }
        else {
          debug('Connected to the SQLite database');
          this.db.run(`CREATE TABLE IF NOT EXISTS SmartFilter (
            disease TEXT PRIMARY KEY,
            filters TEXT NOT NULL)`, (err) => {
              if (err) debug(err);
              else debug('Table of Smart Filter is ready.');
            });
        }
      });
    }

    writeSmartFilter(disease, filters) {
      debug('SmartFilter:writeSmartFilter()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`INSERT INTO SmartFilter VALUES (?,?)`, disease, JSON.stringify(filters), (err) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'Smart filter is written successfully.',
              data: {
                disease: disease,
                filters: filters
              }
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    updateSmartFilter(disease, filters) {
      debug('SmartFilter:updateSmartFilter()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(
          `UPDATE SmartFilter SET filters=? WHERE disease=?`,
          JSON.stringify(filters), disease, (err) => {
            if (err) {
              debug(err);
              reject(err);
            } else {
              this.db.all(`SELECT changes()`, (err, rows) => {
                if (err) {
                  debug(err);
                  reject(err);
                } else {
                  debug(rows);
                  if (rows[0]['changes()'] > 0) {
                    const result = {
                      message: 'Smart filters has been changed on database.',
                      data: {
                        disease: disease,
                        filters: filters
                      }
                    };
                    debug(result);
                    resolve(result);
                  } else { reject(Error('No confirmation is updated.')); }
                }
              });
            }
          });
      });
    }

    retrieveByConditions(disease) {
      debug('SmartFilter:retrieveByConditions()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM SmartFilter WHERE disease=?`, disease, (err, rows) => {
          if (err) {
            debug(err);
            reject(err);
          } else {
            const result = {
              message: 'Smart Filter is retrieved.',
              data: rows
            };
            debug(result);
            resolve(result);
          }
        });
        //this.close();
      });
    }

    connect() {
      if (this.db && !this.db.open) {
        this.db = new sqlite3.Database(this.SF_dbPath, (err) => {
          if (err) debug(err);
          else debug('Connected to Smart Filter database');
        });
      }
    }

    close() {
      if (this.db && this.db.open) {
        this.db.close((err) => {
          if (err) debug(err);
          else debug('Closed Smart Filter database connection');
        });
      }
    }

  }
};
