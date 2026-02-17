<template>
  <div class="view-toggle">
    <span class="view-status">
      Viewing: {{ currentViewLabel }}
      <button
        class="scene-button fullscreen-button"
        type="button"
        :class="{ 'is-active': isCinematicFullscreen }"
        @click="$emit('toggle-fullscreen')"
      >
        {{ isCinematicFullscreen ? "Exit Fullscreen" : "Fullscreen" }}
      </button>
    </span>
    <div class="view-mode-buttons" role="group" aria-label="View mode">
      <button
        class="toggle-button mode-button"
        type="button"
        :class="{ 'is-active': isVerticalView }"
        :aria-pressed="isVerticalView"
        @click="$emit('set-view-mode', 'vertical')"
      >
        Vertical
      </button>
      <button
        class="toggle-button mode-button"
        type="button"
        :class="{ 'is-active': isHorizontalView }"
        :aria-pressed="isHorizontalView"
        @click="$emit('set-view-mode', 'horizontal')"
      >
        Horizontal
      </button>
    </div>
    <div
      v-if="isCinematicFullscreen"
      class="fullscreen-layout-toggle"
      role="group"
      aria-label="Fullscreen narration layout"
    >
      <div class="layout-toggle-group">
        <button
          type="button"
          class="scene-button cinematic-setting layout-toggle"
          :class="{ 'is-active': cinematicNarrationLayout === 'side' }"
          @click="$emit('set-layout', 'side')"
        >
          Narration Side
        </button>
        <button
          type="button"
          class="scene-button cinematic-setting layout-toggle"
          :class="{ 'is-active': cinematicNarrationLayout === 'bottom' }"
          @click="$emit('set-layout', 'bottom')"
        >
          Narration Bottom
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "EpisodeViewControls",
  props: {
    currentViewLabel: {
      type: String,
      default: "Vertical",
    },
    isVerticalView: {
      type: Boolean,
      default: true,
    },
    isHorizontalView: {
      type: Boolean,
      default: false,
    },
    isCinematicFullscreen: {
      type: Boolean,
      default: false,
    },
    cinematicNarrationLayout: {
      type: String,
      default: "side",
    },
  },
};
</script>

<style scoped>
.view-toggle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.fullscreen-button {
  margin-inline-start: 0.5rem;
  align-self: flex-start;
}
.fullscreen-layout-toggle {
  display: none;
}
.view-status {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--page-text-color);
  font-size: 1rem;
  font-weight: 700;
}
.view-mode-buttons {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
}
.toggle-button {
  inline-size: auto;
  padding-block: 0.38rem;
  padding-inline: 1rem;
  border: 1px solid #70284f;
  border-radius: 999px;
  background: var(--panel-bg-color);
  color: var(--panel-text-color);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.2;
  transition: all 0.2s ease-in-out;
}
.toggle-button:hover {
  border-color: #d20083;
  color: #ffd8f0;
  cursor: pointer;
}
.mode-button {
  min-inline-size: 8.2rem;
}
.mode-button.is-active {
  background: #d20083;
  border-color: #d20083;
  color: #fff;
}
.view-mode-buttons .mode-button:first-child {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}
.view-mode-buttons .mode-button:last-child {
  margin-inline-start: -1px;
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}
.scene-button {
  padding-block: 0.5rem;
  padding-inline: 1rem;
  border: 1px solid var(--meta-value-color);
  border-radius: 999px;
  background: var(--panel-bg-color);
  color: var(--meta-value-color);
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.scene-button:hover {
  color: #1a1a1a;
  background: #ffbf46;
}
.scene-button.is-active {
  color: #1a1a1a;
  background: #ffbf46;
}
.cinematic-setting {
  min-inline-size: 9.5rem;
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
@media (max-width: 799px) {
  .view-mode-buttons {
    inline-size: 100%;
  }
  .toggle-button {
    inline-size: auto;
  }
  .mode-button {
    flex: 1 1 0;
    min-inline-size: 0;
  }
  .fullscreen-layout-toggle {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    inline-size: 100%;
  }
  .fullscreen-layout-toggle .cinematic-setting {
    flex: 1 1 10rem;
    min-inline-size: 0;
  }
  .fullscreen-layout-toggle .layout-toggle-group {
    inline-size: 100%;
  }
  .fullscreen-layout-toggle .layout-toggle {
    flex: 1 1 auto;
  }
}
</style>
