<template>
  <transition name="fade">
    <section>
      <div class="section-head">
        <h2>Recent Episodes</h2>
        <p class="section-subtitle">
          Behind? Catch up from the beginning of a
          <router-link to="/albums">season</router-link>.
        </p>
      </div>
      <div class="album-list">
        <router-link
          v-for="post in albums"
          :key="post.path"
          :to="post.path"
          class="post"
          :aria-label="episodeLabel(post)"
        >
          <div class="card-media">
            <img
              :src="$assetUrl(post.frontmatter.image)"
              loading="lazy"
              decoding="async"
            />
            <span class="card-chip">
              {{ post.frontmatter.edition || post.frontmatter.pr }}
            </span>
          </div>

          <div class="album-info">
            <p class="episode-title">{{ post.frontmatter.title }}</p>
            <div class="episode-meta">
              <span v-if="post.frontmatter.release_date">
                Released {{ post.frontmatter.release_date }}
              </span>
              <span v-if="post.frontmatter.narrated_by">
                Narrated by {{ post.frontmatter.narrated_by }}
              </span>
            </div>
            <!-- <span>Release Date: {{ post.frontmatter.release_date }}</span> -->
          </div>
        </router-link>
      </div>
    </section>
  </transition>
</template>

<script>
export default {
  name: "HomeRecentEpisodes",
  data() {
    return {
      memoEpisodes: [],
      memoKey: "",
    };
  },
  computed: {
    albums() {
      const pages = (this.$site && this.$site.pages) || [];
      const key = `${pages.length}-${(this.$site && this.$site.time) || ""}`;
      if (this.memoKey === key && this.memoEpisodes.length) {
        return this.memoEpisodes;
      }
      const top = [];
      pages.forEach((page) => {
        if (!page.path.startsWith("/albums/s") || page.frontmatter.exclude) {
          return;
        }
        const time = Date.parse(page.frontmatter.date || "");
        if (!Number.isFinite(time)) {
          return;
        }
        const item = { page, time };
        let inserted = false;
        for (let i = 0; i < top.length; i += 1) {
          if (time > top[i].time) {
            top.splice(i, 0, item);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          top.push(item);
        }
        if (top.length > 5) {
          top.length = 5;
        }
      });
      const result = top.slice(1, 5).map((item) => item.page);
      this.memoEpisodes = result;
      this.memoKey = key;
      return result;
    },
  },
  methods: {
    episodeLabel(post) {
      if (!post || !post.frontmatter) {
        return "Episode";
      }
      const title = post.frontmatter.title || "Episode";
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
  margin-block: 3rem 1.2rem;
}

h2 {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  margin: 0;
}

.section-subtitle {
  font-size: 1rem;
  color: color-mix(in srgb, var(--text-color), white 25%);
  margin: 0;
}

.album-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.2rem;
  width: 100%;
  margin-block: 0.8em 3em;
}

.post {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
  background: #fff;
  border: 1px solid #f0d79b;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.post:hover {
  transform: translateY(-2px);
}

.card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #0f0f0f;
}

.card-media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 45%,
    rgba(0, 0, 0, 0.55) 100%
  );
  pointer-events: none;
}

.card-media img {
  object-fit: cover;
  display: block;
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
}

.card-chip {
  position: absolute;
  z-index: 1;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  inset-block-end: 0.8rem;
  inset-inline-start: 0.8rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 999px;
  padding-block: 0.25rem;
  padding-inline: 0.6rem;
}

.post:hover .card-media img {
  transform: scale(1.04);
}

.album-info {
  color: #1a1a1a;
  background: #fffdf7;
  padding-block: 0.9rem 1.2rem;
  padding-inline: 1rem;
}

.episode-title {
  font-size: 1.05rem;
  font-weight: 800;
  margin-block: 0 0.4rem;
}

.episode-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.85rem;
  color: color-mix(in srgb, var(--text-color), white 20%);
}

@media (max-width: 719px) {
  .album-list {
    grid-template-columns: 1fr;
    margin-block: 0 2rem;
  }

  .post {
    width: 100%;
  }
}
</style>
