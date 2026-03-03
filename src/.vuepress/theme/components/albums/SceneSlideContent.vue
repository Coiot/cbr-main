<template>
  <article class="h-narration" style="flex-direction: column">
    <h3 v-if="scene.scene_number == scene.scene_title" class="scene-heading">
      <span class="scene-title">{{ displaySceneNumber }}</span>
      <BookmarkButton
        :active="bookmarked"
        :aria-label="bookmarkAria"
        :title="bookmarkAria"
        @toggle="onToggleBookmark"
      />
    </h3>
    <h3 v-else-if="scene.scene_title_html" class="scene-heading">
      <span class="scene-title">
        {{ displaySceneNumber }}:
        <span v-html="scene.scene_title_html"></span>
      </span>
      <BookmarkButton
        :active="bookmarked"
        :aria-label="bookmarkAria"
        :title="bookmarkAria"
        @toggle="onToggleBookmark"
      />
    </h3>
    <h3 v-else-if="scene.scene_title" class="scene-heading">
      <span class="scene-title">
        {{ displaySceneNumber }}:
        {{ scene.scene_title }}
      </span>
      <BookmarkButton
        :active="bookmarked"
        :aria-label="bookmarkAria"
        :title="bookmarkAria"
        @toggle="onToggleBookmark"
      />
    </h3>
    <h3 v-else class="scene-heading">
      <span class="scene-title">{{ displaySceneNumber }}</span>
      <BookmarkButton
        :active="bookmarked"
        :aria-label="bookmarkAria"
        :title="bookmarkAria"
        @toggle="onToggleBookmark"
      />
    </h3>
    <div class="narrations" v-html="scene.narration" tabindex="0"></div>
    <div
      class="narrations"
      v-if="scene.reporter"
      v-html="scene.reporter"
      tabindex="0"
      v-bind:class="{ reporter: scene.reporter }"
    ></div>
    <ReactionPanel
      :key="`reaction-panel-${sceneNumber}-${authStateKey}-${reactionVersion}`"
      :scene-number="sceneNumber"
      :reaction-display="reactionDisplay"
      :scene-counts="sceneCounts"
      :user-reaction="userReaction"
      :auth-user="authUser"
      :is-menu-open="isMenuOpen"
      @toggle-reaction="onToggleReaction"
      @toggle-menu="onToggleMenu"
    />
  </article>
</template>

<script>
import BookmarkButton from "../../layout/BookmarkButton.vue";
import ReactionPanel from "./ReactionPanel.vue";

export default {
  name: "SceneSlideContent",
  components: {
    BookmarkButton,
    ReactionPanel,
  },
  props: {
    scene: {
      type: Object,
      required: true,
    },
    sceneNumber: {
      type: Number,
      required: true,
    },
    bookmarked: {
      type: Boolean,
      default: false,
    },
    bookmarkAria: {
      type: String,
      default: "",
    },
    reactionDisplay: {
      type: Object,
      required: true,
    },
    sceneCounts: {
      type: Object,
      default: () => ({}),
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
    reactionVersion: {
      type: [String, Number],
      default: 0,
    },
  },
  computed: {
    authStateKey() {
      return this.authUser && this.authUser.id ? this.authUser.id : "guest";
    },
    displaySceneNumber() {
      const raw =
        this.scene && this.scene.scene_number !== undefined
          ? this.scene.scene_number
          : "";
      const text = String(raw).trim();
      if (!/^[0-9]+$/.test(text)) {
        return raw;
      }
      const parsed = Number.parseInt(text, 10);
      return Number.isFinite(parsed) ? parsed : raw;
    },
  },
  methods: {
    onToggleBookmark() {
      this.$emit("toggle-bookmark");
    },
    onToggleReaction(sceneNumber, reactionKey) {
      this.$emit("toggle-reaction", sceneNumber, reactionKey);
    },
    onToggleMenu(sceneNumber) {
      this.$emit("toggle-menu", sceneNumber);
    },
  },
};
</script>

<style scoped>
.h-narration {
  position: relative;
  padding-block: 0.5rem;
  padding-inline: 1rem;
  border-block-end: 3px solid color-mix(in srgb, var(--accent-color), black 20%);
  color: var(--panel-text-color);
  background-color: var(--panel-bg-color);
}
.h-narration h3 {
  font-size: 1.2rem;
  margin-block: 1rem 0.5rem;
}
.scene-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.6rem;
}
.scene-title {
  display: inline-block;
}
.narrations {
  font-size: 1.3rem;
  font-weight: 500;
  line-height: 1.25;
  text-shadow: var(--narration-shadow);
  padding: 0;
  margin: 0;
}
:deep(.narrations details) {
  margin: 0.75rem 0 0;
  border: 1px solid color-mix(in srgb, var(--accent-color), transparent 72%);
  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--panel-bg-color), white 4%);
  overflow: hidden;
}
:deep(.narrations details > summary) {
  position: relative;
  padding: 0.55rem 0.85rem;
  font-weight: 700;
  text-shadow: none;
  letter-spacing: 0.01em;
  cursor: pointer;
  list-style: none;
  background: color-mix(in srgb, var(--accent-color), transparent 88%);
  transition: background-color 0.2s ease;
}
:deep(.narrations details > summary:hover),
:deep(.narrations details[open] > summary) {
  background: color-mix(in srgb, var(--accent-color), transparent 82%);
}
:deep(.narrations details > summary::-webkit-details-marker) {
  display: none;
}
:deep(.narrations details > summary::before) {
  content: "▸";
  display: inline-block;
  margin-inline-end: 0.45rem;
  color: color-mix(in srgb, var(--accent-color), white 24%);
  transform-origin: 45% 55%;
  transition: transform 0.2s ease;
}
:deep(.narrations details[open] > summary::before) {
  transform: rotate(90deg);
}
:deep(.narrations details > :not(summary)) {
  margin: 0;
  padding: 0.7rem 0.85rem 0.85rem;
}
.reporter {
  font-size: 1.1rem;
  font-weight: 400;
}
.h-narration .narrations {
  max-height: 16rem;
  overflow: auto;
  padding: 0 !important;
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.6 !important;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 191, 70, 0.7) rgba(255, 255, 255, 0.08);
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}
.h-narration .narrations::-webkit-scrollbar {
  inline-size: 8px;
}
.h-narration .narrations::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}
.h-narration .narrations::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 191, 70, 0.7);
}
@media (max-width: 799px) {
  .narrations {
    font-size: 1rem;
    word-break: break-word;
    margin: 0;
    border-block-start: 0;
  }
  :deep(.narrations details > summary) {
    padding: 0.5rem 0.75rem;
  }
  :deep(.narrations details > :not(summary)) {
    padding: 0.6rem 0.75rem 0.75rem;
  }
  .reporter {
    padding-block-end: 1rem;
  }
}
</style>
