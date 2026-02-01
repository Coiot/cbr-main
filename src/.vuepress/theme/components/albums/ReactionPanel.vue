<template>
  <div class="scene-reactions">
    <div class="reaction-list">
      <button
        v-for="reaction in reactionDisplay.top"
        :key="reaction.key"
        type="button"
        class="reaction-pill"
        :class="{ active: userReaction === reaction.key }"
        :aria-pressed="userReaction === reaction.key"
        :aria-label="reaction.label"
        :title="reaction.label"
        :disabled="!authUser"
        @click.stop="onToggleReaction(reaction.key)"
      >
        <span class="reaction-emoji">{{ reaction.emoji }}</span>
        <span class="reaction-count">{{ reaction.count }}</span>
      </button>
      <button
        v-if="reactionDisplay.rest.length"
        type="button"
        class="reaction-more"
        :aria-expanded="isMenuOpen"
        @click.stop="onToggleMenu"
      >
        {{ isMenuOpen ? "Less" : `+${reactionDisplay.rest.length}` }}
      </button>
    </div>
    <div v-if="isMenuOpen && reactionDisplay.rest.length" class="reaction-more-panel">
      <button
        v-for="reaction in reactionDisplay.rest"
        :key="reaction.key"
        type="button"
        class="reaction-pill"
        :class="{ active: userReaction === reaction.key }"
        :aria-pressed="userReaction === reaction.key"
        :aria-label="reaction.label"
        :title="reaction.label"
        :disabled="!authUser"
        @click.stop="onToggleReaction(reaction.key)"
      >
        <span class="reaction-emoji">{{ reaction.emoji }}</span>
        <span class="reaction-count">{{ reaction.count }}</span>
      </button>
    </div>
    <span v-if="!authUser" class="reaction-hint">Sign in to react</span>
  </div>
</template>

<script>
export default {
  name: "ReactionPanel",
  props: {
    reactionDisplay: {
      type: Object,
      required: true,
    },
    userReaction: {
      type: String,
      default: null,
    },
    authUser: {
      type: Object,
      default: null,
    },
    isMenuOpen: {
      type: Boolean,
      default: false,
    },
    sceneNumber: {
      type: Number,
      required: true,
    },
  },
  methods: {
    onToggleReaction(reactionKey) {
      this.$emit("toggle-reaction", this.sceneNumber, reactionKey);
    },
    onToggleMenu() {
      this.$emit("toggle-menu", this.sceneNumber);
    },
  },
};
</script>

<style scoped>
.scene-reactions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  margin-block-start: 1.5rem;
  padding-block: 1.5rem 0.75rem;
  border-block-start: 1px solid rgba(255, 255, 255, 0.12);
}
.reaction-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.reaction-more {
  padding-block: 0.15rem;
  padding-inline: 0.6rem;
  border: 1px dashed rgba(255, 191, 70, 0.5);
  border-radius: 999px;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--text-color), white 25%);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.reaction-more:hover {
  border-color: rgba(255, 191, 70, 0.8);
  color: #fff;
}
.reaction-more-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  inline-size: 100%;
}
.reaction-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding-block: 0.35rem;
  padding-inline: 0.6rem;
  border: 1px solid rgba(255, 191, 70, 0.35);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--text-color), white 20%);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.reaction-pill:hover {
  border-color: rgba(255, 191, 70, 0.9);
  color: #fff;
  background: #222;
}
.reaction-pill.active {
  border-color: #ffbf46;
  background: #ffbf46;
  color: #1a1a1a;
}
.reaction-pill:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.reaction-emoji {
  font-size: 1rem;
  line-height: 1;
}
.reaction-count {
  font-size: 0.75rem;
  font-weight: 700;
}
.reaction-hint {
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--text-color), white 35%);
}
</style>
