<template>
  <section
    class="scene-carousel"
    :class="{ 'scene-carousel--fill': fillHeight }"
    aria-roledescription="carousel"
    :aria-label="label"
    tabindex="0"
    @keydown.left.prevent="previous"
    @keydown.right.prevent="next"
  >
    <div
      v-if="showThumbnails && scenes.length > 1"
      ref="thumbnailTrack"
      class="scene-carousel-thumbnails"
      aria-label="Scene thumbnails"
    >
      <button
        v-for="(scene, index) in scenes"
        :key="`thumbnail-${sceneKey(scene, index)}`"
        ref="thumbnailButtons"
        type="button"
        class="scene-carousel-thumbnail"
        :class="{ 'is-active': index === normalizedActiveIndex }"
        :aria-current="index === normalizedActiveIndex ? 'true' : null"
        :aria-label="`Show ${sceneLabel(scene, index)}`"
        @click="goToSlide(index)"
      >
        <img
          :src="sceneImage(scene)"
          :alt="sceneLabel(scene, index)"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </button>
    </div>

    <div
      class="scene-carousel-stage"
      :class="{ civdeathBorder: activeScene && activeScene.death }"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="clearPointer"
    >
      <button
        v-if="showArrows && scenes.length > 1"
        type="button"
        class="scene-carousel-arrow scene-carousel-arrow--previous"
        aria-label="Previous scene"
        @click="previous"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <Transition :name="transitionName" mode="out-in">
        <div
          v-if="activeScene"
          :key="sceneKey(activeScene, normalizedActiveIndex)"
          class="scene-carousel-active"
        >
          <slot
            name="media"
            :scene="activeScene"
            :index="normalizedActiveIndex"
          >
            <img
              class="scene-carousel-image medium-zoom"
              :src="sceneImage(activeScene)"
              :alt="sceneLabel(activeScene, normalizedActiveIndex)"
              loading="eager"
              decoding="async"
              draggable="false"
            />
          </slot>
        </div>
      </Transition>

      <span
        v-if="showFraction && scenes.length"
        class="scene-carousel-fraction"
        aria-live="polite"
      >
        {{ normalizedActiveIndex + 1 }} / {{ scenes.length }}
      </span>

      <button
        v-if="showArrows && scenes.length > 1"
        type="button"
        class="scene-carousel-arrow scene-carousel-arrow--next"
        aria-label="Next scene"
        @click="next"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>

    <div v-if="$slots.content && activeScene" class="scene-carousel-content">
      <slot
        name="content"
        :scene="activeScene"
        :index="normalizedActiveIndex"
      />
    </div>
  </section>
</template>

<script>
export default {
  name: "SceneCarousel",
  emits: ["change"],
  props: {
    scenes: {
      type: Array,
      default: () => [],
    },
    activeIndex: {
      type: Number,
      default: 0,
    },
    showThumbnails: {
      type: Boolean,
      default: false,
    },
    showFraction: {
      type: Boolean,
      default: true,
    },
    showArrows: {
      type: Boolean,
      default: true,
    },
    touchable: {
      type: Boolean,
      default: true,
    },
    loop: {
      type: Boolean,
      default: true,
    },
    fillHeight: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: "Episode scenes",
    },
    sceneKey: {
      type: Function,
      default: (scene, index) =>
        `${index}-${String((scene && scene.scene_title) || "")}`,
    },
  },
  data() {
    return {
      pointerStart: null,
      transitionDirection: 1,
    };
  },
  computed: {
    normalizedActiveIndex() {
      if (!this.scenes.length) {
        return 0;
      }
      const index = Number.isInteger(this.activeIndex) ? this.activeIndex : 0;
      return Math.min(Math.max(index, 0), this.scenes.length - 1);
    },
    activeScene() {
      return this.scenes[this.normalizedActiveIndex] || null;
    },
    transitionName() {
      return this.transitionDirection < 0
        ? "scene-carousel-previous"
        : "scene-carousel-next";
    },
  },
  watch: {
    normalizedActiveIndex() {
      this.$nextTick(this.scrollActiveThumbnailIntoView);
    },
    scenes() {
      this.$nextTick(this.scrollActiveThumbnailIntoView);
    },
  },
  mounted() {
    this.scrollActiveThumbnailIntoView();
  },
  methods: {
    sceneImage(scene) {
      const url = scene && (scene.slide_svg || scene.slide_url);
      return this.$assetUrl ? this.$assetUrl(url) : url;
    },
    sceneLabel(scene, index) {
      const title = String((scene && scene.scene_title) || "").trim();
      return title ? `Scene ${index + 1}: ${title}` : `Scene ${index + 1}`;
    },
    normalizeTarget(index) {
      const count = this.scenes.length;
      if (!count) {
        return 0;
      }
      if (this.loop) {
        return ((index % count) + count) % count;
      }
      return Math.min(Math.max(index, 0), count - 1);
    },
    goToSlide(index, options = {}) {
      if (!this.scenes.length) {
        return;
      }
      const target = this.normalizeTarget(Number(index) || 0);
      this.transitionDirection =
        target === this.normalizedActiveIndex
          ? this.transitionDirection
          : target > this.normalizedActiveIndex
          ? 1
          : -1;
      if (options.emit === false || target === this.normalizedActiveIndex) {
        this.$nextTick(this.scrollActiveThumbnailIntoView);
        return;
      }
      this.$emit("change", target);
    },
    previous() {
      this.transitionDirection = -1;
      this.goToSlide(this.normalizedActiveIndex - 1);
    },
    next() {
      this.transitionDirection = 1;
      this.goToSlide(this.normalizedActiveIndex + 1);
    },
    onPointerDown(event) {
      if (
        !this.touchable ||
        (event.pointerType === "mouse" && event.button !== 0)
      ) {
        return;
      }
      this.pointerStart = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    },
    onPointerUp(event) {
      if (
        !this.pointerStart ||
        this.pointerStart.id !== event.pointerId ||
        !this.touchable
      ) {
        this.clearPointer();
        return;
      }
      const deltaX = event.clientX - this.pointerStart.x;
      const deltaY = event.clientY - this.pointerStart.y;
      this.clearPointer();
      if (
        Math.abs(deltaX) >= 48 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.25
      ) {
        deltaX < 0 ? this.next() : this.previous();
      }
    },
    clearPointer() {
      this.pointerStart = null;
    },
    scrollActiveThumbnailIntoView() {
      const buttons = this.$refs.thumbnailButtons;
      const target = Array.isArray(buttons)
        ? buttons[this.normalizedActiveIndex]
        : buttons;
      if (!target || typeof target.scrollIntoView !== "function") {
        return;
      }
      target.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    },
  },
};
</script>

