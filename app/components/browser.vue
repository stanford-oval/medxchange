<template lang="pug">
#v-browser
  .content.main
    img(:src="require('../assets/brands.png')")

    .search-bar
      .ui.large.icon.input.search(:class="{ loading: loading }")
        input(type="text" placeholder="Search..." v-model="query_form.keyword" @keyup.enter="search")
        i.search.icon
      button.ui.basic.button.mini(@click="query_form.show_filters = !query_form.show_filters") #[i.plus.icon] Filters

    .filters.ui.form(v-show="query_form.show_filters")
      .two.fields
        .field
          label Provider ID
          input(type="text" placeholder="Provider ID" v-model="query_form.provider_ID" @keyup.enter="search")
        .field
          label Owner code
          input(type="text" placeholder="Owner code" v-model="query_form.owner_code" @keyup.enter="search")
      .two.fields
        .field
          label Minimum price
          input(type="number" placeholder="Minimum price" v-model.number="query_form.price.min" @keyup.enter="search")
        .field
          label Maximum price
          input(type="number" placeholder="Maximum price" v-model.number="query_form.price.max" @keyup.enter="search")

    .query-result.ui.list
      .item(v-show="show_query_result")
        .data-entry-amount There are {{ data_entries.length }} entries found according to the query.
      .item.advanced_filters(v-show="show_query_result")
        .ui.dropdown#age-filter(@click.stop="focused_filter_category = 'age' === focused_filter_category ? '' : 'age'")
          .text(v-if="query_form.age[0] === filters_restriction.age.min && query_form.age[1] === filters_restriction.age.max") Age (range)
          .text.applied(v-else) Age from {{ query_form.age[0] }} to {{ query_form.age[1] }}
          i.dropdown.icon
          .menu(:style="{ display: 'age' === focused_filter_category ? 'block' : 'none' }" @click.stop)
            .header #[i.pencil.alternate.icon] Customized range
            vue-slider(v-bind="filters_restriction.age" :silent="true" v-model="query_form.age")
            .ui.form.slider-opt
              .input
                label Minimum
                input(type="number" :max="query_form.age[1]" :min="filters_restriction.age.min" v-model.number="query_form.age[0]" @blur="query_form.age.splice(0, 1, pickValidValue($event, 'min'))")
              .input
                label Maximum
                input(type="number" :max="filters_restriction.age.max" :min="query_form.age[0]" v-model.number="query_form.age[1]" @blur="query_form.age.splice(1, 1, pickValidValue($event, 'max'))")
            .divider
            .header #[i.tags.icon] General ranges
            .item(v-for="range in common_filters.age" :key="`${range.min}-${range.max}`" @click="query_form.age = [range.min, range.max]") From #[b {{ range.min }}] to #[b {{ range.max }}]
        .ui.dropdown(@click.stop="focused_filter_category = 'gender' === focused_filter_category ? '' : 'gender'")
          .text(v-if="'' === query_form.gender") Gender
          .text.applied(v-else) {{ query_form.gender }}
          i.dropdown.icon
          .menu(:style="{ display: 'gender' === focused_filter_category ? 'block' : 'none' }")
            .item(:class="{ applied: '' === query_form.gender }" @click="addGenderFilter('')") #[i.check.icon] Both gender
            template(v-for="gender in common_filters.gender" v-if="'' !== gender.value")
              .item(:class="{ applied: gender.value === query_form.gender }" :key="gender.title" @click="addGenderFilter(gender.value)") #[i.check.icon] {{ gender.title }}
        .ui.dropdown(v-for="(filters, category) in advanced_filters" :key="category" @click.stop="focused_filter_category = category === focused_filter_category ? '' : category")
          .text(v-if="!query_form.filters[category]") {{ category }}
          .text.applied(v-else) {{ query_form.filters[category].title }}
          i.dropdown.icon
          .menu(:style="{ display: category === focused_filter_category ? 'block' : 'none' }")
            .item(:class="{ applied: !query_form.filters[category] }" @click="removeFilter(category)") #[i.check.icon] All {{ category }}
            template(v-for="filter in filters")
              .item(:class="{ applied: query_form.filters[category] && filter.title === query_form.filters[category].title }" :key="filter.title" @click="addFilter(category, filter)") #[i.check.icon] {{ filter.title }}
      .item(v-for="entry in data_entries" :key="entry.dataKey")
        .content
          a.header(@click="showEntry(entry)") {{ entry.dataEntryTitle }}
          .description.meta #[span.price $ {{ entry.dataOfferPrice }}] / #[span.due-date {{ entry.dataEntryDueDate }}]
          .description {{ entry.__dataDescription__ }}

  .features
    div(v-for="feature in features")
      i.icon.big(:class="feature.icon")
      h3 {{ feature.title }}
      p {{ feature.description }}

  v-entry(@update-entry="search")
</template>

<script>
import _ from 'lodash'
import { mapMutations, mapState } from 'vuex'

import features from '../assets/features.json'

