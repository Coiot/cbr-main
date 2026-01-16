<template>
  <header class="navbar">
    <SidebarButton @toggle-sidebar="$emit('toggle-sidebar')" />

    <router-link :to="$localePath" class="home-link">
      <img
        class="logo"
        v-if="$site.themeConfig.logo"
        :src="$withBase($site.themeConfig.logo)"
        :alt="$siteTitle"
      />
      <span
        ref="siteName"
        class="site-name"
        v-if="$siteTitle"
        :class="{ 'can-hide': $site.themeConfig.logo }"
        >{{ $siteTitle }}</span
      >
    </router-link>

    <div
      class="links"
      :style="{
        'max-width': linksWrapMaxWidth + 'px',
      }"
    >
      <AlgoliaSearchBox v-if="isAlgoliaSearch" :options="algolia" />
      <SearchBox v-else-if="$site.themeConfig.search !== false" />
      <NavLinks class="can-hide" />
      <div class="bookmark-wrapper" ref="bookmarkWrapper">
        <button
          type="button"
          class="bookmark-trigger"
          :aria-label="'Album bookmarks'"
          aria-haspopup="true"
          :aria-expanded="bookmarkOpen ? 'true' : 'false'"
          @click="toggleBookmarkMenu"
        >
          <svg
            class="bookmark-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            aria-hidden="true"
          >
            <path
              d="M192 64C156.7 64 128 92.7 128 128L128 544C128 555.5 134.2 566.2 144.2 571.8C154.2 577.4 166.5 577.3 176.4 571.4L320 485.3L463.5 571.4C473.4 577.3 485.7 577.5 495.7 571.8C505.7 566.1 512 555.5 512 544L512 128C512 92.7 483.3 64 448 64L192 64z"
            />
          </svg>
          <span v-if="bookmarks.length" class="bookmark-badge">
            {{ bookmarks.length }}
          </span>
        </button>
        <div v-if="bookmarkOpen" class="bookmark-dropdown">
          <div class="bookmark-header">
            <span>Bookmarks</span>
            <!-- <span v-if="bookmarks.length" class="bookmark-count">
              {{ bookmarks.length }}
            </span> -->
          </div>
          <ul v-if="bookmarks.length" class="bookmark-list">
            <li v-for="bookmark in bookmarks" :key="bookmark.key">
              <router-link
                class="bookmark-link"
                :to="bookmark.path"
                @click.native="closeBookmarkMenu"
              >
                <span class="bookmark-title">{{ bookmark.title }}</span>
                <span class="bookmark-meta">
                  <span v-if="bookmark.edition">{{ bookmark.edition }}</span>
                  <span>Scene {{ bookmark.scene }}</span>
                </span>
              </router-link>
              <button
                type="button"
                class="bookmark-remove"
                :aria-label="`Remove bookmark for ${bookmark.title}`"
                title="Remove bookmark"
                @click.stop="removeBookmark(bookmark.key)"
              >
                <svg
                  class="bookmark-remove-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  aria-hidden="true"
                >
                  <path
                    d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"
                  />
                </svg>
              </button>
            </li>
          </ul>
          <p v-else class="bookmark-empty">No bookmarks yet.</p>
        </div>
      </div>
      <div class="help-wrapper" ref="helpWrapper">
        <button
          type="button"
          class="help-trigger"
          aria-label="Help and keyboard shortcuts"
          aria-haspopup="true"
          :aria-expanded="helpOpen ? 'true' : 'false'"
          @click="toggleHelpMenu"
        >
          <svg
            class="help-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            aria-hidden="true"
          >
            <path
              d="M224 224C224 171 267 128 320 128C373 128 416 171 416 224C416 266.7 388.1 302.9 349.5 315.4C321.1 324.6 288 350.7 288 392L288 416C288 433.7 302.3 448 320 448C337.7 448 352 433.7 352 416L352 392C352 390.3 352.6 387.9 355.5 384.7C358.5 381.4 363.4 378.2 369.2 376.3C433.5 355.6 480 295.3 480 224C480 135.6 408.4 64 320 64C231.6 64 160 135.6 160 224C160 241.7 174.3 256 192 256C209.7 256 224 241.7 224 224zM320 576C342.1 576 360 558.1 360 536C360 513.9 342.1 496 320 496C297.9 496 280 513.9 280 536C280 558.1 297.9 576 320 576z"
            />
          </svg>
        </button>
        <div v-if="helpOpen" class="help-dropdown">
          <div class="help-header">Quick Help</div>
          <div class="help-section">
            <h4>Keyboard</h4>
            <ul class="help-list">
              <li><kbd>J</kbd> / <kbd>→</kbd> Next scene</li>
              <li><kbd>K</kbd> / <kbd>←</kbd> Previous scene</li>
              <li><kbd>Home</kbd> / <kbd>End</kbd> First / Last scene</li>
              <li><kbd>B</kbd> Toggle bookmark</li>
              <li><kbd>R</kbd> Resume to bookmark</li>
              <li><kbd>G</kbd> Jump to scene input</li>
              <li><kbd>T</kbd> Toggle view</li>
              <li><kbd>C</kbd> Copy scene link</li>
            </ul>
          </div>
          <div class="help-section">
            <h4>About CivBattleRoyale</h4>
            <p class="community-description">
              A community-driven Civilization computer-only game with narrated
              episodes, power rankings, and deep lore across multiple seasons.
            </p>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import SidebarButton from "../sidebar/SidebarButton.vue";
