<template>
  <div class="scene-jump" :class="{ compact }">
    <label class="jump-label" :for="selectId">Jump to scene</label>
    <div class="jump-controls">
      <select
        :id="selectId"
        :value="modelValue"
        @change="handleChange"
      >
        <option v-for="index in sceneCount" :key="index" :value="index">
          {{ optionLabel(index) }}
        </option>
      </select>
    </div>
  </div>
</template>

<script>
export default {
  name: "SceneJumpControl",
  emits: ["update:modelValue", "go"],
  props: {
    modelValue: {
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
    compact: {
      type: Boolean,
      default: false,
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
      const sceneNumber = Number.isFinite(parsed) ? parsed : 1;
      this.$emit("update:modelValue", sceneNumber);
      this.$emit("go", sceneNumber);
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
.scene-jump.compact {
  min-inline-size: 0;
  gap: 0.4rem;
}
.scene-jump.compact .jump-label {
  font-size: 0.7rem;
}
.scene-jump.compact .jump-controls {
  gap: 0.45rem;
}
.scene-jump.compact .jump-controls select {
  min-inline-size: 10.5rem;
  max-inline-size: 15rem;
  padding-block: 0.42rem;
  font-size: 0.9rem;
}
@media (max-width: 799px) {
  .scene-jump {
    inline-size: 100%;
  }
}
</style>
