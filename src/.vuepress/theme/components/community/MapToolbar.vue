<template>
  <div class="map-toolbar" role="group" aria-label="Map navigation">
    <div class="map-toolbar-zoom" role="group" aria-label="Zoom">
      <button type="button" class="map-toolbar-control map-toolbar-icon" aria-label="Zoom out" @click="$emit('zoom-out')">−</button>
      <span class="map-toolbar-scale" aria-label="Current zoom">{{ scaleLabel }}</span>
      <button type="button" class="map-toolbar-control map-toolbar-icon" aria-label="Zoom in" @click="$emit('zoom-in')">+</button>
    </div>
    <button type="button" class="map-toolbar-control map-toolbar-desktop" @click="$emit('fit')">Fit</button>
    <details ref="views" class="map-toolbar-disclosure map-toolbar-views" @toggle="onDisclosureToggle('views', $event)"
      @keydown.esc="onDisclosureEscape($event)" @focusout="onDisclosureFocusout('views', $event)">
      <summary class="map-toolbar-control" aria-label="Map views">
        Views <svg class="map-toolbar-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </summary>
      <div class="map-toolbar-menu" role="group" aria-label="View actions">
        <button type="button" @click="runAction('browse-views', 'explore')">Community views</button>
        <button type="button" @click="runAction('browse-views', 'following')">Following</button>
        <button type="button" @click="runAction('browse-views', 'mine')">My views</button>
        <hr />
        <button type="button" :disabled="viewUnavailable" @click="runAction('save-view')">Save current view</button>
        <button type="button" :disabled="viewUnavailable" @click="runAction('copy-view')">Copy view link</button>
      </div>
    </details>
    <details ref="more" class="map-toolbar-disclosure" @toggle="onDisclosureToggle('more', $event)"
      @keydown.esc="onDisclosureEscape($event)" @focusout="onDisclosureFocusout('more', $event)">
      <summary class="map-toolbar-control map-toolbar-more" aria-label="More map controls">
        <span class="map-toolbar-more-label">More</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></svg>
      </summary>
      <div class="map-toolbar-menu" role="group" aria-label="Additional map controls">
        <button type="button" :aria-pressed="miniMapEnabled" @click="runAction('toggle-mini-map')"><span>Show mini map</span><span class="map-toolbar-state">{{ miniMapEnabled ? 'On' : 'Off' }}</span></button>
        <button type="button" :aria-pressed="showShortcuts" @click="runAction('toggle-shortcuts')"><span>Keyboard shortcuts</span><span class="map-toolbar-state">{{ showShortcuts ? 'On' : 'Off' }}</span></button>
        <hr class="map-toolbar-mobile" />
        <button type="button" class="map-toolbar-mobile" @click="runAction('fit')">Fit map</button>
        <button type="button" class="map-toolbar-mobile" @click="runAction('toggle-fullscreen')">{{ fullscreen ? 'Exit fullscreen' : 'Enter fullscreen' }}</button>
      </div>
    </details>
    <button type="button" class="map-toolbar-control map-toolbar-icon map-toolbar-desktop" :aria-label="fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
      :title="fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" :aria-pressed="fullscreen" @click="$emit('toggle-fullscreen')">
      <svg class="map-toolbar-fullscreen-icon" :class="{ 'is-entry': !fullscreen }" viewBox="0 0 24 24" aria-hidden="true"><path v-if="fullscreen" d="M3 9h6V3m12 6h-6V3M3 15h6v6m12-6h-6v6" /><path v-else d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" /></svg>
    </button>
    <button type="button" class="map-toolbar-control map-toolbar-icon map-toolbar-desktop" :aria-label="panelCollapsed ? 'Expand map panel' : 'Collapse map panel'"
      :title="panelCollapsed ? 'Expand map panel' : 'Collapse map panel'" :aria-expanded="!panelCollapsed" @click="$emit('toggle-panel')">
      <svg class="map-toolbar-panel-icon" viewBox="0 0 640 640" aria-hidden="true">
        <path v-if="panelCollapsed" d="M544 512C526.3 512 512 497.7 512 480L512 160C512 142.3 526.3 128 544 128C561.7 128 576 142.3 576 160L576 480C576 497.7 561.7 512 544 512zM71 337C61.6 327.6 61.6 312.4 71 303.1L215 159C221.9 152.1 232.2 150.1 241.2 153.8C250.2 157.5 256 166.3 256 176L256 256L400 256C426.5 256 448 277.5 448 304L448 336C448 362.5 426.5 384 400 384L256 384L256 464C256 473.7 250.2 482.5 241.2 486.2C232.2 489.9 221.9 487.9 215 481L71 337z" />
        <path v-else d="M96 128C113.7 128 128 142.3 128 160L128 480C128 497.7 113.7 512 96 512C78.3 512 64 497.7 64 480L64 160C64 142.3 78.3 128 96 128zM569 303C578.4 312.4 578.4 327.6 569 336.9L425 481C418.1 487.9 407.8 489.9 398.8 486.2C389.8 482.5 384 473.7 384 464L384 384L240 384C213.5 384 192 362.5 192 336L192 304C192 277.5 213.5 256 240 256L384 256L384 176C384 166.3 389.8 157.5 398.8 153.8C407.8 150.1 418.1 152.2 425 159L569 303z" />
      </svg>
    </button>
  </div>
