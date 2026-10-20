<template>
  <Teleport :to="teleportTarget"><section ref="panel" :id="popoverId" class="reaction-login-popover" :popover="nativePopover ? (tooltip ? 'manual' : 'auto') : null"
    :role="tooltip ? 'tooltip' : 'dialog'" :aria-labelledby="tooltip ? undefined : `${popoverId}-title`" :style="positionStyle" @toggle="handleToggle"
    @keydown.esc.stop.prevent="close()" @keydown.stop @click.stop @pointerdown.stop @pointerup.stop>
    <div v-if="!tooltip" class="reaction-login-header"><h4 :id="`${popoverId}-title`">{{ title }}</h4><button type="button" class="reaction-login-close" aria-label="Close collections" @click="close()">×</button></div>
    <slot />
  </section></Teleport>
</template>

<script>
import { reactionSignInPosition } from '../albums/reactionSignInPosition.mjs';

export default {
  name: 'CollectionPopover',
  props: {
    tooltip: Boolean,
    anchor: { type: Object, required: true },
    title: { type: String, required: true },
    popoverId: { type: String, required: true },
  },
  emits: ['close'],
  data: () => ({
    teleportTarget: typeof document !== 'undefined' ? (document.fullscreenElement || document.webkitFullscreenElement || document.body) : 'body',
    nativePopover: typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype,
    positionStyle: { visibility: 'hidden' },
  }),
  watch: { anchor() { this.$nextTick(this.updatePosition); } },
  mounted() {
    if (this.nativePopover) this.$refs.panel.showPopover({ source: this.anchor });
    else document.addEventListener('pointerdown', this.handleOutside, true);
    window.addEventListener('scroll', this.updatePosition, true);
    window.addEventListener('resize', this.updatePosition);
    window.visualViewport?.addEventListener('resize', this.updatePosition);
    window.visualViewport?.addEventListener('scroll', this.updatePosition);
    this.resizeObserver = new ResizeObserver(this.updatePosition);
    this.resizeObserver.observe(this.$refs.panel);
    this.updatePosition();
    if (!this.tooltip) this.$nextTick(() => this.$refs.panel.querySelector('button')?.focus({ preventScroll: true }));
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect();
    document.removeEventListener('pointerdown', this.handleOutside, true);
    window.removeEventListener('scroll', this.updatePosition, true);
    window.removeEventListener('resize', this.updatePosition);
    window.visualViewport?.removeEventListener('resize', this.updatePosition);
    window.visualViewport?.removeEventListener('scroll', this.updatePosition);
  },
  methods: {
    updatePosition() {
      const panel = this.$refs.panel;
      if (!panel || !this.anchor?.isConnected) return this.close(false);
      const bounds = this.anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const screen = { left: viewport?.offsetLeft || 0, top: viewport?.offsetTop || 0,
        width: viewport?.width || document.documentElement.clientWidth,
        height: viewport?.height || window.innerHeight };
      if ((bounds.bottom < screen.top || bounds.top > screen.top + screen.height) && !panel.contains(document.activeElement)) return this.close(false);
      const position = reactionSignInPosition(bounds, { width: panel.offsetWidth, height: panel.scrollHeight + 2 }, screen);
      this.positionStyle = { visibility: 'visible', left: `${position.left}px`, top: `${position.top}px`, maxHeight: `${position.maxHeight}px`, maxInlineSize: `${Math.max(0, screen.width - 24)}px` };
    },
    close(restoreFocus = true) {
      if (!this.tooltip && restoreFocus && this.anchor?.isConnected) this.anchor.focus({ preventScroll: true });
      this.$emit('close');
    },
    handleToggle(event) { if (event.newState === 'closed') this.close(false); },
    handleOutside(event) {
      if (!this.$refs.panel.contains(event.target) && !this.anchor.contains(event.target)) this.close(false);
    },
  },
};
</script>

<style scoped>
.reaction-login-popover { position: fixed; inset: auto; margin: 0; z-index: 1000; box-sizing: border-box; inline-size: min(22rem, calc(100vw - 24px)); min-inline-size: 0; padding: 1rem; border: 1px solid var(--field-label-color); border-block-start: 3px solid var(--accent-color); border-radius: 12px; background: var(--panel-bg-color); color: var(--panel-text-color); box-shadow: 0 8px 28px rgb(0 0 0 / .25); overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; white-space: normal; overflow-wrap: anywhere; font-size: 1rem; line-height: 1.5; text-align: start; text-shadow: none; }
.reaction-login-header { display: flex; align-items: start; gap: .5rem; margin-block-end: .5rem; }
.reaction-login-header h4 { flex: 1; min-inline-size: 0; margin: 0; font-size: 1rem; line-height: 1.4; color: var(--panel-text-color); }
.reaction-login-close { flex: 0 0 36px; min-block-size: 36px; border: 1px solid var(--panel-border-color); border-radius: 50%; padding: 0; background: var(--panel-bg-soft-color); color: var(--panel-text-color); font: inherit; font-size: 1.3rem; cursor: pointer; }
.reaction-login-intro { margin: 0 0 .85rem; color: var(--panel-muted-color); font-size: .85rem; line-height: 1.5; }
.reaction-login-close:focus-visible { outline: 3px solid var(--field-label-color); outline-offset: 3px; }
</style>
