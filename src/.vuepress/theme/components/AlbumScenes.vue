<template>
<section class="scenes">
  <p>Testing the Scenes</p>
  <p>{{ abstract }}</p>
  <div class="medium" v-for="scene in scenes">
    <h3>{{ scene.scene_number }}</h3>
    <h2>{{ scene.scene_title }}</h2>
    <img :src="scene.slide_url">
    <div></div>
    <div v-if="reporter" v-html="scene.narration">{{ scene.reporter }}</div>
    </li>
  </div>
</section>
</template>

<script>
export default {
  props: {
    abstract: {
      type: String
    },
    scenes: {
      type: Array,
      required: true
    }
  }
}
</script>

<style scoped>
.scenes {
  display: block;
  padding: 0;
  width: 100%;
  max-width: 1200px;
  height: auto;
  margin: 0 auto 3rem auto;
}

img {
  width: 100%;
  line-height: 0;
  margin: 2rem 0;
}
</style>
