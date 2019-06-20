<template>
<transition name="fade">
  <div class="album-list">

    <h1>Latest Albums</h1>

    <router-link :to="post.path" tag="div" v-for="(post,index) in albums" v-if="index < 5" :key="post.title" class="post" :style="{ backgroundImage: `url(${post.frontmatter.thumbnail})` }" :tabindex="0">

      <div class="title-info">
        <p>{{ post.frontmatter.title }}</p>
        <span v-if="post.frontmatter.edition">{{ post.frontmatter.edition }}</span>
      </div>

      <div class="album-info">
        <p>{{ post.frontmatter.narrated_by }}</p>
        <span>Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;Release Date: {{ post.frontmatter.release_date }}</span>
      </div>

    </router-link>

  </div>
</transition>
</template>

<script>
export default {
  computed: {
    albums() {
      return this.$site.pages
        .filter(x => x.path.startsWith('/albums') && !x.frontmatter.exclude)
        .sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date))
    }
  }
}
</script>

<style scoped>
h1 {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.4;
  margin-top: 2.4em;
}

.album-list {
  margin: 10rem 0 0;
}

.post {
  position: relative;
  width: 100%;
  height: 60vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 1px solid #1a1a1a;
  box-shadow: 0 5px 2px 0 rgba(8, 56, 50, 0.2);
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
  color: $textColor;
  text-shadow: 1px 2px #083832;
  background: #202020;
  border: 1px double #fff;
  border-left: 0;
  box-shadow: 1px 4px 3px 0 rgba(19, 0, 0, 0.4);
  max-width: 550px;
}

.title-info p {
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
  font-size: .9rem;
}

.album-info {
  position: absolute;
  right: 0;
  bottom: 1rem;
  padding: 0.5rem 1rem;
  color: #1a1a1a;
  background: #fff;
  border: 1px double #1a1a1a;
  border-right: 0;
  box-shadow: -4px 5px 0 0 #FFBF46;
  max-width: 800px;
}

.album-info p {
  display: inline-block;
  width: auto;
  font-size: .95rem;
  font-weight: 700;
  margin: 0;
}

.album-info span {
  display: inline-block;
  width: auto;
  margin: 0;
  margin-left: 0.5rem;
  font-size: .86rem;
}

@media (max-width: 719px) {
  .album-list {
    margin: 5rem 2rem 0;
  }
}
</style>
