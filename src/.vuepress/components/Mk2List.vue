<template>
  <transition name="fade">
    <div class="album-list">
      <router-link
        :to="post.path"
        tag="div"
        v-for="(post,index) in albums"
        v-if="index < 1"
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
      <div class="arc">
        <div class="arc-header">
          <h1>Dawn of Civilization</h1>
          <span>Arc One</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 0 && index < 7"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Immortal Paradise</h1>
          <span>Arc Two</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 6 && index < 14"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Age of Discord</h1>
          <span>Arc Three</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 13 && index < 23"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Orange Phase</h1>
          <span>Arc Four</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 22 && index < 33"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Pacific Generation</h1>
          <span>Arc Five</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 32 && index < 42"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Nuclear Season</h1>
          <span>Arc Six</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 41 && index < 49"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Fallout Period</h1>
          <span>Arc Seven</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 48 && index < 57"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Northern Ice Age</h1>
          <span>Arc Eight</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 56 && index < 67"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Grand Alliances</h1>
          <span>Arc Nine</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 66 && index < 74"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Time of Rapture</h1>
          <span>Arc Ten</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 73 && index < 84"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Rise of the Machines</h1>
          <span>Arc Eleven</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 83 && index < 92"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>Bio-Augment Tides</h1>
          <span>Arc Tweleve</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 91 && index < 98"
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
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h1>The Green Revolution</h1>
          <span>Arc Thirteen</span>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 97 && index < 120"
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
        </article>
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
          (x) => x.path.startsWith("/albums/mk2") && !x.frontmatter.exclude
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

.arc-header h1 {
  font-weight: 900;
  margin: 0 0 0.5em;
}

.arc-header span {
  color: #ffbf46;
  font-size: 1.2rem;
  font-weight: 800;
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
  color: $textColor;
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
  line-height: 1.2;
}

.list p span {
  font-size: 65%;
  font-weight: 400;
  margin-left: 0.2rem;
}

@media (max-width: 719px) {
  .arc {
    flex-flow: column;
  }

  .arc-header {
    width: 100%;
    padding: 0;
  }

  .album-list {
    margin: 1rem 1.5rem 0;
  }
}
</style>
