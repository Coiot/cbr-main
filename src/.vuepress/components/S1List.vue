<template>
  <transition name="fade">
    <div class="album-list">
      <router-link
        :to="post.path"
        tag="div"
        v-for="(post,index) in albums"
        v-if="index < 2"
        :key="post.title"
        class="post"
        :style="{ backgroundImage: `url(${post.frontmatter.image})` }"
        :tabindex="0"
      >
        <div class="title-info">
          <p>{{ post.frontmatter.title }}</p>
          <span v-if="post.frontmatter.edition">{{ post.frontmatter.edition }}</span>
        </div>

        <div class="album-info">
          <p>{{ post.frontmatter.narrated_by }}</p>
          <span>Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;Release Date: {{ post.frontmatter.release_date }}</span>
        </div>
      </router-link>
      <div>
        <router-link
          :to="post.path"
          tag="div"
          v-for="(post,index) in albums"
          v-if="index > 1"
          :key="post.title"
          :tabindex="0"
        >
          <div class="list">
            <p>
              {{ post.frontmatter.title }}
              <span>– {{ post.frontmatter.edition }}</span>
            </p>

            <p>
              {{ post.frontmatter.narrated_by }}
              <span>Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;Release Date: {{ post.frontmatter.release_date }}</span>
            </p>
          </div>
        </router-link>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  computed: {
    albums() {
      return this.$site.pages
        .filter(
          (x) => x.path.startsWith("/albums/s1") && !x.frontmatter.exclude
        )
        .sort(
          (b, a) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date)
        );
    },
  },
};
</script>

<style scoped>
.album-list {
  margin: 4rem 6rem 0;
}

.post {
  position: relative;
  width: 100%;
  height: 80vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 1px solid #1a1a1a;
  box-shadow: 0 5px 2px 0 rgba(8, 56, 50, 0.35);
  margin-bottom: 4vw;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.post:hover {
  box-shadow: 0 6px 2px 0 rgba(8, 56, 50, 0.5);
  transform: scale(1.01);
}

img {
  width: 100%;
  line-height: 0;
  margin: 2rem 0;
  transition: all 0.3s ease-in-out;
}

.title-info {
  position: absolute;
  left: 0;
  top: 2rem;
  padding: 1.5rem 2rem;
  color: $textColor;
  text-shadow: 1px 2px #083832;
  background: #202020;
  border: 1px double #fff;
  border-left: 0;
  box-shadow: 1px 4px 3px 0 rgba(19, 0, 0, 0.3);
  max-width: 550px;
}

.title-info p {
  display: inline-block;
  width: auto;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
}

.title-info span {
  margin: 0;
  margin-left: 0.5rem;
  font-size: 1.1rem;
}

.album-info {
  position: absolute;
  right: 0;
  bottom: 1rem;
  padding: 1.5rem 2rem;
  color: #1a1a1a;
  background: #fff;
  border: 1px double #1a1a1a;
  border-right: 0;
  box-shadow: -4px 5px 0 0 #ffbf46;
  max-width: 900px;
}

.album-info p {
  display: inline-block;
  width: auto;
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
}

.album-info span {
  margin: 0;
  margin-left: 0.5rem;
  font-size: 1rem;
}

.list {
  color: $textColor;
  text-shadow: 1px 2px #083832;
  background-color: #202020;
  border: 1px double #fff;
  padding: 1em 2em;
  margin-bottom: 4vw;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.list:hover {
  box-shadow: 0 6px 2px 0 rgba(8, 56, 50, 0.3);
  transform: scale(1.01);
}

.list p {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
}

.list p span {
  font-size: 60%;
  font-weight: 400;
  margin-left: 0.2rem;
}

@media (max-width: 719px) {
  .album-list {
    margin: 1rem 1.5rem 0;
  }
}
</style>
