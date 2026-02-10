<template>
  <div class="search-box">
    <input
      @input="onInput"
      role="combobox"
      aria-autocomplete="list"
      aria-label="Search"
      aria-haspopup="listbox"
      :aria-expanded="showSuggestions ? 'true' : 'false'"
      :aria-controls="showSuggestions ? listboxId : null"
      :aria-activedescendant="activeDescendantId"
      :value="inputValue"
      :class="{ focused: focused }"
      autocomplete="off"
      spellcheck="false"
      @focus="focused = true"
      @blur="onBlur"
      @keyup.enter="onEnter"
      @keyup.esc="onEsc"
      @keydown.tab="onTab"
      @keydown.up.prevent="onUp"
      @keydown.down.prevent="onDown"
    />
    <ul
      class="suggestions"
      v-if="showSuggestions"
      :id="listboxId"
      ref="suggestionsList"
      role="listbox"
      aria-live="polite"
      @mouseleave="unfocus"
    >
      <li
        class="suggestion"
        v-for="(s, i) in suggestions"
        :id="optionId(i)"
        role="option"
        :aria-posinset="i + 1"
        :aria-setsize="suggestions.length"
        :aria-selected="i === focusIndex ? 'true' : 'false'"
        :class="{ focused: i === focusIndex }"
        @mousedown.prevent="onSuggestionPointerDown"
        @touchstart.prevent="go(i)"
        @mouseenter="focus(i)"
      >
        <a :href="s.path" @click.prevent="go(i)">
          <span class="page-title">
            {{ s.title || s.path }}
          </span>
          <span v-if="s.header" class="header">&gt; {{ s.header.title }}</span>
          <span v-if="s.meta" class="page-meta">{{ s.meta }}</span>
        </a>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      inputValue: "",
      query: "",
      queryTimer: null,
      focused: false,
      focusIndex: 0,
      listboxId: `search-suggestions-${Math.random().toString(36).slice(2, 8)}`,
      searchCache: new Map(),
      searchIndex: [],
      queryDebounceMs: 140,
    };
  },

  created() {
    this.buildIndex();
  },

  computed: {
    activeDescendantId() {
      if (!this.showSuggestions || this.focusIndex < 0) {
        return null;
      }
      return this.optionId(this.focusIndex);
    },
    showSuggestions() {
      return this.focused && this.suggestions && this.suggestions.length;
    },

    suggestions() {
      const rawQuery = this.query.trim();
      const query = rawQuery.toLowerCase();
      if (!query) {
        return [];
      }

      const { themeConfig } = this.$site;
      const max = themeConfig.searchMaxSuggestions || 20;
      const localePath = this.$localePath;
      const tokens = this.tokenize(query);
      const cacheKey = `${localePath}|${max}|${query}`;
      const cached = this.searchCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const res = [];
      for (let i = 0; i < this.searchIndex.length; i++) {
        const item = this.searchIndex[i];
        if (item.localePath !== localePath) {
          continue;
        }
        const score = this.scoreItem(item, tokens);
        if (score === null) {
          continue;
        }
        res.push(
          Object.assign({}, item.page, {
            path: item.path,
            header: item.header,
            score,
            meta: item.meta,
          })
        );
      }
      const final = res
        .sort((a, b) => b.score - a.score)
        .slice(0, max)
        .map((item) => item);
      this.cacheSuggestions(cacheKey, final);
      return final;
    },
  },

  methods: {
    buildIndex() {
      const { pages } = this.$site || {};
      if (!pages || !pages.length) {
        this.searchIndex = [];
        return;
      }
      const index = [];
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const localePath = this.getPageLocalePath(p);
        const meta = this.buildMeta(p);
        const base = {
          page: p,
          localePath,
          meta,
        };
        const pageFields = {
          title: this.normalize(p.title),
          headerTitle: "",
          edition: this.normalize(p.frontmatter && p.frontmatter.edition),
          author: this.normalize(p.frontmatter && p.frontmatter.author),
          narratedBy: this.normalize(
            p.frontmatter && p.frontmatter.narrated_by
          ),
          path: this.normalize(p.path),
        };
        index.push(
          Object.assign({}, base, {
            path: p.path,
            header: null,
            fields: Object.assign({}, pageFields),
          })
        );
        if (p.headers) {
          for (let j = 0; j < p.headers.length; j++) {
            const h = p.headers[j];
            index.push(
              Object.assign({}, base, {
                path: p.path + "#" + h.slug,
                header: h,
                fields: Object.assign({}, pageFields, {
                  headerTitle: this.normalize(h.title),
                }),
              })
            );
          }
        }
      }
      this.searchIndex = index;
      this.searchCache.clear();
    },

    tokenize(query) {
      return query.split(/\s+/).filter(Boolean);
    },

    normalize(value) {
      if (!value) return "";
      return String(value).toLowerCase();
    },

    fuzzyMatch(needle, haystack) {
      let h = 0;
      for (let n = 0; n < needle.length; n++) {
        const ch = needle[n];
        h = haystack.indexOf(ch, h);
        if (h === -1) return false;
        h++;
      }
      return true;
    },

    fieldScore(tokens, hay) {
      if (!hay) return null;
      let score = 0;
      for (let t = 0; t < tokens.length; t++) {
        const token = tokens[t];
        const idx = hay.indexOf(token);
        if (idx !== -1) {
          score += 120 - Math.min(idx, 60) - Math.min(hay.length, 80) * 0.05;
          continue;
        }
        if (this.fuzzyMatch(token, hay)) {
          score += 40 - Math.min(hay.length, 80) * 0.03;
          continue;
        }
        return null;
      }
      return score;
    },

    scoreItem(item, tokens) {
      if (!item || !item.fields) return null;
      const titleScore = this.fieldScore(tokens, item.fields.title);
      const headerScore = this.fieldScore(tokens, item.fields.headerTitle);
      const editionScore = this.fieldScore(tokens, item.fields.edition);
      const authorScore = this.fieldScore(tokens, item.fields.author);
      const narratedByScore = this.fieldScore(tokens, item.fields.narratedBy);
      const pathScore = this.fieldScore(tokens, item.fields.path);
      const toScore = (value) => (value === null ? -1 : value);
      const best = Math.max(
        toScore(titleScore) + 50,
        toScore(headerScore) + 35,
        toScore(editionScore) + 20,
        toScore(authorScore) + 20,
        toScore(narratedByScore) + 20,
        toScore(pathScore) + 10
      );
      if (best < 0) return null;
      return best;
    },

    buildMeta(item) {
      const parts = [];
      if (item.frontmatter && item.frontmatter.edition) {
        parts.push(item.frontmatter.edition);
      }
      if (item.frontmatter && item.frontmatter.author) {
        parts.push(`Author: ${item.frontmatter.author}`);
      } else if (item.frontmatter && item.frontmatter.narrated_by) {
        parts.push(`Narrated by: ${item.frontmatter.narrated_by}`);
      }
      return parts.length ? parts.join(" • ") : "";
    },

    cacheSuggestions(key, value) {
      if (!this.searchCache) {
        this.searchCache = new Map();
      }
      this.searchCache.set(key, value);
      if (this.searchCache.size > 50) {
        const firstKey = this.searchCache.keys().next().value;
        this.searchCache.delete(firstKey);
      }
    },

    scheduleQueryUpdate(value) {
      if (this.queryTimer) {
        clearTimeout(this.queryTimer);
      }
      this.queryTimer = setTimeout(() => {
        this.query = value;
        this.queryTimer = null;
        this.focusIndex = 0;
      }, this.queryDebounceMs);
    },

    flushQuery() {
      if (this.queryTimer) {
        clearTimeout(this.queryTimer);
        this.queryTimer = null;
      }
      this.query = this.inputValue;
    },

    onInput(event) {
      const value = event.target.value;
      this.inputValue = value;
      this.scheduleQueryUpdate(value);
    },

    onBlur() {
      this.focused = false;
      this.focusIndex = -1;
    },

    onSuggestionPointerDown() {
      this.focused = true;
    },

    optionId(index) {
      return `${this.listboxId}-option-${index}`;
    },
    getPageLocalePath(page) {
      for (const localePath in this.$site.locales || {}) {
        if (localePath !== "/" && page.path.indexOf(localePath) === 0) {
          return localePath;
        }
      }
      return "/";
    },

    onUp() {
      if (!this.showSuggestions) {
        this.focused = true;
        return;
      }
      if (this.focusIndex > 0) {
        this.focusIndex--;
      } else {
        this.focusIndex = this.suggestions.length - 1;
      }
    },

    onDown() {
      if (!this.showSuggestions) {
        this.focused = true;
        return;
      }
      if (this.focusIndex < this.suggestions.length - 1) {
        this.focusIndex++;
      } else {
        this.focusIndex = 0;
      }
    },

    go(i) {
      if (!this.showSuggestions) {
        return;
      }
      const index = i < 0 ? 0 : i;
      if (!this.suggestions[index]) {
        return;
      }
      this.$router.push(this.suggestions[index].path);
      this.inputValue = "";
      this.query = "";
      this.focusIndex = 0;
    },

    focus(i) {
      this.focusIndex = i;
    },

    unfocus() {
      this.focusIndex = -1;
    },

    onEnter() {
      this.flushQuery();
      if (!this.showSuggestions) {
        return;
      }
      const index =
        this.focusIndex < 0
          ? 0
          : Math.min(this.focusIndex, this.suggestions.length - 1);
      this.go(index);
    },

    onEsc() {
      if (this.queryTimer) {
        clearTimeout(this.queryTimer);
        this.queryTimer = null;
      }
      this.inputValue = "";
      this.query = "";
      this.focused = false;
      this.focusIndex = 0;
    },
    onTab() {
      this.focused = false;
      this.focusIndex = -1;
    },
  },
  watch: {
    query() {
      this.focusIndex = 0;
    },
    focusIndex() {
      this.$nextTick(() => {
        if (!this.showSuggestions || this.focusIndex < 0) {
          return;
        }
        const list = this.$refs.suggestionsList;
        const activeId = this.optionId(this.focusIndex);
        const activeEl = document.getElementById(activeId);
        if (!list || !activeEl) {
          return;
        }
        const listRect = list.getBoundingClientRect();
        const itemRect = activeEl.getBoundingClientRect();
        if (itemRect.top < listRect.top) {
          list.scrollTop -= listRect.top - itemRect.top;
        } else if (itemRect.bottom > listRect.bottom) {
          list.scrollTop += itemRect.bottom - listRect.bottom;
        }
      });
    },
  },

  beforeDestroy() {
    if (this.queryTimer) {
      clearTimeout(this.queryTimer);
      this.queryTimer = null;
    }
  },
};
</script>

