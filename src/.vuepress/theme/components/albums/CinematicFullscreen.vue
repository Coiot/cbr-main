<template>
  <div
    v-if="hasScenes"
    class="cinematic-mode"
    :class="{
      'is-active': isFullscreen,
      'cinematic-mode--bottom': narrationLayout === 'bottom',
      'is-pseudo-fullscreen': pseudoFullscreen,
    }"
  >
    <div
      ref="cinematicStage"
      class="cinematic-stage"
      :class="{
        'cinematic-stage--bottom': narrationLayout === 'bottom',
      }"
    >
      <div class="cinematic-slides">
        <vueper-slides
          ref="cinematicSlides"
          @slide="handlePrimarySlide"
          arrows-inside
          :bullets="true"
          fixed-height="100%"
          fractions
          :touchable="false"
          class="cbr-media cinematic-primary"
          :transition-speed="900"
          style="background-size: contain"
        >
          <vueper-slide
            v-for="(scene, index) in scenes"
            :image="null"
            :key="sceneKey(scene, index)"
            :title="String(scene.scene_title || '')"
            :class="{ civdeathBorder: scene.death }"
          >
            <template v-slot:content>
              <div
                class="scene-slide-media"
                @pointerdown="onZoomPointerDown"
                @pointermove="onZoomPointerMove"
                @pointerup="onZoomPointerEnd"
                @pointercancel="onZoomPointerEnd"
                @dblclick="toggleZoom"
              >
                <img
                  v-if="shouldRenderSlideImage(index)"
                  class="scene-slide-image"
                  :src="$assetUrl(scene.slide_svg || scene.slide_url)"
                  :alt="String(scene.scene_title || `Scene ${index + 1}`)"
                  :style="
                    index === activeSceneIndex ? zoomTransformStyle : null
                  "
                  :loading="index === activeSceneIndex ? 'eager' : 'lazy'"
                  decoding="async"
                  draggable="false"
                />
              </div>
            </template>
          </vueper-slide>
        </vueper-slides>
        <div class="cinematic-zoom-controls" aria-label="Slide zoom controls">
          <button
            type="button"
            :disabled="zoomScale <= 1"
            aria-label="Zoom out"
            @click="zoomBy(-0.5)"
          >
            −
          </button>
          <button
            type="button"
            class="zoom-level"
            aria-label="Reset slide zoom"
            @click="resetZoom"
          >
            {{ Math.round(zoomScale * 100) }}%
          </button>
          <button
            type="button"
            :disabled="zoomScale >= 4"
            aria-label="Zoom in"
            @click="zoomBy(0.5)"
          >
            +
          </button>
        </div>
      </div>
      <aside class="cinematic-narration" v-if="activeScene">
        <div class="cinematic-narration-controls">
          <div class="layout-toggle-group">
            <button
              type="button"
              class="cinematic-control-button layout-toggle"
              :class="{ 'is-active': narrationLayout === 'side' }"
              @click="$emit('set-layout', 'side')"
            >
              Side
            </button>
            <button
              type="button"
              class="cinematic-control-button layout-toggle"
              :class="{ 'is-active': narrationLayout === 'bottom' }"
              @click="$emit('set-layout', 'bottom')"
            >
              Bottom
            </button>
          </div>
          <button
            type="button"
            class="cinematic-control-button"
            :class="{ 'is-active': isFullscreen }"
            @click="toggleFullscreen"
          >
            Exit
          </button>
        </div>
        <div ref="narrationContent" class="cinematic-narration-content">
          <SceneSlideContent
            :key="`cinematic-scene-${activeSceneNumber}-${
              activeUserReaction || 'none'
            }-${reactionVersion}`"
            :scene="activeScene"
            :scene-number="activeSceneNumber"
            :show-scene-number="showSceneNumber"
            :bookmarked="activeBookmarked"
            :bookmark-aria="activeBookmarkAria"
            :reaction-display="activeReactionDisplay"
            :scene-counts="activeSceneCounts"
            :user-reaction="activeUserReaction"
            :auth-user="authUser"
            :is-menu-open="activeMenuOpen"
            :reaction-version="reactionVersion"
            @toggle-bookmark="$emit('toggle-bookmark')"
            @toggle-reaction="onToggleReaction"
            @toggle-menu="onToggleMenu"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
const VueperSlides = () =>
  import("vueperslides").then((mod) => mod.VueperSlides);
const VueperSlide = () => import("vueperslides").then((mod) => mod.VueperSlide);
import SceneSlideContent from "./SceneSlideContent.vue";

export default {
  name: "CinematicFullscreen",
  components: {
    VueperSlides,
    VueperSlide,
    SceneSlideContent,
  },
  data() {
    return {
      pseudoFullscreen: false,
      previousBodyOverflow: null,
      zoomScale: 1,
      zoomTranslateX: 0,
      zoomTranslateY: 0,
      zoomPointers: new Map(),
      zoomGesture: null,
    };
  },
  props: {
    scenes: {
      type: Array,
      default: () => [],
    },
    isFullscreen: {
      type: Boolean,
      default: false,
    },
    narrationLayout: {
      type: String,
      default: "side",
    },
    activeScene: {
      type: Object,
      default: null,
    },
    activeSceneIndex: {
      type: Number,
      default: 0,
    },
    activeSceneNumber: {
      type: Number,
      default: 1,
    },
    showSceneNumber: {
      type: Boolean,
      default: true,
    },
    activeBookmarked: {
      type: Boolean,
      default: false,
    },
    activeBookmarkAria: {
      type: String,
      default: "",
    },
    activeReactionDisplay: {
      type: Object,
      required: true,
    },
    activeSceneCounts: {
      type: Object,
      default: () => ({}),
    },
    activeUserReaction: {
      type: String,
      default: null,
    },
    activeMenuOpen: {
      type: Boolean,
      default: false,
    },
    authUser: {
      type: Object,
      default: null,
    },
    sceneKey: {
      type: Function,
      required: true,
    },
    reactionVersion: {
      type: [String, Number],
      default: 0,
    },
  },
  computed: {
    hasScenes() {
      return this.scenes && this.scenes.length > 0;
    },
    zoomTransformStyle() {
      return {
        transform: `translate3d(${this.zoomTranslateX}px, ${this.zoomTranslateY}px, 0) scale(${this.zoomScale})`,
      };
    },
  },
  watch: {
    isFullscreen(next) {
      if (!next) {
        this.resetZoom();
        this.pseudoFullscreen = false;
        this.unlockBodyScroll();
        this.setFullscreenBodyClass(false);
        return;
      }
      this.$nextTick(() => {
        this.syncToIndex(this.activeSceneIndex);
        this.resetNarrationScroll();
      });
      if (this.shouldUsePseudoFullscreen()) {
        this.lockBodyScroll();
      }
      this.setFullscreenBodyClass(true);
    },
    activeSceneIndex() {
      if (!this.isFullscreen) {
        return;
      }
      this.resetZoom();
      this.$nextTick(() => {
        this.resetNarrationScroll();
      });
    },
  },
  mounted() {
    if (typeof document === "undefined") {
      return;
    }
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    document.addEventListener(
      "webkitfullscreenchange",
      this.handleFullscreenChange
    );
  },
  beforeDestroy() {
    if (typeof document === "undefined") {
      return;
    }
    this.unlockBodyScroll();
    this.setFullscreenBodyClass(false);
    document.removeEventListener(
      "fullscreenchange",
      this.handleFullscreenChange
    );
    document.removeEventListener(
      "webkitfullscreenchange",
      this.handleFullscreenChange
    );
  },
  methods: {
    clampZoomValue(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },
    getActiveZoomMedia() {
      if (!this.$el) {
        return null;
      }
      return this.$el.querySelector(
        ".vueperslide--active .scene-slide-media"
      );
    },
    applyZoom(scale, translateX, translateY, media = null) {
      const nextScale = this.clampZoomValue(scale, 1, 4);
      const target = media || this.getActiveZoomMedia();
      if (nextScale === 1 || !target) {
        this.zoomScale = nextScale;
        this.zoomTranslateX = 0;
        this.zoomTranslateY = 0;
        return;
      }
      const maxX = (target.clientWidth * (nextScale - 1)) / 2;
      const maxY = (target.clientHeight * (nextScale - 1)) / 2;
      this.zoomScale = nextScale;
      this.zoomTranslateX = this.clampZoomValue(translateX, -maxX, maxX);
      this.zoomTranslateY = this.clampZoomValue(translateY, -maxY, maxY);
    },
    resetZoom() {
      this.releaseZoomPointers();
      this.zoomPointers.clear();
      this.zoomGesture = null;
      this.zoomScale = 1;
      this.zoomTranslateX = 0;
      this.zoomTranslateY = 0;
    },
    zoomBy(delta) {
      const nextScale = this.clampZoomValue(this.zoomScale + delta, 1, 4);
      const ratio = nextScale / this.zoomScale;
      this.applyZoom(
        nextScale,
        this.zoomTranslateX * ratio,
        this.zoomTranslateY * ratio
      );
    },
    toggleZoom(event) {
      if (this.zoomScale > 1) {
        this.resetZoom();
        return;
      }
      this.applyZoom(2, 0, 0, event.currentTarget);
    },
    shouldRenderSlideImage(index) {
      const count = this.scenes.length;
      if (count <= 3) return true;
      const active = this.activeSceneIndex;
      const previous = (active - 1 + count) % count;
      const next = (active + 1) % count;
      return index === active || index === previous || index === next;
    },
    releaseZoomPointers() {
      this.zoomPointers.forEach((pointer) => {
        const media = pointer && pointer.media;
        if (!media || typeof media.releasePointerCapture !== "function") {
          return;
        }
        try {
          if (media.hasPointerCapture(pointer.id)) {
            media.releasePointerCapture(pointer.id);
          }
        } catch (error) {
          // A slide transition may detach the captured element first.
        }
      });
    },
    pointerPair() {
      return Array.from(this.zoomPointers.values()).slice(0, 2);
    },
    pointerDistance(first, second) {
      return Math.hypot(second.x - first.x, second.y - first.y);
    },
    pointerCenter(first, second, media) {
      const rect = media.getBoundingClientRect();
      return {
        x: (first.x + second.x) / 2 - rect.left - rect.width / 2,
        y: (first.y + second.y) / 2 - rect.top - rect.height / 2,
      };
    },
    beginPan(pointer, suppressSwipe = false) {
      this.zoomGesture = {
        type: "pan",
        pointerId: pointer.id,
        suppressSwipe,
        startX: pointer.x,
        startY: pointer.y,
        translateX: this.zoomTranslateX,
        translateY: this.zoomTranslateY,
      };
    },
    beginPinch(media) {
      const [first, second] = this.pointerPair();
      if (!first || !second) {
        return;
      }
      const center = this.pointerCenter(first, second, media);
      this.zoomGesture = {
        type: "pinch",
        distance: Math.max(this.pointerDistance(first, second), 1),
        scale: this.zoomScale,
        worldX: (center.x - this.zoomTranslateX) / this.zoomScale,
        worldY: (center.y - this.zoomTranslateY) / this.zoomScale,
      };
    },
    onZoomPointerDown(event) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      const media = event.currentTarget;
      this.zoomPointers.set(event.pointerId, {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
        media,
      });
      if (typeof media.setPointerCapture === "function") {
        try {
          media.setPointerCapture(event.pointerId);
        } catch (error) {
          // Pointer capture is optional and can fail during slide transitions.
        }
      }
      if (this.zoomPointers.size >= 2) {
        this.beginPinch(media);
      } else {
        this.beginPan(this.zoomPointers.get(event.pointerId));
      }
    },
    onZoomPointerMove(event) {
      if (!this.zoomPointers.has(event.pointerId)) {
        return;
      }
      if (event.cancelable) {
        event.preventDefault();
      }
      const previous = this.zoomPointers.get(event.pointerId);
      this.zoomPointers.set(event.pointerId, {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        pointerType: previous.pointerType,
        media: event.currentTarget,
      });
      const media = event.currentTarget;
      if (this.zoomPointers.size >= 2) {
        if (!this.zoomGesture || this.zoomGesture.type !== "pinch") {
          this.beginPinch(media);
        }
        const [first, second] = this.pointerPair();
        const center = this.pointerCenter(first, second, media);
        const distance = this.pointerDistance(first, second);
        const nextScale =
          this.zoomGesture.scale * (distance / this.zoomGesture.distance);
        this.applyZoom(
          nextScale,
          center.x - this.zoomGesture.worldX * nextScale,
          center.y - this.zoomGesture.worldY * nextScale,
          media
        );
        return;
      }
      const pointer = this.zoomPointers.get(event.pointerId);
      if (
        this.zoomScale > 1 &&
        this.zoomGesture &&
        this.zoomGesture.type === "pan"
      ) {
        this.applyZoom(
          this.zoomScale,
          this.zoomGesture.translateX + pointer.x - this.zoomGesture.startX,
          this.zoomGesture.translateY + pointer.y - this.zoomGesture.startY,
          media
        );
      }
    },
    onZoomPointerEnd(event) {
      const media = event.currentTarget;
      const pointer = this.zoomPointers.get(event.pointerId);
      const gesture = this.zoomGesture;
      const isSinglePointer = this.zoomPointers.size === 1;
      const canSwipe = Boolean(
        pointer &&
          event.type === "pointerup" &&
          isSinglePointer &&
          this.zoomScale === 1 &&
          gesture &&
          gesture.type === "pan" &&
          !gesture.suppressSwipe &&
          gesture.pointerId === event.pointerId
      );
      const deltaX = canSwipe ? pointer.x - gesture.startX : 0;
      const deltaY = canSwipe ? pointer.y - gesture.startY : 0;
      this.zoomPointers.delete(event.pointerId);
      if (typeof media.releasePointerCapture === "function") {
        try {
          if (media.hasPointerCapture(event.pointerId)) {
            media.releasePointerCapture(event.pointerId);
          }
        } catch (error) {
          // The browser may already have released capture during navigation.
        }
      }
      const remaining = Array.from(this.zoomPointers.values())[0];
      if (remaining) {
        this.beginPan(
          remaining,
          Boolean(gesture && (gesture.type === "pinch" || gesture.suppressSwipe))
        );
      } else {
        this.zoomGesture = null;
      }
      if (
        canSwipe &&
        Math.abs(deltaX) >= 48 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.25
      ) {
        this.goToAdjacentScene(deltaX < 0 ? 1 : -1);
      }
    },
    goToAdjacentScene(direction) {
      if (!this.scenes.length || !this.$refs.cinematicSlides) {
        return;
      }
      const nextIndex =
        (this.activeSceneIndex + direction + this.scenes.length) %
        this.scenes.length;
      this.$refs.cinematicSlides.goToSlide(nextIndex);
    },
    onToggleReaction(sceneNumber, reactionKey) {
      this.$emit("toggle-reaction", sceneNumber, reactionKey);
    },
    onToggleMenu(sceneNumber) {
      this.$emit("toggle-menu", sceneNumber);
    },
    getFullscreenElement() {
      if (typeof document === "undefined") {
        return null;
      }
      return document.fullscreenElement || document.webkitFullscreenElement;
    },
    handleFullscreenChange() {
      const active = this.getFullscreenElement();
      const stage = this.$refs.cinematicStage;
      const isActive = Boolean(
        active && stage && (active === stage || stage.contains(active))
      );
      if (!isActive) {
        this.pseudoFullscreen = false;
        this.unlockBodyScroll();
      }
      this.setFullscreenBodyClass(isActive || this.pseudoFullscreen);
      this.$emit("fullscreen-change", isActive);
    },
    setFullscreenBodyClass(active) {
      if (typeof document === "undefined" || !document.body) {
        return;
      }
      document.body.classList.toggle("cinematic-fullscreen-active", !!active);
    },
    shouldUsePseudoFullscreen() {
      if (typeof window === "undefined") {
        return false;
      }
      const ua = window.navigator.userAgent || "";
      const isIos =
        /iPad|iPhone|iPod/.test(ua) ||
        (window.navigator.platform === "MacIntel" &&
          window.navigator.maxTouchPoints > 1);
      const isSafari =
        /Safari/i.test(ua) &&
        !/Chrome|CriOS|EdgiOS|FxiOS|Firefox|Android/i.test(ua);
      return isIos || (isSafari && window.navigator.maxTouchPoints > 0);
    },
    lockBodyScroll() {
      if (typeof document === "undefined") {
        return;
      }
      const body = document.body;
      if (!body) {
        return;
      }
      if (this.previousBodyOverflow === null) {
        this.previousBodyOverflow = body.style.overflow || "";
      }
      body.style.overflow = "hidden";
    },
    unlockBodyScroll() {
      if (typeof document === "undefined") {
        return;
      }
      const body = document.body;
      if (!body) {
        return;
      }
      if (this.previousBodyOverflow !== null) {
        body.style.overflow = this.previousBodyOverflow;
      }
      this.previousBodyOverflow = null;
    },
    async toggleFullscreen() {
      if (typeof document === "undefined") {
        return;
      }
      const stage = this.$refs.cinematicStage;
      if (!stage) {
        return;
      }
      if (this.shouldUsePseudoFullscreen()) {
        const next = !this.isFullscreen;
        this.pseudoFullscreen = next;
        if (next) {
          this.lockBodyScroll();
          this.setFullscreenBodyClass(true);
          this.$emit("fullscreen-change", true);
          this.$nextTick(() => {
            this.syncToIndex(this.activeSceneIndex);
            this.resetNarrationScroll();
          });
        } else {
          this.unlockBodyScroll();
          this.setFullscreenBodyClass(false);
          this.$emit("fullscreen-change", false);
        }
        return;
      }
      this.pseudoFullscreen = false;
      const active = this.getFullscreenElement();
      if (active) {
        const exit =
          document.exitFullscreen || document.webkitExitFullscreen || null;
        if (typeof exit === "function") {
          await exit.call(document);
        }
        return;
      }
      this.$emit("fullscreen-change", true);
      await new Promise((resolve) => this.$nextTick(resolve));
      this.syncToIndex(this.activeSceneIndex);
      this.resetNarrationScroll();
      const request =
        stage.requestFullscreen || stage.webkitRequestFullscreen || null;
      if (typeof request === "function") {
        try {
          await request.call(stage);
        } catch (error) {
          this.setFullscreenBodyClass(false);
          this.$emit("fullscreen-change", false);
        }
      }
    },
    syncToIndex(index) {
      if (!this.$refs.cinematicSlides) {
        return;
      }
      this.$refs.cinematicSlides.goToSlide(index, { emit: false });
    },
    goToIndex(index) {
      if (!this.$refs.cinematicSlides) {
        return;
      }
      this.$refs.cinematicSlides.goToSlide(index);
    },
    resetNarrationScroll() {
      const panel = this.$refs.narrationContent;
      if (!panel) {
        return;
      }
      if (typeof panel.scrollTo === "function") {
        panel.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } else {
        panel.scrollTop = 0;
      }
      const nested = panel.querySelectorAll(".h-narration, .h-narration p");
      nested.forEach((node) => {
        if (node && typeof node.scrollTop === "number") {
          node.scrollTop = 0;
        }
      });
    },
    handlePrimarySlide(event) {
      const index = Number(
        event && event.currentSlide && event.currentSlide.index
      );
      if (!Number.isInteger(index) || index < 0 || index >= this.scenes.length) {
        return;
      }
      this.resetNarrationScroll();
      this.$emit("slide-change", { currentSlide: { index } });
    },
  },
};
</script>

<style scoped>
.cinematic-mode {
  display: none;
  --cinematic-shell-bg: #000;
  --cinematic-stage-bg: #050505;
  --cinematic-surface-bg: #141414;
  --cinematic-controls-bg: #101010;
  --cinematic-border: color-mix(in oklch, var(--accent-color), black 40%);
  --cinematic-controls-border: color-mix(
    in oklch,
    var(--accent-color),
    black 50%
  );
  --cinematic-control-bg: #1a1a1a;
  --cinematic-control-fg: #ffbf46;
  --cinematic-control-border: #ffbf46;
  --cinematic-control-active-bg: #ffbf46;
  --cinematic-control-active-fg: #1a1a1a;
}
.cinematic-mode.is-active {
  display: block;
}
.cinematic-mode.is-pseudo-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 2000;
  padding: 1rem;
  background: var(--cinematic-shell-bg);
}
.cinematic-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 20%);
  align-items: stretch;
  gap: 0.9rem;
  min-block-size: min(84vh, 920px);
}
.cinematic-mode.is-pseudo-fullscreen .cinematic-stage {
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 100%;
}
.cinematic-control-button {
  padding-block: 0.3rem;
  padding-inline: 0.9rem;
  border: 1px solid var(--cinematic-control-border);
  border-radius: 999px;
  background: var(--cinematic-control-bg);
  color: var(--cinematic-control-fg);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.cinematic-control-button:hover,
.cinematic-control-button.is-active {
  color: var(--cinematic-control-active-fg);
  background: var(--cinematic-control-active-bg);
}
.layout-toggle-group {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
}
.layout-toggle {
  border-radius: 999px;
}
.layout-toggle-group .layout-toggle:first-child {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}
.layout-toggle-group .layout-toggle:last-child {
  margin-inline-start: -1px;
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}
.cinematic-narration-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.6rem;
  border-block-end: 1px solid var(--cinematic-controls-border);
  background: var(--cinematic-controls-bg);
}
.cinematic-stage:fullscreen,
.cinematic-stage:-webkit-full-screen {
  inline-size: 100vw;
  block-size: 100vh;
  min-block-size: 100vh;
  padding: 1rem;
  background: var(--cinematic-shell-bg);
}
.cinematic-stage--bottom {
  grid-template-columns: 1fr;
  grid-template-rows: minmax(0, 1fr) minmax(130px, clamp(130px, 22vh, 200px));
  min-block-size: min(90vh, 980px);
}
.cinematic-stage--bottom:fullscreen,
.cinematic-stage--bottom:-webkit-full-screen {
  grid-template-rows: minmax(0, 1fr) minmax(120px, 12vh);
}
.cinematic-slides {
  position: relative;
  min-inline-size: 0;
  block-size: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--cinematic-stage-bg);
}
.cinematic-stage:fullscreen .cinematic-slides,
.cinematic-stage:-webkit-full-screen .cinematic-slides {
  block-size: 100%;
}
.scene-slide-media {
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: 100%;
  block-size: 100%;
  overflow: hidden;
  background: var(--cinematic-stage-bg);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.scene-slide-image {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  max-inline-size: 100%;
  max-block-size: 100%;
  object-fit: contain;
  transform-origin: center center;
  will-change: transform;
  user-select: none;
  -webkit-user-drag: none;
}
.cinematic-zoom-controls {
  position: absolute;
  inset-block-start: 0.55rem;
  inset-inline-end: 0.55rem;
  z-index: 6;
  display: none;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--cinematic-control-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--cinematic-control-bg), transparent 8%);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
.cinematic-zoom-controls button {
  min-inline-size: 2.4rem;
  min-block-size: 2.4rem;
  color: var(--cinematic-control-fg);
  background: transparent;
  border: 0;
  padding: 0.3rem 0.55rem;
  font: inherit;
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;
  touch-action: manipulation;
}
.cinematic-zoom-controls button + button {
  border-inline-start: 1px solid var(--cinematic-controls-border);
}
.cinematic-zoom-controls .zoom-level {
  min-inline-size: 3.5rem;
  font-size: 0.72rem;
}
.cinematic-zoom-controls button:disabled {
  opacity: 0.35;
  cursor: default;
}
.cinematic-zoom-controls button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: -2px;
}
:global(.cinematic-primary .vueperslide__content-wrapper) {
  pointer-events: auto !important;
}
:global(.cinematic-primary .vueperslide) {
  background-color: var(--cinematic-stage-bg);
  background-position: center center;
}
:global(.cinematic-primary .vueperslide__image) {
  background-size: contain !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
}
:global(.cinematic-primary .vueperslide__title) {
  display: none !important;
}
:global(.cinematic-primary.vueperslides--fixed-height .vueperslides__inner),
:global(
    .cinematic-primary.vueperslides--fixed-height
      .vueperslides__parallax-wrapper
  ),
:global(.cinematic-primary.vueperslides--fixed-height .vueperslide) {
  height: 100% !important;
}
.cinematic-narration {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  min-block-size: 0;
  border: 1px solid var(--cinematic-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--cinematic-surface-bg);
}
.cinematic-narration-content {
  flex: 1 1 auto;
  min-block-size: 0;
  block-size: auto;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}
.cinematic-stage--bottom .cinematic-narration {
  max-block-size: clamp(130px, 22vh, 200px);
}
.cinematic-stage:fullscreen .cinematic-narration,
.cinematic-stage:-webkit-full-screen .cinematic-narration {
  max-block-size: 100%;
}
.cinematic-stage--bottom:fullscreen .cinematic-narration,
.cinematic-stage--bottom:-webkit-full-screen .cinematic-narration {
  max-block-size: 20vh;
}
:global(.cinematic-narration .h-narration) {
  block-size: auto;
  min-block-size: 0;
  display: flex;
  flex-direction: column;
  border: none;
  background: transparent;
}
:global(.cinematic-narration .h-narration .narrations) {
  max-height: none !important;
  overflow: visible !important;
}
:global(.cinematic-narration .h-narration p) {
  max-height: none;
}
:global(
    .cinematic-stage:not(.cinematic-stage--bottom)
      .cinematic-narration
      .narrations
  ) {
  max-height: 100% !important;
  min-height: 0;
}
/* Light theme tuning for cinematic fullscreen UI */
:root[data-theme="light"] .cinematic-mode {
  --cinematic-shell-bg: var(--panel-bg-soft-color);
  --cinematic-stage-bg: var(--panel-bg-color);
  --cinematic-surface-bg: var(--panel-bg-elevated-color);
  --cinematic-controls-bg: var(--panel-bg-soft-color);
  --cinematic-border: var(--panel-border-color);
  --cinematic-controls-border: var(--panel-border-color);
  --cinematic-control-bg: var(--panel-bg-elevated-color);
  --cinematic-control-fg: var(--panel-text-color);
  --cinematic-control-border: var(--panel-border-color);
  --cinematic-control-active-bg: var(--accent-color);
  --cinematic-control-active-fg: #1a1a1a;
}
@media (max-width: 799px) {
  .cinematic-mode.is-pseudo-fullscreen {
    padding: 0.6rem;
  }
  :global(.cinematic-primary .vueperslides__fractions) {
    display: none !important;
  }
  .cinematic-control-button {
    font-size: 0.82rem;
    padding-inline: 0.65rem;
  }
  .cinematic-narration-controls {
    padding: 0.45rem;
  }
  .cinematic-narration-controls .layout-toggle-group {
    display: inline-flex;
  }
  .cinematic-slides {
    min-block-size: 240px;
  }
  .cinematic-zoom-controls {
    display: flex;
  }
  .cinematic-stage .cinematic-narration {
    max-block-size: 30vh;
  }
}

@media (max-width: 799px) and (orientation: portrait) {
  .cinematic-stage,
  .cinematic-stage--bottom,
  .cinematic-stage:fullscreen,
  .cinematic-stage:-webkit-full-screen,
  .cinematic-stage--bottom:fullscreen,
  .cinematic-stage--bottom:-webkit-full-screen {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(110px, 30vh);
    min-block-size: min(84vh, 780px);
  }
}

@media (max-width: 799px) and (orientation: landscape) {
  .cinematic-stage,
  .cinematic-stage:fullscreen,
  .cinematic-stage:-webkit-full-screen,
  .cinematic-mode.is-pseudo-fullscreen .cinematic-stage {
    grid-template-columns: minmax(0, 1fr) minmax(230px, 34%);
    grid-template-rows: minmax(0, 1fr);
    min-block-size: min(82vh, 760px);
  }
  .cinematic-stage--bottom,
  .cinematic-stage--bottom:fullscreen,
  .cinematic-stage--bottom:-webkit-full-screen,
  .cinematic-mode.is-pseudo-fullscreen .cinematic-stage--bottom {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(110px, 28vh);
  }
  .cinematic-stage .cinematic-narration,
  .cinematic-stage--bottom .cinematic-narration {
    max-block-size: 100%;
  }
}

:global(body.cinematic-fullscreen-active iframe) {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
</style>
