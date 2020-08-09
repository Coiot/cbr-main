<template>
  <transition name="fade">
    <div class="blog">
      <div class="page-nav" v-if="prev || next">
        <p class="nextprev">
          <span v-if="prev" class="prev">
            <router-link
              v-if="prev"
              class="prev"
              :to="$page.frontmatter.prev"
            >← {{ prev.title || prev.path }}</router-link>
          </span>

          <span v-if="next" class="next">
            <router-link v-if="next" :to="$page.frontmatter.next">{{ next.title || next.path }} →</router-link>
          </span>
        </p>
      </div>

      <h1 class>
        {{ $page.frontmatter.title }}
        <span>– {{ $page.frontmatter.edition }}</span>
      </h1>

      <div class="albumInfo">
        <div class="column" tabindex="0">
          <Label class="label">Release Date:</Label>
          <p>
            <span class="value">{{ $page.frontmatter.release_date }}</span>
          </p>
        </div>

        <div class="column" tabindex="0">
          <Label class="label">Narrated by:</Label>
          <p>
            <span class="value">{{ $page.frontmatter.narrated_by }}</span>
          </p>
        </div>

        <div class="column" tabindex="0">
          <Label class="label">Starting Turn:</Label>
          <p>
            <span class="value">{{ $page.frontmatter.starting_turn }}</span>
          </p>
        </div>

        <div v-if="$page.frontmatter.audio_narration" class="column" tabindex="0">
          <Label class="label">Video:</Label>
          <p>
            <span class="value">
              <a
                :href="$page.frontmatter.audio_narration"
                target="_blank"
                rel="noopener noreferrer"
              >Audio Narration</a>
            </span>
          </p>
          <p v-if="$page.frontmatter.fullvideo">
            <span class="value">
              <a
                :href="$page.frontmatter.fullvideo"
                target="_blank"
                rel="noopener noreferrer"
              >Full In-Game Turns</a>
            </span>
          </p>
        </div>
      </div>

      <h2 class="scenenumber" v-if="$page.frontmatter.description">Abstract</h2>
      <p
        class="abstract"
        tabindex="0"
        v-if="$page.frontmatter.description"
      >{{ $page.frontmatter.description }}</p>

      <button class="button" @click="isToggle = !isToggle">
        <span v-if="isToggle === true">Toggle Vertical Mode</span>
        <span v-if="isToggle === false">Toggle Horizontal Mode</span>
      </button>

      <div v-if="isToggle === true">
        <vueper-slides
          lazy
          lazy-load-on-drag
          :slide-content-outside="'bottom'"
          :slide-ratio="9 / 16"
          :infinite="false"
          arrows-outside
          :bullets="false"
          fractions
          :dragging-distance="200"
          :touchable="false"
          class="medium"
        >
          <vueper-slide
            v-for="scene in $page.frontmatter.scenes"
            :image="scene.slide_url"
            :key="scene.number"
            :title="scene.scene_title"
            :content="scene.narration"
            :class="{ civdeathBorder: scene.death }"
          >
            <template v-slot:content>
              <div class="h-narration" style="flex-direction: column">
                <h3 v-html="scene.scene_title"></h3>
                <div class="narrations" v-html="scene.narration" tabindex="0"></div>
              </div>
            </template>
          </vueper-slide>
        </vueper-slides>
      </div>
      <div v-if="isToggle === false">
        <section class="scenes">
          <div class="medium" v-for="scene in $page.frontmatter.scenes" :key="scene.number">
            <h2
              class="scenenumber"
              v-bind:class="{ civdeathBorder: scene.death }"
            >{{ scene.scene_number }}</h2>
            <img
              v-lazy="scene.slide_url"
              tabindex="0"
              alt="CBR In-Game Screenshot"
              v-bind:class="{ civdeathImage: scene.death }"
            />
            <h3>{{ scene.scene_title }}</h3>
            <div
              class="narrations"
              v-html="scene.narration"
              tabindex="0"
              v-bind:class="{ civdeathBorder: scene.death }"
            ></div>
            <div
              class="narrations"
              v-if="scene.reporter"
              v-html="scene.reporter"
              tabindex="0"
              v-bind:class="{ reporter: scene.reporter }"
            ></div>
          </div>
        </section>

        <Content class="custom" />
      </div>

      <div class="page-nav" v-if="prev || next">
        <p class="nextprev">
          <span v-if="prev" class="prev">
            <router-link
              v-if="prev"
              class="prev"
              :to="$page.frontmatter.prev"
            >← {{ prev.title || prev.path }}</router-link>
          </span>

          <span v-if="next" class="next">
            <router-link
              v-if="next"
              :to="$page.frontmatter.next"
            >{{ next.title || next.path }} &ensp;→</router-link>
          </span>
        </p>
      </div>
    </div>
  </transition>
</template>

