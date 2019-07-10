<template>
<transition name="fade">
  <div class="blog">

    <h1 class="">{{ $page.frontmatter.title }} <span>– {{ $page.frontmatter.edition }}</span></h1>

    <div class="albumInfo">

      <div class="column" tabindex="0">
        <Label class="label">Release Date:</Label>
        <p><span class="value">{{ $page.frontmatter.release_date }}</span></p>
      </div>

      <div class="column" tabindex="0">
        <Label class="label">Narrated by:</Label>
        <p><span class="value">{{ $page.frontmatter.narrated_by }}</span></p>
      </div>

      <div class="column" tabindex="0">
        <Label class="label">Starting Turn:</Label>
        <p><span class="value">{{ $page.frontmatter.starting_turn }}</span></p>
      </div>

      <div class="column" tabindex="0">
        <Label class="label">Video:</Label>
        <p><span class="value"><a :href="$page.frontmatter.audio_narration" target="_blank" rel="noopener noreferrer">Audio Narration</a></span></p>
        <p v-if="$page.frontmatter.fullvideo"><span class="value"><a :href="$page.frontmatter.fullvideo" target="_blank" rel="noopener noreferrer">Full In-Game Turns</a></span></p>
      </div>
    </div>

    <button class="horizontal" @click="horizontal = !horizontal">Toggle Horizontal Mode</button>

    <section v-show="horizontal">
      <carousel @keyup="nextScene" ref="carousel" :perPage="1" :paginationEnabled="false" :centerMode="true" :loop="true">
        <slide class="medium" v-for="scene in $page.frontmatter.scenes" :key="$page.frontmatter.scenes">
          <div class="carGrid">
            <img class="carImg" v-lazy="scene.slide_url" alt="CBR In-Game Screenshot" v-bind:class="{ civdeathImage: scene.death }">
            <h3 class="carHead">{{ scene.scene_number }} – {{ scene.scene_title }}</h3>
            <div class="narrations carText" v-html="scene.narration" v-bind:class="{ civdeathBorder: scene.death }"></div>
          </div>
        </slide>
      </carousel>
      <a @click.prevent="prevSlide">Prev</a>
      <a @click.prevent="nextSlide">Next</a>
    </section>

    <h2 class="scenenumber" v-if="$page.frontmatter.description">Abstract</h2>
    <p class="abstract" tabindex="0" v-if="$page.frontmatter.description">{{ $page.frontmatter.description }}</p>

    <section class="scenes">
      <div class="medium" v-for="scene in $page.frontmatter.scenes" :key="$page.frontmatter.scenes">
        <h2 class="scenenumber" v-bind:class="{ civdeathBorder: scene.death }">{{ scene.scene_number }}</h2>
        <img v-lazy="scene.slide_url" tabindex="0" alt="CBR In-Game Screenshot" v-bind:class="{ civdeathImage: scene.death }">
        <h3>{{ scene.scene_title }}</h3>
        <div class="narrations" v-html="scene.narration" tabindex="0" v-bind:class="{ civdeathBorder: scene.death }"></div>
      </div>
    </section>

    <Content class="custom" />

  </div>
</transition>
</template>

<script>
import {
  Carousel,
  Slide
} from 'vue-carousel';
export default {
  name: 'Albums',
  data: function() {
    return false {
      horizontal: false
    }
  },
  mounted() {
    document.addEventListener("keyup", this.nextScene);
  },
  methods: {
    nextSlide() {
      this.$refs.carousel.goToPage(this.$refs.carousel.getNextPage());
    },
    prevSlide() {
      this.$refs.carousel.goToPage(this.$refs.carousel.getPreviousPage());
    },
    nextScene() {
      if (event.keyCode == 39) {
        this.nextSlide()
      } else if (event.keyCode == 37) {
        this.prevSlide()
      } else if (event.keyCode == 68) {
        this.nextSlide()
      } else if (event.keyCode == 65) {
        this.prevSlide()
      }
    }
  },
  components: {
    Carousel,
    Slide
  },
}
</script>

<style lang="stylus" scoped>
@import '../styles/config.styl'
@require '../styles/wrapper.styl'

.blog {
  text-shadow: 2px 2px #083832;
}

.blog h1 {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.4;
  margin-top: 2.4em;
}

.blog h1 span{
  font-size: 61%;
  margin-left: .2rem;
}

.albumInfo {
  display: flex;
  flex-flow: row nowrap;
  padding: 2rem 0 0;
  width: 100%;
  margin: 0 auto 3rem auto;
}

.column {
  flex: 0 0 25%;
}

.label {
  font-size: 1.6rem;
  font-weight: 700;
  color: $navColor;
}

.value {
  font-size: 1.4rem;
  font-weight: 500;
  line-height: 1.4;
  color: $accentColor;
}

.abstract {
  font-size: 1.8rem;
  line-height: 1.4;
}

.horizontal {
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
  border-radius: 5px;
  background-color: #261900;
  width: 100%;
  padding: 1rem 2rem;
}

.VueCarousel {
  margin-top: 5rem;
}

.VueCarousel-slide{
  height:80vh;
}

.VueCarousel-slide img{
  object-fit: contain;
}

.carGrid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-column-gap: 2rem;
  grid-template-rows: 1.5rem;
  grid-template-areas: "img head" "img text" "img text";
}

.carImg {
  grid-area: img;
}

.carHead {
  grid-area: head;
}

h3.carHead {
  margin: 0;
}

.carText {
  grid-area: text;
  font-size: .9rem !important;
}

.scenes {
  display: block;
  padding: 0;
  width: 100%;
  max-width: 1000px;
  height: auto;
  padding: 0 auto 3rem;
}

h2 {
  font-size: 3.5rem;
  font-weight: 600;
  color: white;
  margin: 4rem 0 1rem;
}

.scenes h3 {
  font-size: 1.7rem;
  margin: 2.5rem 0 0;
}

img {
  width: 100%;
  line-height: 0;
  box-shadow: 0 5px 1px 0 rgba(8, 56, 50, 0.2);
  transition: all .2s ease-in-out;
}

img:hover {
  box-shadow: 0 5px 1px 0 rgba(8, 56, 50, 0.3);
  transform: scale(1.01);
}

.narrations {
  font-size: 1.2rem;
  line-height: 1.8;
  text-shadow: 2px 2px #083832;
  padding: 0 0 .5rem;
  margin: .5rem 0 0;
  border-bottom: 2px solid #FFBF46;
}

.blog {
  @extend $wrapper
}

.page-nav
  padding-top 1rem
  padding-bottom 0
  .inner
    min-height 2rem
    margin-top 0
    border-top 1px solid $borderColor
    padding-top 1rem
    overflow auto // clear float
  .next
    float right

@media (max-width: $MQMobile) {
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
    margin: 1.5rem 0 .5rem;
  }
  .scenes h3 {
    font-size: 1.5rem;
    margin: 1rem 0 0;
  }
  .narrations {
    font-size: 1rem;
    padding: .3rem .2rem;
    overflow-wrap: break-word;
    margin: 0;
    border-top: 0;
    border-bottom: 1px solid #FFBF46;
  }
}

@media (max-width: $MQMobileNarrow) {
  .blog__title {
    font-size: 2.5rem;
  }
}
</style>
