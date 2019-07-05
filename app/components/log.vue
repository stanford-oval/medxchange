<template lang="pug">
#log.timeline
  form.filters.ui.fluid.form(@submit.prevent)
    .field
      .ui.pointing.below.label Looking for particular log #[em message]?
      .ui.icon.input(:class="{ loading: loading }")
        input(type="text" placeholder="Enter keywords..." v-model="filters.message" @keyup.enter="getAuditLog")
        i.icon
    .field
      .ui.pointing.below.label Looking for specific log #[em certificate]?
      .ui.icon.input(:class="{ loading: loading }")
        input(type="text" placeholder="Enter certificate..." v-model="filters.certificate" @keyup.enter="getAuditLog")
        i.icon
    .two.fields
      .field
        .ui.pointing.below.label Looking for logs #[em after] particular period?
        .ui.input
          input(type="date" v-model="filters.time_after")
      .field
        .ui.pointing.below.label Looking for logs #[em before] particular period?
        .ui.input
          input(type="date" v-model="filters.time_before")

  .log(v-for="(log, idx) in logs" :data-logging-time="log.loggingDate")
    p.msg {{ log.loggingMessage }}
    p.cert(data-tooltip="Data certificate" :data-position="`bottom ${ idx % 2 ? 'right' : 'left' }`") {{ log.dataCertificate }}
    p.code {{ log.txHash }}
</template>

<script>
import _ from 'lodash'
import { mapState } from 'vuex'

export default {

  computed: mapState([
    'session'
  ]),

  created () {
    this.getAuditLog()

    this.debounceGetAuditLog = _.debounce(this.getAuditLog, 500)
  },

  data () {
    return {
      filters: {
        certificate: '',
        message: '',
        time_after: '',
        time_before: ''
      },
      loading: false,
      logs: []
    }
  },

  methods: {

    getAuditLog () {
      this.loading = true

      this.$__ajax__('post', '/audit/', {
        dataCertificate: this.filters.certificate,
        dateLowerBound: new Date(this.filters.time_after) .getTime() / 1000,
        dateUpperBound: new Date(this.filters.time_before) .getTime() / 1000,
        loggingMessage: this.filters.message,
        userAddress: this.session.userAddress,
        userID: this.session.userID,
        userType: this.session.userType
      })
      .then(res => {
        this.logs = res.data.result.data.slice()

        this.loading = false
      })
    }

  },

  watch: {

    filters: {
      handler () {
        this.debounceGetAuditLog()
      },
      deep: true
    }

  }

}
</script>

<style lang="sass" scoped>
#log
  +layout(auto, 100%, 0, 0 auto)

  display: flex
  flex-direction: column
  max-width: 1280px

  .filters
    +layout(auto, 100%, 2rem, 0 auto)

    box-sizing: border-box
    max-width: 880px

    em
      color: #db2828

    i
      box-sizing: border-box

  &.timeline .log
    box-sizing: border-box
    padding: 1rem 2rem
    position: relative
    width: calc(50% + 1px)

    &:first-of-type
      border-image: linear-gradient(to top, rgba(146, 146, 146, 0.7), rgba(146, 146, 146, 0.3) 88%, white) 1 100%

    &:last-child
      border-image: linear-gradient(to bottom, rgba(146, 146, 146, 0.7), rgba(146, 146, 146, 0.3) 88%, white) 1 100%

    &:nth-child(odd)
      border-right: 2px solid rgba(146, 146, 146, 0.7)
      text-align: right

      &::after
        +locate(absolute, 1rem, -8px, auto, auto)

      &::before
        +locate(absolute, 1rem, 2rem, auto, auto)

    &:nth-child(even)
      align-self: flex-end
      border-left: 2px solid rgba(146, 146, 146, 0.7)

      &::after
        +locate(absolute, 1rem, auto, auto, -8px)

      &::before
        +locate(absolute, 1rem, auto, auto, 2rem)

    &:hover

      &::after
        background-color: rgba(146, 146, 146, 1)!important

    &::after
      +layout(10px, 10px)

      background-color: white
      border: 2px solid rgba(146, 146, 146, 0.7)
      border-radius: 100%
      content: ''
      display: block

    &::before
      color: rgba(68, 68, 68, 0.7)
      content: attr(data-logging-time)
      display: block
      font-weight: bold

    p
      margin: 0
      word-wrap: break-word

      &.cert
        font-style: italic
        margin-bottom: .8rem

      &.code
        color: #9c9c9c
        font-style: italic

      &.msg
        font-size: 1.4rem
        line-height: 1.8
        margin-top: 1.5rem
</style>
