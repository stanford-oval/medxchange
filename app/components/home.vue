<template lang="pug">
#v-home
  .nav
    button.ui.blue.button.mini(@click="showDialog") Login

  v-dialog.dialog(v-show="dialog_active" @close-dialog="hideDialog")
    .dialog__item-centered
      img(:src="require('../assets/brands.png')")

    .menu.tab
      span.item(:class="{ active: show_login_form }" @click="showLoginForm(true)") LOGIN
      span.item(:class="{ active: !show_login_form }" @click="showLoginForm(false)") REGISTER

    .ui.form(v-show="show_login_form")
      .required.field
        label User Type
        .ui.selection.dropdown(:class="{ active: form.login.show_dropdown }" @click="form.login.show_dropdown = !form.login.show_dropdown")
          input(type="hidden" name="user_type")
          i.dropdown.icon
          .default.text(v-show="show_default_text_login") User Type
          .text(v-show="!show_default_text_login") {{ form.login.type }}
          .menu(:style="{ display: form.login.show_dropdown ? 'block' : 'none' }")
            .item(v-for="user_type in user_types" :key="user_type" :class="{ active: user_type === form.login.type }" @click="form.login.type = user_type") {{ user_type }}
      .required.field
        label User ID
        input(type="text" placeholder="Please enter your own user ID" v-model="form.login.id" :maxlength="rules.id.max_length" @keyup.enter="login")
      .required.field
        label Password
        input(type="password" placeholder="Please enter your own password" v-model="form.login.password" :maxlength="rules.password.max_length" @keyup.enter="login")
      button.ui.blue.button(:class="{ loading: btn_loading }" @click="login") Login
      p.error(v-show="form.login.error_msg") {{ form.login.error_msg }}

    .ui.form(v-show="!show_login_form")
      .required.field
        label User Type
        .ui.selection.dropdown(:class="{ active: form.register.show_dropdown }" @click="form.register.show_dropdown = !form.register.show_dropdown")
          input(type="hidden" name="user_type")
          i.dropdown.icon
          .default.text(v-show="show_default_text_register") User Type
          .text(v-show="!show_default_text_register") {{ form.register.type }}
          .menu(:style="{ display: form.register.show_dropdown ? 'block' : 'none' }")
            .item(v-for="user_type in user_types" :key="user_type" :class="{ active: user_type === form.register.type }" @click="form.register.type = user_type") {{ user_type }}
      .required.field
        label User ID
        input(type="text" placeholder="Please enter your own user ID" v-model="form.register.id" :maxlength="rules.id.max_length" @keyup.enter="register")
      .required.field
        label Password
        input(type="password" placeholder="Please enter your own password" v-model="form.register.password" :maxlength="rules.password.max_length" @keyup.enter="register")
      .required.field
        label Retype password
        input(type="password" placeholder="Please retype your own password" v-model="form.register.retyped_password" :maxlength="rules.password.max_length" @keyup.enter="register")
      button.ui.green.button(:class="{ loading: btn_loading }" @click="register") Register
      p.error(v-show="form.register.error_msg") {{ form.register.error_msg }}
      a#download_keystore
</template>

<script>
import sha256 from 'sha256'
import { mapMutations, mapState } from 'vuex'
import { Accounts } from 'web3-eth-accounts'

import medx_conf from '../assets/medx.conf.json'

const accounts = new Accounts()