import AlgoliaSearchBox from "../search/AlgoliaSearchBox.vue";
import SearchBox from "../search/SearchBox.vue";
import NavLinks from "./NavLinks.vue";

export default {
  components: {
    SidebarButton,
    NavLinks,
    SearchBox,
    AlgoliaSearchBox,
  },

  data() {
    return {
      linksWrapMaxWidth: null,
      bookmarks: [],
      bookmarkOpen: false,
      helpOpen: false,
    };
  },

  mounted() {
    const MOBILE_DESKTOP_BREAKPOINT = 719; // refer to config.styl
    const NAVBAR_VERTICAL_PADDING =
      parseInt(css(this.$el, "paddingLeft")) +
      parseInt(css(this.$el, "paddingRight"));
    const handleLinksWrapWidth = () => {
      if (document.documentElement.clientWidth < MOBILE_DESKTOP_BREAKPOINT) {
        this.linksWrapMaxWidth = null;
      } else {
        this.linksWrapMaxWidth =
          this.$el.offsetWidth -
          NAVBAR_VERTICAL_PADDING -
          ((this.$refs.siteName && this.$refs.siteName.offsetWidth) || 0);
      }
    };
    handleLinksWrapWidth();
    window.addEventListener("resize", handleLinksWrapWidth, false);

    this.loadBookmarks();
    this._bookmarkUpdateHandler = () => this.loadBookmarks();
    if (typeof window !== "undefined") {
      window.addEventListener(
        "albums-bookmark-updated",
        this._bookmarkUpdateHandler
      );
      window.addEventListener("storage", this._bookmarkUpdateHandler);
      window.addEventListener("click", this.handleOutsideClick, true);
    }
  },

  beforeDestroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener(
        "albums-bookmark-updated",
        this._bookmarkUpdateHandler
      );
      window.removeEventListener("storage", this._bookmarkUpdateHandler);
      window.removeEventListener("click", this.handleOutsideClick, true);
    }
  },

  computed: {
    algolia() {
      return (
        this.$themeLocaleConfig.algolia || this.$site.themeConfig.algolia || {}
      );
    },

    isAlgoliaSearch() {
      return this.algolia && this.algolia.apiKey && this.algolia.indexName;
    },
  },

  watch: {
    $route() {
      this.bookmarkOpen = false;
      this.helpOpen = false;
      this.loadBookmarks();
    },
  },

  methods: {
    toggleBookmarkMenu() {
      this.bookmarkOpen = !this.bookmarkOpen;
    },
    closeBookmarkMenu() {
      this.bookmarkOpen = false;
    },
    toggleHelpMenu() {
      this.helpOpen = !this.helpOpen;
    },
    removeBookmark(key) {
      if (typeof window === "undefined") {
        return;
      }
      window.localStorage.removeItem(key);
      this.loadBookmarks();
      window.dispatchEvent(new CustomEvent("albums-bookmark-updated"));
    },
    handleOutsideClick(event) {
      const wrapper = this.$refs.bookmarkWrapper;
      if (this.bookmarkOpen && wrapper && !wrapper.contains(event.target)) {
        this.bookmarkOpen = false;
      }
      const helpWrapper = this.$refs.helpWrapper;
      if (this.helpOpen && helpWrapper && !helpWrapper.contains(event.target)) {
        this.helpOpen = false;
      }
    },
    loadBookmarks() {
      if (typeof window === "undefined") {
        this.bookmarks = [];
        return;
      }
      const prefix = "albumsBookmark:";
      const keys = Object.keys(window.localStorage || {});
      const items = [];
      for (const key of keys) {
        if (!key.startsWith(prefix)) {
          continue;
        }
        const path = key.slice(prefix.length);
        const scene = parseInt(window.localStorage.getItem(key), 10);
        if (!Number.isFinite(scene)) {
          continue;
        }
        const page = this.$site.pages.find((p) => p.path === path);
        const title = (page && (page.frontmatter.title || page.title)) || path;
        const edition = page && page.frontmatter && page.frontmatter.edition;
        items.push({
          key,
          path,
          scene,
          title,
          edition,
        });
      }
      items.sort((a, b) => {
        if (a.edition && b.edition && a.edition !== b.edition) {
          return a.edition.localeCompare(b.edition);
        }
        return a.title.localeCompare(b.title);
      });
      this.bookmarks = items;
    },
  },
};

