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
"use strict";

const sqlite3 = require('sqlite3').verbose();
const sha256 = require('crypto-js/sha256');
const debug = require('debug')('dxserver:database');
const dbPath = './storages/registrationDatabase.sqlite3';

module.exports = { 

  RegistrationDatabase: class {
    constructor(identity) {
      this.identity = identity;
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) debug(err);
        else {
          debug('Connected to the SQLite database');
          if (this.identity === 'provider') {
            this.db.run(`CREATE TABLE IF NOT EXISTS provider (directoryID TEXT, userID TEXT, userAddress TEXT)`, (err) => {
              if (err) debug(err);
              else debug('Table of Provider Registration is ready.');
            });
          }
          else if (this.identity === 'consumer') {
            this.db.run(`CREATE TABLE IF NOT EXISTS consumer (directoryID TEXT, userID TEXT, userAddress TEXT)`, (err) => {
              if (err) debug(err);
              else debug('Table of Consumer Registration is ready.');
            });
          }
        }
      });
    }

    retrieveAll() {
      debug('retrieveAll()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM ${this.identity}`, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows); resolve(rows);
          }
        });
        //this.close();
      });
    }

    retrieveByDirectoryId(directoryID) {
      debug('retrieveByDirectoryId()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM ${this.identity} where directoryID=?`, directoryID, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows); resolve(rows);
          }
        });
        //this.close();
      });
    }

    retrieveByUserId(userID) {
      debug('retrieveByUserId()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM ${this.identity} where userID=?`, userID, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows); resolve(rows);
          }
        });
        //this.close();
      });
    }

    retrieveUserAddressByDirectoryIdUserId(directoryID, userID) {
      debug('retrieveUserAddressByDirectoryIdUserId()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT userAddress FROM ${this.identity} where directoryID=? and userID=?`, directoryID, userID, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows); resolve(rows);
          }
        });
        //this.close();
      });
    }

    retrieveUserIdByDirectoryIdUserAddress(directoryID, userAddress) {
      debug('retrieveUserIdByDirectoryIdUserAddress()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT userID FROM ${this.identity} where directoryID=? and userAddress=?`, directoryID, userAddress, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows); resolve(rows);
          }
        });
        //this.close();
      });
    }

    retrieveByUserAddress(userAddress) {
      debug('retrieveByUserAddress()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM ${this.identity} where userAddress=?`, userAddress, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows); resolve(rows);
          }
        });
        //this.close();
      });
    }

    retrieveByDirectoryUserId(directoryID, userID) {
      debug('retrieveByDirectoryUserId()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM ${this.identity} where directoryID=? and userID=?`, directoryID, userID, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows); resolve(rows);
          }
        });
        //this.close();
      });
    }

    retrieveByDirectoryIdUserAddress(directoryID, userAddress) {
      debug('retrieveByDirectoryIdUserAddress()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM ${this.identity} where directoryID=? and userAddress=?`, directoryID, userAddress, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows); resolve(rows);
          }
        });
        //this.close();
      });
    }

    retrieveByUserIdUserAddress(userID, userAddress) {
      debug('retrieveByUserIdUserAddress()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM ${this.identity} where userID=? and userAddress=?`, userID, userAddress, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows); resolve(rows);
          }
        });
        //this.close();
      });
    }

    checkUserExistByUserId(directoryID, userID) {
      debug('checkUserExistByUserId()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM ${this.identity} where directoryID=? and userID=?`, directoryID, userID, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows);
            if(rows.length > 0) {
              resolve(true);
            }
            else resolve(false);
          }
        });
        //this.close();
      });  
    }

    checkUserExistByUserAddress(directoryID, userAddress) {
      debug('checkUserExistByUserAddress()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.all(`SELECT * FROM ${this.identity} where directoryID=? and userAddress=?`, directoryID, userAddress, (err, rows) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            debug(rows);
            if(rows.length > 0) {
              resolve(true);
            }
            else resolve(false);
          }
        });
        //this.close();
      });  
    }

    removeUserInfo(directoryID, userID, userAddress) {
      debug('removeUserInfo()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`DELETE FROM ${this.identity} where directoryID=? and userID=? and userAddress=?`, directoryID, userID, userAddress, (err) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            let message = 'Remove user successfully.';
            debug(message); resolve(message);
          }
        });
        //this.close();
      });  
    }

    writeUserInfo(directoryID, userID, userAddress) {
      debug('writeUserInfo()');
      return new Promise((resolve, reject) => {
        this.connect();
        this.db.run(`INSERT INTO ${this.identity} VALUES (?,?,?)`, [directoryID, userID, userAddress], (err) => {
          if (err) {
            debug(err); reject(err.message);
          }
          else {
            let message = 'Register user successfully.';
            debug(message); resolve(message);
          }
        });
        //this.close();
      });  
    }

    connect() {
      if(this.db && !this.db.open) {
        this.db = new sqlite3.Database(dbPath, (err) => {
          if (err) debug(err);
          else debug('Connected to the SQLite database');
        });
      }
    }

    close() {
      if(this.db && this.db.open) {
        this.db.close((err) => {
          if (err) debug(err);
          else debug('Closed the SQLite database connection');
        });
      }
    }

  }
};

