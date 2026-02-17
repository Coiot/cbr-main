<template>
  <transition name="fade">
    <div class="community-tile-map">
      <div class="map-intro">
        <Content custom />
      </div>
      <CommunityTileMapGrid />
      <div class="footer" v-if="footerText">{{ footerText }}</div>
    </div>
  </transition>
</template>

<script>
import CommunityTileMapGrid from "../components/community/CommunityTileMapGrid.vue";

export default {
  components: {
    CommunityTileMapGrid,
  },

  computed: {
    data() {
      return this.$page.frontmatter;
    },
    footerText() {
      const footer = this.data && this.data.footer;
      if (!footer || typeof footer !== "string") {
        return "";
      }
      const year = new Date().getFullYear();
      return footer.replace(/©\s*\d{4}/, `© ${year}`);
    },
  },
};
</script>

<style>
.community-tile-map {
  max-width: 1200px;
  width: 100%;
  padding: 1rem 1rem 0;
  margin: 0 auto;
}
.community-tile-map .map-intro {
  max-width: 70ch;
}
.community-tile-map .footer {
  color: color-mix(in srgb, var(--page-text-color), white 25%);
  text-align: center;
  border-top: 2px solid var(--border-color);
  padding: 1.5rem 2.5rem 2.5rem;
  margin-block-start: 5rem;
}
@media (max-width: 900px) {
  .community-tile-map {
    width: 95vw;
  }
}
</style>
