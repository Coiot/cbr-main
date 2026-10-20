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
        :aria-haspopup="!authUser ? 'dialog' : null"
        :aria-expanded="!authUser ? accountOpen && accountAnchorKey === reaction.key : null"
        :aria-controls="accountOpen && accountAnchorKey === reaction.key ? accountPopoverId : null"
        @click.stop="onToggleReaction(reaction.key, $event)"
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
        :aria-haspopup="!authUser ? 'dialog' : null"
        :aria-expanded="!authUser ? accountOpen && accountAnchorKey === reaction.key : null"
        :aria-controls="accountOpen && accountAnchorKey === reaction.key ? accountPopoverId : null"
        @click.stop="onToggleReaction(reaction.key, $event)"
      >
        <span class="reaction-emoji">{{ reaction.emoji }}</span>
        <span class="reaction-count">{{ countFor(reaction) }}</span>
      </button>
    </div>
    <div v-if="showSignupPrompt" class="reaction-signup">
      <p class="reaction-signup-title">Have a favourite moment?</p>
      <p>Create an account to react to scenes, revisit your favourites in Spotlight, and sync your reading progress.</p>
      <button type="button" class="reaction-signup-button" aria-haspopup="dialog"
        :aria-expanded="accountOpen && accountAnchorKey === 'signup'" :aria-controls="accountOpen ? accountPopoverId : null"
        @click.stop="openAccount($event, 'signup')">Create an account or sign in</button>
    </div>
    <ReactionSignInPopover v-if="accountOpen && !authUser" :anchor="accountAnchor" :scene-number="sceneNumber"
      :popover-id="accountPopoverId" @close="accountOpen = false" />
  </div>
</template>

<script>
import { markRaw, useId } from 'vue';
import ReactionSignInPopover from './ReactionSignInPopover.vue';

export default {
  name: "ReactionPanel",
  components: { ReactionSignInPopover },
  setup() { return { accountPopoverId: `reaction-signin-${useId()}` }; },
  data() {
    return {
      menuOpenInternal: false,
      accountOpen: false,
      accountAnchor: null,
      accountAnchorKey: null,
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
    showSignupPrompt() {
      return !this.authUser && this.sceneNumber === 1;
    },
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
    authUser(next) { if (next) this.accountOpen = false; },
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
  beforeUnmount() {
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
    openAccount(event, key) {
      const anchor = event?.currentTarget;
      if (!anchor) return;
      this.accountAnchor = markRaw(anchor);
      this.accountAnchorKey = key;
      this.accountOpen = true;
    },
    onToggleReaction(reactionKey, event) {
      if (!this.authUser) {
        this.openAccount(event, reactionKey);
        return;
      }
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
  border-block-start: 1px solid var(--panel-border-color);
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
  color: var(--panel-muted-color);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.reaction-more:hover {
  border-color: rgba(255, 191, 70, 0.8);
  color: var(--panel-text-color);
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
  background: var(--panel-bg-elevated-color);
  font-size: 0.9rem;
  color: var(--panel-text-color);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.reaction-pill:hover {
  border-color: rgba(255, 191, 70, 0.9);
  color: var(--panel-text-color);
  background: var(--panel-bg-soft-color);
}
.reaction-pill.active {
  border-color: #ffbf46;
  background: #ffbf46;
  color: #1a1a1a;
}
.reaction-pill.active .reaction-count {
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
  color: var(--panel-muted-color);
}
.reaction-signup {
  flex-basis: 100%;
  padding: 0.9rem 1rem;
  background: var(--panel-bg-soft-color);
  color: var(--panel-text-color);
  border: 1px solid var(--panel-border-color);
  border-inline-start: 3px solid var(--accent-color);
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.5;
}
.reaction-signup p { margin: 0; line-height: 1.5; }
.reaction-signup .reaction-signup-title { margin-block-end: 0.3rem; font-weight: 800; }
.reaction-signup-button {
  margin-block-start: 0.7rem;
  min-height: 44px;
  padding: 0.5rem 1rem;
  border: 1px solid var(--accent-color);
  border-radius: 999px;
  background: var(--accent-color);
  color: #1a1a1a;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}
.reaction-signup-button:hover { filter: brightness(1.05); }
.reaction-signup-button:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 3px; }
</style>
