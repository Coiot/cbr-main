<template>
  <transition name="fade">
    <div class="album-list">
      <div class="section-head">
        <h2>{{ latestHeadline }}</h2>
        <p class="section-subtitle">{{ latestSubtitle }}</p>
      </div>
      <router-link
        v-if="latestEpisode"
        :to="latestEpisode.path"
        class="post"
        :style="latestEpisodeStyle"
        :aria-label="latestEpisodeLabel"
      >
        <div class="hero-overlay"></div>
        <div class="title-info">
          <p>{{ latestEpisode.frontmatter.title }}</p>
          <span v-if="latestEpisode.frontmatter.edition">{{
            latestEpisode.frontmatter.edition
          }}</span>
          <span v-else-if="latestEpisode.frontmatter.pr">{{
            latestEpisode.frontmatter.pr
          }}</span>
        </div>

        <div class="album-info">
          <p>{{ latestEpisode.frontmatter.narrated_by }}</p>
          <span>
            Release Date: {{ latestEpisode.frontmatter.release_date }}
          </span>
        </div>
      </router-link>
    </div>
  </transition>
</template>

<script>
export default {
  name: "HomeLatestEpisode",
  data() {
    return {
      memoEpisode: null,
      memoKey: "",
    };
  },
  computed: {
    latestEpisode() {
      const pages = (this.$site && this.$site.pages) || [];
      const key = `${pages.length}-${(this.$site && this.$site.time) || ""}`;
      if (this.memoKey === key && this.memoEpisode) {
        return this.memoEpisode;
      }
      let latest = null;
      let latestTime = 0;
      pages.forEach((page) => {
        if (!page.path.startsWith("/albums/s") || page.frontmatter.exclude) {
          return;
        }
        const time = Date.parse(page.frontmatter.date || "");
        if (!Number.isFinite(time)) {
          return;
        }
        if (!latest || time > latestTime) {
          latest = page;
          latestTime = time;
        }
      });
      this.memoEpisode = latest;
      this.memoKey = key;
      return latest;
    },
    latestHeadline() {
      const post = this.latestEpisode;
      if (!post) {
        return "Latest Release";
      }
      const edition = post.frontmatter.edition || "";
      const title = post.frontmatter.title || "";
      const seasonMatch = edition.match(/(?:Season|S)\s*([0-9]+)/i);
      const episodeMatch = title.match(/Episode\s*([0-9]+)/i);
      const season = seasonMatch ? seasonMatch[1] : "";
      const episode = episodeMatch ? episodeMatch[1].padStart(2, "0") : "";
      if (season && episode) {
        return `Season ${season}: Episode ${episode}`;
      }
      if (season) {
        return `Season ${season} • Latest Episode`;
      }
      return "Latest Release";
    },
    latestSubtitle() {
      const post = this.latestEpisode;
      const description =
        post && post.frontmatter && post.frontmatter.description;
      if (description && String(description).trim()) {
        return description;
      }
      return "The newest episode, ready to watch.";
    },
    latestEpisodeStyle() {
      const post = this.latestEpisode;
      const image = post && post.frontmatter && post.frontmatter.image;
      return image ? { backgroundImage: `url(${image})` } : undefined;
    },
    latestEpisodeLabel() {
      const post = this.latestEpisode;
      if (!post) {
        return "Latest episode";
      }
      const title = post.frontmatter.title || "Latest episode";
      const edition = post.frontmatter.edition || "";
      return edition ? `${title} ${edition}` : title;
    },
  },
};
</script>

<style scoped>
.section-head {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-block: 0 1.2rem;
}

h2 {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1.1;
  margin: 0;
}

.section-subtitle {
  font-size: 1.125rem;
  color: color-mix(in srgb, var(--page-text-color), white 25%);
  margin: 0;
}

.album-list {
  width: 100%;
  min-width: 74%;
  margin: 0;
}

.post {
  position: relative;
  display: block;
  text-decoration: none;
  color: inherit;
  min-height: 520px;
  width: 100%;
  height: 70vh;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
  border: 1px solid #2a2a2a;
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.post:hover {
  transform: translateY(-2px);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    140deg,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.1) 45%,
    rgba(0, 0, 0, 0.4) 100%
  );
}

.title-info {
  position: absolute;
  max-width: 550px;
  z-index: 1;
  inset-block-start: 2rem;
  inset-inline-start: 0;
  color: var(--edition-overlay-text);
  text-shadow: var(--heading-shadow-soft);
  background: var(--edition-overlay-bg);
  border: 1px solid var(--edition-overlay-border);
  border-inline-start: 0;
  border-radius: 0 12px 12px 0;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
  padding-block: 1.2rem;
  padding-inline: 1.6rem;
}

.title-info p {
  width: auto;
  display: inline-block;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
}

.title-info span {
  font-size: 1.1rem;
  margin: 0;
  margin-inline-start: 0.5rem;
}

.album-info {
  position: absolute;
  max-width: 900px;
  z-index: 1;
  inset-block-end: 2rem;
  inset-inline-end: 0;
  color: #1a1a1a;
  text-shadow: none;
  background: rgba(255, 250, 240, 0.95);
  border: 1px solid #f0d79b;
  border-inline-end: 0;
  border-radius: 12px 0 0 12px;
  box-shadow: -6px 10px 20px rgba(0, 0, 0, 0.2);
  padding-block: 1.1rem;
  padding-inline: 1.6rem;
}

.album-info p {
  width: auto;
  display: inline-block;
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
}

.album-info span {
  font-size: 1rem;
  margin: 0;
  margin-inline-start: 0.5rem;
}

.hero-cta {
  position: absolute;
  z-index: 1;
  font-weight: 800;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  inset-block-end: 2rem;
  inset-inline-start: 1.6rem;
  color: #1a1a1a;
  background: #ffbf46;
  border-radius: 999px;
  padding-block: 0.5rem;
  padding-inline: 1rem;
}

@media (max-width: 719px) {
  .album-list {
    margin-block: 2rem 0;
  }

  .post {
    min-height: 420px;
    height: auto;
  }

  .hero-cta {
    position: static;
    display: inline-flex;
    margin-block: 1rem 0;
    margin-inline: 1rem;
  }
}
</style>