<script>
import { resolvePage, normalize, outboundRE, endingSlashRE } from "../util.js";
import { VueperSlides, VueperSlide } from "vueperslides";
export default {
  name: "Albums",
  data() {
    return {
      isToggle: false,
    };
  },
  components: {
    VueperSlides,
    VueperSlide,
  },
  computed: {
    prev() {
      const prev = this.$page.frontmatter.prev;
      if (prev === false) {
        return;
      } else if (prev) {
        return resolvePage(this.$site.pages, prev, this.$route.path);
      }
      // else {
      //   return resolvePrev(this.$page, this.sidebarItems);
      // }
    },
    next() {
      const next = this.$page.frontmatter.next;
      if (next === false) {
        return;
      } else if (next) {
        return resolvePage(this.$site.pages, next, this.$route.path);
      }
      // else {
      //   return resolveNext(this.$page, this.sidebarItems);
      // }
    },
  },
};

// function resolvePrev(page, items) {
//   return this.find(page, items, -1);
// }
// function resolveNext(page, items) {
//   return this.find(page, items, 1);
// }
// function find(page, path, offset) {
//   const res = [];
//   path.forEach((item) => {
//     if (item.type === "group") {
//       res.push(...(item.children || []));
//     } else {
//       res.push(item);
//     }
//   });
//   for (let i = 0; i < res.length; i++) {
//     const cur = res[i];
//     if (cur.type === "page" && cur.path === page.path) {
//       return res[i + offset];
//     }
//   }
// }
</script>

<style lang="stylus" scoped>
@import '../styles/config.styl';
@require '../styles/wrapper.styl';

.blog {
  text-shadow: 2px 2px #083832;
}

.blog h1 {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
}

.blog h1 span {
  font-size: 60%;
  margin-left: 0.2rem;
}

.blog h2 {
  font-weight: 700;
  line-height: 1.3;
}

.nextprev {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 1.2rem;
  padding-bottom: 1em;
  margin-top: 2.5rem;
}

.nextprev a {
  color: #fff;
}

.albumInfo {
  display: flex;
  flex-flow: row nowrap;
  padding: 2rem 0 0;
  width: 100%;
  margin: 0 auto 2rem auto;
}

.column {
  flex: 0 0 25%;
}

.label {
  font-size: 1.6rem;
  font-weight: 800;
  color: $navColor;
}

.value {
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.5;
  color: $accentColor;
}

.value a {
  color: #fff;
  font-weight: 600;
}

.abstract {
  font-size: 1.8rem;
  line-height: 1.4;
}

button {
  width: 100%;
  font-size: 2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-weight: 900;
  line-height: 1.5;
  color: #fff;
  text-shadow: 2px 2px #083832;
  background-color: $accentColor;
  border: 1px solid #000;
  border-radius: 10px;
  box-shadow: $accentColor 0px 5px 20px -10px;
  padding: 0.6em 0.8em;
  margin: 0.8em 0 1.3em;
  transition: all 0.2s ease-in-out;
}

button:hover {
  background-color: darken($borderColor, 25%);
  cursor: pointer;
}

.h-narration {
  width: 1200px;
  position: relative;
  left: 20%;
  right: 20%;
  margin-left: -20vw;
  margin-right: -20vw;
}

.scenes {
  display: block;
  padding: 0;
  width: 100%;
  max-width: 1050px;
  height: auto;
  padding: 0 auto 3rem;
}

h2 {
  font-size: 3.5rem;
  font-weight: 600;
  color: white;
  margin: 1.5rem 0 1rem;
}

.scenes h3 {
  font-size: 1.7rem;
  margin: 2rem 0 0;
}

img {
  width: 100%;
  line-height: 0;
  box-shadow: 0 2px 1px 0 hsla(45.3, 75%, 43.7%, 0.6);
  transition: all 0.2s ease-in-out;
}

img:hover {
  box-shadow: 0 2px 1px 0 hsla(45.3, 75%, 43.7%, 1);
  transform: scale(1.008);
}

.narrations {
  font-size: 1.1rem;
  line-height: 1.3;
  text-shadow: 2px 2px #083832;
  padding: 0 0 0.5rem;
  margin: 0.2rem 0 0;
  border-bottom: 2px solid #ffbf46;
}

.blog {
  @extend $wrapper;
}

.page-nav {
  padding: 0.2rem 0 0 0;
}

@media (max-width: $MQMobile) {
  .nextprev {
    font-size: 0.9rem;
    margin-top: 0.3rem;
    flex-flow: row wrap;
  }

  .albumInfo {
    flex-flow: column nowrap;
  }

  .column {
    flex: 0 1 auto;
  }

  img {
    box-shadow: none;
  }

  .scenes h2 {
    margin: 1.5rem 0 0.5rem;
  }

  .scenes h3 {
    font-size: 1.5rem;
    margin: 1rem 0 0;
  }

  .narrations {
    font-size: 1rem;
    padding: 0.3rem 0.2rem;
    overflow-wrap: break-word;
    margin: 0;
    border-top: 0;
    border-bottom: 1px solid #ffbf46;
  }

  .pswp img {
    width: 100% !important;
    height: 100% !important;
  }
}

@media (max-width: $MQMobileNarrow) {
  .blog__title {
    font-size: 2.5rem;
  }
}
</style>
