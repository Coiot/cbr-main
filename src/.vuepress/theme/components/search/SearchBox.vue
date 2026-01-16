<template>
  <div class="search-box">
    <input
      @input="query = $event.target.value"
      aria-label="Search"
      :value="query"
      :class="{ focused: focused }"
      autocomplete="off"
      spellcheck="false"
      @focus="focused = true"
      @blur="focused = false"
      @keyup.enter="onEnter"
      @keyup.esc="onEsc"
      @keyup.up="onUp"
      @keyup.down="onDown"
    />
    <ul class="suggestions" v-if="showSuggestions" @mouseleave="unfocus">
      <li
        class="suggestion"
        v-for="(s, i) in suggestions"
        :class="{ focused: i === focusIndex }"
        @mousedown="go(i)"
        @mouseenter="focus(i)"
      >
        <a :href="s.path" @click.prevent>
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
      query: "",
      focused: false,
      focusIndex: 0,
    };
  },

  computed: {
    showSuggestions() {
      return this.focused && this.suggestions && this.suggestions.length;
    },

    suggestions() {
      const rawQuery = this.query.trim();
      const query = rawQuery.toLowerCase();
      if (!query) {
        return [];
      }

      const { pages, themeConfig } = this.$site;
      const max = themeConfig.searchMaxSuggestions || 10;
      const localePath = this.$localePath;
      const tokens = query.split(/\s+/).filter(Boolean);

      const fuzzyMatch = (needle, haystack) => {
        let h = 0;
        for (let n = 0; n < needle.length; n++) {
          const ch = needle[n];
          h = haystack.indexOf(ch, h);
          if (h === -1) return false;
          h++;
        }
        return true;
      };

      const fieldScore = (fieldValue) => {
        if (!fieldValue) return null;
        const hay = fieldValue.toLowerCase();
        let score = 0;
        for (let t = 0; t < tokens.length; t++) {
          const token = tokens[t];
          const idx = hay.indexOf(token);
          if (idx !== -1) {
            score += 120 - Math.min(idx, 60) - Math.min(hay.length, 80) * 0.05;
            continue;
          }
          if (fuzzyMatch(token, hay)) {
            score += 40 - Math.min(hay.length, 80) * 0.03;
            continue;
          }
          return null;
        }
        return score;
      };

      const scoreItem = (item) => {
        if (!item) return null;
        const titleScore = fieldScore(item.title) ?? -1;
        const headerScore = fieldScore(item.header && item.header.title) ?? -1;
        const editionScore =
          fieldScore(item.frontmatter && item.frontmatter.edition) ?? -1;
        const authorScore =
          fieldScore(item.frontmatter && item.frontmatter.author) ?? -1;
        const narratedByScore =
          fieldScore(item.frontmatter && item.frontmatter.narrated_by) ?? -1;
        const pathScore = fieldScore(item.path) ?? -1;

        const best = Math.max(
          titleScore + 50,
          headerScore + 35,
          editionScore + 20,
          authorScore + 20,
          narratedByScore + 20,
          pathScore + 10
        );
        if (best < 0) return null;
        return best;
      };

      const buildMeta = (item) => {
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
      };

      const res = [];
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        // filter out results that do not match current locale
        if (this.getPageLocalePath(p) !== localePath) {
          continue;
        }
        const pageScore = scoreItem(p);
        if (pageScore !== null) {
          res.push(
            Object.assign({}, p, { score: pageScore, meta: buildMeta(p) })
          );
          continue;
        }
        if (p.headers) {
          for (let j = 0; j < p.headers.length; j++) {
            const h = p.headers[j];
            const headerItem = Object.assign({}, p, {
              path: p.path + "#" + h.slug,
              header: h,
            });
            const headerScore = scoreItem(headerItem);
            if (headerScore !== null) {
              res.push(
                Object.assign({}, headerItem, {
                  score: headerScore,
                  meta: buildMeta(p),
                })
              );
            }
          }
        }
      }
      return res
        .sort((a, b) => b.score - a.score)
        .slice(0, max)
        .map((item) => item);
    },
  },

  methods: {
    getPageLocalePath(page) {
      for (const localePath in this.$site.locales || {}) {
        if (localePath !== "/" && page.path.indexOf(localePath) === 0) {
          return localePath;
        }
      }
      return "/";
    },

    onUp() {
      if (this.showSuggestions) {
        if (this.focusIndex > 0) {
          this.focusIndex--;
        } else {
          this.focusIndex = this.suggestions.length - 1;
        }
      }
    },

    onDown() {
      if (this.showSuggestions) {
        if (this.focusIndex < this.suggestions.length - 1) {
          this.focusIndex++;
        } else {
          this.focusIndex = 0;
        }
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
      this.query = "";
      this.focused = false;
      this.focusIndex = 0;
    },
  },
};
</script>

<style lang="stylus">
@import '../../styles/config.styl';

.search-box {
  display: inline-block;
  position: relative;
  margin-right: 1.5rem;

  input {
    cursor: text;
    width: 15rem;
    color: lighten($backColor, 15%);
    display: inline-block;
    border: 1px solid darken($borderColor, 30%);
    border-radius: 0.6rem;
    font-size: 1rem;
    line-height: 2rem;
    padding: 0 0.5rem 0 2rem;
    outline: none;
    transition: all 0.2s ease;
    background: #fff url('../../assets/search.svg') 0.6rem 0.5rem no-repeat;
    background-size: 1rem;

    &:focus {
      cursor: auto;
      border-color: $accentColor;
    }
  }

  .suggestions {
    background: #fff;
    width: 20rem;
    position: absolute;
    top: 1.5rem;
    border: 1px solid darken($borderColor, 10%);
    border-radius: 4px;
    padding: 0.4rem;
    list-style-type: none;

    &.align-right {
      right: 0;
    }
  }

  .suggestion {
    line-height: 1.4;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;

    a {
      white-space: normal;
      color: lighten($backColor, 25%);

      .page-title {
        font-weight: 800;

        .page-edition {
          font-size: 0.85em;
          font-weight: 400;
        }
      }

      .header {
        font-size: 0.8em;
        margin-left: 0.25em;
      }

      .page-meta {
        display: block;
        font-size: 0.8em;
        font-weight: 400;
        margin-top: 0.1rem;
        color: lighten($backColor, 35%);
      }
    }

    &.focused {
      font-weight: 700;
      background-color: #f9f9f9;

      a {
        color: $backColor;
      }
    }
  }
}

@media (max-width: $MQNarrow) {
  .search-box {
    input {
      cursor: pointer;
      width: 0;
      border-color: transparent;
      position: relative;

      &:focus {
        cursor: text;
        left: 0;
        width: 10rem;
      }
    }
  }
}

@media (max-width: $MQNarrow) and (min-width: $MQMobile) {
  .search-box {
    .suggestions {
      left: 0;
    }
  }
}

@media (max-width: $MQMobile) {
  .search-box {
    margin-right: 0.5rem;

    input {
      left: 1rem;
    }

    .suggestions {
      right: 0;
    }
  }
}

@media (max-width: $MQMobileNarrow) {
  .search-box {
    .suggestions {
      width: calc(100vw - 4rem);
    }

    input:focus {
      width: 8rem;
    }
  }
}
</style>
