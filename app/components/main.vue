<template lang="pug">
#v-main
  img.brands(v-show="show_data_entry || 'auditor' === session.userType" :src="require('../assets/brands.png')")

  .nav
    span.welcome Welcome #[em {{ session.userID }}] #[a.ui.tag.label.mini(:class="label[session.userType]") {{ user_type }}]
    template(v-if="'auditor' !== session.userType")
      button.ui.basic.button.mini(v-show="!show_data_entry" @click="showDataEntry") #[i.folder.open.outline.icon] Manage Entries
      button.ui.basic.button.mini(v-show="show_data_entry" @click="showBrowser") #[i.search.icon] Search Entries
    button.ui.black.button.mini(@click="_removeSession") Logout

  v-log(v-if="'auditor' === session.userType")

  .content(v-else v-show="show_data_entry")
    button.ui.basic.button(v-if="'provider' === session.userType" @click="entry_creation_form.show = true") #[i.edit.outline.icon] New entry

    table.ui.black.celled.selectable.table
      thead
        tr.center.aligned
          th.five.wide Entry title
          template(v-if="'consumer' === session.userType")
            th.two.wide Bidding / Offer price (USD)
            th.three.wide EAS deployment date
            th.three.wide EAS expiration date
            th.three.wide EAS status
          template(v-else)
            th.two.wide Offer price (USD)
            th.three.wide Creation date
            th.three.wide Due date
            th.three.wide Order status
      tbody
        tr(v-for="entry in data_entries" :key="entry.dataKey")
          td #[a(@click="showEntry(entry)") {{ entry.dataEntryTitle }}]
          template(v-if="'consumer' === session.userType")
            td.right.aligned $ {{ entry.__bidding_price__ }} / $ {{ entry.dataOfferPrice }}
            template(v-if="entry.EASlist.length")
              td {{ entry.EASlist[entry.EASlist.length - 1].EASDeploymentDate }}
              td {{ entry.EASlist[entry.EASlist.length - 1].EASExpirationDate }}
            template(v-else)
              td
              td
          template(v-else)
            td.right.aligned $ {{ entry.dataOfferPrice }}
            td {{ entry.dataEntryCreationDate }}
            td {{ entry.dataEntryDueDate }}
          td(v-if="!entry.__agreement__")
          template(v-else-if="'consumer' === session.userType")
            td.warning(v-if="entry.__agreement__.__pending__.length") #[i.attention.icon] Waiting for approval...
            td.negative(v-else-if="entry.__agreement__.__rejected__.length") #[i.close.icon] Rejected
            td.warning(v-else-if="0 === entry.EASlist[entry.EASlist.length - 1].isConfirmed") #[i.attention.icon] Confirming...
            td.positive(v-else-if="1 === entry.EASlist[entry.EASlist.length - 1].isValid") #[i.checkmark.icon] Dealt
            td.negative(v-else-if="0 === entry.EASlist[entry.EASlist.length - 1].isValid") #[i.ban.icon] Revoked
          template(v-else)
            td.negative(v-if="0 === entry.isOffered") #[i.eye.slash.outline.icon] Un-offered
            td.warning(v-else-if="entry.__agreement__.__pending__.length") #[i.attention.icon] Approval needed...
            td(v-else)

    v-entry(@show-data-entry="showDataEntry")

  v-dialog.new-entry(v-if="'provider' === session.userType" v-show="entry_creation_form.show")
    .ui.form
      .required.field
        label Data owner code
        input(type="text" placeholder="Please enter the owner code" v-model="entry_creation_form.owner_code")
      .required.field
        label Data certificate
        input(type="text" placeholder="Please enter the certificate" v-model="entry_creation_form.certificate")
      .required.field
        label Data entry title
        input(type="text" placeholder="Please enter the title" v-model="entry_creation_form.title")
      .required.field
        label Data description
        textarea(type="text" placeholder="Please enter the description" v-model="entry_creation_form.description")
      .two.fields
        .required.field
          label Subject age
          .ui.selection.dropdown(:class="{ active: 'age' === entry_creation_form.show_dropdown }" @click.self="entry_creation_form.show_dropdown = 'age' === entry_creation_form.show_dropdown ? null : 'age'")
            input(type="hidden" name="age")
            i.dropdown.icon
            .text {{ entry_creation_form.age[0] }} ~ {{ entry_creation_form.age[1] }}
            .menu(:style="{ display: 'age' === entry_creation_form.show_dropdown ? 'block' : 'none' }")
              .header #[i.pencil.alternate.icon] Customized range
              vue-slider(v-bind="filters_restriction.age" :silent="true" v-model="entry_creation_form.age")
              .slider-opt
                .input
                  label Minimum
                  input(type="number" :max="entry_creation_form.age[1]" :min="filters_restriction.age.min" v-model.number="entry_creation_form.age[0]" @blur="entry_creation_form.age.splice(0, 1, pickValidValue($event, 'min'))")
                .input
                  label Maximum
                  input(type="number" :max="filters_restriction.age.max" :min="entry_creation_form.age[0]" v-model.number="entry_creation_form.age[1]" @blur="entry_creation_form.age.splice(1, 1, pickValidValue($event, 'max'))")
              .divider
              .header #[i.tags.icon] General ranges
              .item(v-for="range in common_filters.age" :key="`${range.min}-${range.max}`" @click="entry_creation_form.age = [range.min, range.max]") From #[b {{ range.min }}] to #[b {{ range.max }}]
        .required.field
          label Subject gender
          .ui.selection.dropdown(:class="{ active: 'gender' === entry_creation_form.show_dropdown }" @click="entry_creation_form.show_dropdown = 'gender' === entry_creation_form.show_dropdown ? null : 'gender'")
            input(type="hidden" name="gender")
            i.dropdown.icon
            .text {{ entry_creation_form.gender }}
            .menu(:style="{ display: 'gender' === entry_creation_form.show_dropdown ? 'block' : 'none' }")
              .item(v-for="gender in common_filters.gender" :key="gender.title" :class="{ active: gender.title === entry_creation_form.gender }" @click="entry_creation_form.gender = gender.title") {{ gender.title }}
      .required.field
        label Data access path
        input(type="text" placeholder="Please enter the access path" v-model="entry_creation_form.access_path")
      .required.field
        label Data offer price (USD)
        input(type="number" placeholder="Please enter the offer price" v-model.number="entry_creation_form.offer_price")
      .required.field
        label Data entry due date
        input(type="datetime-local" placeholder="Please enter the due date" v-model="entry_creation_form.due_date")
      .required.field
        label Password
        input(type="password" placeholder="Please enter your own password" v-model="entry_creation_form.password")
      .required.field
        label Keystore
        input#upload_keystore(type="file")
      .buttons
        button.ui.red.button(:class="{ disabled: btn_loading }" @click="cancelEntryCreation") Cancel
        button.ui.blue.button(:class="{ disabled: btn_loading, loading: btn_loading }" @click="submitEntryCreation") Submit
      p.error(v-show="entry_creation_form.error_msg") {{ entry_creation_form.error_msg }}
  v-socket(@show-data-entry="showDataEntry({ __UPDATE_ONLY__: true })")
