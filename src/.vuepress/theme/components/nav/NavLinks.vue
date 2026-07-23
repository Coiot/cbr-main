<template>
  <div>
    <nav class="nav-links" v-if="userLinks.length || repoLink">
      <!-- user links -->
      <div class="nav-item" v-for="item in userLinks" :key="item.link">
        <NavLink :item="item" />
      </div>
    </nav>
    <div class="nav-links mobile-quick-links" v-if="quickLinks.length">
      <p class="mobile-quick-heading">Jump back in</p>
      <ul class="mobile-quick-list">
        <li v-for="item in quickLinks" :key="item.id">
          <router-link class="mobile-quick-link" :to="item.to">
            <span class="mobile-quick-kicker">{{ item.kicker }}</span>
            <strong class="mobile-quick-title">{{ item.title }}</strong>
            <span v-if="item.meta" class="mobile-quick-meta">
              {{ item.meta }}
            </span>
          </router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import NavLink from "./NavLink.vue";
import { resolveNavLinkItem } from "../../util";

const RESUME_PREFIX = "albumsResume:";
const BOOKMARK_PREFIX = "albumsBookmark:";
const RESUME_UPDATED_PREFIX = "albumsResumeUpdated:";
const BOOKMARK_UPDATED_PREFIX = "albumsBookmarkUpdated:";

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