export default {

  components: {
    'vue-slider': require('vue-slider-component'),
    'v-entry': require('./entry.vue').default
  },

  computed: mapState([
    'browser_active',
    'common_filters',
    'data_entry_cursor',
    'filters_restriction',
    'session'
  ]),

  created () {
    this.query_form.age.push(this.filters_restriction.age.min, this.filters_restriction.age.max)

    this.debounceAddAgeFilter = _.debounce(this.addAgeFilter, 100)
  },

  data () {
    return {
      advanced_filters: {},
      data_entries: [],
      features: features,
      focused_filter_category: '',
      loading: false,
      longest_str_len: 200,
      query_form: {
        age: [],
        filters: {},
        gender: '',
        keyword: '',
        owner_code: '',
        price: {
          max: '',
          min: ''
        },
        provider_ID: '',
        show_filters: false
      },
      show_query_result: false
    }
  },

  methods: {

    addAgeFilter () {
      this.search({ apply_filter_only: true })
    },

    addFilter (category, filter) {
      this.query_form.filters[category] = filter

      this.search({ apply_filter_only: true })
    },

    addGenderFilter (gender) {
      this.query_form.gender = gender

      this.search({ apply_filter_only: true })
    },

    pickValidValue (event, type) {
      if ('' === event.target.value)
        return this.filters_restriction.age[type]

      return Math.min(parseInt(event.target.max), Math.max(parseInt(event.target.value), parseInt(event.target.min)))
    },

    removeFilter (category) {
      delete this.query_form.filters[category]

      this.search({ apply_filter_only: true })
    },

    search (opt={}) {
      const form = this.query_form

      if (!form.keyword.length && !form.owner_code.length && '' === form.price.max && '' === form.price.min && !form.provider_ID.length)
        return

      if (!opt.apply_filter_only) {
        // reset filters before each independent search

        form.age = [this.filters_restriction.age.min, this.filters_restriction.age.max]
        form.filters = {}
        form.gender = ''
      }

      this.loading = true

      this.$__ajax__('get', '/query/', {
        params: {
          ageLowerBound: form.age[0],
          ageUpperBound: form.age[1],
          dataConsumerID: this.session && 'consumer' === this.session.userType ? this.session.userID : null,
          dataDescription: form.keyword,
          dataEntryTitle: form.keyword,
          dataOwnerCode: form.owner_code,
          dataProviderID: this.session && 'provider' === this.session.userType ? this.session.userID : null,
          filters: form.filters,
          gender: form.gender,
          priceLowerBound: form.price.min,
          priceUpperBound: form.price.max,
          userID: form.provider_ID,
          userType: this.session ? this.session.userType : null
        }
      }).then(res => {
        this.data_entries = res.data.result.data

        this.data_entries.forEach(it => {
          it.__dataDescription__ = it.dataDescription.substring(0, this.longest_str_len) + (it.dataDescription.length > this.longest_str_len ? '...' : '')

          if (this.session) {
            it.__agreement__ = {
              __pending__: it.AGRlist.filter(agreement => !agreement.isRejected)
            }
          }
        })

        this.loading = false
        this.show_query_result = true

        if (!opt.apply_filter_only) {
          this.advanced_filters = res.data.result.filters
          this.focused_filter_category = ''
        }

        if (this.data_entry_cursor.dataKey)
          this.showEntry(this.data_entries.find(it => this.data_entry_cursor.dataKey === it.dataKey))
      })
    },

    ...mapMutations([
      'showEntry'
    ])

  },

  watch: {

    browser_active (active) {
      if (active)
        this.search()
    },

    'query_form.age' () {
      if ('' === this.query_form.age[0] || '' === this.query_form.age[1])
        return

      this.debounceAddAgeFilter()
    },

    session () {
      this.search()
    }

  }

}
</script>

<style lang="sass" scoped>
#age-filter

  .header
    color: rgba(0, 0, 0, .85)!important
    font-size: .78571429em
    font-weight: 700
    margin: 1rem 0 .75rem
    padding: 0 1.14285714rem
    text-transform: uppercase

  .slider-opt

    input
      box-sizing: border-box
      width: 6rem!important

    label
      color: rgba(0, 0, 0, .85)!important

.content.main
  align-items: center
  display: flex
  flex-direction: column
  margin: 6rem .5rem

  >img
    margin-bottom: 1rem
    max-height: 6.75rem
    max-width: 22rem
    min-width: 18rem
    width: 30%

  .filters
    max-width: 50rem
    width: 100%

    .fields
      margin: 1rem 0 0

      input
        box-sizing: border-box

  .query-result
    align-items: center
    box-sizing: border-box
    display: flex
    flex-direction: column
    margin-top: 0
    padding: 0 5rem
    width: 100%

    .advanced_filters
      font-size: smaller
      margin-top: 0!important

      .dropdown
        margin: 0 1rem

        &:hover > *
          color: #000

        > *
          color: #777

        .item
          box-sizing: border-box
          font-size: smaller

          &.applied
            font-weight: bold

            i.check.icon
              color: #000

          i.check.icon
            color: transparent

        .menu
          top: 150%

        .text.applied
          color: #000
          font-weight: bold

    .data-entry-amount
      color: #777
      font-size: small
      font-style: italic
      margin: 1rem 0 0

    .item
      max-width: 47rem
      width: 100%

      & + .item
        margin-top: 1rem

      .description
        font-size: .9rem

      .header
        color: #1a0dab!important
        font-size: 1.2rem
        font-weight: normal

      .meta
        margin: .2rem 0

        .price
          color: #db2828

        .due-date
          color: #006621

  .search-bar
    display: flex
    justify-content: center
    max-width: 50rem
    width: 100%

    >.search
      margin-right: 1rem
      width: 80%

.features
  color: grey
  display: flex
  flex-wrap: wrap
  justify-content: center
  margin-top: 2rem

  >div
    font-style: italic
    margin: .5rem
    max-width: 250px
    text-align: center

    h3
      margin-bottom: 0
</style>