<style scoped>
.scene-carousel {
  inline-size: 100%;
  min-inline-size: 0;
  outline: none;
}

.scene-carousel--fill {
  block-size: 100%;
  min-block-size: 0;
}

.scene-carousel-thumbnails {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(112px, 1fr);
  gap: 0.7rem;
  margin-block-end: 1rem;
  padding-block: 0.2rem 0.45rem;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
  scroll-snap-type: inline proximity;
}

.scene-carousel-thumbnail {
  position: relative;
  min-inline-size: 0;
  aspect-ratio: 16 / 9;
  padding: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-color), transparent 62%);
  border-radius: 4px;
  background: #111;
  opacity: 0.72;
  cursor: pointer;
  scroll-snap-align: center;
  transition:
    border-color 160ms ease,
    opacity 160ms ease,
    transform 160ms ease;
}

.scene-carousel-thumbnail:hover,
.scene-carousel-thumbnail:focus-visible,
.scene-carousel-thumbnail.is-active {
  border-color: var(--accent-color);
  opacity: 1;
}

.scene-carousel-thumbnail.is-active {
  box-shadow: inset 0 4px 0 var(--accent-color);
  transform: translateY(-2px);
}

.scene-carousel-thumbnail img {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.scene-carousel-stage {
  position: relative;
  inline-size: 100%;
  min-inline-size: 0;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #050505;
  touch-action: pan-y;
}

.scene-carousel--fill .scene-carousel-stage,
.scene-carousel--fill .scene-carousel-active {
  block-size: 100%;
  min-block-size: 0;
  aspect-ratio: auto;
}

.scene-carousel-active {
  inline-size: 100%;
  block-size: 100%;
}

.scene-carousel-image {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: contain;
  background: #050505;
}

.scene-carousel-arrow {
  position: absolute;
  inset-block: 0;
  z-index: 5;
  inline-size: clamp(3rem, 8vw, 6rem);
  padding: 0;
  border: 0;
  color: rgba(255, 255, 255, 0.78);
  background: transparent;
  cursor: pointer;
  opacity: 0.7;
  transition:
    color 160ms ease,
    opacity 160ms ease,
    background 160ms ease;
}

.scene-carousel-arrow:hover,
.scene-carousel-arrow:focus-visible {
  color: #fff;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.36),
    rgba(0, 0, 0, 0)
  );
  opacity: 1;
}

.scene-carousel-arrow--previous {
  inset-inline-start: 0;
}

.scene-carousel-arrow--next {
  inset-inline-end: 0;
}

.scene-carousel-arrow--next:hover,
.scene-carousel-arrow--next:focus-visible {
  background: linear-gradient(
    270deg,
    rgba(0, 0, 0, 0.36),
    rgba(0, 0, 0, 0)
  );
}

.scene-carousel-arrow svg {
  inline-size: clamp(2rem, 5vw, 4rem);
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.scene-carousel-fraction {
  position: absolute;
  inset-block-start: 0.75rem;
  inset-inline-start: 0.75rem;
  z-index: 6;
  border: 1px solid var(--accent-color);
  border-radius: 0.3em;
  padding: 0.5em 1em;
  color: #fff;
  background: color-mix(in srgb, var(--accent-color), #6b5a34 52%);
  box-shadow: 2px 2px 2px rgba(45, 40, 5, 0.3);
  font-weight: 800;
  text-shadow: var(--narration-shadow);
  transition: opacity 180ms ease;
}

.scene-carousel-fraction:hover {
  opacity: 0;
}

.scene-carousel-content {
  min-inline-size: 0;
}

.scene-carousel-next-enter-active,
.scene-carousel-next-leave-active,
.scene-carousel-previous-enter-active,
.scene-carousel-previous-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.scene-carousel-next-enter-from,
.scene-carousel-previous-leave-to {
  opacity: 0;
  transform: translateX(2%);
}

.scene-carousel-next-leave-to,
.scene-carousel-previous-enter-from {
  opacity: 0;
  transform: translateX(-2%);
}

@media (max-width: 600px) {
  .scene-carousel-thumbnails {
    grid-auto-columns: minmax(92px, 28vw);
    gap: 0.45rem;
  }

  .scene-carousel-fraction {
    display: none;
  }

  .scene-carousel-arrow {
    inline-size: 3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-carousel-next-enter-active,
  .scene-carousel-next-leave-active,
  .scene-carousel-previous-enter-active,
  .scene-carousel-previous-leave-active {
    transition: none;
  }
}
</style>