</template>
<script>
import { toolbarDisclosureMethods } from './map/toolbarDisclosure.mjs';
export default {
  props: { scaleLabel: String, miniMapEnabled: Boolean, showShortcuts: Boolean, fullscreen: Boolean, panelCollapsed: Boolean, viewUnavailable: Boolean },
  emits: ['zoom-out', 'zoom-in', 'fit', 'browse-views', 'save-view', 'copy-view', 'toggle-mini-map', 'toggle-shortcuts', 'toggle-fullscreen', 'toggle-panel'],
  data: () => ({ openMenu: '' }),
  mounted() { document.addEventListener('pointerdown', this.onOutsidePointer, true); },
  beforeUnmount() { document.removeEventListener('pointerdown', this.onOutsidePointer, true); },
  methods: toolbarDisclosureMethods,
};
</script>
<style scoped>
.map-toolbar { position: relative; z-index: 5; display: flex; flex-wrap: nowrap; align-items: center; gap: .45rem; box-sizing: border-box; inline-size: 100%; min-inline-size: 0; padding: .35rem .6rem; border: 1px solid var(--panel-border-color); border-radius: 1rem; background: var(--panel-bg-soft-color); color: var(--panel-text-color); }
.map-toolbar *, .map-toolbar *::before, .map-toolbar *::after { box-sizing: border-box; }
.map-toolbar-control { display: inline-flex; justify-content: center; align-items: center; flex: 0 0 auto; gap: .3rem; min-block-size: 40px; padding: .4rem .8rem; border: 1px solid var(--panel-border-color); border-radius: 999px; background: var(--panel-bg-elevated-color); color: var(--panel-text-color); font: inherit; font-size: .85rem; font-weight: 700; line-height: 1.3; white-space: nowrap; cursor: pointer; list-style: none; }
.map-toolbar-control::-webkit-details-marker { display: none; }
.map-toolbar-control::marker { content: ''; }
.map-toolbar-control:hover, details[open] > summary { border-color: var(--accent-color); background: var(--accent-color); color: #171717; }
.map-toolbar-icon { inline-size: 40px; padding-inline: 0; }
.map-toolbar svg { display: block; inline-size: 20px; block-size: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.map-toolbar .map-toolbar-panel-icon { inline-size: 1.4rem; block-size: 1.4rem; fill: currentColor; stroke: none; }
.map-toolbar .map-toolbar-fullscreen-icon { inline-size: 1.4rem; block-size: 1.4rem; stroke-width: 2.4; }
.map-toolbar .map-toolbar-fullscreen-icon.is-entry { inline-size: 1.1rem; block-size: 1.1rem; stroke-width: 3.05; }
.map-toolbar .map-toolbar-chevron { inline-size: 12px; block-size: 12px; }
.map-toolbar-more svg { fill: currentColor; }
.map-toolbar-zoom { display: inline-flex; flex: 0 0 auto; align-items: center; gap: .15rem; padding: .2rem; border: 1px solid var(--panel-border-color); border-radius: 999px; background: var(--panel-bg-elevated-color); }
.map-toolbar-zoom .map-toolbar-control { inline-size: 32px; min-block-size: 32px; font-size: 1.1rem; padding: 0; }
.map-toolbar-scale { min-inline-size: 4ch; text-align: center; font-size: .85rem; font-weight: 800; color: var(--panel-muted-color); }
.map-toolbar-views { margin-inline-start: auto; }
.map-toolbar-disclosure { flex: 0 0 auto; }
.map-toolbar-menu { position: absolute; inset-block-start: calc(100% + .45rem); inset-inline-end: 0; z-index: 10; inline-size: min(20rem, 100%); max-block-size: min(60dvh, 26rem); overflow-y: auto; overscroll-behavior: contain; padding: .4rem; border: 1px solid var(--panel-border-color); border-block-start: 3px solid var(--accent-color); border-radius: 0 0 12px 12px; background: var(--panel-bg-color); box-shadow: 0 8px 24px rgb(0 0 0 / .3); white-space: normal; }
.map-toolbar-menu button { display: flex; justify-content: space-between; gap: .75rem; align-items: center; inline-size: 100%; min-block-size: 44px; padding: .65rem .8rem; border: 0; border-radius: 8px; background: transparent; color: var(--panel-text-color); font: inherit; font-size: .9rem; text-align: start; cursor: pointer; }
.map-toolbar-menu button:hover:not(:disabled) { background: var(--panel-bg-soft-color); }
.map-toolbar-menu button:disabled { opacity: .5; cursor: default; }
.map-toolbar-state { color: var(--field-label-color); font-size: .8rem; }
.map-toolbar-menu hr { border: 0; border-block-start: 1px solid var(--panel-border-color); margin: .4rem; }
.map-toolbar :is(button,summary):focus-visible { outline: 3px solid var(--field-label-color); outline-offset: 2px; }
.map-toolbar .map-toolbar-mobile { display: none; }
@media(max-width: 900px) {
  .map-toolbar { gap: .35rem; padding: .3rem; }
  .map-toolbar .map-toolbar-desktop { display: none; }
  .map-toolbar .map-toolbar-mobile { display: flex; }
  .map-toolbar-control { min-block-size: 44px; padding-inline: .65rem; }
  .map-toolbar-zoom .map-toolbar-control { inline-size: 44px; min-block-size: 44px; }
  .map-toolbar-more { inline-size: 44px; padding: 0; }
  .map-toolbar-more-label { display: none; }
}
</style>
