<template>
  <transition name="fade">
    <div class="blog">
      <AlbumsNav :prev="prev" :next="next" />

      <h1 class>
        {{ $page.frontmatter.title }}
        <span>– {{ $page.frontmatter.pr }}</span>
      </h1>

      <div v-if="resumeScene" class="resume-banner">
        <button type="button" class="resume-chip" @click="resumeToScene">
          Resume at Scene {{ resumeScene }}
        </button>
      </div>

      <div class="albumInfo">
        <div class="column" tabindex="0">
          <Label class="label">Release Date:</Label>
          <p>
            <span class="value">{{ $page.frontmatter.release_date }}</span>
          </p>
        </div>

        <div class="column" tabindex="0">
          <Label class="label">Narrated by:</Label>
          <p>
            <span class="value">{{ $page.frontmatter.narrated_by }}</span>
          </p>
        </div>

        <div v-if="$page.frontmatter.starting_turn" class="column" tabindex="0">
          <Label class="label">Starting Turn:</Label>
          <p>
            <span class="value">{{ $page.frontmatter.starting_turn }}</span>
          </p>
        </div>

        <div
          v-if="$page.frontmatter.audio_narration"
          class="column"
          tabindex="0"
        >
          <Label class="label">Video:</Label>
          <p>
            <span class="value">
              <a
                :href="$page.frontmatter.audio_narration"
                target="_blank"
                rel="noopener noreferrer"
                >Audio Narration</a
              >
            </span>
          </p>
          <p v-if="$page.frontmatter.fullvideo">
            <span class="value">
              <a
                :href="$page.frontmatter.fullvideo"
                target="_blank"
                rel="noopener noreferrer"
                >Full In-Game Turns</a
              >
            </span>
          </p>
        </div>
      </div>

      <h2 class="scenenumber" v-if="$page.frontmatter.description">Abstract</h2>
      <p class="abstract" tabindex="0" v-if="$page.frontmatter.description">
        {{ $page.frontmatter.description }}
      </p>

      <div class="episode-tools" v-if="hasScenes">
        <EpisodeViewControls
          :current-view-label="currentViewLabel"
          :is-vertical-view="isVerticalView"
          :is-horizontal-view="isHorizontalView"
          :is-cinematic-fullscreen="isCinematicFullscreen"
          :cinematic-narration-layout="cinematicNarrationLayout"
          @set-view-mode="setViewMode"
          @toggle-fullscreen="toggleCinematicFullscreen"
          @set-layout="setCinematicNarrationLayout"
        />
        <SceneJumpControl
          v-model.number="jumpToScene"
          :scene-count="sceneCount"
          select-id="scene-jump"
          @go="goToScene"
        />
      </div>

      <div v-if="hasScenes" class="scene-timeline">
        <div
          ref="timelineTrack"
          class="timeline-track"
          :style="{ '--progress': timelineProgress + '%' }"
          @keydown="handleTimelineKeydown"
        >
          <button
            v-for="(scene, index) in sceneTimeline"
            :key="scene.key"
            type="button"
            class="timeline-dot"
            :tabindex="index === activeSceneIndex ? 0 : -1"
            :class="{
              active: index === activeSceneIndex,
              completed: index < activeSceneIndex,
              bookmarked: isBookmarked(index),
              death: scene.hasDeath,
              reporter: scene.hasReporter,
            }"
            :aria-label="sceneTooltip(scene, index)"
            :title="sceneTooltip(scene, index)"
            @click="jumpToIndex(index)"
          ></button>
        </div>
        <!-- <div class="timeline-legend">
          <span class="legend-item">
            <span class="legend-dot bookmarked"></span>Bookmark
          </span>
          <span class="legend-item">
            <span class="legend-dot death"></span>Death
          </span>
          <span class="legend-item">
            <span class="legend-dot reporter"></span>Reporter
          </span>
        </div> -->
      </div>

      <div v-if="isToggle === true" :key="`slides-${$page.path}`">
        <vueper-slides
          ref="vueperslides2"
          @slide="handleThumbSlide"
          :slide-ratio="1 / 8"
          :dragging-distance="10"
          :visible-slides="8"
          fixed-height="80px"
          :arrows="false"
          :bullets="false"
          class="first"
          style="margin-bottom: 1rem"
        >
          <vueper-slide
            v-for="(scene, index) in $page.frontmatter.scenes"
            :image="$assetUrl(scene.slide_url)"
            :key="sceneKey(scene, index)"
            @keyup.left="previous()"
            @keyup.right="next()"
            @click.native="
              $refs.vueperslides1 && $refs.vueperslides1.goToSlide(index)
            "
            style="margin: 0 0.2rem"
          ></vueper-slide>
        </vueper-slides>
        <vueper-slides
          ref="vueperslides1"
          @slide="handlePrimarySlide"
          :slide-content-outside="'bottom'"
          arrows-inside
          :bullets="true"
          :slide-ratio="9 / 16"
          fractions
          :touchable="false"
          class="cbr-media"
          :transition-speed="900"
          style="background-size: contain"
        >
          <vueper-slide
            v-for="(scene, index) in $page.frontmatter.scenes"
            :image="$assetUrl(scene.slide_url)"
            :key="`primary-${sceneKey(scene, index)}`"
            :title="scene.scene_title"
            :class="{ civdeathBorder: scene.death }"
          >
            <template v-slot:content>
              <SceneSlideContent
                :key="`slide-content-${sceneKey(
                  scene,
                  index
                )}-${reactionSceneVersion(sceneNumber(index))}`"
                :scene="scene"
                :scene-number="sceneNumber(index)"
                :bookmarked="isBookmarked(index)"
                :bookmark-aria="bookmarkAria(index)"
                :reaction-display="reactionDisplay(sceneNumber(index))"
                :scene-counts="sceneReactionCounts(sceneNumber(index))"
                :user-reaction="userReaction(sceneNumber(index))"
                :auth-user="authUser"
                :is-menu-open="isReactionMenuOpen(sceneNumber(index))"
                :reaction-version="reactionSceneVersion(sceneNumber(index))"
                @toggle-bookmark="bookmarkScene(index)"
                @toggle-reaction="toggleReaction"
                @toggle-menu="toggleReactionMenu"
              />
            </template>
          </vueper-slide>
        </vueper-slides>
      </div>
      <CinematicFullscreen
        ref="cinematicOverlay"
        :scenes="$page.frontmatter.scenes || []"
        :is-fullscreen="isCinematicFullscreen"
        :narration-layout="cinematicNarrationLayout"
        :active-scene="activeScene"
        :active-scene-index="activeSceneIndex"
        :active-scene-number="sceneNumber(activeSceneIndex)"
        :active-bookmarked="isBookmarked(activeSceneIndex)"
        :active-bookmark-aria="bookmarkAria(activeSceneIndex)"
        :active-reaction-display="
          reactionDisplay(sceneNumber(activeSceneIndex))
        "
        :active-scene-counts="
          sceneReactionCounts(sceneNumber(activeSceneIndex))
        "
        :active-user-reaction="userReaction(sceneNumber(activeSceneIndex))"
        :active-menu-open="isReactionMenuOpen(sceneNumber(activeSceneIndex))"
        :auth-user="authUser"
        :scene-key="sceneKey"
        :reaction-version="reactionSceneVersion(sceneNumber(activeSceneIndex))"
        @set-layout="setCinematicNarrationLayout"
        @toggle-bookmark="bookmarkScene(activeSceneIndex)"
        @toggle-reaction="toggleReaction"
        @toggle-menu="toggleReactionMenu"
        @slide-change="handlePrimarySlide"
        @fullscreen-change="handleCinematicFullscreenChange"
      />
      <div v-if="isToggle === false" :key="`scenes-${$page.path}`">
        <section class="scenes">
          <SceneCard
            v-for="(scene, index) in $page.frontmatter.scenes"
            :key="sceneKey(scene, index)"
            :id="sceneAnchor(index)"
            :scene="scene"
            :scene-alt="sceneAlt(scene)"
            :scene-number="sceneNumber(index)"
            :bookmarked="isBookmarked(index)"
            :bookmark-aria="bookmarkAria(index)"
            :reaction-display="reactionDisplay(sceneNumber(index))"
            :scene-counts="sceneReactionCounts(sceneNumber(index))"
            :user-reaction="userReaction(sceneNumber(index))"
            :auth-user="authUser"
            :is-menu-open="isReactionMenuOpen(sceneNumber(index))"
            :reaction-version="reactionSceneVersion(sceneNumber(index))"
            @toggle-bookmark="bookmarkScene(index)"
            @toggle-reaction="toggleReaction"
            @toggle-menu="toggleReactionMenu"
          />
        </section>
      </div>

      <Content class="custom" />

      <div
        v-if="shouldTrackSnapshot"
        ref="snapshotSentinel"
        class="episode-snapshot-sentinel"
        aria-hidden="true"
      ></div>

      <CommentsSection
        v-if="shouldShowComments"
        :auth-user="authUser"
        :can-supporter-comment="canSupporterComment"
        :comment-window-open="commentWindowOpen"
        :comment-window-label="commentWindowLabel"
        :user-comment="userComment"
        :comment-editing="commentEditing"
        :comment-draft="commentDraft"
        :comment-max-length="commentMaxLength"
        :comment-saving="commentSaving"
        :can-submit-comment="canSubmitComment"
        :comment-preview="commentPreview"
        :comment-message="commentMessage"
        :comment-message-type="commentMessageType"
        :comments-loading="commentsLoading"
        :comments="comments"
        :comment-civ-style="commentCivStyle"
        @update:commentDraft="commentDraft = $event"
        @start-edit="startEditComment"
        @delete-comment="deleteComment"
        @preview-comment="previewComment"
        @submit-comment="submitComment"
        @cancel-edit="cancelEditComment"
      />

      <EpisodeMapSnapshot
        v-if="shouldRenderSnapshot"
        :snapshot-path="episodeSnapshotPath"
        :snapshot-title="episodeSnapshotTitle"
        :use-base-snapshot="episodeSnapshotIsBase"
      />

      <AlbumsNav :prev="prev" :next="next" />
    </div>
  </transition>
</template>

<script>
import { normalize } from "../util.js";
const VueperSlides = () =>
  import("vueperslides").then((mod) => mod.VueperSlides);
const VueperSlide = () => import("vueperslides").then((mod) => mod.VueperSlide);
import "vueperslides/dist/vueperslides.css";
import SceneCard from "../components/albums/SceneCard.vue";
import SceneSlideContent from "../components/albums/SceneSlideContent.vue";
import CinematicFullscreen from "../components/albums/CinematicFullscreen.vue";
import EpisodeViewControls from "../components/albums/EpisodeViewControls.vue";
import SceneJumpControl from "../components/albums/SceneJumpControl.vue";
import CommentsSection from "../components/albums/CommentsSection.vue";
import AlbumsNav from "../components/albums/AlbumsNav.vue";
import EpisodeMapSnapshot from "../components/albums/EpisodeMapSnapshot.vue";
import { normalizeOwnerKey, OWNER_COLOR_MAP } from "../../data/civColors.mjs";
import {
  getSupabaseClient,
  ensureProfileRow,
  checkSupporterAccess,
  SUPABASE_ALBUM_PROGRESS_TABLE,
  SUPABASE_ALBUM_REACTIONS_TABLE,
  SUPABASE_ALBUM_COMMENTS_TABLE,
} from "../supabaseClient";

const pageDir = (path) => {
  const normalized = normalize(path).replace(/\/$/, "");
  const parts = normalized.split("/");
  parts.pop();
  return parts.join("/") || "/";
};

const REACTION_POLL_INTERVAL = 30000;
const DEFAULT_REACTION_OPTIONS = [
  { key: "smart", label: "Smart", emoji: "🧠" },
  { key: "clap", label: "Clap", emoji: "👏" },
  { key: "mindblown", label: "MindBlown", emoji: "🤯" },
  { key: "pray", label: "Pray", emoji: "🙏" },
  { key: "fire", label: "Fire", emoji: "🔥" },
  { key: "facepalm", label: "FacePalm", emoji: "🤦" },
  { key: "popcorn", label: "Popcorn", emoji: "🍿" },
  { key: "star", label: "Star", emoji: "⭐" },
  { key: "salt", label: "Salt", emoji: "🧂" },
  { key: "hype", label: "Hype", emoji: "🚀" },
  { key: "heart", label: "Heart", emoji: "❤️" },
  { key: "laugh", label: "Laugh", emoji: "😂" },
  { key: "stress", label: "Stress", emoji: "😰" },
  { key: "scared", label: "Scared", emoji: "😱" },
  { key: "tears", label: "Tears", emoji: "😭" },
  { key: "rage", label: "Rage", emoji: "😡" },
  { key: "rip", label: "RIP", emoji: "🪦" },
];
const COMMENT_WINDOW_DAYS = 7;
const COMMENT_MAX_LENGTH = 600;
const COMMENT_FALLBACK_PRIMARY = "#6c6c6c";
const COMMENT_FALLBACK_SECONDARY = "#d1c3a1";
const SEASON_FIVE_COMMENT_CUTOFF = new Date(2026, 1, 11, 23, 59, 59, 999);
const SEASON_FIVE_COMMENT_LABEL = new Date(2026, 1, 11);
const RESUME_SYNC_DEBOUNCE = 4000;
const CINEMATIC_NARRATION_LAYOUT_KEY = "albumsCinematicNarrationLayout";
const normalizeEpisodeNumber = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  const raw = String(value).trim();
  if (!raw) {
    return "";
  }
  if (raw.includes(".")) {
    const numeric = Number.parseFloat(raw);
    if (!Number.isFinite(numeric)) {
      return "";
    }
    return String(numeric);
  }
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  return String(numeric);
};

export default {
  name: "PR",
  data() {
    return {
      isToggle: false,
      jumpToScene: 1,
      bookmarkedScene: null,
      lastSeenScene: null,
      activeSceneIndex: 0,
      cinematicNarrationLayout: "side",
      isCinematicFullscreen: false,
      copiedScene: null,
      timelineFocusEnabled: false,
      timelineFocusTimeoutId: null,
      supabase: null,
      authUser: null,
      authSession: null,
      authProfile: null,
      reactionCounts: {},
      userReactions: {},
      reactionLoading: false,
      reactionUpdating: false,
      reactionMenuOpen: {},
      comments: [],
      commentsLoading: false,
      commentDraft: "",
      commentPreview: null,
      commentMessage: "",
      commentMessageType: "info",
      commentSaving: false,
      commentEditing: false,
      favoriteCiv: "",
      customFlair: "",
      siblingPagesCache: [],
      sceneTimelineCache: [],
      snapshotInView: false,
    };
  },
  created() {
    this.rebuildPageCaches();
  },
  components: {
    VueperSlides,
    VueperSlide,
    SceneCard,
    SceneSlideContent,
    CinematicFullscreen,
    EpisodeViewControls,
    SceneJumpControl,
    CommentsSection,
    AlbumsNav,
    EpisodeMapSnapshot,
  },
  computed: {
    siblingPages() {
      return this.siblingPagesCache;
    },
    prev() {
      const index = this.siblingPages.findIndex(
        (page) => page.path === this.$page.path
      );
      if (index > 0) {
        return this.siblingPages[index - 1];
      }
    },
    next() {
      const index = this.siblingPages.findIndex(
        (page) => page.path === this.$page.path
      );
      if (index !== -1 && index < this.siblingPages.length - 1) {
        return this.siblingPages[index + 1];
      }
    },
    hasScenes() {
      return (
        this.$page.frontmatter.scenes &&
        this.$page.frontmatter.scenes.length > 0
      );
    },
    sceneCount() {
      return this.hasScenes ? this.$page.frontmatter.scenes.length : 0;
    },
    sceneTimeline() {
      return this.sceneTimelineCache;
    },
    currentViewLabel() {
      return this.isToggle ? "Horizontal" : "Vertical";
    },
    isHorizontalView() {
      return this.isToggle;
    },
    isVerticalView() {
      return !this.isToggle;
    },
    activeScene() {
      if (!this.hasScenes) {
        return null;
      }
      return (
        this.$page.frontmatter.scenes[this.activeSceneIndex] ||
        this.$page.frontmatter.scenes[0] ||
        null
      );
    },
    timelineProgress() {
      if (this.sceneCount <= 1) {
        return 0;
      }
      return (this.activeSceneIndex / (this.sceneCount - 1)) * 100;
    },
    bookmarkKey() {
      return `albumsBookmark:${this.$page.path}`;
    },
    resumeKey() {
      return `albumsResume:${this.$page.path}`;
    },
    resumeScene() {
      return this.bookmarkedScene || this.lastSeenScene;
    },
    useCloud() {
      return Boolean(this.supabase && this.authUser);
    },
    reactionOptions() {
      const options =
        this.$site &&
        this.$site.themeConfig &&
        this.$site.themeConfig.reactions;
      return Array.isArray(options) && options.length
        ? options
        : DEFAULT_REACTION_OPTIONS;
    },
    isSeasonFive() {
      const edition =
        (this.$page &&
          this.$page.frontmatter &&
          (this.$page.frontmatter.edition || this.$page.frontmatter.pr)) ||
        "";
      const normalized = String(edition).trim().toLowerCase();
      return (
        normalized === "s5" ||
        normalized === "season5" ||
        normalized === "season 5" ||
        normalized.includes("s5")
      );
    },
    episodeSnapshotNumber() {
      if (!this.isSeasonFive) {
        return "";
      }
      const frontmatter = (this.$page && this.$page.frontmatter) || {};
      const explicit =
        frontmatter.episode_number ||
        frontmatter.episodeNumber ||
        frontmatter.episode;
      if (explicit !== undefined && explicit !== null) {
        return normalizeEpisodeNumber(explicit);
      }
      const title = frontmatter.title || "";
      const match = String(title).match(/episode\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (match) {
        return normalizeEpisodeNumber(match[1]);
      }
      const prLabel = frontmatter.pr || "";
      const prMatch = String(prLabel).match(/([0-9]+(?:\.[0-9]+)?)/);
      if (!prMatch) {
        return "";
      }
      return normalizeEpisodeNumber(prMatch[1]);
    },
    episodeSnapshotPath() {
      if (!this.isSeasonFive || !this.episodeSnapshotNumber) {
        return "";
      }
      const safeNumber = this.episodeSnapshotNumber.replace(/\./g, "-");
      return `/community/snapshots/s5-episode-${safeNumber}.json`;
    },
    episodeSnapshotIsBase() {
      return this.isSeasonFive && this.episodeSnapshotNumber === "0";
    },
    episodeSnapshotTitle() {
      if (!this.episodeSnapshotNumber) {
        return "Episode Map Snapshot";
      }
      return `Episode ${this.episodeSnapshotNumber} Snapshot`;
    },
    hasEpisodeSnapshot() {
      return Boolean(this.episodeSnapshotPath || this.episodeSnapshotIsBase);
    },
    isFinalScene() {
      if (!this.sceneCount) {
        return true;
      }
      return this.activeSceneIndex >= this.sceneCount - 1;
    },
    shouldTrackSnapshot() {
      return this.hasEpisodeSnapshot && !this.isToggle && !this.snapshotInView;
    },
    shouldRenderSnapshot() {
      if (!this.hasEpisodeSnapshot) {
        return false;
      }
      if (this.isToggle) {
        return this.isFinalScene;
      }
      return this.snapshotInView;
    },
    showComments() {
      return Boolean(
        this.$page && this.$page.frontmatter && this.$page.frontmatter.pr
      );
    },
    shouldShowComments() {
      return this.showComments && (!this.isToggle || this.isFinalScene);
    },
    commentPostedAt() {
      const raw =
        (this.$page && this.$page.frontmatter && this.$page.frontmatter.date) ||
        null;
      const date = raw ? new Date(raw) : null;
      return date && Number.isFinite(date.getTime()) ? date : null;
    },
    commentWindowEndsAt() {
      if (!this.showComments) {
        return null;
      }
      if (this.isSeasonFive) {
        if (!this.commentPostedAt) {
          return SEASON_FIVE_COMMENT_CUTOFF;
        }
        const regularEnd = new Date(
          this.commentPostedAt.getTime() +
            COMMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
        );
        return regularEnd > SEASON_FIVE_COMMENT_CUTOFF
          ? regularEnd
          : SEASON_FIVE_COMMENT_CUTOFF;
      }
      if (!this.commentPostedAt) {
        return null;
      }
      return new Date(
        this.commentPostedAt.getTime() +
          COMMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
      );
    },
    commentWindowOpen() {
      if (!this.showComments) {
        return false;
      }
      if (!this.commentWindowEndsAt) {
        return true;
      }
      return Date.now() <= this.commentWindowEndsAt.getTime();
    },
    commentWindowLabel() {
      if (!this.showComments) {
        return "";
      }
      if (this.isSeasonFive) {
        return SEASON_FIVE_COMMENT_LABEL.toLocaleDateString();
      }
      if (!this.commentWindowEndsAt) {
        return "";
      }
      return this.commentWindowEndsAt.toLocaleDateString();
    },
    canSupporterComment() {
      return Boolean(this.authProfile && this.authProfile.can_edit);
    },
    userComment() {
      if (!this.authUser) {
        return null;
      }
      return (
        this.comments.find((comment) => comment.user_id === this.authUser.id) ||
        null
      );
    },
    commentMaxLength() {
      return COMMENT_MAX_LENGTH;
    },
    canSubmitComment() {
      if (!this.commentPreview || !this.commentPreview.message) {
        return false;
      }
      const current = String(this.commentDraft || "").trim();
      return current && this.commentPreview.message === current;
    },
  },
  watch: {
    "$page.path"() {
      this.rebuildPageCaches();
      this.jumpToScene = 1;
      this.bookmarkedScene = null;
      this.lastSeenScene = null;
      this.activeSceneIndex = 0;
      this.isCinematicFullscreen = false;
      this.copiedScene = null;
      this.snapshotInView = false;
      this.teardownSnapshotObserver();
      this.resetReactions();
      this.comments = [];
      this.commentDraft = "";
      this.commentPreview = null;
      this.clearCommentMessage();
      this.commentEditing = false;
      this.$nextTick(() => {
        this.loadBookmark();
        this.loadResume();
        this.loadReactionCounts();
        if (this.showComments) {
          this.loadComments();
        }
        this.cacheSceneElements();
        this.setupSnapshotObserver();
      });
    },
    isToggle() {
      this.$nextTick(() => {
        this.cacheSceneElements();
        if (!this.isToggle) {
          this.updateActiveFromScroll();
        }
        this.setupSnapshotObserver();
      });
    },
    "$route.hash"() {
      this.applyHashScene();
    },
    commentDraft() {
      if (
        this.commentPreview &&
        this.commentPreview.message !== String(this.commentDraft || "").trim()
      ) {
        this.commentPreview = null;
      }
    },
  },
  mounted() {
    if (typeof window === "undefined") {
      return;
    }
    this.initSupabase();
    this.initReactions();
    this.loadLocalUserSettings();
    if (this.showComments) {
      this.loadComments();
    }
    const saved = window.localStorage.getItem("albumsViewMode");
    this.loadCinematicSettings();
    this.setViewMode(saved, { persist: false, emit: false });
    this.loadBookmark();
    this.loadResume();
    this.rebuildPageCaches();
    this.$nextTick(() => {
      this.cacheSceneElements();
      this.applyHashScene();
      this.updateActiveFromScroll();
      this.setupSnapshotObserver();
    });
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("keydown", this.handleKeydown, true);
    window.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    window.addEventListener(
      "albums-bookmark-updated",
      this.handleBookmarkUpdate
    );
    window.addEventListener("user-settings-synced", this.handleSettingsSync);
    window.addEventListener("supabase-auth-session", this.handleExternalAuth);
  },
  beforeDestroy() {
    if (typeof window === "undefined") {
      return;
    }
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("keydown", this.handleKeydown, true);
    window.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    window.removeEventListener(
      "albums-bookmark-updated",
      this.handleBookmarkUpdate
    );
    window.removeEventListener("user-settings-synced", this.handleSettingsSync);
    window.removeEventListener(
      "supabase-auth-session",
      this.handleExternalAuth
    );
    this.teardownSnapshotObserver();
    this.teardownReactions();
    this.teardownSupabase();
    this.flushPendingResume(true);
    if (this._copyTimeout) {
      window.clearTimeout(this._copyTimeout);
    }
    if (this._scrollRaf) {
      window.cancelAnimationFrame(this._scrollRaf);
    }
    if (this._jumpScrollCleanup) {
      this._jumpScrollCleanup();
      this._jumpScrollCleanup = null;
    }
  },
  methods: {
    rebuildPageCaches() {
      this.siblingPagesCache = this.computeSiblingPages();
      this.sceneTimelineCache = this.computeSceneTimeline();
    },
    computeSiblingPages() {
      const dir = pageDir(this.$page.path);
      return this.$site.pages
        .filter((page) => {
          if (page.frontmatter.exclude) {
            return false;
          }
          return pageDir(page.path) === dir;
        })
        .sort((a, b) => {
          const aDate = new Date(a.frontmatter.date || 0);
          const bDate = new Date(b.frontmatter.date || 0);
          return aDate - bDate;
        });
    },
    computeSceneTimeline() {
      if (!this.hasScenes) {
        return [];
      }
      return this.$page.frontmatter.scenes.map((scene, index) => ({
        index,
        key: `${this.sceneKey(scene, index)}-${index}`,
        number: scene.scene_number || index + 1,
        hasDeath: Boolean(scene.death),
        hasReporter: Boolean(scene.reporter),
      }));
    },
    setCommentMessage(message, type = "info") {
      this.commentMessage = message;
      this.commentMessageType = type;
    },
    clearCommentMessage() {
      this.commentMessage = "";
      this.commentMessageType = "info";
    },
    initSupabase() {
      if (this.supabase || typeof window === "undefined") {
        return;
      }
      this.supabase = getSupabaseClient();
      if (!this.supabase) {
        return;
      }
      const { data } = this.supabase.auth.onAuthStateChange(
        (_event, session) => {
          this.handleAuthSession(session);
        }
      );
      this._authSubscription = data ? data.subscription : null;
      this.supabase.auth.getSession().then(({ data: sessionData }) => {
        this.handleAuthSession(sessionData ? sessionData.session : null);
      });
    },
    teardownSupabase() {
      if (this._authSubscription) {
        this._authSubscription.unsubscribe();
        this._authSubscription = null;
      }
      if (this._resumeSyncTimer) {
        window.clearTimeout(this._resumeSyncTimer);
        this._resumeSyncTimer = null;
      }
      this._pendingResumeScene = null;
      this.setSessionSceneNumber(this.resumePendingKey(), null);
    },
    handleAuthSession(session) {
      this.authUser = session ? session.user : null;
      this.authSession = session || null;
      this.authProfile = null;
      this.loadReactionCounts();
      if (this.authUser) {
        this.fetchProfile();
        this.loadCloudState();
        return;
      }
      this.loadBookmarkLocal();
      this.loadResumeLocal();
      this.authSession = null;
      this.authProfile = null;
      this.commentEditing = false;
      this.commentDraft = "";
      this.commentPreview = null;
    },
    handleBookmarkUpdate() {
      this.loadBookmark();
    },
    handleExternalAuth(event) {
      const session =
        event &&
        event.detail &&
        Object.prototype.hasOwnProperty.call(event.detail, "session")
          ? event.detail.session
          : null;
      this.handleAuthSession(session || null);
    },
    getLocalSceneNumber(key) {
      if (typeof window === "undefined") {
        return null;
      }
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        return null;
      }
      const sceneNumber = parseInt(stored, 10);
      if (!Number.isFinite(sceneNumber)) {
        return null;
      }
      return sceneNumber;
    },
    getSessionSceneNumber(key) {
      if (typeof window === "undefined") {
        return null;
      }
      const stored = window.sessionStorage.getItem(key);
      if (!stored) {
        return null;
      }
      const sceneNumber = parseInt(stored, 10);
      if (!Number.isFinite(sceneNumber)) {
        return null;
      }
      return sceneNumber;
    },
    setLocalSceneNumber(key, sceneNumber) {
      if (typeof window === "undefined") {
        return;
      }
      if (!Number.isFinite(sceneNumber)) {
        window.localStorage.removeItem(key);
        return;
      }
      window.localStorage.setItem(key, String(sceneNumber));
    },
    setSessionSceneNumber(key, sceneNumber) {
      if (typeof window === "undefined") {
        return;
      }
      if (!Number.isFinite(sceneNumber)) {
        window.sessionStorage.removeItem(key);
        return;
      }
      window.sessionStorage.setItem(key, String(sceneNumber));
    },
    initReactions() {
      if (typeof window === "undefined") {
        return;
      }
      if (!this.supabase) {
        this.supabase = getSupabaseClient();
      }
      this.loadReactionCounts();
      this.startReactionPolling();
    },
    teardownReactions() {
      if (this._reactionPollId) {
        window.clearInterval(this._reactionPollId);
        this._reactionPollId = null;
      }
      this.reactionLoading = false;
      this.reactionUpdating = false;
    },
    resetReactions() {
      this.reactionCounts = {};
      this.userReactions = {};
      this.reactionMenuOpen = {};
      this.emitReactionSnapshot({}, {});
    },
    startReactionPolling() {
      if (typeof window === "undefined") {
        return;
      }
      if (this._reactionPollId) {
        window.clearInterval(this._reactionPollId);
      }
      this._reactionPollId = window.setInterval(() => {
        this.loadReactionCounts();
      }, REACTION_POLL_INTERVAL);
    },
    sceneNumber(index) {
      return index + 1;
    },
    normalizeReactionKey(rawKey) {
      if (rawKey === null || rawKey === undefined) {
        return "";
      }
      let key = String(rawKey).trim().toLowerCase();
      key = key.replace(/[\s_-]+/g, "");
      if (key === "mindblow") {
        return "mindblown";
      }
      return key;
    },
    userReaction(sceneNumber) {
      const scene = parseInt(sceneNumber, 10);
      if (Number.isFinite(scene) && this.userReactions[scene]) {
        return this.userReactions[scene];
      }
      return this.userReactions[sceneNumber] || null;
    },
    reactionSceneVersion(sceneNumber) {
      const scene = parseInt(sceneNumber, 10);
      const counts = this.sceneReactionCounts(sceneNumber);
      const userKey = this.userReaction(sceneNumber) || "none";
      const signature = this.reactionOptions
        .map((option) => {
          const key = this.normalizeReactionKey(option.key);
          return `${key}:${counts[key] || 0}`;
        })
        .join("|");
      return `${
        Number.isFinite(scene) ? scene : sceneNumber
      }|${userKey}|${signature}`;
    },
    reactionDisplay(sceneNumber) {
      const counts = this.sceneReactionCounts(sceneNumber);
      const userKey = this.userReaction(sceneNumber);
      const ranked = this.reactionOptions
        .map((option, index) => ({
          ...option,
          key: this.normalizeReactionKey(option.key),
          count: counts[this.normalizeReactionKey(option.key)] || 0,
          order: index,
          isUser: this.normalizeReactionKey(option.key) === userKey,
        }))
        .map((option) => ({
          ...option,
          count: option.isUser && !option.count ? 1 : option.count,
        }))
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          if (a.isUser !== b.isUser) {
            return a.isUser ? -1 : 1;
          }
          return a.order - b.order;
        });
      const top = ranked.slice(0, 8);
      if (userKey && !top.some((item) => item.key === userKey)) {
        const userItem = ranked.find((item) => item.key === userKey);
        if (userItem && top.length) {
          top[top.length - 1] = userItem;
        } else if (userItem) {
          top.push(userItem);
        }
      }
      const topKeys = new Set(top.map((item) => item.key));
      const rest = ranked.filter((item) => !topKeys.has(item.key));
      return { top, rest };
    },
    sceneReactionCounts(sceneNumber) {
      const scene = parseInt(sceneNumber, 10);
      if (!Number.isFinite(scene)) {
        return {};
      }
      return (
        this.reactionCounts[scene] || this.reactionCounts[sceneNumber] || {}
      );
    },
    emitReactionSnapshot(reactionCountsByScene, userReactionsByScene) {
      if (typeof window === "undefined") {
        return;
      }
      window.dispatchEvent(
        new CustomEvent("album-reactions-snapshot", {
          detail: {
            pagePath: this.$page && this.$page.path ? this.$page.path : "",
            reactionCountsByScene: reactionCountsByScene || {},
            userReactionsByScene:
              userReactionsByScene || this.userReactions || {},
          },
        })
      );
    },
    reactionPathCandidates() {
      const currentPath =
        (this.$page &&
          typeof this.$page.path === "string" &&
          this.$page.path) ||
        "/";
      const candidates = new Set();
      const trimmed = currentPath.trim() || "/";
      candidates.add(trimmed);
      const noSlash = trimmed === "/" ? "/" : trimmed.replace(/\/+$/, "");
      candidates.add(noSlash);
      if (noSlash !== "/" && !/\.html?$/i.test(noSlash)) {
        candidates.add(`${noSlash}.html`);
      }
      if (noSlash !== "/") {
        candidates.add(`${noSlash}/`);
      }
      return Array.from(candidates).filter(Boolean);
    },
    reactionPagePath() {
      const currentPath =
        (this.$page &&
          typeof this.$page.path === "string" &&
          this.$page.path) ||
        "/";
      const trimmed = currentPath.trim() || "/";
      if (trimmed === "/") {
        return "/";
      }
      if (/\/$/.test(trimmed)) {
        return trimmed;
      }
      if (/\.html?$/i.test(trimmed)) {
        return trimmed.replace(/\.html?$/i, "/");
      }
      return `${trimmed}/`;
    },
    isReactionMenuOpen(sceneNumber) {
      return Boolean(this.reactionMenuOpen[sceneNumber]);
    },
    toggleReactionMenu(sceneNumber) {
      const key = Number(sceneNumber);
      if (!Number.isFinite(key)) {
        return;
      }
      const nextValue = !Boolean(this.reactionMenuOpen[key]);
      if (typeof this.$set === "function") {
        this.$set(this.reactionMenuOpen, key, nextValue);
        return;
      }
      this.reactionMenuOpen = {
        ...this.reactionMenuOpen,
        [key]: nextValue,
      };
    },
    async loadReactionCounts() {
      if (typeof window === "undefined") {
        return;
      }
      if (!this.supabase) {
        this.supabase = getSupabaseClient();
      }
      if (!this.supabase || this.reactionLoading) {
        return;
      }
      this.reactionLoading = true;
      try {
        const { data, error } = await this.supabase
          .from(SUPABASE_ALBUM_REACTIONS_TABLE)
          .select("scene_number, reaction_key")
          .in("page_path", this.reactionPathCandidates());
        if (error) {
          console.warn("Unable to load reactions.", error);
          return;
        }
        const counts = {};
        (data || []).forEach((row) => {
          const scene = parseInt(row.scene_number, 10);
          if (!Number.isFinite(scene)) {
            return;
          }
          const key = this.normalizeReactionKey(row.reaction_key);
          if (!key) {
            return;
          }
          if (!counts[scene]) {
            counts[scene] = {};
          }
          counts[scene][key] = (counts[scene][key] || 0) + 1;
        });
        const userReactions = {};
        if (this.authUser) {
          const { data: userData, error: userError } = await this.supabase
            .from(SUPABASE_ALBUM_REACTIONS_TABLE)
            .select("scene_number, reaction_key")
            .in("page_path", this.reactionPathCandidates())
            .eq("user_id", this.authUser.id);
          if (userError) {
            console.warn("Unable to load user reactions.", userError);
          } else {
            (userData || []).forEach((row) => {
              const scene = parseInt(row.scene_number, 10);
              if (!Number.isFinite(scene)) {
                return;
              }
              const key = this.normalizeReactionKey(row.reaction_key);
              if (!key) {
                return;
              }
              userReactions[scene] = key;
            });
            // Fallback: if aggregate query is empty/blocked by policy, at least
            // render the authenticated user's reactions and counts.
            if (!Object.keys(counts).length) {
              (userData || []).forEach((row) => {
                const scene = parseInt(row.scene_number, 10);
                const key = this.normalizeReactionKey(row.reaction_key);
                if (!Number.isFinite(scene) || !key) {
                  return;
                }
                if (!counts[scene]) {
                  counts[scene] = {};
                }
                counts[scene][key] = (counts[scene][key] || 0) + 1;
              });
            }
          }
        }
        this.reactionCounts = counts;
        this.userReactions = userReactions;
        this.emitReactionSnapshot(counts, userReactions);
      } finally {
        this.reactionLoading = false;
      }
    },
    async toggleReaction(sceneNumber, reactionKey) {
      if (!this.authUser) {
        return;
      }
      if (!this.supabase) {
        this.supabase = getSupabaseClient();
      }
      if (!this.supabase || this.reactionUpdating) {
        return;
      }
      const scene = parseInt(sceneNumber, 10);
      if (!Number.isFinite(scene)) {
        return;
      }
      const normalizedReactionKey = this.normalizeReactionKey(reactionKey);
      if (!normalizedReactionKey) {
        return;
      }
      this.reactionUpdating = true;
      const current = this.userReaction(scene);
      const nextReaction =
        current === normalizedReactionKey ? null : normalizedReactionKey;
      this.userReactions = {
        ...this.userReactions,
        [scene]: nextReaction,
      };
      this.applyReactionOptimistic(scene, current, nextReaction);
      try {
        if (current === normalizedReactionKey) {
          const { error } = await this.supabase
            .from(SUPABASE_ALBUM_REACTIONS_TABLE)
            .delete()
            .eq("user_id", this.authUser.id)
            .in("page_path", this.reactionPathCandidates())
            .eq("scene_number", scene);
          if (error) {
            console.warn("Unable to remove reaction.", error);
          }
        } else {
          const { error } = await this.supabase
            .from(SUPABASE_ALBUM_REACTIONS_TABLE)
            .upsert(
              {
                user_id: this.authUser.id,
                page_path: this.reactionPagePath(),
                scene_number: scene,
                reaction_key: normalizedReactionKey,
              },
              { onConflict: "user_id,page_path,scene_number" }
            );
          if (error) {
            console.warn("Unable to save reaction.", error);
          }
        }
      } finally {
        this.reactionUpdating = false;
        this.loadReactionCounts();
      }
    },
    applyReactionOptimistic(sceneNumber, previousKey, nextKey) {
      const scene = Number(sceneNumber);
      if (!Number.isFinite(scene)) {
        return;
      }
      const normalizedPrevious = this.normalizeReactionKey(previousKey);
      const normalizedNext = this.normalizeReactionKey(nextKey);
      const sceneCounts = { ...(this.reactionCounts[scene] || {}) };
      if (normalizedPrevious && sceneCounts[normalizedPrevious]) {
        sceneCounts[normalizedPrevious] = Math.max(
          0,
          sceneCounts[normalizedPrevious] - 1
        );
      }
      if (normalizedNext) {
        sceneCounts[normalizedNext] = (sceneCounts[normalizedNext] || 0) + 1;
      }
      this.reactionCounts = {
        ...this.reactionCounts,
        [scene]: sceneCounts,
      };
      this.emitReactionSnapshot(this.reactionCounts, this.userReactions);
    },
    async fetchProfile() {
      if (!this.useCloud) {
        return;
      }
      const { error: ensureError } = await ensureProfileRow(
        this.supabase,
        this.authUser
      );
      if (ensureError) {
        console.warn("Unable to ensure profile row.", ensureError);
      }
      const { data, error } = await this.supabase
        .from("profiles")
        .select("username, can_edit")
        .eq("id", this.authUser.id)
        .maybeSingle();
      if (error) {
        console.warn("Unable to load profile.", error);
        return;
      }
      let profile = data || null;
      const shouldCheckSupporter = !profile || !profile.can_edit;
      if (shouldCheckSupporter) {
        const { allowed, error: supporterError } = await checkSupporterAccess(
          this.supabase,
          this.authUser,
          this.authSession ? this.authSession.access_token : ""
        );
        if (supporterError) {
          console.warn("Unable to verify supporter status.", supporterError);
        } else {
          profile = { ...(profile || {}), can_edit: allowed };
        }
      }
      this.authProfile = profile;
    },
    async loadCloudState() {
      if (!this.useCloud) {
        return;
      }
      if (this._cloudLoadPromise) {
        return this._cloudLoadPromise;
      }
      this._cloudLoadPromise = (async () => {
        try {
          const localBookmark = this.getLocalSceneNumber(this.bookmarkKey);
          const localResume = this.getLocalSceneNumber(this.resumeKey);
          const { data, error } = await this.supabase
            .from(SUPABASE_ALBUM_PROGRESS_TABLE)
            .select("bookmark_scene, resume_scene")
            .eq("user_id", this.authUser.id)
            .eq("page_path", this.$page.path)
            .maybeSingle();
          if (error) {
            console.warn("Unable to load cloud album state.", error);
            this.loadBookmarkLocal();
            this.loadResumeLocal();
            return;
          }
          const hasCloudRow = Boolean(data);
          const cloudBookmark = data ? parseInt(data.bookmark_scene, 10) : null;
          const cloudResume = data ? parseInt(data.resume_scene, 10) : null;
          const mergedBookmark = Number.isFinite(cloudBookmark)
            ? cloudBookmark
            : hasCloudRow
            ? null
            : localBookmark;
          const mergedResume = Number.isFinite(cloudResume)
            ? cloudResume
            : hasCloudRow
            ? null
            : localResume;
          const needsUpsert =
            (!hasCloudRow && Number.isFinite(localBookmark)) ||
            (!hasCloudRow && Number.isFinite(localResume));
          if (needsUpsert) {
            await this.upsertCloudState({
              bookmark_scene: Number.isFinite(mergedBookmark)
                ? mergedBookmark
                : null,
              resume_scene: Number.isFinite(mergedResume) ? mergedResume : null,
            });
          }
          this.bookmarkedScene = Number.isFinite(mergedBookmark)
            ? mergedBookmark
            : null;
          this.lastSeenScene = Number.isFinite(mergedResume)
            ? mergedResume
            : null;
          if (hasCloudRow) {
            this.setLocalSceneNumber(this.bookmarkKey, null);
            this.setLocalSceneNumber(this.resumeKey, null);
          } else {
            this.setLocalSceneNumber(this.bookmarkKey, mergedBookmark);
            this.setLocalSceneNumber(this.resumeKey, mergedResume);
          }
          this._lastCloudResumeScene = Number.isFinite(mergedResume)
            ? mergedResume
            : null;
          if (this.bookmarkedScene && !this.getHashSceneNumber()) {
            this.jumpToScene = this.bookmarkedScene;
            this.$nextTick(() => {
              this.goToScene();
            });
          }
        } catch (error) {
          console.warn("Unable to load cloud album state.", error);
          this.loadBookmarkLocal();
          this.loadResumeLocal();
        }
      })();
      try {
        await this._cloudLoadPromise;
      } finally {
        this._cloudLoadPromise = null;
      }
    },
    async upsertCloudState(payload) {
      if (!this.useCloud) {
        return;
      }
      const row = {
        user_id: this.authUser.id,
        page_path: this.$page.path,
      };
      if (Object.prototype.hasOwnProperty.call(payload, "bookmark_scene")) {
        row.bookmark_scene = payload.bookmark_scene;
      }
      if (Object.prototype.hasOwnProperty.call(payload, "resume_scene")) {
        row.resume_scene = payload.resume_scene;
      }
      try {
        const { data: updatedRows, error: updateError } = await this.supabase
          .from(SUPABASE_ALBUM_PROGRESS_TABLE)
          .update(row)
          .eq("user_id", row.user_id)
          .eq("page_path", row.page_path)
          .select("user_id")
          .limit(1);
        if (updateError) {
          console.warn("Unable to update cloud album state.", updateError);
          return;
        }
        if (Array.isArray(updatedRows) && updatedRows.length) {
          return;
        }
        const { error: insertError } = await this.supabase
          .from(SUPABASE_ALBUM_PROGRESS_TABLE)
          .insert(row);
        if (insertError) {
          console.warn("Unable to insert cloud album state.", insertError);
        }
      } catch (error) {
        console.warn("Unable to save cloud album state.", error);
      }
    },
    resumePendingKey() {
      return `${this.resumeKey}:pending`;
    },
    queueCloudResumeUpdate(sceneNumber) {
      if (!this.useCloud) {
        return;
      }
      this.setSessionSceneNumber(this.resumePendingKey(), sceneNumber);
      this._pendingResumeScene = sceneNumber;
      if (this._resumeSyncTimer) {
        window.clearTimeout(this._resumeSyncTimer);
      }
      this._resumeSyncTimer = window.setTimeout(() => {
        this._resumeSyncTimer = null;
        this.flushPendingResume();
      }, RESUME_SYNC_DEBOUNCE);
    },
    flushPendingResume(force) {
      if (!this.useCloud) {
        return;
      }
      const pending = this.getSessionSceneNumber(this.resumePendingKey());
      if (!Number.isFinite(pending)) {
        return;
      }
      if (!force && this._lastCloudResumeScene === pending) {
        return;
      }
      this._lastCloudResumeScene = pending;
      this.upsertCloudState({ resume_scene: pending });
    },
    loadLocalUserSettings() {
      if (typeof window === "undefined") {
        return;
      }
      const storedCiv = window.localStorage.getItem("favoriteCiv");
      this.favoriteCiv = storedCiv || "";
      const storedFlair = window.localStorage.getItem("customFlair");
      this.customFlair = storedFlair || "";
    },
    handleSettingsSync(event) {
      if (!event || !event.detail) {
        return;
      }
      if (
        Object.prototype.hasOwnProperty.call(event.detail, "albumsViewMode")
      ) {
        this.setViewMode(event.detail.albumsViewMode, {
          persist: false,
          emit: false,
        });
      }
      if (Object.prototype.hasOwnProperty.call(event.detail, "favoriteCiv")) {
        this.favoriteCiv = event.detail.favoriteCiv || "";
      }
      if (Object.prototype.hasOwnProperty.call(event.detail, "customFlair")) {
        this.customFlair = event.detail.customFlair || "";
      }
    },
    async loadComments() {
      if (typeof window === "undefined") {
        return;
      }
      if (!this.showComments) {
        return;
      }
      if (!this.supabase) {
        this.supabase = getSupabaseClient();
      }
      if (!this.supabase || this.commentsLoading) {
        return;
      }
      this.commentsLoading = true;
      try {
        const { data, error } = await this.supabase
          .from(SUPABASE_ALBUM_COMMENTS_TABLE)
          .select(
            "id, user_id, username, message, civ_label, civ_primary, civ_secondary, flair, created_at, updated_at"
          )
          .eq("page_path", this.$page.path)
          .order("created_at", { ascending: true });
        if (error) {
          console.warn("Unable to load comments.", error);
          return;
        }
        this.comments = data || [];
      } finally {
        this.commentsLoading = false;
      }
    },
    commentCivStyle(comment) {
      const primary = comment.civ_primary || COMMENT_FALLBACK_PRIMARY;
      const secondary = comment.civ_secondary || COMMENT_FALLBACK_SECONDARY;
      return {
        "--civ-primary": primary,
        "--civ-secondary": secondary,
      };
    },
    startEditComment() {
      if (!this.userComment) {
        return;
      }
      if (!this.commentWindowOpen) {
        return;
      }
      this.commentDraft = this.userComment.message || "";
      this.commentPreview = null;
      this.commentEditing = true;
      this.clearCommentMessage();
    },
    cancelEditComment() {
      this.commentEditing = false;
      this.commentDraft = "";
      this.commentPreview = null;
      this.clearCommentMessage();
    },
    previewComment() {
      if (!this.authUser) {
        this.setCommentMessage("Sign in to leave a comment.", "error");
        return;
      }
      if (!this.canSupporterComment) {
        this.setCommentMessage("Supporters only can comment.", "error");
        return;
      }
      if (!this.commentWindowOpen) {
        this.setCommentMessage("Comment window has closed.", "error");
        return;
      }
      const message = String(this.commentDraft || "").trim();
      if (!message) {
        this.setCommentMessage("Enter a comment before previewing.", "error");
        return;
      }
      if (message.length > COMMENT_MAX_LENGTH) {
        this.setCommentMessage(
          `Comment must be ${COMMENT_MAX_LENGTH} characters or less.`,
          "error"
        );
        return;
      }
      const civLabel = String(this.favoriteCiv || "").trim();
      const civKey = civLabel ? normalizeOwnerKey(civLabel) : "";
      const colors =
        civKey && OWNER_COLOR_MAP[civKey] ? OWNER_COLOR_MAP[civKey] : null;
      const flair = String(this.customFlair || "").trim();
      const username =
        (this.authProfile && this.authProfile.username) ||
        (this.authUser && this.authUser.email) ||
        "Supporter";
      this.commentPreview = {
        message,
        username,
        civ_label: civLabel || null,
        civ_primary: colors ? colors.primary : COMMENT_FALLBACK_PRIMARY,
        civ_secondary: colors ? colors.secondary : COMMENT_FALLBACK_SECONDARY,
        flair: flair || null,
      };
      this.clearCommentMessage();
    },
    async submitComment() {
      if (!this.authUser) {
        this.setCommentMessage("Sign in to leave a comment.", "error");
        return;
      }
      if (!this.canSupporterComment) {
        this.setCommentMessage("Supporters only can comment.", "error");
        return;
      }
      if (!this.commentWindowOpen) {
        this.setCommentMessage("Comment window has closed.", "error");
        return;
      }
      const message = String(this.commentDraft || "").trim();
      if (!message) {
        this.setCommentMessage("Enter a comment before posting.", "error");
        return;
      }
      if (message.length > COMMENT_MAX_LENGTH) {
        this.setCommentMessage(
          `Comment must be ${COMMENT_MAX_LENGTH} characters or less.`,
          "error"
        );
        return;
      }
      if (!this.canSubmitComment) {
        this.setCommentMessage("Preview before posting.", "info");
        return;
      }
      if (!this.supabase) {
        this.supabase = getSupabaseClient();
      }
      if (!this.supabase || this.commentSaving) {
        return;
      }
      this.commentSaving = true;
      this.clearCommentMessage();
      const now = new Date().toISOString();
      try {
        if (this.userComment) {
          const { error } = await this.supabase
            .from(SUPABASE_ALBUM_COMMENTS_TABLE)
            .update({
              message,
              updated_at: now,
            })
            .eq("id", this.userComment.id)
            .eq("user_id", this.authUser.id);
          if (error) {
            console.warn("Unable to update comment.", error);
            this.setCommentMessage("Unable to update comment.", "error");
            return;
          }
          this.commentEditing = false;
        } else {
          const civLabel = String(this.favoriteCiv || "").trim();
          const civKey = civLabel ? normalizeOwnerKey(civLabel) : "";
          const colors =
            civKey && OWNER_COLOR_MAP[civKey] ? OWNER_COLOR_MAP[civKey] : null;
          const flair = String(this.customFlair || "").trim();
          const username =
            (this.authProfile && this.authProfile.username) ||
            (this.authUser && this.authUser.email) ||
            "Supporter";
          const { error } = await this.supabase
            .from(SUPABASE_ALBUM_COMMENTS_TABLE)
            .insert({
              user_id: this.authUser.id,
              page_path: this.$page.path,
              message,
              username,
              civ_label: civLabel || null,
              civ_primary: colors ? colors.primary : COMMENT_FALLBACK_PRIMARY,
              civ_secondary: colors
                ? colors.secondary
                : COMMENT_FALLBACK_SECONDARY,
              flair: flair || null,
              updated_at: now,
            });
          if (error) {
            console.warn("Unable to save comment.", error);
            this.setCommentMessage("Unable to save comment.", "error");
            return;
          }
        }
        this.commentDraft = "";
        this.commentPreview = null;
        this.loadComments();
      } finally {
        this.commentSaving = false;
      }
    },
    async deleteComment() {
      if (!this.userComment || !this.authUser) {
        return;
      }
      if (!this.commentWindowOpen) {
        this.setCommentMessage("Comment window has closed.", "error");
        return;
      }
      if (typeof window !== "undefined") {
        const confirmed = window.confirm("Delete your comment?");
        if (!confirmed) {
          return;
        }
      }
      if (!this.supabase) {
        this.supabase = getSupabaseClient();
      }
      const { error } = await this.supabase
        .from(SUPABASE_ALBUM_COMMENTS_TABLE)
        .delete()
        .eq("id", this.userComment.id)
        .eq("user_id", this.authUser.id);
      if (error) {
        console.warn("Unable to delete comment.", error);
        this.setCommentMessage("Unable to delete comment.", "error");
        return;
      }
      this.commentDraft = "";
      this.commentPreview = null;
      this.commentEditing = false;
      this.loadComments();
    },
    normalizeViewMode(mode) {
      if (mode === "horizontal" || mode === "vertical") {
        return mode;
      }
      return "vertical";
    },
    applyViewMode(mode) {
      const normalized = this.normalizeViewMode(mode);
      this.isToggle = normalized === "horizontal";
    },
    setViewMode(mode, options = {}) {
      const { persist = true, emit = true } = options;
      const normalized = this.normalizeViewMode(mode);
      this.applyViewMode(normalized);
      if (typeof window !== "undefined" && persist) {
        window.localStorage.setItem("albumsViewMode", normalized);
      }
      if (typeof window !== "undefined" && emit) {
        window.dispatchEvent(
          new CustomEvent("user-settings-updated", {
            detail: { albumsViewMode: normalized },
          })
        );
      }
    },
    toggleView() {
      this.setViewMode(this.isToggle ? "vertical" : "horizontal");
    },
    loadCinematicSettings() {
      if (typeof window === "undefined") {
        return;
      }
      const storedLayout = window.localStorage.getItem(
        CINEMATIC_NARRATION_LAYOUT_KEY
      );
      if (storedLayout === "side" || storedLayout === "bottom") {
        this.cinematicNarrationLayout = storedLayout;
      }
    },
    setCinematicNarrationLayout(layout) {
      if (layout !== "side" && layout !== "bottom") {
        return;
      }
      this.cinematicNarrationLayout = layout;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CINEMATIC_NARRATION_LAYOUT_KEY, layout);
      }
    },
    handleCinematicFullscreenChange(isFullscreen) {
      this.isCinematicFullscreen = Boolean(isFullscreen);
      if (this.isCinematicFullscreen) {
        this.$nextTick(() => {
          this.syncSlidesToActiveScene();
        });
      }
    },
    async toggleCinematicFullscreen() {
      const overlay = this.$refs.cinematicOverlay;
      if (!overlay || typeof overlay.toggleFullscreen !== "function") {
        return;
      }
      await overlay.toggleFullscreen();
    },
    resumeToScene() {
      if (!this.resumeScene) {
        return;
      }
      this.jumpToScene = this.resumeScene;
      this.goToScene();
    },
    jumpToIndex(index) {
      this.jumpToScene = index + 1;
      this.goToScene();
    },
    handleThumbSlide(event) {
      if (this.$refs.vueperslides1) {
        this.$refs.vueperslides1.goToSlide(event.currentSlide.index, {
          emit: false,
        });
      }
      this.jumpToScene = event.currentSlide.index + 1;
      this.setActiveScene(event.currentSlide.index);
    },
    handlePrimarySlide(event) {
      if (this.$refs.vueperslides2) {
        this.$refs.vueperslides2.goToSlide(event.currentSlide.index, {
          emit: false,
        });
      }
      this.jumpToScene = event.currentSlide.index + 1;
      this.setActiveScene(event.currentSlide.index);
    },
    syncSlidesToActiveScene() {
      if (!this.sceneCount) {
        return;
      }
      const targetIndex = Math.min(
        Math.max(this.activeSceneIndex, 0),
        this.sceneCount - 1
      );
      const overlay = this.$refs.cinematicOverlay;
      if (
        this.isCinematicFullscreen &&
        overlay &&
        typeof overlay.syncToIndex === "function"
      ) {
        overlay.syncToIndex(targetIndex);
      }
      if (this.$refs.vueperslides1) {
        this.$refs.vueperslides1.goToSlide(targetIndex, { emit: false });
      }
      if (this.$refs.vueperslides2) {
        this.$refs.vueperslides2.goToSlide(targetIndex, { emit: false });
      }
    },
    goToScene() {
      if (!this.sceneCount) {
        return;
      }
      let target = parseInt(this.jumpToScene, 10);
      if (!Number.isFinite(target)) {
        target = 1;
      }
      target = Math.min(Math.max(target, 1), this.sceneCount);
      this.jumpToScene = target;
      const index = target - 1;
      this.setActiveScene(index);
      const overlay = this.$refs.cinematicOverlay;
      if (
        this.isCinematicFullscreen &&
        overlay &&
        typeof overlay.goToIndex === "function"
      ) {
        overlay.goToIndex(index);
        return;
      }
      if (this.isToggle && this.$refs.vueperslides1) {
        this.$refs.vueperslides1.goToSlide(index);
        return;
      }
      this.scrollToScene(index);
    },
    focusTimelineDot(index) {
      this.$nextTick(() => {
        const track = this.$refs.timelineTrack;
        if (!track) {
          return;
        }
        const dots = Array.from(track.querySelectorAll(".timeline-dot"));
        const target = dots[index];
        if (target && typeof target.focus === "function") {
          target.focus({ preventScroll: true });
        }
      });
    },
    handleTimelineKeydown(event) {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(event.key)) {
        return;
      }
      const track = this.$refs.timelineTrack;
      if (!track) {
        return;
      }
      const dots = Array.from(track.querySelectorAll(".timeline-dot"));
      if (!dots.length) {
        return;
      }
      const targetIndex = dots.indexOf(event.target);
      const currentIndex =
        targetIndex >= 0 ? targetIndex : this.activeSceneIndex || 0;
      let nextIndex = currentIndex;
      if (event.key === "ArrowLeft") {
        nextIndex = Math.max(0, currentIndex - 1);
      } else if (event.key === "ArrowRight") {
        nextIndex = Math.min(dots.length - 1, currentIndex + 1);
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = dots.length - 1;
      }
      if (nextIndex === currentIndex) {
        return;
      }
      event.preventDefault();
      this.enableTimelineFocus();
      this.jumpToIndex(nextIndex);
      this.focusTimelineDot(nextIndex);
    },
    enableTimelineFocus() {
      this.timelineFocusEnabled = true;
      if (this.timelineFocusTimeoutId) {
        clearTimeout(this.timelineFocusTimeoutId);
      }
      this.timelineFocusTimeoutId = setTimeout(() => {
        this.timelineFocusEnabled = false;
        this.timelineFocusTimeoutId = null;
      }, 1500);
    },
    setActiveScene(index) {
      if (!this.sceneCount) {
        return;
      }
      const safeIndex = Math.min(Math.max(index, 0), this.sceneCount - 1);
      this.activeSceneIndex = safeIndex;
      this.saveResumeScene(safeIndex + 1);
      this.syncTimelineFocus(safeIndex);
    },
    syncTimelineFocus(index) {
      const track = this.$refs.timelineTrack;
      if (!track) {
        return;
      }
      if (!this.timelineFocusEnabled) {
        return;
      }
      this.focusTimelineDot(index);
    },
    sceneAnchor(index) {
      return `scene-${index + 1}`;
    },
    sceneKey(scene, index) {
      return scene.scene_number || scene.slide_url || index;
    },
    sceneAlt(scene) {
      const title = scene.scene_title || scene.scene_number || "Scene";
      return `CBR In-Game Screenshot of ${title}`;
    },
    sceneTooltip(scene, index) {
      const parts = [`Scene ${scene.number}`];
      if (scene.hasDeath) {
        parts.push("Death");
      }
      if (scene.hasReporter) {
        parts.push("Reporter");
      }
      if (this.isBookmarked(index)) {
        parts.push("Bookmarked");
      }
      return parts.join(" / ");
    },
    isBookmarked(index) {
      return this.bookmarkedScene === index + 1;
    },
    bookmarkAria(index) {
      return this.isBookmarked(index) ? "Remove bookmark" : "Add bookmark";
    },
    copyLabel(index) {
      return this.copiedScene === index + 1 ? "Copied" : "Copy Link";
    },
    copySceneLink(index) {
      if (typeof window === "undefined") {
        return;
      }
      const anchor = this.sceneAnchor(index);
      const resolved = this.$router.resolve({
        path: this.$page.path,
        hash: `#${anchor}`,
      });
      const url = new URL(resolved.href, window.location.origin).toString();
      const handleCopy = () => {
        this.setCopied(index);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(url)
          .then(handleCopy)
          .catch(() => {
            this.copyFallback(url, handleCopy);
          });
        return;
      }
      this.copyFallback(url, handleCopy);
    },
    copyFallback(url, onCopied) {
      if (typeof document === "undefined") {
        return;
      }
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      onCopied();
    },
    setCopied(index) {
      this.copiedScene = index + 1;
      if (this._copyTimeout) {
        window.clearTimeout(this._copyTimeout);
      }
      this._copyTimeout = window.setTimeout(() => {
        this.copiedScene = null;
      }, 2000);
    },
    async bookmarkScene(index) {
      if (typeof window === "undefined") {
        return;
      }
      const sceneNumber = index + 1;
      if (this.bookmarkedScene === sceneNumber) {
        this.bookmarkedScene = null;
        if (this.useCloud) {
          await this.upsertCloudState({ bookmark_scene: null });
        }
        this.setLocalSceneNumber(this.bookmarkKey, null);
        window.dispatchEvent(new CustomEvent("albums-bookmark-updated"));
        this.saveResumeScene(this.activeSceneIndex + 1);
        return;
      }
      this.bookmarkedScene = sceneNumber;
      if (this._resumeSyncTimer) {
        window.clearTimeout(this._resumeSyncTimer);
        this._resumeSyncTimer = null;
      }
      this._pendingResumeScene = null;
      this.setSessionSceneNumber(this.resumePendingKey(), null);
      if (this.useCloud) {
        await this.upsertCloudState({ bookmark_scene: sceneNumber });
      }
      this.setLocalSceneNumber(this.bookmarkKey, sceneNumber);
      window.dispatchEvent(new CustomEvent("albums-bookmark-updated"));
    },
    loadResume() {
      if (this.useCloud) {
        this.loadCloudState();
        return;
      }
      this.loadResumeLocal();
    },
    loadResumeLocal() {
      const sceneNumber = this.getLocalSceneNumber(this.resumeKey);
      if (!Number.isFinite(sceneNumber)) {
        this.lastSeenScene = null;
        return;
      }
      this.lastSeenScene = sceneNumber;
    },
    saveResumeScene(sceneNumber) {
      if (typeof window === "undefined") {
        return;
      }
      if (!this.sceneCount) {
        return;
      }
      if (this.bookmarkedScene) {
        return;
      }
      if (!Number.isFinite(sceneNumber)) {
        return;
      }
      const safeScene = Math.min(
        Math.max(sceneNumber, 1),
        this.sceneCount || 1
      );
      if (this.lastSeenScene === safeScene) {
        return;
      }
      this.lastSeenScene = safeScene;
      this.setLocalSceneNumber(this.resumeKey, safeScene);
      if (this.useCloud) {
        this.queueCloudResumeUpdate(safeScene);
      }
    },
    loadBookmark() {
      if (this.useCloud) {
        this.loadCloudState();
        return;
      }
      this.loadBookmarkLocal();
    },
    loadBookmarkLocal() {
      const hashScene = this.getHashSceneNumber();
      const sceneNumber = this.getLocalSceneNumber(this.bookmarkKey);
      if (!Number.isFinite(sceneNumber)) {
        this.bookmarkedScene = null;
        return;
      }
      this.bookmarkedScene = sceneNumber;
      if (!hashScene) {
        this.jumpToScene = sceneNumber;
        this.$nextTick(() => {
          this.goToScene();
        });
      }
    },
    scrollToScene(index) {
      if (typeof document === "undefined") {
        return;
      }
      const el = document.getElementById(this.sceneAnchor(index));
      if (!el || typeof el.scrollIntoView !== "function") {
        return;
      }
      if (this._jumpScrollCleanup) {
        this._jumpScrollCleanup();
        this._jumpScrollCleanup = null;
      }
      const scroll = () =>
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      scroll();
      this.$nextTick(() => {
        scroll();
      });
      const onLoad = () => {
        if (!document.body.contains(el) || this.isToggle) {
          return;
        }
        scroll();
      };
      document.addEventListener("load", onLoad, true);
      document.addEventListener("error", onLoad, true);
      const timeoutId = window.setTimeout(() => {
        if (this._jumpScrollCleanup) {
          this._jumpScrollCleanup();
          this._jumpScrollCleanup = null;
        }
      }, 2000);
      this._jumpScrollCleanup = () => {
        document.removeEventListener("load", onLoad, true);
        document.removeEventListener("error", onLoad, true);
        window.clearTimeout(timeoutId);
      };
      const img = el.querySelector("img");
      if (img && !img.complete) {
        img.addEventListener("load", onLoad, { once: true });
        img.addEventListener("error", onLoad, { once: true });
      } else if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(scroll);
      }
    },
    handleKeydown(event) {
      if (!this.hasScenes) {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const key = event.key;
      const tagName = event.target && event.target.tagName;
      const isInput =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        (event.target && event.target.isContentEditable);
      if (isInput) {
        return;
      }
      if (
        this.isCinematicFullscreen &&
        (key === "ArrowRight" || key === "ArrowLeft")
      ) {
        event.preventDefault();
        return;
      }
      if (key === "ArrowRight" || key === "j" || key === "J") {
        event.preventDefault();
        if (key === "ArrowRight") {
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") {
            event.stopImmediatePropagation();
          }
        }
        this.enableTimelineFocus();
        this.jumpRelative(1);
        return;
      }
      if (key === "ArrowLeft" || key === "k" || key === "K") {
        event.preventDefault();
        if (key === "ArrowLeft") {
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") {
            event.stopImmediatePropagation();
          }
        }
        this.enableTimelineFocus();
        this.jumpRelative(-1);
        return;
      }
      if (key === "b" || key === "B") {
        event.preventDefault();
        this.bookmarkScene(this.activeSceneIndex);
        return;
      }
      if (key === "c" || key === "C") {
        event.preventDefault();
        this.copySceneLink(this.activeSceneIndex);
        return;
      }
      if (key === "t" || key === "T") {
        event.preventDefault();
        this.toggleView();
        return;
      }
      if (key === "f" || key === "F") {
        event.preventDefault();
        this.toggleCinematicFullscreen();
        return;
      }
      if (key === "r" || key === "R") {
        event.preventDefault();
        this.resumeToScene();
        return;
      }
      if (key === "g" || key === "G") {
        event.preventDefault();
        const jumpInput = document.getElementById("scene-jump");
        if (jumpInput && typeof jumpInput.focus === "function") {
          jumpInput.focus();
        }
        return;
      }
      if (key === "Home") {
        event.preventDefault();
        this.jumpToIndex(0);
        return;
      }
      if (key === "End") {
        event.preventDefault();
        this.jumpToIndex(this.sceneCount - 1);
        return;
      }
    },
    handleVisibilityChange() {
      if (typeof document === "undefined") {
        return;
      }
      if (document.visibilityState === "hidden") {
        this.flushPendingResume(true);
      }
    },
    handleBeforeUnload() {
      this.flushPendingResume(true);
    },
    jumpRelative(delta) {
      if (!this.sceneCount) {
        return;
      }
      const nextIndex = Math.min(
        Math.max(this.activeSceneIndex + delta, 0),
        this.sceneCount - 1
      );
      this.jumpToScene = nextIndex + 1;
      this.goToScene();
    },
    handleScroll() {
      if (this.isToggle || typeof window === "undefined") {
        return;
      }
      if (this._scrollRaf) {
        return;
      }
      this._scrollRaf = window.requestAnimationFrame(() => {
        this._scrollRaf = null;
        this.updateActiveFromScroll();
        this.checkSnapshotInView();
      });
    },
    setupSnapshotObserver() {
      if (typeof window === "undefined") {
        return;
      }
      this.teardownSnapshotObserver();
      if (!this.shouldTrackSnapshot) {
        return;
      }
      const sentinel = this.$refs.snapshotSentinel;
      if (!sentinel) {
        return;
      }
      if ("IntersectionObserver" in window) {
        this._snapshotObserver = new IntersectionObserver((entries) => {
          if (!entries || !entries.length) {
            return;
          }
          if (entries.some((entry) => entry.isIntersecting)) {
            this.snapshotInView = true;
            this.teardownSnapshotObserver();
          }
        });
        this._snapshotObserver.observe(sentinel);
        return;
      }
      this.checkSnapshotInView();
    },
    teardownSnapshotObserver() {
      if (this._snapshotObserver) {
        this._snapshotObserver.disconnect();
        this._snapshotObserver = null;
      }
    },
    checkSnapshotInView() {
      if (
        this.snapshotInView ||
        this.isToggle ||
        typeof window === "undefined" ||
        !this.hasEpisodeSnapshot
      ) {
        return;
      }
      const sentinel = this.$refs.snapshotSentinel;
      if (!sentinel || typeof sentinel.getBoundingClientRect !== "function") {
        return;
      }
      const rect = sentinel.getBoundingClientRect();
      if (rect.top <= window.innerHeight && rect.bottom >= 0) {
        this.snapshotInView = true;
        this.teardownSnapshotObserver();
      }
    },
    updateActiveFromScroll() {
      if (!this._sceneElements || !this._sceneElements.length) {
        return;
      }
      const offset = window.innerHeight * 0.35;
      let activeIndex = 0;
      for (let i = 0; i < this._sceneElements.length; i++) {
        const rect = this._sceneElements[i].getBoundingClientRect();
        if (rect.top - offset <= 0) {
          activeIndex = i;
        } else {
          break;
        }
      }
      if (activeIndex !== this.activeSceneIndex) {
        this.activeSceneIndex = activeIndex;
        this.jumpToScene = activeIndex + 1;
        this.saveResumeScene(activeIndex + 1);
      }
    },
    cacheSceneElements() {
      if (typeof document === "undefined") {
        return;
      }
      if (this.isToggle) {
        this._sceneElements = [];
        return;
      }
      this._sceneElements = Array.from(
        document.querySelectorAll(".scenes article")
      );
    },
    getHashSceneNumber() {
      if (typeof window === "undefined") {
        return null;
      }
      const match = window.location.hash.match(/^#scene-(\d+)$/);
      if (!match) {
        return null;
      }
      const sceneNumber = parseInt(match[1], 10);
      if (!Number.isFinite(sceneNumber)) {
        return null;
      }
      return sceneNumber;
    },
    applyHashScene() {
      const sceneNumber = this.getHashSceneNumber();
      if (!sceneNumber) {
        return;
      }
      if (!this.sceneCount) {
        return;
      }
      const target = Math.min(Math.max(sceneNumber, 1), this.sceneCount);
      this.jumpToScene = target;
      this.goToScene();
    },
  },
};

