<template>
  <transition name="fade">
    <div class="page">
      <slot name="top" />

      <Content :custom="false" />

      <slot name="bottom" />
    </div>
  </transition>
</template>

<script>
import { resolvePage, normalize, outboundRE, endingSlashRE } from "../util";

export default {
  props: ["sidebarItems"],
};
</script>

<style lang="stylus">
@import '../styles/config.styl';
@require '../styles/wrapper.styl';

.page {
  padding-bottom: 3rem;
}
</style>
