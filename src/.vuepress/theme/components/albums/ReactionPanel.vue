<template>
  <div class="scene-reactions">
    <div class="reaction-list">
      <button
        v-for="reaction in topReactions"
        :key="reaction.key"
        type="button"
        class="reaction-pill"
        :class="{ active: isActiveReaction(reaction.key) }"
        :aria-pressed="isActiveReaction(reaction.key)"
        :aria-label="reaction.label"
        :title="reaction.label"
        @click.stop="onToggleReaction(reaction.key)"
      >
        <span class="reaction-emoji">{{ reaction.emoji }}</span>
        <span class="reaction-count">{{ countFor(reaction) }}</span>
      </button>
      <button
        v-if="restReactions.length"
        type="button"
        class="reaction-more"
        :aria-expanded="menuOpen"
        @click.stop="onToggleMenu"
      >
        {{ menuOpen ? "Less" : `+${restReactions.length}` }}
      </button>
    </div>
    <div v-if="menuOpen && restReactions.length" class="reaction-more-panel">
      <button
        v-for="reaction in restReactions"
        :key="reaction.key"
        type="button"
        class="reaction-pill"
        :class="{ active: isActiveReaction(reaction.key) }"
        :aria-pressed="isActiveReaction(reaction.key)"
        :aria-label="reaction.label"
        :title="reaction.label"
        @click.stop="onToggleReaction(reaction.key)"
      >
        <span class="reaction-emoji">{{ reaction.emoji }}</span>
        <span class="reaction-count">{{ countFor(reaction) }}</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "ReactionPanel",
  data() {
    return {
      menuOpenInternal: false,
      countsInternal: {},
      userReactionInternal: undefined,
    };
  },
  props: {
    reactionDisplay: {
      type: Object,
      required: true,
    },
    userReaction: {
      type: String,
      default: null,
    },
    sceneCounts: {
      type: Object,
      default: () => ({}),
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
  computed: {
    menuOpen() {
      return this.menuOpenInternal || this.isMenuOpen;
    },
    effectiveUserReaction() {
      if (this.userReactionInternal !== undefined) {
        return this.userReactionInternal;
      }
      return this.normalizeReactionKey(this.userReaction);
    },
    orderedReactions() {
      const source = [
        ...(this.reactionDisplay && this.reactionDisplay.top
          ? this.reactionDisplay.top
          : []),
        ...(this.reactionDisplay && this.reactionDisplay.rest
          ? this.reactionDisplay.rest
          : []),
      ];
      const seen = new Set();
      return source
        .map((reaction, index) => ({
          ...reaction,
          key: this.normalizeReactionKey(reaction.key),
          _order: index,
        }))
        .filter((reaction) => {
          if (!reaction.key || seen.has(reaction.key)) {
            return false;
          }
          seen.add(reaction.key);
          return true;
        })
        .sort((a, b) => {
          const aCount = this.countFor(a);
          const bCount = this.countFor(b);
          if (aCount !== bCount) {
            return bCount - aCount;
          }
          const aIsUser = this.isActiveReaction(a.key);
          const bIsUser = this.isActiveReaction(b.key);
          if (aIsUser !== bIsUser) {
            return aIsUser ? -1 : 1;
          }
          return a._order - b._order;
        })
        .map(({ _order, ...reaction }) => reaction);
    },
    topReactions() {
      return this.orderedReactions.slice(0, 8);
    },
    restReactions() {
      return this.orderedReactions.slice(8);
    },
  },
  watch: {
    isMenuOpen(next) {
      if (next) {
        this.menuOpenInternal = true;
      }
    },
    userReaction: {
      immediate: true,
      handler(next) {
        this.userReactionInternal = this.normalizeReactionKey(next);
      },
    },
    sceneCounts: {
      immediate: true,
      deep: true,
      handler(next) {
        if (!next || typeof next !== "object") {
          this.countsInternal = {};
          return;
        }
        this.countsInternal = { ...next };
      },
    },
  },
  mounted() {
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener(
      "album-reactions-snapshot",
      this.handleReactionSnapshot
    );
  },
  beforeDestroy() {
    if (typeof window === "undefined") {
      return;
    }
    window.removeEventListener(
      "album-reactions-snapshot",
      this.handleReactionSnapshot
    );
  },
  methods: {
    normalizeReactionKey(rawKey) {
      if (rawKey === null || rawKey === undefined) {
        return "";
      }
      return String(rawKey)
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
    },
    countFor(reaction) {
      const key = this.normalizeReactionKey(reaction && reaction.key);
      if (
        key &&
        this.countsInternal &&
        this.countsInternal[key] !== undefined
      ) {
        return this.countsInternal[key];
      }
      if (key && this.sceneCounts && this.sceneCounts[key] !== undefined) {
        return this.sceneCounts[key];
      }
      return (reaction && reaction.count) || 0;
    },
    isActiveReaction(reactionKey) {
      return (
        this.normalizeReactionKey(reactionKey) === this.effectiveUserReaction
      );
    },
    handleReactionSnapshot(event) {
      const detail = (event && event.detail) || {};
      const countsByScene = detail.reactionCountsByScene;
      const userByScene = detail.userReactionsByScene;
      const scene = parseInt(this.sceneNumber, 10);
      if (!Number.isFinite(scene)) {
        return;
      }
      if (countsByScene && typeof countsByScene === "object") {
        this.countsInternal = { ...(countsByScene[scene] || {}) };
      }
      if (userByScene && typeof userByScene === "object") {
        this.userReactionInternal = this.normalizeReactionKey(
          userByScene[scene]
        );
      }
    },
    onToggleReaction(reactionKey) {
      this.$emit("toggle-reaction", this.sceneNumber, reactionKey);
    },
    onToggleMenu() {
      this.menuOpenInternal = !this.menuOpenInternal;
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
  opacity: 0.65;
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
