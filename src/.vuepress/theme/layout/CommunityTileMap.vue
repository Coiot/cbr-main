<template>
  <transition name="fade">
    <div class="community-tile-map">
      <div class="map-intro">
        <Content custom />
      </div>
      <MapExperience />
    </div>
  </transition>
</template>

<script>
import { defineAsyncComponent } from "vue";

const MapExperience = defineAsyncComponent(() =>
  import("../components/community/official/MapExperience.vue")
);

export default {
  components: {
    MapExperience,
  },
};
</script>

<style>
.community-tile-map {
  box-sizing: border-box;
  max-width: 1200px;
  width: 100%;
  padding: 1rem 1rem 0;
  margin: 0 auto;
}
.community-tile-map .map-intro {
  max-width: 70ch;
}
</style>
