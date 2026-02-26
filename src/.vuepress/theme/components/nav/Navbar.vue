<template>
  <header class="navbar">
    <SidebarButton @toggle-sidebar="$emit('toggle-sidebar')" />

    <router-link :to="$localePath" class="home-link">
      <img
        class="logo"
        v-if="$site.themeConfig.logo"
        :src="$assetUrl($withBase($site.themeConfig.logo))"
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
      <NavLinks class="can-hide" />
      <QuickJumpPalette />
      <a
        class="social-trigger"
        href="https://old.reddit.com/r/civbattleroyale/"
        aria-label="Reddit"
        title="Reddit"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg class="social-icon" viewBox="0 0 512 512" aria-hidden="true">
          <path
            d="M0 256C0 114.6 114.6 0 256 0S512 114.6 512 256 397.4 512 256 512L37.1 512c-13.7 0-20.5-16.5-10.9-26.2L75 437C28.7 390.7 0 326.7 0 256zM349.6 153.6c23.6 0 42.7-19.1 42.7-42.7s-19.1-42.7-42.7-42.7c-20.6 0-37.8 14.6-41.8 34-34.5 3.7-61.4 33-61.4 68.4l0 .2c-37.5 1.6-71.8 12.3-99 29.1-10.1-7.8-22.8-12.5-36.5-12.5-33 0-59.8 26.8-59.8 59.8 0 24 14.1 44.6 34.4 54.1 2 69.4 77.6 125.2 170.6 125.2s168.7-55.9 170.6-125.3c20.2-9.6 34.1-30.2 34.1-54 0-33-26.8-59.8-59.8-59.8-13.7 0-26.3 4.6-36.4 12.4-27.4-17-62.1-27.7-100-29.1l0-.2c0-25.4 18.9-46.5 43.4-49.9 4.4 18.8 21.3 32.8 41.5 32.8l.1 .2zM177.1 246.9c16.7 0 29.5 17.6 28.5 39.3s-13.5 29.6-30.3 29.6-31.4-8.8-30.4-30.5 15.4-38.3 32.1-38.3l.1-.1zm190.1 38.3c1 21.7-13.7 30.5-30.4 30.5s-29.3-7.9-30.3-29.6 11.8-39.3 28.5-39.3 31.2 16.6 32.1 38.3l.1 .1zm-48.1 56.7c-10.3 24.6-34.6 41.9-63 41.9s-52.7-17.3-63-41.9c-1.2-2.9 .8-6.2 3.9-6.5 18.4-1.9 38.3-2.9 59.1-2.9s40.7 1 59.1 2.9c3.1 .3 5.1 3.6 3.9 6.5z"
          />
        </svg>
      </a>
      <a
        class="social-trigger"
        href="https://discord.gg/565JwaMsuQ"
        aria-label="Discord"
        title="Discord"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          class="social-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          aria-hidden="true"
        >
          <path
            d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5zM417.9 401.5C388.9 401.5 365.1 374.9 365.1 342.3C365.1 309.7 388.5 283.1 417.9 283.1C447.6 283.1 471.2 309.9 470.7 342.3C470.7 375 447.5 401.5 417.9 401.5z"
          />
        </svg>
      </a>
      <router-link
        class="community-trigger"
        to="/community-tile-map/"
        aria-label="Community tile map"
        title="Community tile map"
      >
        <svg
          class="community-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          aria-hidden="true"
        >
          <path
            transform="rotate(90 320 320)"
            d="M65.5 284.3C52.8 306.5 52.8 333.7 65.5 355.8L161.7 523.9C174.5 546.3 198.4 560.1 224.2 560.1L415.8 560.1C441.6 560.1 465.5 546.3 478.3 523.9L574.5 355.8C587.2 333.6 587.2 306.4 574.5 284.3L478.3 116.2C465.5 93.8 441.6 80 415.8 80L224.2 80C198.4 80 174.5 93.8 161.7 116.2L65.5 284.3zM107.2 332C103 324.6 103 315.5 107.2 308.2L203.4 140.1C207.7 132.6 215.6 128 224.2 128L415.8 128C424.4 128 432.4 132.6 436.6 140.1L532.8 308.2C537 315.6 537 324.7 532.8 332L436.7 500C432.4 507.5 424.5 512.1 415.9 512.1L224.3 512.1C215.7 512.1 207.7 507.5 203.5 500L107.2 332zM296 408C296 421.3 306.7 432 320 432C333.3 432 344 421.3 344 408L344 344L408 344C421.3 344 432 333.3 432 320C432 306.7 421.3 296 408 296L344 296L344 232C344 218.7 333.3 208 320 208C306.7 208 296 218.7 296 232L296 296L232 296C218.7 296 208 306.7 208 320C208 333.3 218.7 344 232 344L296 344L296 408z"
          />
        </svg>
      </router-link>
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
                  <span v-else-if="bookmark.pr">{{ bookmark.pr }}</span>
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

      <div class="user-wrapper" ref="userWrapper">
        <button
          type="button"
          class="user-trigger"
          aria-label="User menu"
          aria-haspopup="true"
          :aria-expanded="userOpen ? 'true' : 'false'"
          @click="toggleUserMenu"
        >
          <svg
            class="user-icon"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            aria-hidden="true"
          >
            <path d="M18 20a6 6 0 0 0-12 0" />
            <circle cx="12" cy="10" r="4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span
            v-if="userStatusBadge"
            class="user-status-badge"
            :class="{
              'is-supporter': userStatusBadge === 'supporter',
              'is-non-supporter': userStatusBadge === 'non-supporter',
            }"
            :title="userStatusBadgeTitle"
            aria-hidden="true"
          >
            {{ userStatusBadge === "supporter" ? "$" : "!" }}
          </span>
        </button>
        <div v-if="userOpen" class="user-dropdown">
          <!-- <div class="user-header">Account</div> -->
          <div v-if="!authUser" class="user-section">
            <p class="user-copy">
              Sign in to sync settings, write reactions, leave comments, and
              more!
            </p>

            <input
              class="user-input"
              type="email"
              placeholder="Email linked with Ko-Fi"
              v-model="authEmail"
              autocomplete="email"
            />
            <button
              type="button"
              class="user-button"
              :disabled="authLoading"
              @click="signInWithEmail"
            >
              {{ authLoading ? "Sending..." : "Send Link" }}
            </button>
            <div class="user-field">
              <label class="user-label">Theme</label>
              <div class="user-toggle">
                <button
                  type="button"
                  class="user-chip"
                  :class="{ 'is-active': themeMode === 'dark' }"
                  @click="setThemeMode('dark')"
                >
                  Dark
                </button>
                <button
                  type="button"
                  class="user-chip"
                  :class="{ 'is-active': themeMode === 'light' }"
                  @click="setThemeMode('light')"
                >
                  Light
                </button>
              </div>
            </div>
            <p v-if="authMessage" class="user-message">{{ authMessage }}</p>
            <p class="user-cta">
              Support the show and get exclusive features.
              <br />
              <a href="https://ko-fi.com/coiot" target="_blank" rel="noreferrer"
                >Donate on Ko-Fi</a
              >
            </p>
          </div>
          <div v-else class="user-section">
            <p class="user-email">{{ displayName }}</p>
            <div class="user-field">
              <label class="user-label" for="user-name-input">Username</label>
              <div class="user-row">
                <input
                  id="user-name-input"
                  class="user-input"
                  type="text"
                  placeholder="Set display name"
                  v-model="usernameInput"
                  maxlength="32"
                  autocomplete="nickname"
                />
                <button
                  type="button"
                  class="user-button"
                  :disabled="usernameSaving"
                  @click="saveUsername"
                >
                  {{ usernameSaving ? "Saving..." : "Save" }}
                </button>
              </div>
              <p v-if="usernameMessage" class="user-message">
                {{ usernameMessage }}
              </p>
            </div>
            <div class="user-field">
              <label class="user-label">View Mode</label>
              <div class="user-toggle">
                <button
                  type="button"
                  class="user-chip"
                  :class="{ 'is-active': albumsViewMode === 'vertical' }"
                  @click="setAlbumsViewMode('vertical')"
                >
                  Vertical
                </button>
                <button
                  type="button"
                  class="user-chip"
                  :class="{ 'is-active': albumsViewMode === 'horizontal' }"
                  @click="setAlbumsViewMode('horizontal')"
                >
                  Horizontal
                </button>
              </div>
            </div>
            <div class="user-field">
              <label class="user-label">Theme</label>
              <div class="user-toggle">
                <button
                  type="button"
                  class="user-chip"
                  :class="{ 'is-active': themeMode === 'dark' }"
                  @click="setThemeMode('dark')"
                >
                  Dark
                </button>
                <button
                  type="button"
                  class="user-chip"
                  :class="{ 'is-active': themeMode === 'light' }"
                  @click="setThemeMode('light')"
                >
                  Light
                </button>
              </div>
            </div>
            <div class="user-field">
              <label class="user-label" for="user-civ-select"
                >Favorite civ</label
              >
              <select
                id="user-civ-select"
                class="user-input"
                v-model="favoriteCiv"
                :disabled="!canEditSupporterFields"
                @change="saveFavoriteCiv"
              >
                <option value="">No preference</option>
                <option v-for="civ in civOptions" :key="civ" :value="civ">
                  {{ civ }}
                </option>
              </select>
            </div>
            <div class="user-field">
              <label class="user-label" for="user-flair-input"
                >Custom flair</label
              >
              <input
                id="user-flair-input"
                class="user-input"
                type="text"
                placeholder="Add a short flair"
                v-model="customFlair"
                maxlength="40"
                :disabled="!canEditSupporterFields"
                @change="saveCustomFlair"
              />
              <p class="user-hint">Shown next to your supporter comment.</p>
            </div>
            <p v-if="authMessage" class="user-message">{{ authMessage }}</p>
            <button type="button" class="user-button" @click="signOut">
              Sign out
            </button>
            <p class="user-cta" v-if="canEditSupporterFields">n.n <3</p>
            <p class="user-cta" v-else>
              Signed in. Consider donating!
              <br />
              <a href="https://ko-fi.com/coiot" target="_blank" rel="noreferrer"
                >Become a supporter on Ko-Fi</a
              >
            </p>
          </div>
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
              <li><kbd>→</kbd> / <kbd>J</kbd> Next scene</li>
              <li><kbd>←</kbd> / <kbd>K</kbd> Previous scene</li>
              <li><kbd>Home</kbd> / <kbd>End</kbd> First / Last scene</li>
              <li><kbd>B</kbd> Toggle bookmark</li>
              <li><kbd>R</kbd> Resume to bookmark</li>
              <li><kbd>Cmd/Ctrl</kbd> + <kbd>K</kbd> Open quick jump</li>
              <li><kbd>T</kbd> Toggle view</li>
              <li><kbd>F</kbd> Toggle fullscreen</li>
              <!-- <li><kbd>C</kbd> Copy scene link</li> -->
            </ul>
          </div>
          <div class="help-section">
            <h4>About CivBattleRoyale</h4>
            <p class="community-description">
              A community-driven Civilization computer-only game with narrated
              episodes, power rankings, and goofy lore across multiple seasons.
            </p>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import SidebarButton from "../sidebar/SidebarButton.vue";
