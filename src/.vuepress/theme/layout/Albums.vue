<template>
  <transition name="fade">
    <div class="blog">
      <div class="page-nav" v-if="prev || next">
        <p class="nextprev">
          <span v-if="prev" class="prev">
            <router-link v-if="prev" class="prev" :to="$page.frontmatter.prev"
              >← {{ prev.title || prev.path }}</router-link
            >
          </span>

          <span v-if="next" class="next">
            <router-link v-if="next" :to="$page.frontmatter.next"
              >{{ next.title || next.path }} →</router-link
            >
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

        <div
          v-if="$page.frontmatter.audio_narration"
          class="column"
          tabindex="0"
        >
          <Label class="label">Video:</Label>
          <p>
            <span class="value">
              <a
                :href="$page.frontmatter.audio_narration"
                target="_blank"
                rel="noopener noreferrer"
                >Audio Narration</a
              >
            </span>
          </p>
          <p v-if="$page.frontmatter.fullvideo">
            <span class="value">
              <a
                :href="$page.frontmatter.fullvideo"
                target="_blank"
                rel="noopener noreferrer"
                >Full In-Game Turns</a
              >
            </span>
          </p>
        </div>
      </div>

      <h2 class="scenenumber" v-if="$page.frontmatter.description">Abstract</h2>
      <p class="abstract" tabindex="0" v-if="$page.frontmatter.description">
        {{ $page.frontmatter.description }}
      </p>

      <button class="button" @click="isToggle = !isToggle">
        <span v-if="isToggle === true">Toggle Vertical Mode</span>
        <span v-if="isToggle === false">Toggle Horizontal Mode</span>
      </button>

      <div v-if="isToggle === true">
        <vueper-slides
          ref="vueperslides2"
          @slide="
            $refs.vueperslides1 &&
              $refs.vueperslides1.goToSlide($event.currentSlide.index, {
                emit: false,
              })
          "
          :slide-ratio="1 / 8"
          :dragging-distance="10"
          :visible-slides="8"
          fixed-height="80px"
          :arrows="false"
          :bullets="false"
          class="first"
          style="margin-bottom: 1rem"
        >
          <vueper-slide
            v-for="(scene, index) in $page.frontmatter.scenes"
            :image="scene.slide_url"
            :key="scene.number"
            @keyup.left="previous()"
            @keyup.right="next()"
            @click.native="
              $refs.vueperslides1 && $refs.vueperslides1.goToSlide(index)
            "
            style="margin: 0 0.2rem"
          ></vueper-slide>
        </vueper-slides>
        <vueper-slides
          ref="vueperslides1"
          @slide="
            $refs.vueperslides2 &&
              $refs.vueperslides2.goToSlide($event.currentSlide.index, {
                emit: false,
              })
          "
          :slide-content-outside="'bottom'"
          arrows-inside
          :bullets="true"
          :slide-ratio="9 / 16"
          fractions
          :touchable="false"
          class="medium"
          :transition-speed="900"
          style="background-size: contain"
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
              <article class="h-narration" style="flex-direction: column">
                <h3 v-if="scene.scene_number == scene.scene_title">
                  {{ scene.scene_number }}
                </h3>
                <h3 v-else-if="scene.scene_title">
                  {{ scene.scene_number }}: {{ scene.scene_title }}
                </h3>
                <h3 v-else>{{ scene.scene_number }}</h3>
                <p class="narrations" v-html="scene.narration" tabindex="0"></p>
                <p
                  class="narrations"
                  v-if="scene.reporter"
                  v-html="scene.reporter"
                  tabindex="0"
                  v-bind:class="{ reporter: scene.reporter }"
                ></p>
              </article>
            </template>
          </vueper-slide>
        </vueper-slides>
      </div>
      <div v-if="isToggle === false">
        <section class="scenes">
          <article
            class="medium"
            v-for="scene in $page.frontmatter.scenes"
            :key="scene.number"
          >
            <img
              v-lazy="scene.slide_url"
              tabindex="0"
              alt="CBR In-Game Screenshot"
              v-bind:class="{ civdeathImage: scene.death }"
            />
            <div class="text" v-bind:class="{ civdeathBorder: scene.death }">
              <h3 v-if="scene.scene_number == scene.scene_title">
                {{ scene.scene_number }}
              </h3>
              <h3 v-else-if="scene.scene_title">
                {{ scene.scene_number }}: {{ scene.scene_title }}
              </h3>
              <h3 v-else>{{ scene.scene_number }}</h3>

              <div
                class="narrations"
                v-html="scene.narration"
                tabindex="0"
              ></div>
              <div
                class="narrations"
                v-if="scene.reporter"
                v-html="scene.reporter"
                tabindex="0"
                v-bind:class="{ reporter: scene.reporter }"
              ></div>
            </div>
          </article>
        </section>

        <Content class="custom" />
      </div>

      <div class="page-nav" v-if="prev || next">
        <p class="nextprev">
          <span v-if="prev" class="prev">
            <router-link v-if="prev" class="prev" :to="$page.frontmatter.prev"
              >← {{ prev.title || prev.path }}</router-link
            >
          </span>

          <span v-if="next" class="next">
            <router-link v-if="next" :to="$page.frontmatter.next"
              >{{ next.title || next.path }} &ensp;→</router-link
            >
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
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.blog h1 {
  font-size: 3rem;
  font-weight: 900;
  line-height: 1;
  padding-top: 2rem;
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
  flex: 1 0 25%;
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
  transition: all 0.2s ease-in-out;
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
  background-color: darken($accentColor, 25%);
  border: 1px solid #000;
  border-radius: 10px;
  box-shadow: $accentColor 0px 4px 20px -10px;
  padding: 0.3em 0.8em 0.42em;
  margin: 0.8em 0 1.3em;
  transition: all 0.2s ease-in-out;
}

