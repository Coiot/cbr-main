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
          Scene {{ index }}
        </option>
      </select>
      <button type="button" class="scene-button" @click="$emit('go')">Go</button>
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
    selectId: {
      type: String,
      default: "scene-jump",
    },
  },
  methods: {
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
  color: var(--nav-color);
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
  inline-size: 7rem;
  padding-block: 0.5rem;
  padding-inline: 0.6rem 1.4rem;
  border: 1px solid #ffbf46;
  border-radius: 8px;
  color: #fff;
  background: #1a1a1a;
  font-size: 1rem;
  font-weight: 600;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #ffbf46 50%),
    linear-gradient(135deg, #ffbf46 50%, transparent 50%);
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
  border: 1px solid #ffbf46;
  border-radius: 999px;
  background: #1a1a1a;
  color: #ffbf46;
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