// function resolvePrev(page, items) {
//   return this.find(page, items, -1);
// }
// function resolveNext(page, items) {
//   return this.find(page, items, 1);
// }
// function find(page, path, offset) {
//   const res = [];
//   path.forEach((item) => {
//     if (item.type === "group") {
//       res.push(...(item.children || []));
//     } else {
//       res.push(item);
//     }
//   });
//   for (let i = 0; i < res.length; i++) {
//     const cur = res[i];
//     if (cur.type === "page" && cur.path === page.path) {
//       return res[i + offset];
//     }
//   }
// }
</script>

<style scoped>
.wrapper,
.blog {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: 0.2rem;
}
@media (max-width: 980px) {
  .wrapper,
  .blog {
    padding: 0.4rem;
  }
}
@media (max-width: 450px) {
  .wrapper,
  .blog {
    padding: 0.3rem;
  }
}
.blog {
  margin-block: 2rem;
}
.blog h1 {
  font-size: 3rem;
  font-weight: 900;
  line-height: 1;
  padding-block-start: 2rem;
}
.blog h1 span {
  font-size: 60%;
  margin-inline-start: 0.2rem;
}
.resume-banner {
  margin-block: 0.6rem 1.4rem;
}
.resume-chip {
  font-size: 0.9rem;
  font-weight: 800;
  color: #1a1a1a;
  background: #ffbf46;
  border: 1px solid #ffbf46;
  border-radius: 999px;
  padding-block: 0.35rem;
  padding-inline: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.resume-chip:hover {
  background: color-mix(in srgb, #ffbf46, white 10%);
}
.blog h2 {
  font-weight: 700;
  line-height: 1.3;
}
.albumInfo {
  display: flex;
  flex-flow: row nowrap;
  width: 100%;
  padding-block-start: 2rem;
  padding-inline: 0;
  margin-block: 0 2rem;
  margin-inline: auto;
}
.column {
  flex: 1 0 25%;
}
.label {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--page-text-color);
}
.value {
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.5;
  color: var(--meta-value-color);
}
.value a {
  color: var(--page-text-color);
  font-weight: 600;
  transition: all 0.2s ease-in-out;
}
.abstract {
  font-size: 1.8rem;
  line-height: 1.4;
}
.episode-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem 2.5rem;
  margin-block: 1.2em 2em;
}
.scene-timeline {
  position: sticky;
  z-index: 5;
  overflow-x: auto;
  background: var(--timeline-surface-bg);
  padding-block: 0.5rem;
  padding-inline: 0;
  margin-block: 0 2rem;
  inset-block-start: 0;
}
.timeline-track {
  position: relative;
  width: 100%;
  min-width: 520px;
  height: 6px;
  background: var(--timeline-track-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 999px;
  padding-block: 0;
  padding-inline: 0.2rem;
}
.timeline-track::before {
  content: "";
  position: absolute;
  height: 100%;
  width: var(--progress);
  background: var(--accent-color);
  border-radius: inherit;
  z-index: 0;
  inset-block-start: 0;
  inset-inline-start: 0;
}
.timeline-dot {
  width: 0.65rem;
  height: 0.65rem;
  position: relative;
  z-index: 1;
  background: var(--timeline-dot-bg);
  border: 1px solid var(--timeline-dot-border);
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out,
    background 0.15s ease-in-out;
}
.timeline-dot.completed:not(.death):not(.reporter) {
  background: #e67300;
  border-color: var(--timeline-track-bg);
}
.timeline-dot.active {
  transform: scale(1.35);
  box-shadow: 0 0 0 3px rgba(255, 191, 70, 0.45);
}
.timeline-dot.active:not(.death):not(.reporter) {
  background: var(--accent-color);
  border-color: color-mix(in srgb, var(--accent-color), black 35%);
}
.timeline-dot.death {
  background: #d16b6b;
}
.timeline-dot.reporter {
  background: #5fa6db;
}
.timeline-dot.bookmarked {
  box-shadow: 0 0 0 2px #ffbf46;
}
.timeline-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--panel-muted-color);
  margin-block-start: 0.6rem;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.legend-dot {
  width: 0.6rem;
  height: 0.6rem;
  border: 1px solid var(--timeline-dot-border);
  border-radius: 50%;
  background: var(--timeline-dot-bg);
  display: inline-block;
}
.legend-dot.bookmarked {
  box-shadow: 0 0 0 2px #ffbf46;
}
.legend-dot.death {
  background: #d16b6b;
}
.legend-dot.reporter {
  background: #5fa6db;
}
.h-narration {
  position: relative;
  border-bottom: 3px solid color-mix(in srgb, var(--accent-color), black 20%);
  color: var(--panel-text-color);
  background-color: var(--panel-bg-color);
  padding-block: 0.5rem;
  padding-inline: 1rem;
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
.scene-link {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--page-text-color), white 25%);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  padding-block: 0.1rem;
  padding-inline: 0.55rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.scene-link:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
}
.scene-link.copied {
  background: var(--accent-color);
  color: #1a1a1a;
  border-color: var(--accent-color);
}
.h-narration p {
  font-size: 1.1rem;
  line-height: 1.6 !important;
  padding: 0 !important;
  margin: 0;
  max-height: 9.7rem;
  overflow: auto;
}
.scenes {
  width: 100%;
  max-width: 1050px;
  height: auto;
  display: block;
  margin-top: 1rem;
}
.episode-snapshot-sentinel {
  width: 100%;
  height: 1px;
}
article + article {
  margin: 3rem 0;
}
h2 {
  font-size: 3.5rem;
  font-weight: 900;
  color: var(--page-text-color);
  margin: 1.5rem 0 1rem;
}
.scene-image {
  width: 100%;
  line-height: 0;
  display: block;
  transition: box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out;
}
.scene-image:hover {
  box-shadow: 0 3px 0 0 #c39a1c;
  transform: scale(1.007);
}
.text {
  border-bottom: 3px solid color-mix(in srgb, var(--accent-color), black 20%);
  color: var(--panel-text-color);
  background-color: var(--panel-bg-color);
  padding: 2rem 2rem 1rem;
}
.scenes h3 {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0;
}
.narrations {
  font-size: 1.3rem;
  font-weight: 500;
  line-height: 1.25;
  text-shadow: var(--narration-shadow);
  padding: 0;
  margin: 0;
}
.reporter {
  font-size: 1.1rem;
  font-weight: 400;
}
.page-nav {
  padding: 0.2rem 0 0 0;
}
@media (max-width: 799px) {
  .scene-timeline {
    margin-bottom: 1.4rem;
  }
  .timeline-track {
    min-width: 420px;
  }
  .timeline-dot {
    width: 0.55rem;
    height: 0.55rem;
  }
  .scene-link {
    font-size: 0.65rem;
  }
  .episode-tools {
    align-items: flex-start;
  }
  .nav-card {
    text-align: left;
  }
  .nav-card.next {
    padding-right: 1.3rem;
  }
  .nav-card.next .nav-arrow {
    right: 0.5rem;
  }
  .nav-card.prev {
    padding-left: 1.3rem;
  }
  .nav-card.prev .nav-arrow {
    left: 0.5rem;
  }
  .nav-arrow {
    width: 1.8rem;
    height: 1.8rem;
    display: none;
  }
  .albumInfo {
    flex-flow: column nowrap;
  }
  .column {
    flex: 0 1 auto;
  }
  .scene-image {
    box-shadow: none;
  }
  .scenes h2 {
    margin: 1.5rem 0 0.5rem;
  }
  .scenes h3 {
    font-size: 1.2rem;
    margin: 0.5rem 0 0;
  }
  .text {
    padding: 0.5rem;
  }
  .narrations {
    font-size: 1rem;
    word-break: break-word;
    margin: 0;
    border-top: 0;
  }
  .reporter {
    padding-bottom: 1rem;
  }
  .pswp img {
    width: 100% !important;
    height: 100% !important;
  }
}
@media (max-width: 980px) {
  .blog {
    margin: 0 1rem;
  }
  .blog h1 {
    margin-top: 0.5rem;
  }
}
@media (max-width: 450px) {
  .blog__title {
    font-size: 2.5rem;
  }
}
</style>
