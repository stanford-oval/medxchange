<template lang="pug">
#notice(:class="{ active: null !== msg }")
  p {{ msg }} #[i.x.icon(@click="msg = null")]
</template>

<script>
import io from 'socket.io-client'
import { mapState } from 'vuex'

import medx_conf from '../assets/medx.conf.json'

const socket = io(medx_conf.MEDX_SOCKET_SERVER)

export default {

  computed: {
    ...mapState([
      'session'
    ])
  },

  created () {

    if (null !== this.session)
      socket.emit('login', JSON.stringify(this.session))

    // listen to socket events

    socket.on('AGR', it => this.update(it))
    socket.on('DEC', it => this.update(it))
    socket.on('EASD', it => this.update(it))

  },

  data () {
    return {
      msg: null
    }
  },

  methods: {

    update (msg) {
      this.msg = msg

      this.$emit('show-data-entry')
    }

  },

  watch: {

    session (updated, deprecated) {
      if (null === updated)
        socket.emit('logout', JSON.stringify(deprecated))

      else if (null === deprecated)
        socket.emit('login', JSON.stringify(updated))
    }

  }

}
</script>

<style lang="sass" scoped>
#notice
  +locate(fixed, 4rem, -10rem)

  background: linear-gradient(90deg, #fdfdfd, #c0c0c0)
  border: 1px solid #d4d4d4
  border-radius: .28571429rem
  box-shadow: 3px 3px #b3b3b3
  font-weight: bold
  padding: 1rem .5rem 1rem 1.5rem
  transition: right .3s

  &.active
    right: 1rem

  i.x.icon
    cursor: pointer
    margin-left: 1rem

  p
    box-sizing: border-box
    font-style: italic
    margin: 0
    padding-left: .8rem
</style>
