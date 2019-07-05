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
const verifyingConfig = require('./verifyingConfig.json');

exports.MedXconfiguration = function (DXconfig) {
  for (let item of verifyingConfig.MedXconfiguration.configVerifyingList) {
    if ('' === DXconfig[item] || undefined === DXconfig[item])
      return false;
  }
  for (let item of verifyingConfig.MedXconfiguration.gasVerifyingList) {
    if ('' === DXconfig[item].GAS || undefined === DXconfig[item].GAS)
      return false;
  }
  for (let item of verifyingConfig.MedXconfiguration.directoryVerifyingList) {
    if ('' === DXconfig.Directory[item] || undefined === DXconfig.Directory[item])
      return false;
  }
  for (let item of verifyingConfig.MedXconfiguration.EASVerifyingList) {
    if ('' === DXconfig.EAS[item] || undefined === DXconfig.EAS[item])
      return false;
  }
  return true;
};

exports.verifyFieldValues = function (type, fieldValues) {
  return new Promise((resolve, reject) => {
    for (let item of verifyingConfig[type].verifyingList) {
      if ('' === fieldValues[item] || undefined === fieldValues[item])
        reject(Error('Please fill out all required fields'));
    }
    resolve(true);
  });
};