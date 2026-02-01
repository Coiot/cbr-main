<template>
  <transition name="fade">
    <section>
      <div class="album-list">
        <router-link
          :to="post.path"
          v-for="(post, index) in albums"
          :key="post.title"
          class="post"
        >
          <img :src="post.frontmatter.image" />

          <div class="album-info">
            <p class="pr-title">
              Latest Power Rankings
              <!-- <span class="pr-badge">New</span> -->
            </p>
            <!-- <p v-else>{{ post.frontmatter.pr }}</p> -->
            <span>{{ post.frontmatter.title }}</span>
            <span style="margin-block-start: 0.25rem"
              >Release Date: {{ post.frontmatter.release_date }}</span
            >
          </div>
        </router-link>
      </div>
    </section>
  </transition>
</template>

<script>
export default {
  name: "HomePowerRankings",
  computed: {
    albums() {
      return this.$site.pages
        .filter(
          (x) => x.path.startsWith("/albums/pr") && !x.frontmatter.exclude
        )
        .sort(
          (a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date)
        )
        .slice(0, 1);
    },
  },
};
</script>

<style scoped>
h2 {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
  margin-block-start: 0.5rem;
}

.album-list {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-block: 1rem 0.6rem !important;
}

.post {
  display: flex;
  flex-direction: column;
  width: 100%;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d9a62b;
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.2s ease-in-out;
}

.post:hover {
  transform: translateY(-2px);
}

img {
  height: 10rem;
  object-fit: cover;
  width: 100%;
  margin: 0;
}

.album-info {
  flex-grow: 1;
  color: #1a1a1a;
  background: #fffdf7;
  padding-block: 0.9rem 1.2rem;
  padding-inline: 1rem;
}

.album-info p {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  font-size: 1rem;
  font-weight: 700;
  margin-block: 0 0.5rem;
  margin-inline: 0.5rem 0;
}

.pr-badge {
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1a1a1a;
  background: #ffbf46;
  border-radius: 999px;
  padding-block: 0.1rem;
  padding-inline: 0.4rem;
}

.album-info span {
  display: inline-block;
  width: auto;
  font-size: 1rem;
  margin: 0;
  margin-inline-start: 0.5rem;
}

@media (max-width: 719px) {
  .album-list {
    flex-direction: column;
    justify-content: none;
    margin: 0;
  }

  .post {
    width: 100%;
    margin-block-end: 2rem;
  }
}
</style>