function css(el, property) {
  // NOTE: Known bug, will return 'auto' if style value is 'auto'
  const win = el.ownerDocument.defaultView;
  // null means not to return pseudo styles
  return win.getComputedStyle(el, null)[property];
}
</script>

<style lang="stylus">
@import '../../styles/config.styl';

$navbar-vertical-padding = 0.6rem;
$navbar-horizontal-padding = 1.4rem;

.navbar {
  position: relative;
  padding-block: 0;
  padding-inline-start: 0;
  padding-inline-end: 4rem;

  a, span, img {
    display: inline-block;
  }

  .logo {
    height: 3.5em;
    vertical-align: top;
    margin-inline-end: 0.9rem;
  }

  .site-name {
    position: relative;
    font-size: 1.6rem;
    font-weight: 900;
    color: $backColor;
    text-shadow: 2px 2px #eee;
    margin-block-start: 0.7rem;
  }

  .links {
    position: absolute;
    inset-block-start: $navbar-vertical-padding;
    inset-inline-end: $navbar-horizontal-padding;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    box-sizing: border-box;
    font-size: 1rem;
    font-weight: 700;
    background-color: $navColor;
    white-space: nowrap;
    padding-inline-start: 1.5rem;

    .search-box {
      flex: 0 0 auto;
      vertical-align: top;
    }

    .nav-links {
      flex: 1;
    }

    .bookmark-wrapper {
      position: relative;
    }

    .help-wrapper {
      position: relative;
    }

    .bookmark-trigger {
      width: 2.4rem;
      height: 2.4rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: $backColor;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 0.3rem;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
    }

    .bookmark-trigger:hover {
      border-color: $accentColor;
      color: $accentColor;
    }

    .bookmark-icon {
      width: 1.2rem;
      height: 1.2rem;
      fill: currentColor;
    }

    .help-trigger {
      width: 2.4rem;
      height: 2.4rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: $backColor;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 0.3rem;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
    }

    .help-trigger:hover {
      border-color: $accentColor;
      color: $accentColor;
    }

    .help-icon {
      width: 1.15rem;
      height: 1.15rem;
      fill: currentColor;
    }

    .community-description {
      font-size: 0.85rem;
      font-weight: 400;
      line-height: 1.25;
      text-wrap: balance;
      margin-block-start: 0.25rem;
    }

    .bookmark-badge {
      position: absolute;
      font-size: 0.7rem;
      font-weight: 800;
      color: #1a1a1a;
      background: $accentColor;
      border-radius: 999px;
      padding: 0.1rem 0.35rem;
      inset-block-start: -0.2rem;
      inset-inline-end: -0.2rem;
    }

    .bookmark-dropdown {
      position: absolute;
      min-width: 22rem;
      max-width: 90vw;
      z-index: 20;
      inset-block-start: calc(100% + 0.4rem);
      inset-inline-end: 0;
      color: $backColor;
      background: #fff;
      border: 1px solid darken($borderColor, 10%);
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      padding-block: 0.8rem;
      padding-inline: 0.8rem;
    }

    .help-dropdown {
      position: absolute;
      width: 20rem;
      max-width: 90vw;
      z-index: 20;
      inset-block-start: calc(100% + 0.4rem);
      inset-inline-end: 0;
      color: $backColor;
      background: #fff;
      border: 1px solid darken($borderColor, 10%);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      padding-block: 1rem;
      padding-inline: 1rem;
    }

    .help-header {
      font-weight: 800;
      margin-block-end: 0.6rem;
    }

    .help-section + .help-section {
      margin-block-start: 1rem;
    }

    .help-section h4 {
      font-size: 0.85rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: lighten($backColor, 20%);
      margin-block: 0 0.4rem;
    }

    .help-section p {
      font-size: 0.9rem;
      line-height: 1.4;
      color: lighten($backColor, 10%);
      margin: 0;
    }

    .help-list {
      list-style: none;
      display: grid;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: lighten($backColor, 10%);
      margin: 0;
      padding: 0;
    }

    .help-list kbd {
      min-width: 1.2rem;
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 800;
      color: #1a1a1a;
      background: #f3f3f3;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding-block: 0.1rem;
      padding-inline: 0.4rem;
      margin-inline-end: 0.2rem;
    }

    .bookmark-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 800;
      margin-block-end: 0.6rem;
    }

    .bookmark-count {
      font-size: 0.8rem;
      color: lighten($backColor, 20%);
    }

    .bookmark-list {
      list-style: none;
      display: grid;
      gap: 0.5rem;
      width: 100%;
      margin: 0;
      padding: 0;
    }

    .bookmark-list li {
      display: flex;
      align-items: stretch;
      width: 100%;
      box-sizing: border-box;
      background: #fefefe;
      border: 1px solid #ddd;
      border-radius: 6px;
      overflow: hidden;
    }

    .bookmark-link {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      color: $backColor;
      overflow: hidden;
      padding-block: 0.55rem;
      padding-inline: 0.8rem;
    }

    .bookmark-link:hover {
      background: #f6f6f6;
    }

    .bookmark-title {
      font-size: 0.95rem;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bookmark-meta {
      display: flex;
      gap: 0.6rem;
      font-size: 0.8rem;
      color: lighten($backColor, 25%);
      flex-wrap: wrap;
    }

    .bookmark-remove {
      flex: 0 0 3rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: lighten($backColor, 10%);
      background: #f3f3f3;
      border: 0;
      border-inline-start: 1px solid #e3e3e3;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }

    .bookmark-remove:hover {
      color: #d16b6b;
      background: #fff1f1;
    }

    .bookmark-remove-icon {
      width: 1rem;
      height: 1rem;
      display: block;
      fill: currentColor;
    }

    .bookmark-empty {
      font-size: 0.9rem;
      color: lighten($backColor, 30%);
      margin-block-start: 0.4rem;
    }
  }
}

@media (max-width: $MQMobile) {
  .navbar {
    padding-inline-start: 3.1rem;

    .can-hide {
      display: none;
    }

    .links {
      padding-inline-start: 2rem;
    }

    .logo {
      height: 3.2rem;
      min-width: 3rem;
    }
  }
}
</style>
