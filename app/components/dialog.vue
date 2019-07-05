<template lang="pug">
.v-dialog(@click.self="$emit('close-dialog')")
  .dialog__content
    slot
  slot(name="attached")
</template>

<script>
export default {

  data () {
    return {}
  }

}
</script>

<style lang="sass" scoped>
.v-dialog
  +layout(auto, 100%)

  align-items: flex-start
  background-color: rgba(0, 0, 0, 0.4)
  display: flex
  justify-content: center
  min-height: 100%
  position: absolute
  top: 0
  z-index: 9999

  .dialog__content
    background-color: white
    border-radius: .2rem
    box-sizing: border-box
    display: flex
    flex-direction: column
    margin: 2rem .5rem
    max-width: 30rem
    padding: 1.5rem

  .dialog__item-centered
    align-items: center
    display: flex
    justify-content: center

  .ui.form
    margin-top: 1.5rem

    button
      width: 100%

    input, textarea, .dropdown
      box-sizing: border-box

    p
      font-style: italic
      margin-bottom: 0
      text-align: center
      white-space: pre-line

      &.error
        color: #db2828

      &.help
        color: rgba(0, 0, 0, 0.4)
        cursor: pointer
        text-decoration: underline rgba(0, 0, 0, 0.4)

    textarea
      font-family: sans-serif

    .selection .menu
      box-sizing: border-box
</style>
