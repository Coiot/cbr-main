<template>
  <router-link
    class="nav-link"
    :to="link"
    v-if="!isExternal(link) && !isXml(link)"
    :exact="exact"
  >{{ item.text }}</router-link>
  <a v-else-if="isXml(link)" :href="link" class="nav-link">{{ item.text }}</a>
  <a
    v-else
    :href="link"
    class="nav-link external"
    :target="isMailto(link) || isTel(link) ? null : '_blank'"
    :rel="isMailto(link) || isTel(link) ? null : 'noopener noreferrer'"
  >{{ item.text }}</a>
</template>

<script>
import { isExternal, isMailto, isTel, isXml, ensureExt } from "../util";

export default {
  props: {
    item: {
      required: true,
    },
  },

  computed: {
    link() {
      return ensureExt(this.item.link);
    },

    exact() {
      if (this.$site.locales) {
        return Object.keys(this.$site.locales).some(
          (rootLink) => rootLink === this.link
        );
      }
      return this.link === "/";
    },
  },

  methods: {
    isExternal,
    isMailto,
    isTel,
    isXml,
  },
};
</script>
