<template>
  <transition name="fade">
    <section>
      <div class="section-head">
        <h2>Recent Episodes</h2>
        <p class="section-subtitle">
          Behind? Before catch up from the beginning of a
          <router-link to="/albums">season</router-link>.
        </p>
      </div>
      <div class="album-list">
        <router-link
          :to="post.path"
          tag="div"
          v-for="(post, index) in albums"
          :key="post.title"
          class="post"
          :tabindex="0"
          :aria-label="`${post.frontmatter.title} ${
            post.frontmatter.edition || ''
          }`"
        >
          <div class="card-media">
            <img :src="post.frontmatter.image" loading="lazy" />
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
  computed: {
    albums() {
      return this.$site.pages
        .filter((x) => x.path.startsWith("/albums/s") && !x.frontmatter.exclude)
        .sort(
          (a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date)
        )
        .slice(1, 5);
    },
  },
};
</script>

<style scoped>
.section-head {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-block: 0.6rem 1.2rem;
}

h2 {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  margin: 0;
}

.section-subtitle {
  font-size: 1rem;
  color: lighten($textColor, 25%);
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
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
  background: #fff;
  border: 1px solid #f0d79b;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.post:hover {
  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.18);
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
  color: lighten($textColor, 20%);
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
