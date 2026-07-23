<template>
  <transition name="fade">
    <div class="home">
      <section class="home-content">
        <div class="albums-column">
          <div class="hero-intro">
            <h1 class="hero-tagline">Latest from the frontlines</h1>
          </div>
          <HomeLatestEpisode />
        </div>
        <aside class="link-column">
          <div class="quick-panel">
            <HomePowerRankings />

            <router-link
              v-if="readingReturn"
              :to="readingReturn.to"
              class="list reading-return"
            >
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
                  />
                </svg>
              </span>
              <span class="list-copy">
                <span class="list-text">{{ readingReturn.label }}</span>
                <small>{{ readingReturn.meta }}</small>
              </span>
            </router-link>

            <a href="https://civbattleroyale.tv/albums/pr/" class="list">
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 2l2.7 5.6 6.2.9-4.5 4.4 1.1 6.2L12 16.9 6.5 19.1l1.1-6.2L3 8.5l6.3-.9L12 2z"
                  />
                </svg>
              </span>
              <span class="list-text">Past Power Rankings</span>
            </a>
            <a
              href="https://www.reddit.com/r/civbattleroyale/comments/1jalax7/cbrx_season_5_megathread/"
              class="list"
            >
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 4v16M4 12h16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
              <span class="list-text">New? Join the Show</span>
            </a>
            <a href="https://ko-fi.com/coiot" class="list">
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 21l-1.1-1C6 16 3 13.1 3 9.5 3 7 5 5 7.5 5c1.6 0 3 .8 3.5 2 0 0 .7-2 3.5-2 2.5 0 4.5 2 4.5 4.5 0 3.6-3 6.5-7.9 10.5L12 21z"
                  />
                </svg>
              </span>
              <span class="list-text">Ko-Fi Donations</span>
            </a>
            <a href="https://www.youtube.com/@docido3976" class="list">
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7-11-7z" />
                </svg>
              </span>
              <span class="list-text">Episode Audio Narrations</span>
            </a>
            <a href="https://www.youtube.com/@iniocl" class="list">
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7-11-7z" />
                </svg>
              </span>
              <span class="list-text">PR Audio Narrations</span>
            </a>
          </div>
        </aside>
      </section>

      <HomeCommunityMap />

      <HomeRecentEpisodes />

      <Content custom />
    </div>
  </transition>
</template>

<script>
import HomeLatestEpisode from "../components/home/HomeLatestEpisode.vue";
import HomeRecentEpisodes from "../components/home/HomeRecentEpisodes.vue";
import HomePowerRankings from "../components/home/HomePowerRankings.vue";
import HomeCommunityMap from "../components/home/HomeCommunityMap.vue";

const READING_KEYS = [
  {
    prefix: "albumsResume:",
    updatedPrefix: "albumsResumeUpdated:",
    label: "Continue Reading",
  },
  {
    prefix: "albumsBookmark:",
    updatedPrefix: "albumsBookmarkUpdated:",
    label: "Return to Bookmark",
  },
];

function isAlbumPage(page) {
  return Boolean(
    page &&
      page.path &&
      page.path.startsWith("/albums/") &&
      page.frontmatter &&
      (Number(page.frontmatter.scene_count) > 0 ||
        (Array.isArray(page.frontmatter.scenes) &&
          page.frontmatter.scenes.length > 0))
  );
}

function pageTimestamp(page) {
  const frontmatter = (page && page.frontmatter) || {};
  const date = Date.parse(frontmatter.date || frontmatter.release_date || "");
  return Number.isFinite(date) ? date : 0;
}

