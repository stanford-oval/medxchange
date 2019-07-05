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

  mutations: {

    hideBrowser (state) {
      state.browser_active = false
    },

    hideDialog (state) {
      state.dialog_active = false
    },

    hideEntry (state) {
      state.data_entry_cursor = {}
    },

    removeSession (state) {
      localStorage.removeItem('session')

      state.browser_active = true
      state.dialog_active = false
      state.session = null
    },

    saveSession (state, session) {
      localStorage.setItem('session', session)

      state.session = jsonwebtoken.decode(session).data
    },

    showBrowser (state) {
      state.browser_active = true
    },

    showDialog (state) {
      state.dialog_active = true
    },

    showEntry (state, data_entry) {
      state.data_entry_cursor = JSON.parse(JSON.stringify(data_entry))
    }

  },

  state: {
    browser_active: true,
    common_filters: {
      age: [
        { min: 0, max: 18 },
        { min: 18, max: 65 },
        { min: 65, max: 120 }
      ],
      gender: [
        { title: 'Both', value: '' },
        { title: 'Male', value: 'Male' },
        { title: 'Female', value: 'Female' }
      ]
    },
    data_entry_cursor: {},
    dialog_active: false,
    filters_restriction: {
      age: {
        max: 120,
        min: 0
      }
    },
    session: localStorage.getItem('session') ? jsonwebtoken.decode(localStorage.getItem('session')).data : null
  }

}
