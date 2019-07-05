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
// Author: Jay Zheng <seven8355@gmail.com>

'use strict'

// node built-in modules

import fs from 'fs'

// npm modules

import express from 'express'
import createError from 'http-errors'
import logger from 'morgan'
import { join } from 'path'
import spdy from 'spdy'
import webpack from 'webpack'

// global config

import option from './option.json'
import webpack_config from './webpack.config.js'

const opt = {
  __PORT__: process.env.PORT || option.server.port,
  __SSL__: {
    cert: fs.readFileSync(join(__dirname, './sslcert/server.cert')),
    key: fs.readFileSync(join(__dirname, './sslcert/server.key'))
  }
}

// webpack setting

const app = express()
const compiler = webpack(webpack_config)

app.use(logger('tiny'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(require('webpack-dev-middleware')(compiler, webpack_config.devServer))
app.use(require('webpack-hot-middleware')(compiler))
app.use('/', require('./routes/index.js'))

// start HTTP2 server

spdy.createServer(opt.__SSL__, app)
  .listen(opt.__PORT__, () => console.log('\x1b[44m\x1b[1m%s\x1b[0m', `MedX server is listening on port ${opt.__PORT__}`))

// error handler

const debug = require('debug')('medx-server:app')

app.use((req, res, next) => next(createError(404)))

app.use((err, req, res, next) => {

  // set locals, detailed error will be provided in development only

  debug(res.locals.message = err.message)

  res.locals.error = 'development' === req.app.get('env') ? err : {}

  res.status(err.status || 500)

})
