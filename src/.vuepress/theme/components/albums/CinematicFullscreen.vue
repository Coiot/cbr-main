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
          class="medium cinematic-primary"
          :transition-speed="900"
          style="background-size: contain"
        >
          <vueper-slide
            v-for="(scene, index) in scenes"
            :image="scene.slide_svg ? null : scene.slide_url"
            :key="sceneKey(scene, index)"
            :title="String(scene.scene_title || '')"
            :class="{ civdeathBorder: scene.death }"
          >
            <template v-if="scene.slide_svg" v-slot:content>
              <div class="scene-slide-media">
                <object
                  class="scene-slide-svg"
                  :data="scene.slide_svg"
                  type="image/svg+xml"
                  aria-label="Scene slide"
                ></object>
              </div>
            </template>
          </vueper-slide>
        </vueper-slides>
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
            :scene="activeScene"
            :scene-number="activeSceneNumber"
            :bookmarked="activeBookmarked"
            :bookmark-aria="activeBookmarkAria"
            :reaction-display="activeReactionDisplay"
            :user-reaction="activeUserReaction"
            :auth-user="authUser"
            :is-menu-open="activeMenuOpen"
            @toggle-bookmark="$emit('toggle-bookmark')"
            @toggle-reaction="
              (sceneNumber, reactionKey) =>
                $emit('toggle-reaction', sceneNumber, reactionKey)
            "
            @toggle-menu="(sceneNumber) => $emit('toggle-menu', sceneNumber)"
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
  },
  computed: {
    hasScenes() {
      return this.scenes && this.scenes.length > 0;
    },
  },
  watch: {
    isFullscreen(next) {
      if (!next) {
        this.pseudoFullscreen = false;
        this.unlockBodyScroll();
        return;
      }
      this.$nextTick(() => {
        this.syncToIndex(this.activeSceneIndex);
        this.resetNarrationScroll();
      });
      if (this.shouldUsePseudoFullscreen()) {
        this.lockBodyScroll();
      }
    },
    activeSceneIndex() {
      if (!this.isFullscreen) {
        return;
      }
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
      this.$emit("fullscreen-change", isActive);
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
          this.$emit("fullscreen-change", true);
          this.$nextTick(() => {
            this.syncToIndex(this.activeSceneIndex);
            this.resetNarrationScroll();
          });
        } else {
          this.unlockBodyScroll();
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
      this.resetNarrationScroll();
      this.$emit("slide-change", event);
    },
  },
};
</script>

<style scoped>
.cinematic-mode {
  display: none;
}
.cinematic-mode.is-active {
  display: block;
}
.cinematic-mode.is-pseudo-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 2000;
  padding: 1rem;
  background: #000;
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
  border: 1px solid #ffbf46;
  border-radius: 999px;
  background: #1a1a1a;
  color: #ffbf46;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.cinematic-control-button:hover,
.cinematic-control-button.is-active {
  color: #1a1a1a;
  background: #ffbf46;
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
  border-block-end: 1px solid color-mix(in srgb, var(--accent-color), black 50%);
  background: #101010;
}
.cinematic-stage:fullscreen,
.cinematic-stage:-webkit-full-screen {
  inline-size: 100vw;
  block-size: 100vh;
  min-block-size: 100vh;
  padding: 1rem;
  background: #000;
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
  min-inline-size: 0;
  block-size: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #050505;
}
.cinematic-stage:fullscreen .cinematic-slides,
.cinematic-stage:-webkit-full-screen .cinematic-slides {
  block-size: 100%;
}
:global(.cinematic-primary .vueperslide) {
  background-color: #050505;
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
  border: 1px solid color-mix(in srgb, var(--accent-color), black 40%);
  border-radius: 12px;
  overflow: hidden;
  background: #141414;
}
.cinematic-narration-content {
  min-block-size: 0;
  block-size: 100%;
  overflow: auto;
  overscroll-behavior: contain;
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
  min-block-size: 100%;
  display: flex;
  flex-direction: column;
  border: none;
  background: transparent;
}
:global(.cinematic-narration .h-narration p) {
  max-height: none;
}
@media (max-width: 799px) {
  .cinematic-mode.is-pseudo-fullscreen {
    padding: 0.6rem;
  }
  .cinematic-control-button {
    font-size: 0.82rem;
    padding-inline: 0.65rem;
  }
  .cinematic-narration-controls {
    padding: 0.45rem;
  }
  .cinematic-stage {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto;
    min-block-size: min(82vh, 760px);
  }
  .cinematic-stage--bottom {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(110px, 30vh);
    min-block-size: min(84vh, 780px);
  }
  .cinematic-slides {
    min-block-size: 240px;
  }
  .cinematic-stage .cinematic-narration {
    max-block-size: 30vh;
  }
}
</style>
