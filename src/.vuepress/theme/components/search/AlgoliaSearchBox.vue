<template>
  <form
    id="search-form"
    class="algolia-search-wrapper search-box"
  >
    <input
      id="algolia-search-input"
      class="search-query"
    >
  </form>
</template>

<script>
export default {
  props: ['options'],

  mounted () {
    this.initialize(this.options, this.$lang)
  },

  methods: {
    initialize (userOptions, lang) {
      Promise.all([
        import(/* webpackChunkName: "docsearch" */ 'docsearch.js/dist/cdn/docsearch.min.js'),
        import(/* webpackChunkName: "docsearch" */ 'docsearch.js/dist/cdn/docsearch.min.css')
      ]).then(([docsearch]) => {
        docsearch = docsearch.default
        const { algoliaOptions = {}} = userOptions
        docsearch(Object.assign(
          {},
          userOptions,
          {
            inputSelector: '#algolia-search-input',
            // #697 Make docsearch work well at i18n mode.
            algoliaOptions: Object.assign({
              'facetFilters': [`lang:${lang}`].concat(algoliaOptions.facetFilters || [])
            }, algoliaOptions)
          }
        ))
      })
    },

    update (options, lang) {
      this.$el.innerHTML = '<input id="algolia-search-input" class="search-query">'
      this.initialize(options, lang)
    }
  },

  watch: {
    $lang (newValue) {
      this.update(this.options, newValue)
    },

    options (newValue) {
      this.update(newValue, this.$lang)
    }
  }
}
</script>

<style>
.algolia-search-wrapper > span {
  vertical-align: middle;
}
.algolia-search-wrapper .algolia-autocomplete {
  line-height: normal;
}
.algolia-search-wrapper .algolia-autocomplete .ds-dropdown-menu {
  background-color: #fff;
  border: 1px solid #999;
  border-radius: 4px;
  font-size: 16px;
  margin: 6px 0 0;
  padding: 4px;
  text-align: left;
}
.algolia-search-wrapper .algolia-autocomplete .ds-dropdown-menu:before {
  border-color: #999;
}
.algolia-search-wrapper .algolia-autocomplete .ds-dropdown-menu [class*=ds-dataset-] {
  border: none;
  padding: 0;
}
.algolia-search-wrapper .algolia-autocomplete .ds-dropdown-menu .ds-suggestions {
  margin-top: 0;
}
.algolia-search-wrapper .algolia-autocomplete .ds-dropdown-menu .ds-suggestion {
  border-bottom: 1px solid var(--border-color);
}
.algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion--highlight {
  color: #2c815b;
}
.algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion {
  border-color: var(--border-color);
  padding: 0;
}
.algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion .algolia-docsearch-suggestion--category-header {
  padding: 5px 10px;
  margin-top: 0;
  background: var(--accent-color);
  color: #fff;
  font-weight: 600;
}
.algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion .algolia-docsearch-suggestion--category-header .algolia-docsearch-suggestion--highlight {
  background: rgba(255,255,255,0.6);
}
.algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion .algolia-docsearch-suggestion--wrapper {
  padding: 0;
}
.algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion .algolia-docsearch-suggestion--title {
  font-weight: 600;
  margin-bottom: 0;
  color: var(--text-color);
}
.algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion .algolia-docsearch-suggestion--subcategory-column {
  vertical-align: top;
  padding: 5px 7px 5px 5px;
  border-color: var(--border-color);
  background: #f1f3f5;
}
.algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion .algolia-docsearch-suggestion--subcategory-column:after {
  display: none;
}
.algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion .algolia-docsearch-suggestion--subcategory-column-text {
  color: #555;
}
.algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-footer {
  border-color: var(--border-color);
}
.algolia-search-wrapper .algolia-autocomplete .ds-cursor .algolia-docsearch-suggestion--content {
  background-color: #e7edf3 !important;
  color: var(--text-color);
}
@media (min-width: 799px) {
  .algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion .algolia-docsearch-suggestion--subcategory-column {
    float: none;
    width: 150px;
    min-width: 150px;
    display: table-cell;
  }
  .algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion .algolia-docsearch-suggestion--content {
    float: none;
    display: table-cell;
    width: 100%;
    vertical-align: top;
  }
  .algolia-search-wrapper .algolia-autocomplete .algolia-docsearch-suggestion .ds-dropdown-menu {
    min-width: 515px !important;
  }
}
@media (max-width: 799px) {
  .algolia-search-wrapper .ds-dropdown-menu {
    min-width: calc(100vw - 4rem) !important;
    max-width: calc(100vw - 4rem) !important;
  }
  .algolia-search-wrapper .algolia-docsearch-suggestion--wrapper {
    padding: 5px 7px 5px 5px !important;
  }
  .algolia-search-wrapper .algolia-docsearch-suggestion--subcategory-column {
    padding: 0 !important;
    background: #fff !important;
  }
  .algolia-search-wrapper .algolia-docsearch-suggestion--subcategory-column-text:after {
    content: " > ";
    font-size: 10px;
    line-height: 14.4px;
    display: inline-block;
    width: 5px;
    margin: -3px 3px 0;
    vertical-align: middle;
  }
}
</style>