</template>

<script>
import { mapMutations, mapState } from 'vuex'

import medx_conf from '../assets/medx.conf.json'

export default {

  components: {
    'vue-slider': require('vue-slider-component'),
    'v-dialog': require('./dialog.vue').default,
    'v-entry': require('./entry.vue').default,
    'v-log': require('./log.vue').default,
    'v-socket': require('./socket.vue').default
  },

  computed: {
    user_type () {
      return this.session.userType.substring(0, 1).toUpperCase() + this.session.userType.substring(1)
    },
    ...mapState([
      'common_filters',
      'data_entry_cursor',
      'filters_restriction',
      'session'
    ])
  },

  created () {
    this.$__setHTTPHeader__('Authorization', `Bearer ${localStorage.getItem('session')}`)

    this.entry_creation_form.age.push(this.filters_restriction.age.min, this.filters_restriction.age.max)
  },

  data () {
    return {
      btn_loading: false,
      data_entries: [],
      entry_creation_form: {
        access_path: '',
        age: [],
        certificate: '',
        description: '',
        due_date: '',
        error_msg: null,
        gender: '',
        offer_price: 0,
        owner_code: '',
        password: '',
        show: false,
        show_dropdown: null,
        title: ''
      },
      label: {
        auditor: 'red',
        consumer: 'green',
        provider: 'purple'
      },
      show_data_entry: false
    }
  },

  methods: {

    _removeSession () {
      this.$__setHTTPHeader__('Authorization', undefined)

      this.removeSession()
    },

    cancelEntryCreation () {
      this.entry_creation_form = Object.assign({}, this.entry_creation_form, {
        access_path: '',
        age: [this.filters_restriction.age.min, this.filters_restriction.age.max],
        certificate: '',
        description: '',
        due_date: '',
        error_msg: null,
        gender: '',
        offer_price: 0,
        owner_code: '',
        password: '',
        show: false,
        show_dropdown: null,
        title: ''
      })

      document.querySelectorAll("input[type='file']").forEach(dom => dom.value = '')
    },

    pickValidValue (event, type) {
      if ('' === event.target.value)
        return this.filters_restriction.age[type]

      return Math.min(parseInt(event.target.max), Math.max(parseInt(event.target.value), parseInt(event.target.min)))
    },

    showBrowser () {
      this.show_data_entry = false

      this.$store.commit('showBrowser')
    },

    showDataEntry (opt={}) {
      this.$__ajax__('get', `/entry/`, {
        params: {
          userID: this.session.userID,
          userType: this.session.userType
        }
      })
      .then(res => {
        this.data_entries = res.data.result.data

        this.data_entries.forEach(it => {
          it.__agreement__ = {
            __pending__: it.AGRlist.filter(agreement => !agreement.isRejected),
            __rejected__: it.AGRlist.filter(agreement => agreement.isRejected)
          }

          if ('consumer' === this.session.userType) {
            if (it.EASlist.length)
              it.__bidding_price__ = it.EASlist[it.EASlist.length - 1].dataBiddingPrice
            else if (it.AGRlist.length)
              it.__bidding_price__ = it.AGRlist[it.AGRlist.length - 1].dataBiddingPrice
          }
        })

        if (this.data_entry_cursor.dataKey)
          this.showEntry(this.data_entries.find(it => this.data_entry_cursor.dataKey === it.dataKey))

        if (opt.__UPDATE_ONLY__)
          return

        this.show_data_entry = true

        this.hideBrowser()
      })
    },

    async submitEntryCreation () {
      const form = this.entry_creation_form

      const due_date = Math.floor(new Date(form.due_date) .getTime() / 1000),
            timestamp = Math.floor(new Date() .getTime() / 1000)

      let keystore = document.getElementById('upload_keystore').files[0]

      // Check for legal values in login form TODO

      if ('' === form.owner_code)
        return form.error_msg = 'Please fill in the `Data owner code`'
      else if ('' === form.certificate)
        return form.error_msg = 'Please fill in the `Data certificate`'
      else if ('' === form.title)
        return form.error_msg = 'Please fill in the `Data entry title`'
      else if ('' === form.description)
        return form.error_msg = 'Please fill in the `Data description`'
      else if ('' === form.gender)
        return form.error_msg = 'Please fill in the `Subject gender`'
      else if ('' === form.access_path)
        return form.error_msg = 'Please fill in the `Data access path`'
      else if (isNaN(due_date))
        return form.error_msg = 'Please fill in the complete `Data entry due date`'
      else if ('' === form.password)
        return form.error_msg = 'Please fill in the `Password`'
      else
        this.entry_creation_form.error_msg = null

      this.btn_loading = true

      // Generate signed-TxDEC

      try {

        keystore = await this.$__readFile__(keystore, 'keystore')

      } catch (err) {
        this.btn_loading = false

        return form.error_msg = err.msg
      }

      setTimeout(async () => {
        try {

          const signedTX = await this.$__signTransaction__('createDataEntry', [
            `${timestamp}${form.certificate}`, JSON.stringify({
              ageLowerBound: form.age[0],
              ageUpperBound: form.age[1],
              dataAccessPath: form.access_path,
              dataCertificate: form.certificate,
              dataDescription: form.description,
              dataEntryTitle: form.title,
              dataOwnerCode: form.owner_code,
              gender: form.gender
            }), form.offer_price, due_date, timestamp
          ], this.session.userID, form.password, keystore)

          await this.$__ajax__('post', '/entry/create/', {
            ageLowerBound: form.age[0],
            ageUpperBound: form.age[1],
            dataAccessPath: form.access_path,
            dataCertificate: form.certificate,
            dataDescription: form.description,
            dataEntryCreationDate: `${timestamp}`,
            dataEntryDueDate: due_date,
            dataEntryTitle: form.title,
            dataOfferPrice: form.offer_price,
            dataOwnerCode: form.owner_code,
            gender: form.gender,
            signedTX: JSON.stringify(signedTX),
            userID: this.session.userID
          })

          this.btn_loading = false

          this.cancelEntryCreation()
          this.showDataEntry()

        } catch (err) {
          this.btn_loading = false

          return form.error_msg = err.message
        }
      }, 500)
    },

    ...mapMutations([
      'hideBrowser',
      'removeSession',
      'showEntry'
    ])

  }

}
</script>

<style lang="sass" scoped>
a
  color: #1a0dab
  cursor: pointer

  &.tag
    cursor: initial!important

.brands
  height: 4rem
  position: absolute

.nav

  button.basic
    font-weight: 700
    margin-right: 1rem

  .welcome
    color: grey
    font-style: italic
    margin-right: 1rem

    em
      font-weight: bold
      text-decoration: underline grey

.content
  align-items: center
  box-sizing: border-box
  display: flex
  flex-direction: column
  margin: 1rem 0
  padding: 1rem 5rem

  .show-detail
    cursor: pointer

.menu
  max-height: none!important
</style>
