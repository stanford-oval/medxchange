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

const express = require('express');
const router = express.Router();

const debug = require('debug')('dxserver:index');
const apiList = require('./apiList.json');

const EthDXserver = require('../controllers/eth-dxservice');
const DXconfig = require('../controllers/dxservice-config.json');
const DXserver = new EthDXserver(DXconfig);

router.get('/', async function (req, res, next) {
  res.render('index');
});

router.post(apiList.CreateNewDirectory, async function (req, res, next) {
  try {
    const response = await DXserver.CreateNewDirectory();
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.post(apiList.UserRegistration, async function (req, res, next) {
  try {
    const response = await DXserver.UserRegistration(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.post(apiList.DataEntryCreation, async function (req, res, next) {
  try {
    const response = await DXserver.DataEntryCreation(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.post(apiList.DataEntryDeletion, async function (req, res, next) {
  try {
    const response = await DXserver.DataEntryDeletion(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.post(apiList.EASDeployment, async function (req, res, next) {
  try {
    const response = await DXserver.EASDeployment(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.post(apiList.EASInvocation, async function (req, res, next) {
  try {
    const response = await DXserver.EASInvocation(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.post(apiList.EASRevocation, async function (req, res, next) {
  try {
    const response = await DXserver.EASRevocation(req.body);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.get(apiList.DataEntryCount, async function (req, res, next) {
  try {
    const response = await DXserver.DataEntryCount(req.query);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.get(apiList.DataEntryRetrievalByIndex, async function (req, res, next) {
  try {
    const response = await DXserver.DataEntryRetrievalByIndex(req.query);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.get(apiList.DataEntryRetrievalByDataCertificate, async function (req, res, next) {
  try {
    const response = await DXserver.DataEntryRetrievalByDataCertificate(req.query);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.get(apiList.EASRetrieval, async function (req, res, next) {
  try {
    const response = await DXserver.EASRetrieval(req.query);
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

router.get(apiList.RetriveLocalDatabase, async function (req, res, next) {
  try {
    const response = await DXserver.RetriveLocalDatabase();
    debug(response); res.status(200).json({ result: response });
  } catch (error) {
    debug(error); res.status(400).json({ error: error.message });
  }
});

module.exports = router;