export default {
  components: {
    HomeLatestEpisode,
    HomeRecentEpisodes,
    HomePowerRankings,
    HomeCommunityMap,
  },

  data() {
    return {
      readingStateReady: false,
      readingStateVersion: 0,
    };
  },

  mounted() {
    this.readingStateReady = true;
    window.addEventListener("storage", this.refreshReadingState);
    window.addEventListener(
      "albums-bookmark-updated",
      this.refreshReadingState
    );
    window.addEventListener(
      "albums-bookmarks-cache-updated",
      this.refreshReadingState
    );
    window.addEventListener(
      "albums-reading-progress-updated",
      this.refreshReadingState
    );
  },

  beforeUnmount() {
    window.removeEventListener("storage", this.refreshReadingState);
    window.removeEventListener(
      "albums-bookmark-updated",
      this.refreshReadingState
    );
    window.removeEventListener(
      "albums-bookmarks-cache-updated",
      this.refreshReadingState
    );
    window.removeEventListener(
      "albums-reading-progress-updated",
      this.refreshReadingState
    );
  },

  computed: {
    data() {
      return this.$page.frontmatter;
    },
    actionLink() {
      return {
        link: this.data.actionLink,
        text: this.data.actionText,
      };
    },
    readingReturn() {
      this.readingStateVersion;
      if (!this.readingStateReady || typeof window === "undefined") {
        return null;
      }
      const pages = (this.$site && this.$site.pages) || [];
      const candidates = [];
      READING_KEYS.forEach((type) => {
        Object.keys(window.localStorage || {}).forEach((key) => {
          if (!key.startsWith(type.prefix)) {
            return;
          }
          const path = key.slice(type.prefix.length);
          const scene = parseInt(window.localStorage.getItem(key), 10);
          const page = pages.find((item) => item.path === path);
          if (!Number.isFinite(scene) || !isAlbumPage(page)) {
            return;
          }
          const updated = parseInt(
            window.localStorage.getItem(`${type.updatedPrefix}${path}`),
            10
          );
          candidates.push({
            label: type.label,
            meta: `${page.frontmatter.title || page.title} · Scene ${scene}`,
            score: Number.isFinite(updated) ? updated : pageTimestamp(page),
            to: { path, hash: `#scene-${scene}` },
          });
        });
      });
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0] || null;
    },
  },

  methods: {
    refreshReadingState() {
      this.readingStateVersion += 1;
    },
  },
};
</script>

<style scoped>
.home {
  max-inline-size: 1400px;
  padding-block-start: 3rem;
  padding-block-end: 0;
  padding-inline: 1rem;
  margin-block: 0;
  margin-inline: auto;
}
.home .home-content {
  inline-size: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  padding: 0;
  margin-block-end: 2rem;
}
.home .home-content h1 {
  margin-block-start: 0;
}
.home .albums-column {
  min-inline-size: 0;
  inline-size: 100%;
  flex: 1.2;
}
.home .hero-intro {
  margin-block: 0 1.5rem;
}
.home .hero-tagline {
  color: color-mix(in srgb, var(--page-text-color), white 35%);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-block: 0 0.4rem;
}
.home .link-column {
  max-inline-size: 380px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1rem;
  flex: 0 0 340px;
}
.home .quick-panel {
  background: #fff;
  border: 1px solid #f1d9a0;
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  padding: 1.2rem;
}
.home .quick-title {
  color: #1a1a1a;
  font-size: 1.3rem;
  font-weight: 900;
  margin-block: 0 0.9rem;
}
.home .link-column .album-list {
  margin-block: 0.8rem 0;
}
.home .list {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  text-align: left;
  color: #1a1a1a;
  font-size: 0.95rem;
  font-weight: 800;
  text-decoration: none;
  background: linear-gradient(135deg, #fff, #fff, #fff6dc);
  border: 1px solid #d9a62b;
  border-radius: 12px;
  padding-block: 0.5rem;
  padding-inline: 0.75rem;
  margin-block: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.home .list:hover {
  border-color: #e5c27a;
  box-shadow: 0 10px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
.home .list-icon {
  block-size: 2.1rem;
  inline-size: 2.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: #1a1a1a;
  background: #ffbf46;
  border-radius: 10px;
}
.home .list-icon svg {
  block-size: 1.1rem;
  inline-size: 1.1rem;
  display: block;
  fill: currentColor;
}
.home .list-text {
  flex: 1;
}
.home .list-copy {
  min-inline-size: 0;
  display: grid;
  gap: 0.08rem;
}
.home .list-copy .list-text {
  line-height: 1.15;
}
.home .list-copy small {
  overflow: hidden;
  color: #626262;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.home .reading-return {
  background: linear-gradient(135deg, #fff9e9, #fff, #fff3cf);
}
@media (max-width: 799px) {
  .home .home-content {
    flex-direction: column;
  }
  .home .link-column {
    inline-size: 100%;
    max-inline-size: none;
  }
}
@media (max-width: 450px) {
  .home {
    padding-inline: 1.5rem;
  }
}
</style>