export default {

  components: {
    'v-dialog': require('./dialog.vue').default
  },

  computed: {
    show_default_text_login () {
      return 0 === this.form.login.type.length
    },
    show_default_text_register () {
      return 0 === this.form.register.type.length
    },
    valid_user_types () {
      return new RegExp(`^(${this.user_types.join('|')})$`)
    },
    ...mapState([
      'dialog_active'
    ])
  },

  data () {
    return {
      btn_loading: false,
      form: {
        login: {
          error_msg: null,
          id: '',
          password: '',
          show_dropdown: false,
          type: ''
        },
        register: {
          error_msg: null,
          id: '',
          password: '',
          retyped_password: '',
          show_dropdown: false,
          type: ''
        }
      },
      rules: {
        id: {
          max_length: 10,
          min_length: 8,
          regex: /^\w+$/
        },
        password: {
          max_length: 10,
          min_length: 8,
          regex: /^\w+$/
        }
      },
      show_login_form: true,
      user_types: ['Data auditor', 'Data consumer', 'Data provider']
    }
  },

  methods: {

    login () {
      if (this.btn_loading)
        return

      this.form.login.error_msg = null
      this.form.login.show_dropdown = false

      const [id, password, type] = [this.form.login.id, this.form.login.password, this.form.login.type]

      if (!this.valid_user_types.test(type))
        return this.form.login.error_msg = 'Please choose your `User Type`.'

      else if ('' === id)
        return this.form.login.error_msg = 'Please fill in your `User ID`.'

      else if ('' === password)
        return this.form.login.error_msg = 'Please fill in your `Password`.'

      this.btn_loading = true

      this.$__ajax__('post', '/user/login/', {
        userID: id,
        userPassword: sha256(password),
        userType: type.split(' ')[1]
      })
      .then(res => {
        this.saveSession(res.data.result)
      })
      .catch(err => {
        this.form.login.error_msg = err.response.data.error
      })
      .then(() => {
        // Reset login form

        this.btn_loading = false
        this.form.login.password = ''

        this.form.register.password = ''
        this.form.register.retyped_password = ''
      })
    },

    register () {
      if (this.btn_loading)
        return

      this.form.register.error_msg = null
      this.form.register.show_dropdown = false

      const [id, password, retyped_password, type] = [this.form.register.id, this.form.register.password, this.form.register.retyped_password, this.form.register.type]

      if (!this.valid_user_types.test(type))
        return this.form.register.error_msg = 'Please choose your `User Type`.'

      else if (id.length > this.rules.id.max_length || id.length < this.rules.id.min_length || !this.rules.id.regex.test(id))
        return this.form.register.error_msg = `Invalid \`User ID\`.\nIt should be composed of alphanumeric or dash characters, and also its length should be between ${this.rules.id.min_length} and ${this.rules.id.max_length}.`

      else if (password.length > this.rules.password.max_length || password.length < this.rules.password.min_length || !this.rules.password.regex.test(password))
        return this.form.register.error_msg = `Invalid \`Password\`.\nIt should be composed of alphanumeric or dash characters, and also its length should be between ${this.rules.password.min_length} and ${this.rules.password.max_length}.`

      else if (password !== retyped_password)
        return this.form.register.error_msg = 'Please check your `Password` again.'

      this.btn_loading = true

      setTimeout(() => {
        // Generate new ethereum account

        const account = 'Data auditor' === type
          ? { address: '0x0000000000000000000000000000000000000000' }
          : accounts.encrypt(accounts.create().privateKey, `${id}${password}`)

        this.$__ajax__('post', '/user/register/', {
          userAddress: `0x${account.address}`,
          userID: id,
          userPassword: sha256(password),
          userType: type.split(' ')[1]
        })
        .then(res => {
          // Generate keystore file to download (filename followed ethereum format)

          if ('Data auditor' !== type) {
            const dl_link = document.getElementById('download_keystore'),
                  keystore = account

            dl_link.download = `UTC--${(new Date()).toISOString().replace(':', '-')}--${keystore.address}`
            dl_link.href = `data:application/octet-stream;charset=utf-8;base64,${window.btoa(JSON.stringify(keystore))}`
            dl_link.click()

            this.$emit('show-prompt')
          }

          this.saveSession(res.data.result)
        })
        .catch(err => {
          this.form.register.error_msg = err.response.data.error
        })
        .then(() => {
          // Reset registration form

          this.btn_loading = false
          this.form.register.password = ''
          this.form.register.retyped_password = ''

          this.form.login.password = ''
        })
      }, 500)
    },

    showLoginForm (bool) {
      this.form.login.show_dropdown = false
      this.form.register.show_dropdown = false

      this.show_login_form = bool
    },

    ...mapMutations([
      'hideDialog',
      'saveSession',
      'showDialog'
    ])

  }

}
</script>

<style lang="sass" scoped>
.dialog

  .dialog__item-centered img
    margin-bottom: 1rem
    width: 50%

  .menu.tab
    border-bottom: 1px solid #bbb
    padding-bottom: .5rem

    .item
      cursor: pointer
      margin: .5rem 0
      text-decoration: underline transparent

      & + .item
        margin-left: 1rem

      &:hover
        text-decoration-color: black

      &.active
        color: #db2828
        text-decoration-color: #db2828
</style>
