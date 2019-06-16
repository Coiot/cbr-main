<template>
<div class="album-list">

  <router-link :to="post.path" tag="div" v-for="post in albums" :key="post.title" class="post" :style="{ backgroundImage: `url(${post.frontmatter.thumbnail})` }">

    <div class="title-info">
      <h2>{{ post.frontmatter.title }}</h2>
      <span v-if="post.frontmatter.edition">{{ post.frontmatter.edition }}</span>
    </div>

    <div class="album-info">
      <h2>{{ post.frontmatter.narrator }}</h2>
      <span>Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;Release Date: {{ post.frontmatter.release_date }}</span>
    </div>

  </router-link>

</div>
</template>

<script>
export default {
  computed: {
    albums() {
      return this.$site.pages
        .filter(x => x.path.startsWith('/blog') && !x.frontmatter.exclude)
        .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title))
    }
  }
}
</script>

<style scoped>
.post {
  position: relative;
  width: 100%;
  height: 60vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  margin-bottom: 5vw;
  cursor: pointer;
}

img {
  width: 100%;
  line-height: 0;
  margin: 2rem 0;
}

.title-info {
  position: absolute;
  left: 0;
  top: 2rem;
  padding: 0.5rem 1rem;
  color: rgb(255, 255, 255);
  background: rgba(0, 0, 0, 1);
  max-width: 420px;
}

.title-info h2 {
  display: inline-block;
  width: auto;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.title-info span {
  display: inline-block;
  width: auto;
  margin: 0;
  margin-left: 0.5rem;
  font-size: .84rem;
}

.album-info {
  position: absolute;
  right: 0;
  bottom: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 1);
  max-width: 800px;
}

.album-info h2 {
  display: inline-block;
  width: auto;
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0;
}

.album-info span {
  display: inline-block;
  width: auto;
  margin: 0;
  margin-left: 0.5rem;
  font-size: .84rem;
}
</style>