import NavLinks from "./NavLinks.vue";
import QuickJumpPalette from "./QuickJumpPalette.vue";
import { getEdition } from "../../../data/editions";
import {
  getSupabaseClient,
  ensureProfileRow,
  SUPABASE_ALBUM_PROGRESS_TABLE,
  SUPABASE_USER_SETTINGS_TABLE,
} from "../../supabaseClient";

const USER_SETTINGS_KEYS = [
  "albumsViewMode",
  "favoriteCiv",
  "customFlair",
  "themeMode",
];
const THEME_STORAGE_KEY = "themeMode";
const DEFAULT_THEME_MODE = "dark";

export default {
  components: {
    SidebarButton,
    NavLinks,
    QuickJumpPalette,
  },

  data() {
    return {
      linksWrapMaxWidth: null,
      bookmarks: [],
      bookmarkOpen: false,
      helpOpen: false,
      userOpen: false,
      supabase: null,
      authUser: null,
      authProfile: null,
      userSettings: {},
      authEmail: "",
      usernameInput: "",
      usernameSaving: false,
      usernameMessage: "",
      albumsViewMode: "vertical",
      themeMode: DEFAULT_THEME_MODE,
      favoriteCiv: "",
      customFlair: "",
      authLoading: false,
      authMessage: "",
    };
  },

  mounted() {
    const MOBILE_DESKTOP_BREAKPOINT = 799; // keep aligned with CSS breakpoints
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

    this.initSupabase();
    this.loadBookmarks();
    this.loadViewMode();
    this._bookmarkUpdateHandler = () => this.loadBookmarks();
    if (typeof window !== "undefined") {
      window.addEventListener(
        "albums-bookmark-updated",
        this._bookmarkUpdateHandler
      );
      window.addEventListener("storage", this._bookmarkUpdateHandler);
      this._themeStorageHandler = (event) =>
        this.handleThemeStorageUpdate(event);
      window.addEventListener("storage", this._themeStorageHandler);
      window.addEventListener(
        "user-settings-updated",
        this.handleSettingsUpdate
      );
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
      if (this._themeStorageHandler) {
        window.removeEventListener("storage", this._themeStorageHandler);
        this._themeStorageHandler = null;
      }
      window.removeEventListener(
        "user-settings-updated",
        this.handleSettingsUpdate
      );
      window.removeEventListener("click", this.handleOutsideClick, true);
    }
    this.teardownSupabase();
  },

  computed: {
    useCloud() {
      return Boolean(this.supabase && this.authUser);
    },
    displayName() {
      if (this.authProfile && this.authProfile.username) {
        return this.authProfile.username;
      }
      return (this.authUser && this.authUser.email) || "";
    },
    civOptions() {
      const edition = getEdition("s5");
      const names = (
        edition && edition.competitors
          ? edition.competitors.map((civ) => civ.name)
          : []
      ).slice();
      if (!names.includes("Babylon")) {
        names.push("Babylon");
      }
      return names.sort((a, b) => a.localeCompare(b, "en"));
    },
    userStatusBadge() {
      if (!this.authUser || !this.authProfile) {
        return "";
      }
      return this.authProfile.can_edit === true ? "supporter" : "non-supporter";
    },
    canEditSupporterFields() {
      return Boolean(
        this.authUser && this.authProfile && this.authProfile.can_edit === true
      );
    },
    userStatusBadgeTitle() {
      if (this.userStatusBadge === "supporter") {
        return "Supporter account. Thank you!";
      }
      if (this.userStatusBadge === "non-supporter") {
        return "Signed in (non-supporter)";
      }
      return "";
    },
  },

  watch: {
    $route() {
      this.bookmarkOpen = false;
      this.helpOpen = false;
      this.userOpen = false;
      this.loadBookmarks();
    },
  },

  methods: {
    broadcastAuthSession(session) {
      if (typeof window === "undefined") {
        return;
      }
      window.dispatchEvent(
        new CustomEvent("supabase-auth-session", {
          detail: {
            session: session || null,
            user: session && session.user ? session.user : null,
          },
        })
      );
    },
    initSupabase() {
      if (this.supabase || typeof window === "undefined") {
        return;
      }
      this.supabase = getSupabaseClient();
      if (!this.supabase) {
        return;
      }
      const { data } = this.supabase.auth.onAuthStateChange(
        (_event, session) => {
          this.handleAuthSession(session);
        }
      );
      this._authSubscription = data ? data.subscription : null;
      this.supabase.auth.getSession().then(({ data: sessionData }) => {
        this.handleAuthSession(sessionData ? sessionData.session : null);
      });
    },
    teardownSupabase() {
      if (this._authSubscription) {
        this._authSubscription.unsubscribe();
        this._authSubscription = null;
      }
      this._localSyncDone = false;
      this._localSyncPromise = null;
      this._settingsSyncDone = false;
      this._settingsSyncPromise = null;
    },
    handleAuthSession(session) {
      this.authUser = session ? session.user : null;
      this.broadcastAuthSession(session || null);
      if (this.authUser && !this.authEmail) {
        this.authEmail = this.authUser.email || "";
      }
      this._localSyncDone = false;
      this._settingsSyncDone = false;
      if (this.authUser) {
        this.authMessage = "Signed in.";
        this.fetchProfile();
        this.syncLocalStateToCloud().then(() => {
          this.loadBookmarks();
        });
        this.syncLocalSettingsToCloud();
        return;
      }
      if (this.authMessage && this.authMessage !== "Signed out.") {
        this.authMessage = "";
      }
      this.authProfile = null;
      this.userSettings = {};
      this.usernameInput = "";
      this.usernameMessage = "";
      this.favoriteCiv = "";
      this.customFlair = "";
      this.loadBookmarks();
    },
    collectLocalAlbumState() {
      if (typeof window === "undefined") {
        return {};
      }
      const state = {};
      const storage = window.localStorage || {};
      const bookmarkPrefix = "albumsBookmark:";
      const resumePrefix = "albumsResume:";
      Object.keys(storage).forEach((key) => {
        if (key.startsWith(bookmarkPrefix)) {
          const path = key.slice(bookmarkPrefix.length);
          const scene = parseInt(window.localStorage.getItem(key), 10);
          if (!Number.isFinite(scene)) {
            return;
          }
          state[path] = state[path] || {};
          state[path].bookmark_scene = scene;
          return;
        }
        if (key.startsWith(resumePrefix)) {
          const path = key.slice(resumePrefix.length);
          const scene = parseInt(window.localStorage.getItem(key), 10);
          if (!Number.isFinite(scene)) {
            return;
          }
          state[path] = state[path] || {};
          state[path].resume_scene = scene;
        }
      });
      return state;
    },
    async syncLocalStateToCloud() {
      if (!this.useCloud) {
        return;
      }
      if (this._localSyncDone) {
        return;
      }
      if (this._localSyncPromise) {
        return this._localSyncPromise;
      }
      let syncSucceeded = false;
      this._localSyncPromise = (async () => {
        try {
          const localState = this.collectLocalAlbumState();
          const paths = Object.keys(localState);
          if (!paths.length) {
            syncSucceeded = true;
            return;
          }
          const { data, error } = await this.supabase
            .from(SUPABASE_ALBUM_PROGRESS_TABLE)
            .select("page_path, bookmark_scene, resume_scene")
            .eq("user_id", this.authUser.id)
            .in("page_path", paths);
          if (error) {
            console.warn("Unable to sync local album state.", error);
            return;
          }
          const cloudMap = new Map(
            (data || []).map((row) => [row.page_path, row])
          );
          const rows = [];
          paths.forEach((path) => {
            const localEntry = localState[path] || {};
            const cloudEntry = cloudMap.get(path) || {};
            const cloudBookmark = parseInt(cloudEntry.bookmark_scene, 10);
            const cloudResume = parseInt(cloudEntry.resume_scene, 10);
            const bookmarkScene = Number.isFinite(cloudBookmark)
              ? cloudBookmark
              : localEntry.bookmark_scene;
            const resumeScene = Number.isFinite(cloudResume)
              ? cloudResume
              : localEntry.resume_scene;
            if (
              !Number.isFinite(bookmarkScene) &&
              !Number.isFinite(resumeScene)
            ) {
              return;
            }
            rows.push({
              user_id: this.authUser.id,
              page_path: path,
              bookmark_scene: Number.isFinite(bookmarkScene)
                ? bookmarkScene
                : null,
              resume_scene: Number.isFinite(resumeScene) ? resumeScene : null,
            });
          });
          if (!rows.length) {
            syncSucceeded = true;
            return;
          }
          let syncError = null;
          for (const row of rows) {
            try {
              const { data: updatedRows, error: updateError } =
                await this.supabase
                  .from(SUPABASE_ALBUM_PROGRESS_TABLE)
                  .update(row)
                  .eq("user_id", row.user_id)
                  .eq("page_path", row.page_path)
                  .select("user_id")
                  .limit(1);
              if (updateError) {
                syncError = updateError;
                break;
              }
              if (Array.isArray(updatedRows) && updatedRows.length) {
                continue;
              }
              const { error: insertError } = await this.supabase
                .from(SUPABASE_ALBUM_PROGRESS_TABLE)
                .insert(row);
              if (insertError) {
                syncError = insertError;
                break;
              }
            } catch (error) {
              syncError = error;
              break;
            }
          }
          if (syncError) {
            console.warn("Unable to sync local album state.", syncError);
            return;
          }
          syncSucceeded = true;
        } catch (error) {
          console.warn("Unable to sync local album state.", error);
        }
      })();
      try {
        await this._localSyncPromise;
      } finally {
        this._localSyncPromise = null;
        if (syncSucceeded) {
          this._localSyncDone = true;
        }
      }
    },
    async fetchProfile() {
      if (!this.useCloud) {
        return;
      }
      const { error: ensureError } = await ensureProfileRow(
        this.supabase,
        this.authUser
      );
      if (ensureError) {
        console.warn("Unable to ensure profile row.", ensureError);
      }
      const { data, error } = await this.supabase
        .from("profiles")
        .select("username, can_edit")
        .eq("id", this.authUser.id)
        .maybeSingle();
      if (error) {
        console.warn("Unable to load profile.", error);
        this.authMessage = "Signed in. Unable to verify supporter status.";
        return;
      }
      this.authProfile = data || null;
      this.authMessage =
        this.authProfile && this.authProfile.can_edit === true
          ? "Supporter account. Thank you!"
          : "Signed in.";
      if (this.authProfile && this.authProfile.username) {
        this.usernameInput = this.authProfile.username;
      }
    },
    collectLocalUserSettings() {
      if (typeof window === "undefined") {
        return {};
      }
      const settings = {};
      USER_SETTINGS_KEYS.forEach((key) => {
        const value = window.localStorage.getItem(key);
        if (!value) {
          return;
        }
        if (key === "albumsViewMode") {
          if (value === "horizontal" || value === "vertical") {
            settings[key] = value;
          }
          return;
        }
        if (key === "favoriteCiv") {
          settings[key] = value;
          return;
        }
        if (key === "customFlair") {
          settings[key] = value;
          return;
        }
        if (key === "themeMode") {
          settings[key] = this.normalizeThemeMode(value);
          return;
        }
        settings[key] = value;
      });
      return settings;
    },
    applyUserSettings(settings, emit = false) {
      if (typeof window === "undefined") {
        return;
      }
      if (!settings || typeof settings !== "object") {
        return;
      }
      USER_SETTINGS_KEYS.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(settings, key)) {
          return;
        }
        const value = settings[key];
        if (key === "albumsViewMode") {
          if (value === "horizontal" || value === "vertical") {
            window.localStorage.setItem(key, value);
          } else {
            window.localStorage.setItem(key, "vertical");
          }
          return;
        }
        if (key === "favoriteCiv") {
          if (value) {
            window.localStorage.setItem(key, value);
          } else {
            window.localStorage.removeItem(key);
          }
          return;
        }
        if (key === "customFlair") {
          if (value) {
            window.localStorage.setItem(key, value);
          } else {
            window.localStorage.removeItem(key);
          }
          return;
        }
        if (key === "themeMode") {
          const mode = this.normalizeThemeMode(value);
          window.localStorage.setItem(THEME_STORAGE_KEY, mode);
          this.applyThemeMode(mode);
          return;
        }
        if (value == null) {
          return;
        }
        window.localStorage.setItem(key, String(value));
      });
      if (emit) {
        window.dispatchEvent(
          new CustomEvent("user-settings-synced", { detail: settings })
        );
      }
    },
    async syncLocalSettingsToCloud() {
      if (!this.useCloud) {
        return;
      }
      if (this._settingsSyncDone) {
        return;
      }
      if (this._settingsSyncPromise) {
        return this._settingsSyncPromise;
      }
      let syncSucceeded = false;
      this._settingsSyncPromise = (async () => {
        const { error: ensureError } = await ensureProfileRow(
          this.supabase,
          this.authUser
        );
        if (ensureError) {
          console.warn("Unable to ensure profile row.", ensureError);
          return;
        }
        const localSettings = this.collectLocalUserSettings();
        const { data, error } = await this.supabase
          .from(SUPABASE_USER_SETTINGS_TABLE)
          .select("settings")
          .eq("user_id", this.authUser.id)
          .maybeSingle();
        if (error) {
          console.warn("Unable to sync user settings.", error);
          return;
        }
        const cloudSettings = (data && data.settings) || {};
        const merged = { ...localSettings, ...cloudSettings };
        this.userSettings = merged;
        this.applyUserSettings(merged, true);
        this.loadViewMode();
        let needsUpsert = !data;
        USER_SETTINGS_KEYS.forEach((key) => {
          if (
            Object.prototype.hasOwnProperty.call(localSettings, key) &&
            !Object.prototype.hasOwnProperty.call(cloudSettings, key)
          ) {
            needsUpsert = true;
          }
        });
        if (!needsUpsert) {
          syncSucceeded = true;
          return;
        }
        const { error: upsertError } = await this.supabase
          .from(SUPABASE_USER_SETTINGS_TABLE)
          .upsert(
            {
              user_id: this.authUser.id,
              settings: merged,
            },
            { onConflict: "user_id" }
          );
        if (upsertError) {
          console.warn("Unable to sync user settings.", upsertError);
          return;
        }
        syncSucceeded = true;
      })();
      try {
        await this._settingsSyncPromise;
      } finally {
        this._settingsSyncPromise = null;
        if (syncSucceeded) {
          this._settingsSyncDone = true;
        }
      }
    },
    async saveUserSettings(patch) {
      if (!this.useCloud || !patch || typeof patch !== "object") {
        return;
      }
      const { error: ensureError } = await ensureProfileRow(
        this.supabase,
        this.authUser
      );
      if (ensureError) {
        console.warn("Unable to ensure profile row.", ensureError);
        return;
      }
      this.userSettings = { ...this.userSettings, ...patch };
      const { error } = await this.supabase
        .from(SUPABASE_USER_SETTINGS_TABLE)
        .upsert(
          {
            user_id: this.authUser.id,
            settings: this.userSettings,
          },
          { onConflict: "user_id" }
        );
      if (error) {
        console.warn("Unable to save user settings.", error);
      }
    },
    handleSettingsUpdate(event) {
      if (!event || !event.detail) {
        return;
      }
      const settings = event.detail;
      this.applyUserSettings(settings, false);
      if (Object.prototype.hasOwnProperty.call(settings, "albumsViewMode")) {
        this.albumsViewMode = settings.albumsViewMode;
      }
      if (Object.prototype.hasOwnProperty.call(settings, "favoriteCiv")) {
        this.favoriteCiv = settings.favoriteCiv || "";
      }
      if (Object.prototype.hasOwnProperty.call(settings, "customFlair")) {
        this.customFlair = settings.customFlair || "";
      }
      if (Object.prototype.hasOwnProperty.call(settings, "themeMode")) {
        const mode = this.normalizeThemeMode(settings.themeMode);
        this.themeMode = mode;
        this.applyThemeMode(mode);
      }
      this.saveUserSettings(settings);
    },
    loadViewMode() {
      if (typeof window === "undefined") {
        return;
      }
      const stored = window.localStorage.getItem("albumsViewMode");
      this.albumsViewMode = stored === "horizontal" ? "horizontal" : "vertical";
      const storedCiv = window.localStorage.getItem("favoriteCiv");
      this.favoriteCiv = storedCiv || "";
      const storedFlair = window.localStorage.getItem("customFlair");
      this.customFlair = storedFlair || "";
      const storedThemeMode = this.normalizeThemeMode(
        window.localStorage.getItem(THEME_STORAGE_KEY)
      );
      this.themeMode = storedThemeMode;
      this.applyThemeMode(storedThemeMode);
    },
    normalizeThemeMode(mode) {
      return mode === "light" ? "light" : DEFAULT_THEME_MODE;
    },
    applyThemeMode(mode) {
      if (typeof document === "undefined") {
        return;
      }
      const normalized = this.normalizeThemeMode(mode);
      this.themeMode = normalized;
      const root = document.documentElement;
      root.setAttribute("data-theme", normalized);
      root.style.colorScheme = normalized;
    },
    setThemeMode(mode) {
      if (typeof window === "undefined") {
        return;
      }
      const normalized = this.normalizeThemeMode(mode);
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
      this.applyThemeMode(normalized);
      window.dispatchEvent(
        new CustomEvent("user-settings-updated", {
          detail: { themeMode: normalized },
        })
      );
    },
    handleThemeStorageUpdate(event) {
      if (
        !event ||
        event.storageArea !== window.localStorage ||
        event.key !== THEME_STORAGE_KEY
      ) {
        return;
      }
      const mode = this.normalizeThemeMode(event.newValue);
      this.applyThemeMode(mode);
    },
    setAlbumsViewMode(mode) {
      if (typeof window === "undefined") {
        return;
      }
      if (mode !== "horizontal" && mode !== "vertical") {
        return;
      }
      this.albumsViewMode = mode;
      window.localStorage.setItem("albumsViewMode", mode);
      window.dispatchEvent(
        new CustomEvent("user-settings-updated", {
          detail: { albumsViewMode: mode },
        })
      );
    },
    saveFavoriteCiv() {
      if (this.authUser && !this.canEditSupporterFields) {
        return;
      }
      if (typeof window === "undefined") {
        return;
      }
      const value = String(this.favoriteCiv || "").trim();
      if (value) {
        window.localStorage.setItem("favoriteCiv", value);
      } else {
        window.localStorage.removeItem("favoriteCiv");
      }
      window.dispatchEvent(
        new CustomEvent("user-settings-updated", {
          detail: { favoriteCiv: value },
        })
      );
    },
    saveCustomFlair() {
      if (this.authUser && !this.canEditSupporterFields) {
        return;
      }
      if (typeof window === "undefined") {
        return;
      }
      const value = String(this.customFlair || "").trim();
      if (value) {
        window.localStorage.setItem("customFlair", value);
      } else {
        window.localStorage.removeItem("customFlair");
      }
      window.dispatchEvent(
        new CustomEvent("user-settings-updated", {
          detail: { customFlair: value },
        })
      );
    },
    async saveUsername() {
      if (!this.useCloud) {
        return;
      }
      const trimmed = String(this.usernameInput || "").trim();
      if (!trimmed) {
        this.usernameMessage = "Enter a username to save.";
        return;
      }
      if (trimmed.length > 32) {
        this.usernameMessage = "Username must be 32 characters or less.";
        return;
      }
      if (this.authProfile && this.authProfile.username === trimmed) {
        this.usernameMessage = "Username is already set.";
        return;
      }
      this.usernameSaving = true;
      this.usernameMessage = "";
      const { error } = await this.supabase.from("profiles").upsert(
        {
          id: this.authUser.id,
          username: trimmed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      this.usernameSaving = false;
      if (error) {
        console.warn("Unable to save username.", error);
        this.usernameMessage = "Unable to save username.";
        return;
      }
      this.authProfile = { ...(this.authProfile || {}), username: trimmed };
      this.usernameMessage = "Username saved.";
    },
    updateLocalBookmarksCache(items) {
      if (typeof window === "undefined") {
        return;
      }
      const prefix = "albumsBookmark:";
      const keep = new Set();
      items.forEach((item) => {
        const key = `${prefix}${item.path}`;
        keep.add(key);
        if (Number.isFinite(item.scene)) {
          window.localStorage.setItem(key, String(item.scene));
        }
      });
      const keys = Object.keys(window.localStorage || {});
      keys.forEach((key) => {
        if (key.startsWith(prefix) && !keep.has(key)) {
          window.localStorage.removeItem(key);
        }
      });
    },
    toggleBookmarkMenu() {
      this.bookmarkOpen = !this.bookmarkOpen;
    },
    closeBookmarkMenu() {
      this.bookmarkOpen = false;
    },
    toggleUserMenu() {
      this.userOpen = !this.userOpen;
    },
    closeUserMenu() {
      this.userOpen = false;
    },
    toggleHelpMenu() {
      this.helpOpen = !this.helpOpen;
    },
    async signInWithEmail() {
      if (!this.supabase) {
        return;
      }
      const email = String(this.authEmail || "").trim();
      if (!email) {
        this.authMessage = "Enter your email to receive a login link.";
        return;
      }
      this.authLoading = true;
      this.authMessage = "";
      const redirectBase =
        window.location.origin +
        window.location.pathname +
        window.location.search;
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectBase,
        },
      });
      this.authLoading = false;
      if (error) {
        this.authMessage = error.message || "Unable to send login link.";
        return;
      }
      this.authMessage = "Check your email for the login link.";
    },
    async signOut() {
      if (!this.supabase) {
        return;
      }
      await this.supabase.auth.signOut();
      this.authUser = null;
      this.authProfile = null;
      this.userSettings = {};
      this.usernameInput = "";
      this.usernameMessage = "";
      this.themeMode = this.normalizeThemeMode(
        window.localStorage.getItem(THEME_STORAGE_KEY)
      );
      this.favoriteCiv = "";
      this.customFlair = "";
      this.authMessage = "Signed out.";
      this.loadBookmarks();
    },
    async removeBookmark(key) {
      if (typeof window === "undefined") {
        return;
      }
      const prefix = "albumsBookmark:";
      const path =
        key && key.startsWith(prefix) ? key.slice(prefix.length) : key;
      if (!path) {
        return;
      }
      if (this.useCloud) {
        const row = {
          user_id: this.authUser.id,
          page_path: path,
          bookmark_scene: null,
        };
        try {
          const { data: updatedRows, error: updateError } = await this.supabase
            .from(SUPABASE_ALBUM_PROGRESS_TABLE)
            .update(row)
            .eq("user_id", row.user_id)
            .eq("page_path", row.page_path)
            .select("user_id")
            .limit(1);
          if (updateError) {
            console.warn("Unable to remove cloud bookmark.", updateError);
          } else if (!Array.isArray(updatedRows) || !updatedRows.length) {
            const { error: insertError } = await this.supabase
              .from(SUPABASE_ALBUM_PROGRESS_TABLE)
              .insert(row);
            if (insertError) {
              console.warn("Unable to remove cloud bookmark.", insertError);
            }
          }
        } catch (error) {
          console.warn("Unable to remove cloud bookmark.", error);
        }
      }
      window.localStorage.removeItem(`${prefix}${path}`);
      this.loadBookmarks();
      window.dispatchEvent(new CustomEvent("albums-bookmark-updated"));
    },
    handleOutsideClick(event) {
      const wrapper = this.$refs.bookmarkWrapper;
      if (this.bookmarkOpen && wrapper && !wrapper.contains(event.target)) {
        this.bookmarkOpen = false;
      }
      const userWrapper = this.$refs.userWrapper;
      if (this.userOpen && userWrapper && !userWrapper.contains(event.target)) {
        this.userOpen = false;
      }
      const helpWrapper = this.$refs.helpWrapper;
      if (this.helpOpen && helpWrapper && !helpWrapper.contains(event.target)) {
        this.helpOpen = false;
      }
    },
    async loadBookmarks() {
      if (typeof window === "undefined") {
        this.bookmarks = [];
        return;
      }
      if (this.useCloud) {
        try {
          await this.syncLocalStateToCloud();
          const { data, error } = await this.supabase
            .from(SUPABASE_ALBUM_PROGRESS_TABLE)
            .select("page_path, bookmark_scene")
            .eq("user_id", this.authUser.id)
            .not("bookmark_scene", "is", null);
          if (error) {
            console.warn("Unable to load cloud bookmarks.", error);
            this.loadBookmarksLocal();
            return;
          }
          const items = (data || [])
            .map((row) => {
              const path = row.page_path;
              const scene = parseInt(row.bookmark_scene, 10);
              if (!Number.isFinite(scene)) {
                return null;
              }
              const page = this.$site.pages.find((p) => p.path === path);
              const title =
                (page && (page.frontmatter.title || page.title)) || path;
              const edition =
                page && page.frontmatter && page.frontmatter.edition;
              const pr = page && page.frontmatter && page.frontmatter.pr;
              return {
                key: path,
                path,
                scene,
                title,
                edition,
                pr,
              };
            })
            .filter(Boolean);
          items.sort((a, b) => {
            const aGroup = a.edition || a.pr;
            const bGroup = b.edition || b.pr;
            if (aGroup && bGroup && aGroup !== bGroup) {
              return aGroup.localeCompare(bGroup);
            }
            return a.title.localeCompare(b.title);
          });
          this.bookmarks = items;
          this.updateLocalBookmarksCache(items);
          return;
        } catch (error) {
          console.warn("Unable to load cloud bookmarks.", error);
          this.loadBookmarksLocal();
          return;
        }
      }
      this.loadBookmarksLocal();
    },
    loadBookmarksLocal() {
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
        const pr = page && page.frontmatter && page.frontmatter.pr;
        items.push({
          key: path,
          path,
          scene,
          title,
          edition,
          pr,
        });
      }
      items.sort((a, b) => {
        const aGroup = a.edition || a.pr;
        const bGroup = b.edition || b.pr;
        if (aGroup && bGroup && aGroup !== bGroup) {
          return aGroup.localeCompare(bGroup);
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

<style>
.navbar {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 1rem;
  inline-size: 100%;
  min-block-size: var(--navbar-height);
  background-color: var(--nav-color);
  padding-block: 0;
}
.navbar a,
.navbar span,
.navbar img {
  display: inline-block;
}
.navbar .logo {
  block-size: 3.5em;
  vertical-align: top;
  margin-inline-end: 0.9rem;
}
.navbar .home-link {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  text-decoration: none;
}
.navbar .site-name {
  position: relative;
  margin: 0;
  color: var(--back-color);
  font-size: 1.6rem;
  font-weight: 900;
  line-height: 1;
  text-shadow: var(--site-title-shadow);
}
.navbar .links {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 0.8rem;
  min-block-size: var(--navbar-height);
  font-size: 1rem;
  font-weight: 700;
  white-space: nowrap;
  background-color: var(--nav-color);
  margin-inline-start: auto;
  min-inline-size: 0;
  padding-block: 0.35rem;
  padding-inline: 0.5rem;
}
.navbar .links > * {
  flex: 0 0 auto;
}
.navbar .links .search-box {
  min-inline-size: 0;
  flex: 0 0 auto;
  vertical-align: top;
}
.navbar .links .nav-links {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  flex: 0 1 auto;
  flex-wrap: nowrap;
  min-inline-size: 0;
}
.navbar .links .nav-links .nav-item,
.navbar .links .nav-links .repo-link {
  margin: 0;
}
.navbar .links .bookmark-wrapper {
  position: relative;
}
.navbar .links .user-wrapper {
  position: relative;
}
.navbar .links .help-wrapper {
  position: relative;
}
.navbar .links .bookmark-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2.4rem;
  block-size: 2.4rem;
  color: var(--back-color);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.3rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.navbar .links .bookmark-trigger:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}
.navbar .links .bookmark-trigger:focus-visible {
  outline: none;
  border-color: var(--accent-color);
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color), transparent 90%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color), white 45%);
}
.navbar .links .community-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  color: var(--back-color);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.3rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.navbar .links .community-trigger:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}
.navbar .links .community-trigger:focus-visible {
  outline: none;
  border-color: var(--accent-color);
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color), transparent 90%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color), white 45%);
}
.navbar .links .community-icon {
  inline-size: 1.2rem;
  block-size: 1.2rem;
  fill: currentColor;
}
.navbar .links .social-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  color: var(--back-color);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.3rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.navbar .links .social-trigger:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}
.navbar .links .social-trigger:focus-visible {
  outline: none;
  border-color: var(--accent-color);
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color), transparent 90%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color), white 45%);
}
.navbar .links .social-icon {
  display: block;
  inline-size: 1.2rem;
  block-size: 1.2rem;
  fill: currentColor;
}
.navbar .links .user-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2.4rem;
  block-size: 2.4rem;
  padding: 0.3rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--back-color);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.navbar .links .user-trigger:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}
