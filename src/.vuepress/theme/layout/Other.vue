<template>
  <transition name="fade">
    <div class="page">
      <Content custom />

      <div class="footer" v-if="footerText">{{ footerText }}</div>
    </div>
  </transition>
</template>

<script>
export default {
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
.page {
  padding: 0 1rem 0;
  max-width: 100%;
  margin: 0 auto;
}
.page .footer {
  color: color-mix(in srgb, var(--text-color), white 25%);
  text-align: center;
  border-top: 2px solid var(--border-color);
  padding: 1.5rem 2.5rem 2.5rem;
  margin-block-start: 5rem;
}
</style>
