<template>
  <div class="scene-jump">
    <label class="jump-label" :for="selectId">Jump to scene</label>
    <div class="jump-controls">
      <select
        :id="selectId"
        :value="value"
        @change="handleChange"
        @keyup.enter="$emit('go')"
      >
        <option v-for="index in sceneCount" :key="index" :value="index">
          {{ optionLabel(index) }}
        </option>
      </select>
      <button type="button" class="scene-button" @click="$emit('go')">
        Go
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "SceneJumpControl",
  props: {
    value: {
      type: Number,
      default: 1,
    },
    sceneCount: {
      type: Number,
      default: 0,
    },
    scenes: {
      type: Array,
      default: () => [],
    },
    showSceneTitles: {
      type: Boolean,
      default: false,
    },
    selectId: {
      type: String,
      default: "scene-jump",
    },
  },
  methods: {
    optionLabel(index) {
      const base = `Scene ${index}`;
      if (!this.showSceneTitles) {
        return base;
      }
      const scene = this.scenes[index - 1] || {};
      const rawTitle = scene.scene_title_html || scene.scene_title || "";
      const title = String(rawTitle)
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();
      return title ? `${base}: ${title}` : base;
    },
    handleChange(event) {
      const parsed = parseInt(event.target.value, 10);
      this.$emit("input", Number.isFinite(parsed) ? parsed : 1);
      this.$emit("go");
    },
  },
};
</script>

<style scoped>
.scene-jump {
  min-inline-size: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.jump-label {
  color: var(--page-text-color);
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.jump-controls {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.jump-controls select {
  inline-size: 100%;
  min-inline-size: 12rem;
  max-inline-size: 24rem;
  padding-block: 0.5rem;
  padding-inline: 0.6rem 1.4rem;
  border: 1px solid var(--meta-value-color);
  border-radius: 8px;
  color: var(--panel-text-color);
  background: var(--panel-bg-color);
  font-size: 1rem;
  font-weight: 600;
  appearance: none;
  background-image: linear-gradient(
      45deg,
      transparent 50%,
      var(--meta-value-color) 50%
    ),
    linear-gradient(135deg, var(--meta-value-color) 50%, transparent 50%);
  background-position: calc(100% - 0.9rem) calc(50% - 0.1rem),
    calc(100% - 0.6rem) calc(50% - 0.1rem);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}
.jump-controls select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 191, 70, 0.3);
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
@media (max-width: 799px) {
  .scene-jump {
    inline-size: 100%;
  }
}
</style>