.navbar .links .user-trigger:focus-visible {
  outline: none;
  border-color: var(--accent-color);
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color), transparent 90%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color), white 45%);
}
.navbar .links .user-icon {
  display: block;
  inline-size: 1.15rem;
  block-size: 1.15rem;
  stroke: currentColor;
}
.navbar .links .user-status-badge {
  position: absolute;
  inset-block-start: -0.2rem;
  inset-inline-end: -0.2rem;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.1rem 0.375rem;
}
.navbar .links .user-status-badge.is-supporter {
  color: #1a1a1a;
  background: #f4c14f;
}
.navbar .links .user-status-badge.is-non-supporter {
  color: #f7f8fb;
  background: #444;
}
.navbar .links .bookmark-icon {
  inline-size: 1.2rem;
  block-size: 1.2rem;
  fill: currentColor;
}
.navbar .links .help-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2.2rem;
  block-size: 2.2rem;
  color: var(--back-color);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.3rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.navbar .links .help-trigger:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
}
.navbar .links .help-trigger:focus-visible {
  outline: none;
  color: var(--accent-color);
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color), transparent 90%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color), white 45%);
}
.navbar .links .help-icon {
  inline-size: 1.15rem;
  block-size: 1.15rem;
  fill: currentColor;
}
.navbar .links .community-description {
  font-size: 0.85rem;
  font-weight: 400;
  line-height: 1.25;
  text-wrap: balance;
  margin-block-start: 0.25rem;
}
.navbar .links .bookmark-badge {
  position: absolute;
  inset-block-start: -0.2rem;
  inset-inline-end: -0.2rem;
  color: #1a1a1a;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 999px;
  background: var(--accent-color);
  padding: 0.1rem 0.35rem;
}
.navbar .links .bookmark-dropdown {
  position: absolute;
  z-index: 20;
  inset-block-start: calc(100% + 0.4rem);
  inset-inline-end: 0;
  min-inline-size: 22rem;
  max-inline-size: 90vw;
  color: var(--back-color);
  background: var(--surface-color);
  border: 1px solid color-mix(in srgb, var(--border-color), black 10%);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding-block: 0.8rem;
  padding-inline: 0.8rem;
}
.navbar .links .user-dropdown {
  position: absolute;
  z-index: 20;
  inset-block-start: calc(100% + 0.4rem);
  inset-inline-end: 0;
  inline-size: 20rem;
  max-inline-size: 90vw;
  color: var(--back-color);
  background: var(--surface-color);
  border: 1px solid color-mix(in srgb, var(--border-color), black 10%);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding-block: 1rem;
  padding-inline: 1rem;
}
.navbar .links .help-dropdown {
  position: absolute;
  z-index: 20;
  inset-block-start: calc(100% + 0.4rem);
  inset-inline-end: 0;
  inline-size: 20rem;
  max-inline-size: 90vw;
  color: var(--back-color);
  background: var(--surface-color);
  border: 1px solid color-mix(in srgb, var(--border-color), black 10%);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding-block: 1rem;
  padding-inline: 1rem;
}
.navbar .links .user-header {
  font-weight: 800;
  margin-block-end: 0.6rem;
}
.navbar .links .user-section {
  display: grid;
  gap: 0.6rem;
}
.navbar .links .user-copy {
  color: color-mix(in srgb, var(--back-color), white 10%);
  font-size: 0.85rem;
  line-height: 1.3;
  word-break: break-word;
  white-space: normal;
  margin: 0;
}
.navbar .links .user-input {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--back-color);
  background: var(--surface-color);
  border: 1px solid var(--surface-border-color);
  border-radius: 6px;
  padding: 0.5rem 0.7rem;
}
.navbar .links .user-input:disabled {
  color: color-mix(in srgb, var(--back-color), white 45%);
  background: color-mix(in srgb, var(--surface-color), black 12%);
  border-color: color-mix(in srgb, var(--surface-border-color), black 18%);
  opacity: 0.75;
  cursor: not-allowed;
}
.navbar .links .user-label {
  color: color-mix(in srgb, var(--back-color), white 25%);
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.navbar .links .user-field {
  display: grid;
  gap: 0.5rem;
}
.navbar .links .user-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.navbar .links .user-row .user-input {
  flex: 1;
}
.navbar .links .user-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #1a1a1a;
  font-size: 0.9rem;
  font-weight: 800;
  background: var(--accent-color);
  border: 1px solid var(--accent-color);
  border-radius: 6px;
  padding: 0.45rem 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.navbar .links .user-button--ghost {
  color: var(--accent-color);
  background: var(--surface-color);
}
.navbar .links .user-button--ghost:hover {
  background: color-mix(in srgb, var(--accent-color), white 38%);
}
.navbar .links .user-button:hover {
  background: color-mix(in srgb, var(--accent-color), white 10%);
  border-color: color-mix(in srgb, var(--accent-color), white 10%);
}
.navbar .links .user-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.navbar .links .user-toggle {
  display: flex;
  gap: 0.5rem;
}
.navbar .links .user-chip {
  flex: 1;
  color: #1a1a1a;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--surface-border-color);
  border-radius: 999px;
  background: var(--surface-muted-color);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.navbar .links .user-chip.is-active {
  color: #1a1a1a;
  border-color: var(--accent-color);
  background: var(--accent-color);
}
.navbar .links .user-message {
  color: color-mix(in srgb, var(--back-color), white 15%);
  font-size: 0.85rem;
  margin: 0;
}
.navbar .links .user-hint {
  color: color-mix(in srgb, var(--back-color), white 30%);
  font-size: 0.7rem;
  margin: 0;
}
.navbar .links .user-email {
  color: var(--back-color);
  font-size: 1.125rem;
  font-weight: 800;
  margin: 0;
}
.navbar .links .user-cta {
  color: color-mix(in srgb, var(--back-color), white 35%);
  font-size: 0.75rem;
  line-height: 1.25;
  margin: 0;
}
.navbar .links .user-cta a {
  color: var(--accent-color);
  font-size: 1.25rem;
  font-weight: 900;
  padding-block-start: 0.5rem;
}
.navbar .links .help-header {
  font-weight: 800;
  margin-block-end: 0.6rem;
}
.navbar .links .help-section + .help-section {
  margin-block-start: 1rem;
}
.navbar .links .help-section h4 {
  color: color-mix(in srgb, var(--back-color), white 20%);
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-block: 0 0.4rem;
}
.navbar .links .help-section p {
  color: color-mix(in srgb, var(--back-color), white 10%);
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0;
}
.navbar .links .help-list {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
  color: color-mix(in srgb, var(--back-color), white 10%);
  font-size: 0.9rem;
}
.navbar .links .help-list kbd {
  min-inline-size: 1.2rem;
  display: inline-block;
  border: 1px solid var(--surface-border-color);
  border-radius: 6px;
  background: var(--surface-muted-color);
  color: #1a1a1a;
  font-size: 0.75rem;
  font-weight: 800;
  padding-block: 0.1rem;
  padding-inline: 0.4rem;
  margin-inline-end: 0.2rem;
}
.navbar .links .bookmark-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 800;
  margin-block-end: 0.6rem;
}
.navbar .links .bookmark-count {
  color: color-mix(in srgb, var(--back-color), white 20%);
  font-size: 0.8rem;
}
.navbar .links .bookmark-list {
  display: grid;
  gap: 0.5rem;
  inline-size: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}
.navbar .links .bookmark-list li {
  display: flex;
  align-items: stretch;
  inline-size: 100%;
  box-sizing: border-box;
  border: 1px solid var(--surface-border-color);
  border-radius: 6px;
  background: var(--surface-color);
  overflow: hidden;
}
.navbar .links .bookmark-link {
  box-sizing: border-box;
  min-inline-size: 0;
  inline-size: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  color: var(--back-color);
  overflow: hidden;
  padding-block: 0.55rem;
  padding-inline: 0.8rem;
}
.navbar .links .bookmark-link:hover {
  background: var(--surface-muted-color);
}
.navbar .links .bookmark-title {
  font-size: 0.95rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.navbar .links .bookmark-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  color: color-mix(in srgb, var(--back-color), white 25%);
  font-size: 0.8rem;
}
.navbar .links .bookmark-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 3rem;
  color: color-mix(in srgb, var(--back-color), white 10%);
  border: 0;
  border-inline-start: 1px solid var(--surface-border-color);
  background: var(--surface-muted-color);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.navbar .links .bookmark-remove:hover {
  color: #d16b6b;
  background: #fff1f1;
}
.navbar .links .bookmark-remove-icon {
  display: block;
  inline-size: 1rem;
  block-size: 1rem;
  fill: currentColor;
}
.navbar .links .bookmark-empty {
  color: color-mix(in srgb, var(--back-color), white 30%);
  font-size: 0.9rem;
  margin-block-start: 0.4rem;
}
@media (max-width: 799px) {
  .navbar {
    gap: 0.6rem;
    padding-inline: 3.1rem 0.75rem;
  }
  .navbar .can-hide {
    display: none;
  }
  .navbar .links {
    gap: 0;
    min-block-size: 0;
    padding-block: 0.2rem;
    padding-inline-start: 1rem;
  }
  .navbar .logo {
    block-size: 3.2rem;
    min-inline-size: 3rem;
  }
  .navbar .bookmark-dropdown {
    position: fixed;
    inset-block-start: calc(var(--navbar-height, 3.6rem) + 0.4rem);
    inset-inline-start: 20%;
    inset-inline-end: auto;
    inline-size: 20rem;
    max-inline-size: 95vw;
    min-inline-size: 0;
    box-sizing: border-box;
    transform: translateX(-75%);
  }
  .navbar .user-dropdown,
  .navbar .help-dropdown {
    position: fixed;
    inset-block-start: calc(var(--navbar-height, 3.6rem) + 0.4rem);
    inset-inline-end: 1rem;
    inline-size: 20rem;
    max-inline-size: 95vw;
    box-sizing: border-box;
  }
  .navbar .help-dropdown {
    inline-size: 19rem !important;
    max-inline-size: 95vw;
  }
  .navbar .social-trigger {
    display: none;
  }
}
</style>
