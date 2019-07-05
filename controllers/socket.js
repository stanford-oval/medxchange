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
import { join } from 'path'

export default class Socket {

  constructor(__PORT__) {

    // start HTTPS server

    const server = require('https').createServer({
      cert: fs.readFileSync(join(__dirname, '../sslcert/server.cert')),
      key: fs.readFileSync(join(__dirname, '../sslcert/server.key'))
    })

    server.listen(__PORT__, () => console.log(`socket server listening on port ${__PORT__}`))

    // pool of clients

    this.clients = {
      consumer: new Map(),
      provider: new Map()
    }

    // configure socket server

    this.io = require('socket.io')(server)

    this.io.on('connect', socket => {

      socket.on('login', token => {
        const user_info = JSON.parse(token) // TODO

        this.clients[user_info.userType] && this.clients[user_info.userType].set(user_info.userID, socket.id)
      })

      socket.on('logout', token => {
        const user_info = JSON.parse(token) // TODO

        this.clients[user_info.userType] && this.clients[user_info.userType].delete(user_info.userID)
      })

    })

  }

  update(eventName, userType, userID, msg) {
    if (this.clients[userType].has(userID))
      this.io.to(this.clients[userType].get(userID)).emit(eventName, msg)
  }

}
