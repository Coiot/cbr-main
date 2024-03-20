<template>
  <transition name="fade">
    <div class="album-list">
      <div class="header">
        <h1>Power Rankings</h1>
        <span>CBR.tv Archive</span>
      </div>
      <router-link
        :to="post.path"
        tag="div"
        v-for="(post, index) in albums"
        v-if="index < 1"
        :key="post.title"
        class="post"
        :style="{ backgroundImage: `url(${post.frontmatter.image})` }"
        :tabindex="0"
      >
        <div class="title-info">
          <p>{{ post.frontmatter.title }}</p>
          <span v-if="post.frontmatter.edition">{{
            post.frontmatter.edition
          }}</span>
        </div>

        <div class="album-info">
          <p>{{ post.frontmatter.narrated_by }}</p>
          <span
            >Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;Release
            Date: {{ post.frontmatter.release_date }}</span
          >
        </div>
      </router-link>
      <div>
        <router-link
          :to="post.path"
          tag="div"
          v-for="(post, index) in albums"
          v-if="index > 0"
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
              <span
                >Starting Turn:
                {{ post.frontmatter.starting_turn }}&emsp;Release Date:
                {{ post.frontmatter.release_date }}</span
              >
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
          (x) => x.path.startsWith("/albums/pr") && !x.frontmatter.exclude
        )
        .sort(
          (a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date)
        )
    },
  },
};
</script>

<style scoped>
.album-list {
  margin: 0 5rem;
}

.header {
  display: inline-flex;
  align-items: baseline;
}

.header span {
  font-size: 1.5rem;
  font-weight: 300;
  text-shadow: 2px 2px #083832;
  margin-left: 2rem;
}

.post {
  position: relative;
  width: 100%;
  height: 80vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: 0 6px 0 0 #ffbf46;
  margin-bottom: 3rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.post:hover {
  box-shadow: 0 2px 0 0 #ffbf46;
  transform: scale(1.01);
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
  padding: 1.5rem 2rem;
  text-shadow: 2px 2px #083832;
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
  text-shadow: 2px 2px #eee;
  background: #fff;
  border: 1px double #1a1a1a;
  border-right: 0;
  box-shadow: -3px 4px 0 0 #ffbf46;
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

h1 {
  font-size: 4rem;
  font-weight: 900;
  text-shadow: 3px 3px #083832;
  padding: 0.5em 0 0.1em;
}

.competitors {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  grid-template-rows: repeat(auto-fit, minmax(0.3rem, 1fr));
  list-style-type: none;
}

.competitors li {
  display: flex;
  flex-flow: row;
  align-items: baseline;
  width: 100%;
  transition: all 0.2s ease-in-out;
}

.competitors li:hover {
  color: #ffbf46;
  transform: scale(1.02);
}

.competitors p {
  font-size: 1.25rem;
  font-weight: 900;
  text-shadow: 2px 2px #083832;
  padding-right: 0.7rem;
  margin: 0.5rem 0;
}

.competitors span {
  color: #fff !important;
  font-size: 0.86rem;
  font-weight: 400;
  text-shadow: 2px 2px #083832;
}

.arc {
  width: 100%;
  display: flex;
  flex-flow: row;
}

.arc + .arc {
  margin: 3em 0;
}

.arc-header {
  width: 50%;
}

.arc-header h2 {
  font-size: 2.2rem;
  font-weight: 900;
  text-shadow: 3px 3px #083832;
  margin: 0 0 0.5em;
}

.arc-header span {
  color: #ffbf46;
  font-size: 1.7rem;
  font-weight: 800;
  text-shadow: 2px 2px #083832;
}

.arc-header p {
  text-shadow: 2px 2px #083832;
  margin-right: 3em;
}

.arc-list {
  width: 80%;
  display: flex;
  flex-flow: column;
  flex-wrap: nowrap;
  flex-grow: 1;
}

.list {
  flex-grow: 1;
  text-shadow: 1px 2px #083832;
  background-color: #202020;
  border: 1px double #fff;
  box-shadow: -4px 4px 0 0 #ffbf46;
  padding: 0em 1.8em;
  margin-bottom: 2.5vw;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.list:hover {
  box-shadow: 0 6px 2px 0 rgba(8, 56, 50, 0.3);
  transform: scale(1.01);
}

.list p {
  font-size: 1.4rem;
  font-weight: 800;
  text-shadow: 2px 2px #083832;
  line-height: 1.2;
}

.list p span {
  font-size: 65%;
  font-weight: 400;
  text-shadow: 2px 2px #083832;
  margin-left: 0.6rem;
}

@media (max-width: 719px) {
  .arc {
    flex-flow: column;
  }

  .arc-header {
    width: 100%;
    line-height: 0.1;
    padding: 0;
  }

  .arc-header h2 {
    font-size: 3rem;
  }

  .arc-header span {
    font-size: 2.5rem;
  }

  .arc-header p {
    font-size: 1.5rem;
    padding: 1rem 0;
    margin-right: 0;
  }

  .arc-list {
    width: 100%;
  }

  .album-list {
    margin: 1rem 1.5rem 0;
  }

  h2 {
    border-bottom: none;
  }
}
</style>
