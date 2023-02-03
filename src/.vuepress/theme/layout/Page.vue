<template>
  <transition name="fade">
    <div class="archive">
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

.archive {
  padding: 1rem 1rem 0;
  max-width: 70ch;
  margin: 0px auto;
  word-break: keep-all;

  .footer {
    color: lighten($textColor, 25%);
    text-align: center;
    border-top: 2px solid $borderColor;
    padding: 1.5rem 2.5rem 2.5rem;
    margin-inline-start: 5rem;
  }
}
</style>
