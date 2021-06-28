<template>
  <transition name="fade">
    <div class="page">

      <Content custom />

      <div class="footer" v-if="data.footer">{{ data.footer }}</div>
    </div>
  </transition>
</template>

<script>
import NavLink from "../components/NavLink.vue";

export default {
  components: {
    NavLink,
  },

  computed: {
    data() {
      return this.$page.frontmatter;
    },
  },
};
</script>

<style lang="stylus">
@import '../styles/config.styl';

.page {
  padding: 0 1rem 0;
  max-width: 100%h;
  margin: 0 auto;

  .footer {
    padding: 2.5rem;
    border-top: 2px solid $borderColor;
    text-align: center;
    color: lighten($textColor, 25%);
  }
}
</style>
