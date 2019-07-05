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

// import modules

import express from 'express'
import jwt from '../lib/jwt.js'

const debug = require('debug')('medx-server:index');
const EthMedXserver = require('../controllers/eth-dxservice');
const MedXverifier = require('./dx-verifier');
const SyncManager = require('../controllers/sync-manager');
const Socket = require('../controllers/socket.js').default;

// import configs

import apiList from './apiList.json'
import option from '../option.json'

const DXconfig = 'production' === process.env.NODE_ENV
  ? require('../controllers/medx-config.json')
  : require('../controllers/medx-dev-config.json')

// initialize servers

if (!MedXverifier.MedXconfiguration(DXconfig)) {
  throw (Error('Lack of system configurations'));
}

const socketServer = new Socket(DXconfig.SOCKET_PORT);

const MedXserver = new EthMedXserver(DXconfig, socketServer);
MedXserver.removeDueEntryAndExpiredEAS(DXconfig.REMOVE_INTERVAL);

const SyncBlockchain = new SyncManager(DXconfig, MedXserver, socketServer);
SyncBlockchain.syncDirectoryStorage();

// helper function

const errorMessageIndicator = message => {
  return [
    "The user has been registered.",
    "Wrong user ID or password."
  ].includes(message) ? message : "Error returned from DDS"
}

// configure routers

const router = express.Router();

const tokenless_routes = [
  apiList.DataQueryService,
  apiList.UserLogin,
  apiList.UserRegistration
]

router.use(async (req, res, next) => {
  if (tokenless_routes.includes(req._parsedUrl.pathname))
    return next()

  const match = req.headers.authorization && req.headers.authorization.match(/^Bearer (.+)$/)

  if (match) {
    try {

      res.locals.user_info = (await jwt.verify(match[1], option.secret)).data

      return next()

    } catch (err) {
      return res.status(403).json({ error: 'Invalid authorization' })
    }
  }

  res.status(403).json({ error: 'Invalid authorization' })
})

router.post(apiList.UserRegistration, async (req, res, next) => {
  try {
    await MedXverifier.verifyFieldValues('UserRegistration', req.body);
    const response = await MedXserver.UserRegistration(req.body);
    debug(response); res.status(200).json({ result: await jwt.sign(response, option.secret) });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.post(apiList.UserLogin, async (req, res, next) => {
  try {
    await MedXverifier.verifyFieldValues('UserLogin', req.body);
    const response = await MedXserver.UserLogin(req.body);
    debug(response); res.status(200).json({ result: await jwt.sign(response, option.secret) });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.post(apiList.DataEntryCreation, async (req, res, next) => {
  try {
    await MedXverifier.verifyFieldValues('DataEntryCreation', req.body);
    const response = await MedXserver.DataEntryCreation(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.post(apiList.DataEntryDeletion, async (req, res, next) => {
  try {
    await MedXverifier.verifyFieldValues('DataEntryDeletion', req.body);
    const response = await MedXserver.DataEntryDeletion(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.post(apiList.DataEntryAgreement, async (req, res, next) => {
  try {
    await MedXverifier.verifyFieldValues('DataEntryAgreement', req.body);
    const response = await MedXserver.DataEntryAgreement(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.post(apiList.DataEntryAgreementRejection, async (req, res, next) => {
  try {
    await MedXverifier.verifyFieldValues('DataEntryAgreementRejection', req.body);
    const response = await MedXserver.DataEntryAgreementRejection(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.post(apiList.EASRevocation, async (req, res, next) => {
  try {
    await MedXverifier.verifyFieldValues('EASRevocation', req.body);
    const response = await MedXserver.EASRevocation(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.post(apiList.EASInvocation, async (req, res, next) => {
  try {
    await MedXverifier.verifyFieldValues('EASInvocation', req.body);
    const response = await MedXserver.EASInvocation(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.get(apiList.DataEntryCount, async (req, res, next) => {
  try {
    const response = await MedXserver.DataEntryCount(req.query);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.get(apiList.DataEntryRetrievalByUserID, async (req, res, next) => {
  try {
    await MedXverifier.verifyFieldValues('DataEntryRetrievalByUserID', req.query);
    const response = await MedXserver.DataEntryRetrievalByUserID(req.query);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.post(apiList.AuditTrailLogRetrieval, async (req, res, next) => {
  try {
    await MedXverifier.verifyFieldValues('AuditTrailLogRetrieval', req.body);
    const response = await MedXserver.AuditTrailLogRetrieval(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.get(apiList.DataQueryService, async (req, res, next) => {
  try {
    const response = await MedXserver.DataQueryService(req.query);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

router.get(apiList.TransactionNonce, async (req, res, next) => {
  try {
    const response = await MedXserver.getTransactionNonce(req.query);
    debug(response); res.status(200).send(response);
  } catch (error) {
    debug(error); res.status(400).json({ error: errorMessageIndicator(error.message) });
  }
});

module.exports = router;
