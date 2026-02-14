<template>
  <article class="h-narration" style="flex-direction: column">
    <h3 v-if="scene.scene_number == scene.scene_title" class="scene-heading">
      <span class="scene-title">{{ scene.scene_number }}</span>
      <BookmarkButton
        :active="bookmarked"
        :aria-label="bookmarkAria"
        :title="bookmarkAria"
        @toggle="onToggleBookmark"
      />
    </h3>
    <h3 v-else-if="scene.scene_title_html" class="scene-heading">
      <span class="scene-title">
        {{ scene.scene_number }}:
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
        {{ scene.scene_number }}:
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
      <span class="scene-title">{{ scene.scene_number }}</span>
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
      type: Number,
      default: 0,
    },
  },
  computed: {
    authStateKey() {
      return this.authUser && this.authUser.id ? this.authUser.id : "guest";
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
  background-color: #1a1a1a;
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
  text-shadow: 2px 2px #08201d;
  padding: 0;
  margin: 0;
}
.reporter {
  font-size: 1.1rem;
  font-weight: 400;
}
.h-narration .narrations {
  max-height: 9.7rem;
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
  .reporter {
    padding-block-end: 1rem;
  }
}
</style>
