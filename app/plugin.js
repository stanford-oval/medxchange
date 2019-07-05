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
//         Jay Zheng <seven8355@gmail.com>
//         Wesley Liu <Wesley_Liu@htc.com>

import axios from 'axios'
import ethereumAbi from 'ethereumjs-abi'
import ethereumTx from 'ethereumjs-tx'
import { Accounts } from 'web3-eth-accounts'

import medx_conf from './assets/medx.conf.json'

const accounts = new Accounts()

export default {

  install (Vue, options) {

    Vue.prototype.$__ajax__ = (method, api, data) => axios[method](`${medx_conf.MEDX_SERVER}${api}`, data)

    Vue.prototype.$__readFile__ = (file, title) => {
      const reader = new FileReader()

      return new Promise((resolve, reject) => {
        if (!file)
          return reject({ msg: `Please choose "${title}" to upload.` })

        reader.onerror = e => reject({ msg: `Error happened during uploading ${title}`, stack: e })

        reader.onload = e => resolve(e.target.result)

        reader.readAsText(file)
      })
    }

    Vue.prototype.$__setHTTPHeader__ = (header, config) => {
      if (config)
        axios.defaults.headers.common[header] = config

      else
        delete axios.defaults.headers.common[header]
    }

    Vue.prototype.$__sign__ = (user_password, signed_info, keystore) => {
      const account = accounts.decrypt(keystore, `${signed_info.userID || signed_info.consumerID}${user_password}`),
            tx = new ethereumTx(signed_info)

      tx.sign(new Buffer(account.privateKey.substring(2), 'hex'))

      return {
        message: JSON.stringify(signed_info),
        messageHash: `0x${Buffer.from(tx.hash(false)).toString('hex')}`,
        v: `0x${Buffer.from(tx.v).toString('hex')}`,
        r: `0x${Buffer.from(tx.r).toString('hex')}`,
        s: `0x${Buffer.from(tx.s).toString('hex')}`,
        signature: `0x${tx.serialize().toString('hex')}`
      }

      // web3.eth.accounts.sign(data, privateKey);
      // Signs arbitrary data. This data is before UTF-8 HEX decoded and enveloped.
      // Output example:
      // {
      //   "message": (inputFields),
      //   "messageHash": "0xfbd8120ce9995b1688ef4a18879185c96aff93fcd77a0d8f5e5d6c61e083c398",
      //   "v": "0x1c",
      //   "r": "0xdd819d912555b43d77c0ea687065dd63d8ed8fd4d1c3b9da268679690c10ca06",
      //   "s": "0x21dbe0db65771dc08c1c057d76fa3063ebe6496cf1960defe54f1e9917a70fe9",
      //   "signature": "0xdd819d912555b43d77c0ea687065dd63d8ed8fd4d1c3b9da268679690c10ca06
      //                 21dbe0db65771dc08c1c057d76fa3063ebe6496cf1960defe54f1e9917a70fe91c"
      // }
    }

    Vue.prototype.$__signTransaction__ = async (method, data, user_id, user_password, keystore) => {
      const account = accounts.decrypt(keystore, `${user_id}${user_password}`),
            address = JSON.parse(keystore).address

      const transaction = ethereumAbi.simpleEncode(medx_conf[method].ABI, ...data)

      const tx = new ethereumTx({
        from: `0x${address}`,
        to: medx_conf.Directory.CONTRACT_ADDR.toLowerCase(),
        nonce: (await axios.get(`${medx_conf.MEDX_SERVER}/tx/nonce/`, {
          params: {
            userAddress: `0x${address}`
          }
        })).data,
        gasPrice: medx_conf.GAS_PRICE,
        gas: medx_conf[method].GAS,
        chainId: medx_conf.chainId,
        data: `0x${transaction.toString('hex')}`,
        value: '0x0'
      })

      tx.sign(new Buffer(account.privateKey.substring(2), 'hex'))

      return {
        messageHash: `0x${Buffer.from(tx.hash(false)).toString('hex')}`,
        v: `0x${Buffer.from(tx.v).toString('hex')}`,
        r: `0x${Buffer.from(tx.r).toString('hex')}`,
        s: `0x${Buffer.from(tx.s).toString('hex')}`,
        rawTransaction: `0x${tx.serialize().toString('hex')}`
      }
    }

  }

}
