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

// default options of logging

const __OPT_DEFAULT__ = {
  LOG_ONCE: false,
  UPPERCASE_FIRST_LETTER: true
}

// set colorful console message

const __FGCOLORS__ = {
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m'
}

for (let color in __FGCOLORS__)
  String.prototype[color] = str => __FGCOLORS__[color] + str + '\x1b[0m'

///////////////////////////////

export default (msg, opt) => {
  let now = new Date()
  let now_str = ''.blue(now.toString().split(' ')[4])

  opt = Object.assign({}, __OPT_DEFAULT__, opt)

  if (opt.UPPERCASE_FIRST_LETTER)
    msg = msg.charAt(0).toUpperCase() + msg.slice(1)

  if (opt.LOG_ONCE)
    return console.log(`[${now_str}] ${''.cyan(msg)}`)

  return now
}
