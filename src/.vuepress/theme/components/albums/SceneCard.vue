<template>
  <article class="cbr-media">
    <img
      v-if="scene.slide_svg"
      class="scene-image scene-image--svg"
      :class="{ civdeathImage: scene.death }"
      :src="$assetUrl(scene.slide_svg)"
      loading="lazy"
      decoding="async"
      tabindex="0"
      :alt="sceneAlt"
    />
    <img
      v-else
      :src="$assetUrl(scene.slide_url)"
      loading="lazy"
      decoding="async"
      tabindex="0"
      :alt="sceneAlt"
      class="scene-image"
      :class="{ civdeathImage: scene.death }"
    />
    <div class="text" :class="{ civdeathBorder: scene.death }">
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
        :class="{ reporter: scene.reporter }"
      ></div>
      <ReactionPanel
        :scene-number="sceneNumber"
        :reaction-display="reactionDisplay"
        :user-reaction="userReaction"
        :auth-user="authUser"
        :is-menu-open="isMenuOpen"
        @toggle-reaction="onToggleReaction"
        @toggle-menu="onToggleMenu"
      />
    </div>
  </article>
</template>

<script>
import BookmarkButton from "../../layout/BookmarkButton.vue";
import ReactionPanel from "./ReactionPanel.vue";

export default {
  name: "SceneCard",
  components: {
    BookmarkButton,
    ReactionPanel,
  },
  props: {
    scene: {
      type: Object,
      required: true,
    },
    sceneAlt: {
      type: String,
      default: "",
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
.scene-image {
  display: block;
  inline-size: 100%;
  line-height: 0;
  transition: box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out;
}
.scene-image--svg {
  block-size: auto;
  min-block-size: 12rem;
  border: none;
}
.scene-image:hover {
  box-shadow: 0 3px 0 0 #c39a1c;
  transform: scale(1.007);
}
.text {
  padding: 2rem 2rem 1rem;
  border-block-end: 3px solid color-mix(in srgb, var(--accent-color), black 20%);
  background-color: #1a1a1a;
}
.scene-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.6rem;
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
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
@media (max-width: 799px) {
  .scene-heading {
    margin: 0.5rem 0 0;
    font-size: 1.2rem;
  }
  .scene-image {
    box-shadow: none;
  }
  .text {
    padding: 0.5rem;
  }
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
