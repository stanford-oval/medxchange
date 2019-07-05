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

import jsonwebtoken from 'jsonwebtoken'

export default {

  sign (payload, secret, opts) {
    return new Promise((resolve, reject) => {
      jsonwebtoken.sign(payload, secret, opts || {}, (err, token) => {
        if (err)
          reject(err)

        resolve(token)
      })
    })
  },

  verify (token, secret, opts) {
    return new Promise((resolve, reject) => {
      jsonwebtoken.verify(token, secret, opts || {}, (err, decoded) => {
        if (err)
          reject(err)

        resolve(decoded)
      })
    })
  }

}
