<template>
<section>
  <carousel @keyup="nextScene" ref="carousel" :perPage="1" :paginationEnabled="false" :loop="true">
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
</template>

<script>
import {
  Carousel,
  Slide
} from 'vue-carousel';

export default {
  components: {
    Carousel,
    Slide
  },
  mounted() {
    window.addEventListener("keyup", this.nextScene);
  },
  methods: {
    nextSlide() {
      this.$refs.carousel.goToPage(this.$refs.carousel.getNextPage());
    },
    prevSlide() {
      this.$refs.carousel.goToPage(this.$refs.carousel.getPreviousPage());
    },
    nextScene() {
      if (event.keyCode == 39 || event.keyCode == 68) {
        this.nextSlide()
      } else if (event.keyCode == 37 || event.keyCode == 65) {
        this.prevSlide()
      }
    }
  },
  data: function() {
    return {
      horizontal: false
    }
  },
}
</script>
