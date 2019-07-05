<template lang="pug">
#v-app
  v-home(v-if="!session" @show-prompt="keystore_downloaded = true")
  v-main(v-else)
  v-browser(v-show="(!session || 'auditor' !== session.userType) && browser_active")
  v-footer
  v-dialog#prompt(v-show="keystore_downloaded")
    p Your keystore file has been downloaded successfully.
    button.ui.blue.button(@click="keystore_downloaded = false") Got it.
</template>

<script>
import { mapState } from 'vuex'

export default {

  components: {
    'v-browser': require('./components/browser.vue').default,
    'v-dialog': require('./components/dialog.vue').default,
    'v-footer': require('./components/footer.vue').default,
    'v-home': require('./components/home.vue').default,
    'v-main': require('./components/main.vue').default
  },

  computed: mapState([
    'browser_active',
    'session'
  ]),

  data () {
    return {
      keystore_downloaded: false
    }
  }

}
</script>

<style lang="sass" scoped>
#v-app
  +layout(100%, 100%)

  #prompt

    p
      font-size: 1.25rem
      line-height: 1.5
      margin-bottom: 2.5rem
      text-align: center
</style>