function isPowerRanking(page) {
  return Boolean(
    page &&
      page.frontmatter &&
      (page.frontmatter.pr || /^\/albums\/pr\//i.test(page.path || ""))
  );
}

function seasonNumber(page) {
  const frontmatter = (page && page.frontmatter) || {};
  const source = `${frontmatter.edition || ""} ${page.path || ""}`;
  const match = source.match(/(?:season\s*|\/s)(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function pageTimestamp(page) {
  const frontmatter = (page && page.frontmatter) || {};
  const date = Date.parse(frontmatter.date || frontmatter.release_date || "");
  if (Number.isFinite(date)) {
    return date;
  }
  const numberMatch = String(page.path || "").match(/(?:episode|pr)(\d+)/i);
  return numberMatch ? parseInt(numberMatch[1], 10) : 0;
}

function latestPage(pages) {
  return pages.slice().sort((a, b) => pageTimestamp(b) - pageTimestamp(a))[0];
}

function pageTitle(page) {
  return (page && (page.frontmatter.title || page.title)) || "Album";
}

export default {
  components: {
    NavLink,
  },

  data() {
    return {
      readingLinksVersion: 0,
    };
  },

  mounted() {
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener("storage", this.refreshReadingLinks);
    window.addEventListener(
      "albums-bookmark-updated",
      this.refreshReadingLinks
    );
    window.addEventListener(
      "albums-bookmarks-cache-updated",
      this.refreshReadingLinks
    );
    window.addEventListener(
      "albums-reading-progress-updated",
      this.refreshReadingLinks
    );
  },

  beforeUnmount() {
    if (typeof window === "undefined") {
      return;
    }
    window.removeEventListener("storage", this.refreshReadingLinks);
    window.removeEventListener(
      "albums-bookmark-updated",
      this.refreshReadingLinks
    );
    window.removeEventListener(
      "albums-bookmarks-cache-updated",
      this.refreshReadingLinks
    );
    window.removeEventListener(
      "albums-reading-progress-updated",
      this.refreshReadingLinks
    );
  },

  computed: {
    userNav() {
      return this.$themeLocaleConfig.nav || this.$site.themeConfig.nav || [];
    },

    nav() {
      const { locales } = this.$site;
      if (locales && Object.keys(locales).length > 1) {
        const currentLink = this.$page.path;
        const routes = this.$site.pages || [];
        const themeLocales = this.$site.themeConfig.locales || {};
        const languageDropdown = {
          text: this.$themeLocaleConfig.selectText || "Languages",
          items: Object.keys(locales).map((path) => {
            const locale = locales[path];
            const text =
              (themeLocales[path] && themeLocales[path].label) || locale.lang;
            let link;
            // Stay on the current page
            if (locale.lang === this.$lang) {
              link = currentLink;
            } else {
              // Try to stay on the same page
              link = currentLink.replace(this.$localeConfig.path, path);
              // fallback to homepage
              if (!routes.some((route) => route.path === link)) {
                link = path;
              }
            }
            return {
              text,
              link,
            };
          }),
        };
        return [...this.userNav, languageDropdown];
      }
      return this.userNav;
    },

    userLinks() {
      return (this.nav || []).map((link) => {
        return Object.assign(resolveNavLinkItem(link), {
          items: (link.items || []).map(resolveNavLinkItem),
        });
      });
    },

    latestEpisode() {
      const pages = ((this.$site && this.$site.pages) || []).filter(
        (page) => isAlbumPage(page) && !isPowerRanking(page)
      );
      const currentSeason = pages.reduce(
        (latest, page) => Math.max(latest, seasonNumber(page)),
        0
      );
      return latestPage(
        pages.filter((page) => seasonNumber(page) === currentSeason)
      );
    },

    latestPowerRanking() {
      return latestPage(
        ((this.$site && this.$site.pages) || []).filter(
          (page) => isAlbumPage(page) && isPowerRanking(page)
        )
      );
    },

    quickLinks() {
      this.readingLinksVersion;
      const links = [];
      if (this.latestEpisode) {
        const season = seasonNumber(this.latestEpisode);
        links.push({
          id: "latest-episode",
          kicker: season ? `Latest · Season ${season}` : "Latest episode",
          title: pageTitle(this.latestEpisode),
          meta: this.latestEpisode.frontmatter.release_date || "",
          to: this.latestEpisode.path,
        });
      }
      if (this.latestPowerRanking) {
        links.push({
          id: "latest-pr",
          kicker: "Latest Power Ranking",
          title: pageTitle(this.latestPowerRanking),
          meta: this.latestPowerRanking.frontmatter.release_date || "",
          to: this.latestPowerRanking.path,
        });
      }
      const resume = this.latestStoredScene(
        RESUME_PREFIX,
        RESUME_UPDATED_PREFIX
      );
      if (resume) {
        links.push({
          id: "resume",
          kicker: "Continue reading",
          title: pageTitle(resume.page),
          meta: `Resume at Scene ${resume.scene}`,
          to: { path: resume.page.path, hash: `#scene-${resume.scene}` },
        });
      }
      const bookmark = this.latestStoredScene(
        BOOKMARK_PREFIX,
        BOOKMARK_UPDATED_PREFIX
      );
      if (bookmark) {
        links.push({
          id: "bookmark",
          kicker: "Latest bookmark",
          title: pageTitle(bookmark.page),
          meta: `Scene ${bookmark.scene}`,
          to: { path: bookmark.page.path, hash: `#scene-${bookmark.scene}` },
        });
      }
      return links;
    },
  },

  watch: {
    $route() {
      this.refreshReadingLinks();
    },
  },

  methods: {
    refreshReadingLinks() {
      this.readingLinksVersion += 1;
    },

    latestStoredScene(prefix, updatedPrefix) {
      if (typeof window === "undefined") {
        return null;
      }
      const pages = (this.$site && this.$site.pages) || [];
      const candidates = [];
      Object.keys(window.localStorage || {}).forEach((key) => {
        if (!key.startsWith(prefix)) {
          return;
        }
        const path = key.slice(prefix.length);
        const scene = parseInt(window.localStorage.getItem(key), 10);
        const page = pages.find((item) => item.path === path);
        if (!Number.isFinite(scene) || !isAlbumPage(page)) {
          return;
        }
        const updated = parseInt(
          window.localStorage.getItem(`${updatedPrefix}${path}`),
          10
        );
        candidates.push({
          page,
          scene,
          score: Number.isFinite(updated) ? updated : pageTimestamp(page),
        });
      });
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0] || null;
    },
  },
};
</script>

<style>
.nav-links {
  display: inline-block;
}
.nav-links a {
  color: var(--back-color);
}
.nav-links a:hover {
  color: var(--accent-color);
}
.nav-links a:not(.external) {
  font-weight: 900;
  text-shadow: var(--nav-link-shadow);
}
.nav-links .nav-item {
  position: relative;
  display: inline-block;
  margin-top: 0.3rem;
  margin-left: 1.2rem;
  line-height: 1.5rem;
}
.nav-links .nav-item:first-child {
  margin-left: 0;
}
.nav-links .repo-link {
  margin-left: 1.1rem;
}
.mobile-quick-links {
  display: none;
}
.navbar .links .mobile-quick-links {
  display: none !important;
}
@media (max-width: 799px) {
  .nav-links .nav-item,
  .nav-links .repo-link {
    margin-left: 0;
  }
  .sidebar .mobile-quick-links {
    display: block !important;
    padding-block: 0.9rem 1rem !important;
  }
  .mobile-quick-heading {
    color: color-mix(in srgb, var(--back-color), white 28%);
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding-inline: 1.5rem;
    margin: 0 0 0.65rem;
  }
  .mobile-quick-list {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0 0.8rem;
    list-style: none;
  }
  .mobile-quick-link {
    display: grid !important;
    gap: 0.1rem;
    color: var(--back-color);
    background: color-mix(in srgb, var(--surface-muted-color), white 28%);
    border: 1px solid color-mix(in srgb, var(--border-color), transparent 45%);
    border-radius: 10px;
    padding: 0.68rem 0.75rem;
    text-decoration: none;
  }
  .mobile-quick-link:hover,
  .mobile-quick-link.router-link-active {
    color: var(--back-color);
    border-color: var(--accent-color);
    background: color-mix(in srgb, var(--accent-color), white 82%);
  }
  .mobile-quick-kicker {
    color: color-mix(in srgb, var(--back-color), white 22%);
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }
  .mobile-quick-title {
    overflow: hidden;
    color: var(--back-color);
    font-size: 0.86rem;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mobile-quick-meta {
    color: color-mix(in srgb, var(--back-color), white 35%);
    font-size: 0.68rem;
    font-weight: 700;
  }
}
@media (min-width: 800px) {
  .nav-links a:hover,
  .nav-links a.router-link-active {
    color: var(--back-color);
  }
  .nav-item {
    border-bottom: 3px solid transparent;
    transition: all 0.2s ease-in;
  }
  .nav-item:hover,
  .nav-item.router-link-active {
    margin-bottom: 0px;
    border-bottom: 3px solid color-mix(in srgb, var(--accent-color), white 20%);
  }
}
</style>