button:hover {
  background-color: darken($accentColor, 35%);
  transform: scale(1.005);
  cursor: pointer;
}

.h-narration {
  position: relative;
  border-bottom: 3px solid darken($accentColor, 20%);
  background-color: #1a1a1a;
  padding: 0.5rem 1rem 1rem;
}

.h-narration h3 {
  font-size: 1.2rem;
  margin: 1rem 0 0.1rem;
}

.h-narration p {
  font-size: 1rem;
  line-height: 1.6 !important;
  margin: 0.2rem 0;
}

.scenes {
  width: 100%;
  max-width: 1050px;
  height: auto;
  display: block;
  margin-top: 1rem;
}

article + article {
  margin: 3rem 0;
}

h2 {
  font-size: 3.5rem;
  font-weight: 900;
  color: white;
  margin: 1.5rem 0 1rem;
}

img {
  width: 100%;
  line-height: 0;
  transition: all 0.2s ease-in-out;
}

img:hover {
  box-shadow: 0 3px 0 0 hsla(45.3, 75%, 43.7%, 1);
  transform: scale(1.007);
}

.text {
  border-bottom: 3px solid darken($accentColor, 20%);
  background-color: #1a1a1a;
  padding: 2rem;
}

.scenes h3 {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0;
}

.narrations {
  font-size: 1.3rem;
  font-weight: 500;
  line-height: 1.2;
  text-shadow: 2px 2px #08201d;
  max-height: 8rem;
  padding: 0;
  margin: 0.1rem 0 0;
  overflow:auto;
}

.reporter {
  font-size: 1.1rem;
  font-weight: 400;
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
    margin-top: 1rem;
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
    font-size: 1.2rem;
    margin: 0.5rem 0 0;
  }

  .text {
    padding: 0.5rem;
  }

  .narrations {
    font-size: 1rem;
    word-break: break-word;
    margin: 0;
    border-top: 0;
  }

  .reporter {
    padding-bottom: 1rem;
  }

  .pswp img {
    width: 100% !important;
    height: 100% !important;
  }
}

@media (max-width: $MQNarrow) {
  .blog {
    margin: 0 1rem;
  }

  .blog h1 {
    margin-top: 0.5rem;
  }
}

@media (max-width: $MQMobileNarrow) {
  .blog__title {
    font-size: 2.5rem;
  }
}
</style>
