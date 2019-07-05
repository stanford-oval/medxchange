<template lang="pug">
v-dialog(v-show="data_entry.dataKey" @close-dialog="hideEntry")
  .ui.form
    .field
      label Data entry title
      input(type="text" :value="data_entry.dataEntryTitle" readonly)
    .field
      label Data provider ID
      input(type="text" :value="data_entry.dataProviderID" readonly)
    .field
      label Data provider address
      input(type="text" :value="data_entry.dataProviderAddress" readonly)
    .field
      label Data certificate
      input(type="text" :value="data_entry.dataCertificate" readonly)
    .field
      label Data owner code
      input(type="text" :value="data_entry.dataOwnerCode" readonly)
    .field
      label Data description
      textarea(type="text" :value="data_entry.dataDescription" readonly)
    .two.fields
      .field
        label Subject age
        input(type="text" :value="`${data_entry.ageLowerBound} ~ ${data_entry.ageUpperBound}`" readonly)
      .field
        label Subject gender
        input(type="text" :value="data_entry.gender" readonly)
    .field
      label Data access path
      input(type="text" :value="data_entry.dataAccessPath" readonly)
    .field
      label Data offer price (USD)
      input(type="text" :value="`$ ${data_entry.dataOfferPrice}`" readonly)
    .field
      label Data entry due date
      input(type="text" :value="data_entry.dataEntryDueDate" readonly)
    .field
      label Data entry creation date
      input(type="text" :value="data_entry.dataEntryCreationDate" readonly)
    .field
      label Data entry confirmation
      input.confirmation(type="text" :class="{ em: 0 === data_entry.isConfirmed }" :value="0 === data_entry.isConfirmed ? 'Confirming' : 'Confirmed'" readonly)

    template(v-if="session && data_entry.dataCertificate")

      template(v-if="'consumer' === session.userType")

        template(v-if="data_entry.EASlist.length && 1 === data_entry.EASlist[data_entry.EASlist.length - 1].isValid")
          .ui.form
            .required.field
              label Password
              input(type="password" placeholder="Please enter your own password" v-model="revocation_form.password")
            .required.field
              label Keystore
              input(type="file" @change="revocation_form.keystore = $event.target.files[0]")
            .field.ui.checkbox(v-show="0 === data_entry.EASlist[data_entry.EASlist.length - 1].downloadCount")
              input#permission(type="checkbox" v-model="revocation_form.permission")
              label(for="permission") I am sure that I want to revoke this EAS.
            .buttons
              button.ui.red.button(v-if="0 === data_entry.EASlist[data_entry.EASlist.length - 1].downloadCount" :class="{ disabled: btn_disabled || !revocation_form.permission, loading: revocation_form.btn_loading_revoke }" @click="revokeEAS") Revoke
              button.ui.green.button(:class="{ disabled: btn_disabled, loading: revocation_form.btn_loading_download }" @click="download") Download
            p.error(v-show="revocation_form.error_msg") {{ revocation_form.error_msg }}

        template(v-else-if="0 === data_entry.isOffered")
          button.ui.negative.disabled.button This data entry is unavailable.

        template(v-else-if="!data_entry.__agreement__.__pending__.length && 1 === data_entry.isConfirmed")
          button.ui.inverted.violet.button(@click="agreement_sending_form.active = !agreement_sending_form.active") I want to buy
          .attached-content(v-show="agreement_sending_form.active")
            .required.field
              label Bidding price (USD)
              input(type="number" v-model.number="agreement_sending_form.bidding_price")
            .required.field
              label Password
              input(type="password" placeholder="Please enter your own password" v-model="agreement_sending_form.password")
            .required.field
              label Keystore
              input(type="file" @change="agreement_sending_form.keystore = $event.target.files[0]")
            .buttons
              button.ui.red.button(:class="{ disabled: btn_disabled }" @click="cancel('agreement_sending_form')") Cancel
              button.ui.blue.button(:class="{ disabled: btn_disabled, loading: agreement_sending_form.btn_loading }" @click="submitAgreementSending") Submit
            p.error(v-show="agreement_sending_form.error_msg") {{ agreement_sending_form.error_msg }}

      template(v-else-if="'provider' === session.userType && data_entry.dataProviderID === session.userID && 1 === data_entry.isOffered")
        button.ui.inverted.red.button(@click="entry_deletion_form.active = !entry_deletion_form.active") Un-offer
        .attached-content(v-show="entry_deletion_form.active")
          .required.field
            label Password
            input(type="password" placeholder="Please enter your own password" v-model="entry_deletion_form.password")
          .required.field
            label Keystore
            input(type="file" @change="entry_deletion_form.keystore = $event.target.files[0]")
          .buttons
            button.ui.red.button(:class="{ disabled: btn_disabled }" @click="cancel(entry_deletion_form)") Cancel
            button.ui.blue.button(:class="{ disabled: btn_disabled, loading: entry_deletion_form.btn_loading }" @click="submitEntryDeletion") Submit
          p.error(v-show="entry_deletion_form.error_msg") {{ entry_deletion_form.error_msg }}

  template(v-if="session && data_entry.dataCertificate" #attached)
    .dialog__content.attached(v-if="'provider' === session.userType && (data_entry.__agreement__.__pending__.length || data_entry.EASlist.length)")

      template(v-if="data_entry.__agreement__.__pending__.length")
        h3.ui.header
          i.check.square.outline.icon
          .content Consumers' agreements
        table.ui.compact.celled.definition.table
          thead
            tr
              th
              th Consumer ID
              th Bidding price (USD)

          tbody
            tr(v-for="agreement in data_entry.__agreement__.__pending__")
              td.collapsing
                .ui.fitted.slider.checkbox
                  input(type="checkbox" :value="agreement" v-model="approval_form.agreements")
                  label
              td {{ agreement.userID }}
              td.right.aligned $ {{ agreement.dataBiddingPrice }}

          tfoot.full-width
            tr
              th
              th(colspan="2")
                .ui.form
                  .required.field
                    label Password
                    input(type="password" placeholder="Please enter your own password" v-model="approval_form.password")
                  .required.field
                    label Keystore
                    input(type="file" @change="approval_form.keystore = $event.target.files[0]")
                  .buttons
                    button.ui.red.button(:class="{ disabled: btn_disabled, loading: approval_form.btn_loading_reject }" @click="submitApproval(false)") Reject
                    button.ui.blue.button(:class="{ disabled: btn_disabled, loading: approval_form.btn_loading_accept }" @click="submitApproval(true)") Accept
                  p.error(v-show="approval_form.error_msg") {{ approval_form.error_msg }}

      template(v-if="data_entry.EASlist.length")
        h3.ui.header
          i.file.alternate.outline.icon
          .content Established EAS
        table.ui.compact.celled.definition.table
          thead
            tr
              th
              th Consumer ID
              th Expiration date
              th Strike price (USD)
              th Status

          tbody
            tr(v-for="EAS in data_entry.EASlist")
              td.collapsing
                .ui.fitted.slider.checkbox(:class="{ 'disabled input': 1 !== EAS.isValid }")
                  input(type="checkbox" :value="EAS" v-model="revocation_form.EAS")
                  label
              td {{ EAS.dataConsumerID }}
              td {{ EAS.EASExpirationDate }}
              td.right.aligned $ {{ EAS.dataBiddingPrice }}
              td.warning(v-if="0 === EAS.isConfirmed") #[i.attention.icon] Confirming...
              td.positive(v-else-if="1 === EAS.isValid") #[i.checkmark.icon] Dealt
              td.negative(v-else) #[i.ban.icon] Revoked

          tfoot.full-width
            tr
              th
              th(colspan="4")
                .ui.form
                  .required.field
                    label Password
                    input(type="password" placeholder="Please enter your own password" v-model="revocation_form.password")
                  .required.field
                    label Keystore
                    input(type="file" @change="revocation_form.keystore = $event.target.files[0]")
                  .buttons
                    button.ui.red.button(:class="{ disabled: btn_disabled, loading: revocation_form.btn_loading_revoke }" @click="revokeEAS") Revoke
                  p.error(v-show="revocation_form.error_msg") {{ revocation_form.error_msg }}
</template>

<script>
import axios from 'axios'
import { mapMutations, mapState } from 'vuex'

import medx_conf from '../assets/medx.conf.json'

export default {

  components: {
    'v-dialog': require('./dialog.vue').default
  },

  computed: mapState({
    data_entry: 'data_entry_cursor',
    session: 'session'
  }),

  created () {
    window.onkeyup = e => {
      if ('Escape' === e.key)
        this.hideEntry()
    }
  },

  data () {
    return {
      agreement_sending_form: {
        active: false,
        bidding_price: 0,
        btn_loading: false,
        error_msg: null,
        keystore: null,
        password: ''
      },
      approval_form: {
        agreements: [],
        btn_loading_accept: false,
        btn_loading_reject: false,
        error_msg: null,
        keystore: null,
        password: ''
      },
      btn_disabled: false,
      entry_deletion_form: {
        active: false,
        btn_loading: false,
        error_msg: null,
        keystore: null,
        password: ''
      },
      revocation_form: {
        btn_loading_download: false,
        btn_loading_revoke: false,
        EAS: [],
        error_msg: null,
        keystore: null,
        password: '',
        permission: false
      }
    }
  },

  methods: {

    async __preProcess__ (form, btn_loading_ref, main_process, reset_form_only=true) {
      if ('' === form.password)
        return form.error_msg = 'Illegal password'
      else
        form.error_msg = null

      this.btn_disabled = true
      form[btn_loading_ref] = true

      // Generate signed-agreement

      let keystore

      try {

        keystore = await this.$__readFile__(form.keystore, 'keystore')

      } catch (err) {
        this.btn_disabled = false
        form[btn_loading_ref] = false

        return form.error_msg = err.msg
      }

      setTimeout(async () => {
        try {

          await main_process(keystore)

          setTimeout(() => {
            this.btn_disabled = false
            form[btn_loading_ref] = false

            this.hideEntry({ reset_form_only })

            this.$emit('show-data-entry')
            this.$emit('update-entry')
          }, 500)

        } catch (err) {
          this.btn_disabled = false
          form[btn_loading_ref] = false

          return form.error_msg = err.message
        }
      }, 500)
    },

    cancel (form_name) {
      if (this[form_name].active)
        this[form_name].active = false

      if (this[form_name].agreements)
        this[form_name].agreements = []

      if (this[form_name].EAS)
        this[form_name].EAS = []

      if (this[form_name].permission)
        this[form_name].permission = false

      document.querySelectorAll("input[type='file']").forEach(dom => dom.value = '')

      this[form_name].error_msg = null
      this[form_name].keystore = null
      this[form_name].password = ''
    },

    async download () {
      this.__preProcess__(this.revocation_form, 'btn_loading_download', async keystore => {
        let signed_access = this.$__sign__(this.revocation_form.password, {
          consumerAddress: this.session.userAddress,
          consumerID: this.session.userID,
          dataCertificate: this.data_entry.dataCertificate,
          dataKey: this.data_entry.dataKey
        }, keystore)

        const res = await axios.post(this.data_entry.dataAccessPath, signed_access)

        const dl_link = document.createElement('a')

        dl_link.href = res.data.result.downloadURL
        dl_link.click()
      })
    },

    hideEntry (opt={}) {
      this.cancel('agreement_sending_form')
      this.cancel('approval_form')
      this.cancel('entry_deletion_form')
      this.cancel('revocation_form')

      if (opt.reset_form_only)
        return

      this.__hideEntry__()
    },

    async revokeEAS () {
      if ('provider' === this.session.userType && !this.revocation_form.EAS.length)
        return this.revocation_form.error_msg = 'Please choose at least one agreement to approve.'

      this.__preProcess__(this.revocation_form, 'btn_loading_revoke', async keystore => {
        if ('provider' === this.session.userType) {
          for (let EAS of this.revocation_form.EAS) {
            let signedTX = await this.$__signTransaction__('revokeEASbyProvider', [this.data_entry.dataKey, EAS.dataConsumerAddress], this.session.userID, this.revocation_form.password, keystore)

            await this.$__ajax__('post', '/eas/revoke/', {
              signedTX: JSON.stringify(signedTX),
              userID: this.session.userID
            })
          }
        }

        else if ('consumer' === this.session.userType) {
          let signedTX = await this.$__signTransaction__('revokeEASbyConsumer', [this.data_entry.dataKey], this.session.userID, this.revocation_form.password, keystore)

          await this.$__ajax__('post', '/eas/revoke/', {
            signedTX: JSON.stringify(signedTX),
            userID: this.session.userID
          })
        }
      })
    },

    async submitAgreementSending () {
      this.__preProcess__(this.agreement_sending_form, 'btn_loading', async keystore => {
        let signed_agreement = this.$__sign__(this.agreement_sending_form.password, {
          dataBiddingPrice: 0 < this.agreement_sending_form.bidding_price ? this.agreement_sending_form.bidding_price : this.data_entry.dataOfferPrice,
          dataCertificate: this.data_entry.dataCertificate,
          dataEntryCreationDate: Math.floor(new Date(this.data_entry.dataEntryCreationDate) / 1000),
          EASExpirationDate: Math.floor((new Date() .getTime() + 31556926000) / 1000),
          targetUserAddress: this.data_entry.dataProviderAddress,
          targetUserID: this.data_entry.dataProviderID,
          userAddress: this.session.userAddress,
          userID: this.session.userID,
          userType: this.session.userType
        }, keystore)

        await this.$__ajax__('post', '/entry/agreement/', signed_agreement)
      })
    },

    async submitApproval (approval) {
      if (!this.approval_form.agreements.length)
        return this.approval_form.error_msg = 'Please choose at least one agreement to approve.'

      this.__preProcess__(this.approval_form, `btn_loading_${approval ? 'accept' : 'reject'}`, async keystore => {
        for (let agreement of this.approval_form.agreements) {
          let signed_agreement = this.$__sign__(this.approval_form.password, {
            dataBiddingPrice: agreement.dataBiddingPrice,
            dataCertificate: this.data_entry.dataCertificate,
            dataEntryCreationDate: Math.floor(new Date(this.data_entry.dataEntryCreationDate) / 1000),
            EASExpirationDate: Math.floor(new Date(agreement.EASExpirationDate) / 1000),
            targetUserAddress: agreement.userAddress,
            targetUserID: agreement.userID,
            userAddress: this.session.userAddress,
            userID: this.session.userID,
            userType: this.session.userType
          }, keystore)

          await this.$__ajax__('post', approval ? '/entry/agreement/' : '/agreement/reject/', signed_agreement)
        }
      })
    },

    async submitEntryDeletion () {
      this.__preProcess__(this.entry_deletion_form, 'btn_loading', async keystore => {
        const signedTX = await this.$__signTransaction__('deleteDataEntry', [this.data_entry.dataKey], this.session.userID, this.entry_deletion_form.password, keystore)

        await this.$__ajax__('post', '/entry/delete/', {
          signedTX: JSON.stringify(signedTX),
          userID: this.session.userID
        })
      })
    },

    ...mapMutations({
      __hideEntry__: 'hideEntry'
    })

  },

  watch: {

    data_entry () {
      this.agreement_sending_form.bidding_price = this.data_entry.dataOfferPrice
    }

  }

}
</script>

<style lang="sass" scoped>
input.confirmation
  color: #21ba45!important
  font-style: italic
  font-weight: bold

  &.em
    color: #db2828!important

.attached .ui.header
  border-bottom: 1px solid rgba(34, 36, 38, .15)
  margin-bottom: 0
  padding-bottom: .6rem

.attached-content
  margin-top: 1rem

.checkbox label
  color: #db2828!important
  cursor: pointer
  font-style: italic
  font-weight: bold
</style>