<style>
.search-box {
  position: relative;
  display: inline-block;
  margin: 0;
}
.search-box input {
  cursor: text;
  width: -webkit-fill-available;
  color: color-mix(in srgb, var(--back-color), white 15%);
  display: inline-block;
  border: 1px solid color-mix(in srgb, var(--border-color), black 30%);
  border-radius: 0.6rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 2rem;
  padding: 0 0.5rem 0 2rem;
  outline: none;
  transition: all 0.2s ease;
  background: #fff url("../../assets/search.svg") 0.6rem 0.5rem no-repeat;
  background-size: 1rem;
}
.search-box input:focus {
  cursor: auto;
  border-color: var(--accent-color);
}
.search-box .suggestions {
  position: absolute;
  top: calc(100% + 0.45rem);
  left: -1rem;
  max-height: 18rem;
  min-width: 16.5rem;
  width: 100%;
  overflow-y: auto;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--border-color), black 10%);
  border-radius: 4px;
  padding: 0.5rem;
  list-style-type: none;
}
.search-box .suggestion {
  line-height: 1.4;
  padding: 0.5rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.search-box .suggestion a {
  white-space: normal;
  color: color-mix(in srgb, var(--back-color), white 25%);
}
.search-box .suggestion a .page-title {
  font-weight: 800;
}
.search-box .suggestion a .page-title .page-edition {
  font-size: 0.85em;
  font-weight: 400;
}
.search-box .suggestion a .header {
  font-size: 0.8em;
  margin-left: 0.25em;
}
.search-box .suggestion a .page-meta {
  display: block;
  font-size: 0.8em;
  font-weight: 400;
  margin-top: 0.1rem;
  color: color-mix(in srgb, var(--back-color), white 35%);
}
.search-box .suggestion.focused {
  font-weight: 700;
  background-color: #f1f1f1;
}
.search-box .suggestion.focused a {
  color: color-mix(in srgb, var(--back-color), black 15%);
}
.search-box .suggestion:hover {
  background-color: #ddd;
  border-color: #ccc;
}
.search-box .suggestion:hover a {
  color: color-mix(in srgb, var(--back-color), black 20%);
}
@media (max-width: 980px) {
  .search-box input {
    width: -webkit-fill-available;
    border-color: color-mix(in srgb, var(--border-color), black 30%);
    position: relative;
  }
}
@media (max-width: 799px) {
  .search-box input {
    width: -webkit-fill-available;
    border-color: color-mix(in srgb, var(--border-color), black 30%);
    position: relative;
  }
  .search-box .suggestions {
    position: static;
    top: calc(var(--navbar-height, 2.25rem) + 0.4rem);
    max-height: min(50vh, 22rem);
    width: 100%;
    margin-top: 0.5rem;
    box-sizing: border-box;
    transform: none;
  }

  .search-dropdown {
    position: fixed;
    inset-block-start: calc(var(--navbar-height, 3.6rem) + 0.4rem);
    inset-inline-end: 1rem;
    inline-size: 20rem;
    max-inline-size: 95vw;
    min-inline-size: 0;
    box-sizing: border-box;
  }
}
</style>
