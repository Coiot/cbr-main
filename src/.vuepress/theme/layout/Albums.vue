<template>
  <transition name="fade">
    <div class="blog">
      <AlbumsNav :prev="prev" :next="next" :archive="albumArchive" compact />

      <header class="episode-heading">
        <h1 class="episode-title">
          {{ $page.frontmatter.title }}
          <span v-if="albumEditionLabel">– {{ albumEditionLabel }}</span>
        </h1>

        <div v-if="resumeScene" class="resume-banner">
          <button type="button" class="resume-chip" @click="resumeToScene">
            Resume at Scene {{ resumeScene }}
          </button>
        </div>
      </header>

      <section
        class="episode-details"
        :class="{ 'is-open': episodeDetailsOpen }"
      >
        <button
          type="button"
          class="episode-details-toggle"
          :aria-expanded="episodeDetailsOpen ? 'true' : 'false'"
          aria-controls="episode-details-content"
          @click="episodeDetailsOpen = !episodeDetailsOpen"
        >
          <span>Episode details</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m7 9 5 5 5-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div id="episode-details-content" class="albumInfo">
        <div class="column">
          <span class="label">Release Date:</span>
          <p>
            <span class="value">{{ $page.frontmatter.release_date }}</span>
          </p>
        </div>

        <div class="column">
          <span class="label">Narrated by:</span>
          <p>
            <span class="value">{{ $page.frontmatter.narrated_by }}</span>
          </p>
        </div>

        <div v-if="$page.frontmatter.starting_turn" class="column">
          <span class="label">Starting Turn:</span>
          <p>
            <span class="value">{{ $page.frontmatter.starting_turn }}</span>
          </p>
        </div>

        <div
          v-if="$page.frontmatter.audio_narration"
          class="column"
        >
          <span class="label">Video:</span>
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
      </section>

      <h2 class="scenenumber" v-if="$page.frontmatter.description">Abstract</h2>
      <p class="abstract" v-if="$page.frontmatter.description">
        {{ $page.frontmatter.description }}
      </p>

      <div v-if="scenesLoading" class="album-scenes-status" role="status">
        Loading scenes…
      </div>
      <div v-else-if="scenesLoadError" class="album-scenes-status is-error">
        <span>{{ scenesLoadError }}</span>
        <button type="button" @click="retryAlbumScenes">Retry</button>
      </div>

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
          ref="sceneJumpControl"
          v-model.number="jumpToScene"
          :scene-count="sceneCount"
          :scenes="scenes"
          :show-scene-titles="isPowerRanking"
          select-id="scene-jump"
          @go="goToScene"
        />
      </div>

      <transition name="floating-scene-jump">
        <aside
          v-if="showFloatingSceneJump && !isCinematicFullscreen"
          class="floating-scene-jump"
          aria-label="Jump to scene"
        >
          <button
            type="button"
            class="floating-scene-trigger"
            aria-label="Open jump to scene control"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h10M4 18h7" />
            </svg>
          </button>
          <div class="floating-scene-panel">
            <SceneJumpControl
              v-model.number="jumpToScene"
              :scene-count="sceneCount"
              :scenes="scenes"
              :show-scene-titles="isPowerRanking"
              select-id="floating-scene-jump"
              compact
              @go="goToScene"
            />
          </div>
        </aside>
      </transition>

      <nav
        v-if="hasScenes && !isCinematicFullscreen"
        class="mobile-album-bar"
        aria-label="Scene navigation"
      >
        <div v-if="mobileJumpOpen" class="mobile-jump-panel">
          <SceneJumpControl
            v-model.number="jumpToScene"
            :scene-count="sceneCount"
            :scenes="scenes"
            :show-scene-titles="isPowerRanking"
            select-id="mobile-scene-jump"
            compact
            @go="goToSceneFromMobileBar"
          />
        </div>

        <button
          type="button"
          class="mobile-album-action"
          :disabled="activeSceneIndex <= 0"
          aria-label="Previous scene"
          @click="jumpRelative(-1)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>Previous</span>
        </button>
        <button
          type="button"
          class="mobile-album-action"
          :class="{ active: mobileJumpOpen }"
          :aria-expanded="mobileJumpOpen ? 'true' : 'false'"
          aria-controls="mobile-scene-jump"
          @click="mobileJumpOpen = !mobileJumpOpen"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h10M4 18h7" />
          </svg>
          <span>Jump</span>
        </button>
        <button
          type="button"
          class="mobile-album-action"
          :class="{ active: isBookmarked(activeSceneIndex) }"
          :aria-pressed="isBookmarked(activeSceneIndex) ? 'true' : 'false'"
          :aria-label="bookmarkAria(activeSceneIndex)"
          @click="bookmarkScene(activeSceneIndex)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h12v18l-6-4-6 4V3z" />
          </svg>
          <span>Bookmark</span>
        </button>
        <button
          type="button"
          class="mobile-album-action"
          :disabled="activeSceneIndex >= sceneCount - 1"
          aria-label="Next scene"
          @click="jumpRelative(1)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span>Next</span>
        </button>
      </nav>

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

      <div v-if="isHorizontalView" :key="`slides-${$page.path}`">
        <SceneCarousel
          ref="horizontalCarousel"
          class="cbr-media"
          :scenes="scenes"
          :active-index="activeSceneIndex"
          :scene-key="sceneKey"
          show-thumbnails
          show-fraction
          @change="handlePrimarySlide"
        >
          <template #content="{ scene, index }">
            <SceneSlideContent
              :key="`slide-content-${sceneKey(
                scene,
                index
              )}-${reactionSceneVersion(sceneNumber(index))}`"
              :scene="scene"
              :scene-number="sceneNumber(index)"
              :show-scene-number="!isPowerRanking"
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
        </SceneCarousel>
      </div>
      <CinematicFullscreen
        ref="cinematicOverlay"
        :scenes="scenes"
        :is-fullscreen="isCinematicFullscreen"
        :narration-layout="cinematicNarrationLayout"
        :active-scene="activeScene"
        :active-scene-index="activeSceneIndex"
        :active-scene-number="sceneNumber(activeSceneIndex)"
        :show-scene-number="!isPowerRanking"
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
      <div v-if="isVerticalView" :key="`scenes-${$page.path}`">
        <section class="scenes">
          <SceneCard
            v-for="(scene, index) in scenes"
            :key="sceneKey(scene, index)"
            :id="sceneAnchor(index)"
            :scene="scene"
            :scene-alt="sceneAlt(scene)"
            :scene-number="sceneNumber(index)"
            :show-scene-number="!isPowerRanking"
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

      <EpisodeReadingCompletion v-if="hasScenes" :path="$page.path" :next="next" :prepare-save="prepareReadingStatusChange" />

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
        :access-notice="commentAccessNotice"
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
        @retry-access="fetchProfile(true)"
      />

      <EpisodeMapSnapshot
        v-if="shouldRenderSnapshot"
        :snapshot-path="episodeSnapshotPath"
        :previous-snapshot-path="previousEpisodeSnapshotPath"
        :snapshot-title="episodeSnapshotTitle"
        :snapshot-date="commentPostedAt"
        :use-base-snapshot="episodeSnapshotIsBase"
      />

      <AlbumsNav :prev="prev" :next="next" />
    </div>
  </transition>
</template>

<script>
import { readingLibrary } from "../components/albums/library/readingLibrary.js";
import { archiveReturnFor, carryArchiveReturn } from "../components/albums/library/archiveState.mjs";
import EpisodeReadingCompletion from "../components/albums/library/EpisodeReadingCompletion.vue";
import { defineAsyncComponent } from "vue";
import { getEdition } from "../../data/editions";
import AlbumsNav from "../components/albums/AlbumsNav.vue";
import SceneCard from "../components/albums/SceneCard.vue";
import SceneCarousel from "../components/albums/SceneCarousel.vue";
import SceneSlideContent from "../components/albums/SceneSlideContent.vue";
import CinematicFullscreen from "../components/albums/CinematicFullscreen.vue";
import EpisodeViewControls from "../components/albums/EpisodeViewControls.vue";
import SceneJumpControl from "../components/albums/SceneJumpControl.vue";
import { albumSceneCache, pageDir } from "../components/albums/behavior/albumSettings.js";
import { albumReactionsComputed, albumReactionsMethods } from "../components/albums/behavior/albumReactions.js";
import { albumCommentsComputed, albumCommentsMethods } from "../components/albums/behavior/albumComments.js";
import { albumProgressComputed, albumProgressMethods } from "../components/albums/behavior/albumProgress.js";
import { albumAccountMethods } from "../components/albums/behavior/albumAccount.js";
import { albumViewingComputed, albumViewingMethods } from "../components/albums/behavior/albumViewing.js";
import { albumSnapshotComputed, albumSnapshotMethods } from "../components/albums/behavior/albumSnapshot.js";

const CommentsSection = defineAsyncComponent(() =>
  import("../components/albums/CommentsSection.vue")
);
const EpisodeMapSnapshot = defineAsyncComponent(() =>
  import("../components/albums/EpisodeMapSnapshot.vue")
);

export default {
  name: "Albums",
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
      supporterChecking: false,
      supporterCheckFailed: false,
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
      commentNow: Date.now(),
      favoriteCiv: "",
      customFlair: "",
      siblingPagesCache: [],
      sceneTimelineCache: [],
      snapshotInView: false,
      showFloatingSceneJump: false,
      episodeDetailsOpen: false,
      mobileJumpOpen: false,
      albumScenes: [],
      scenesLoading: false,
      scenesLoadError: "",
    };
  },
  components: {
    EpisodeReadingCompletion,
    AlbumsNav,
    SceneCard,
    SceneCarousel,
    SceneSlideContent,
    CinematicFullscreen,
    EpisodeViewControls,
    SceneJumpControl,
    CommentsSection,
    EpisodeMapSnapshot,
  },
  created() {
    this.rebuildPageCaches();
  },
  computed: {
    ...albumReactionsComputed,
    ...albumCommentsComputed,
    ...albumProgressComputed,
    ...albumViewingComputed,
    ...albumSnapshotComputed,
    isPowerRanking() {
      const frontmatter = (this.$page && this.$page.frontmatter) || {};
      const pagePath = (this.$page && this.$page.path) || "";
      return Boolean(frontmatter.pr) || /^\/albums\/pr\//i.test(pagePath);
    },
    albumArchive() {
      const id = String(this.$page?.path || "").split("/").filter(Boolean)[1];
      const edition = getEdition(id);
      if (!edition) return { to: "/albums/", label: "Back to Albums" };
      const season = id.match(/^s(\d+)$/);
      const label = season ? `Season ${season[1]}` : edition.title;
      const back = archiveReturnFor(this.$page.path);
      if (back) return { to: back.to, label: `Back to ${label}` };
      return { to: { path: "/albums/", query: { edition: id } }, label: `Back to ${label}` };
    },
    albumEditionLabel() {
      const frontmatter = (this.$page && this.$page.frontmatter) || {};
      return frontmatter.edition || frontmatter.pr || "";
    },
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
    scenes() {
      const inlineScenes = this.$page.frontmatter.scenes;
      return Array.isArray(inlineScenes) ? inlineScenes : this.albumScenes;
    },
    hasScenes() {
      return this.scenes.length > 0;
    },
    sceneCount() {
      if (this.hasScenes) return this.scenes.length;
      const count = Number(this.$page.frontmatter.scene_count);
      return Number.isFinite(count) && count > 0 ? count : 0;
    },
    sceneTimeline() {
      return this.sceneTimelineCache;
    },
  },
  watch: {
    commentWindowEndsAt() { this.refreshCommentWindow(); },
    "$page.path"(path, previousPath) {
      carryArchiveReturn(previousPath, path);
      this.flushPendingResume(true);
      this.albumScenes = [];
      this.scenesLoading = false;
      this.scenesLoadError = "";
      this.jumpToScene = 1;
      this.bookmarkedScene = null;
      this.lastSeenScene = null;
      this.activeSceneIndex = 0;
      this.copiedScene = null;
      this.snapshotInView = false;
      this.showFloatingSceneJump = false;
      this.episodeDetailsOpen = false;
      this.mobileJumpOpen = false;
      this.teardownSceneJumpObserver();
      this.teardownSnapshotObserver();
      this.resetReactions();
      this.comments = [];
      this.commentDraft = "";
      this.commentPreview = null;
      this.clearCommentMessage();
      this.commentEditing = false;
      this.loadAlbumScenes().then((loaded) => {
        if (!loaded) return;
        this.initializeAlbumScenes();
        this.loadReactionCounts();
        if (this.showComments) {
          this.loadComments();
        }
      });
    },
    isToggle() {
      this.$nextTick(() => {
        this.cacheSceneElements();
        if (!this.isToggle) {
          this.updateActiveFromScroll();
        }
        this.syncSlidesToActiveScene();
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
    readingLibrary.initialize();
    if (typeof window === "undefined") {
      return;
    }
    this.initSupabase();
    this.refreshCommentWindow();
    this.initReactions();
    this.loadLocalUserSettings();
    this.loadCinematicSettings();
    if (this.showComments) {
      this.loadComments();
    }
    const saved = window.localStorage.getItem("albumsViewMode");
    this.applyViewMode(saved);
    this.loadAlbumScenes().then((loaded) => {
      if (loaded) this.initializeAlbumScenes();
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
  beforeUnmount() {
    if (typeof window === "undefined") {
      return;
    }
    window.clearTimeout(this._commentWindowTimer);
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
    this.teardownSceneJumpObserver();
    this.teardownReactions();
    this.flushPendingResume(true);
    this.teardownSupabase();
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
    ...albumReactionsMethods,
    ...albumCommentsMethods,
    ...albumProgressMethods,
    ...albumAccountMethods,
    ...albumViewingMethods,
    ...albumSnapshotMethods,
    async loadAlbumScenes() {
      const frontmatter = (this.$page && this.$page.frontmatter) || {};
      if (Array.isArray(frontmatter.scenes)) {
        this.albumScenes = frontmatter.scenes;
        return true;
      }
      const dataUrl = String(frontmatter.scene_data_url || "").trim();
      if (!dataUrl || typeof window === "undefined") {
        this.albumScenes = [];
        return false;
      }
      if (albumSceneCache.has(dataUrl)) {
        this.albumScenes = albumSceneCache.get(dataUrl);
        return true;
      }
      this.scenesLoading = true;
      this.scenesLoadError = "";
      try {
        const response = await fetch(this.$withBase(dataUrl), {
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const scenes = Array.isArray(payload) ? payload : payload.scenes;
        if (!Array.isArray(scenes)) {
          throw new Error("Invalid scene data");
        }
        albumSceneCache.set(dataUrl, scenes);
        const currentUrl = String(
          (this.$page.frontmatter && this.$page.frontmatter.scene_data_url) || ""
        ).trim();
        if (currentUrl !== dataUrl) return false;
        this.albumScenes = scenes;
        return true;
      } catch (error) {
        this.albumScenes = [];
        this.scenesLoadError = "Scenes could not be loaded.";
        return false;
      } finally {
        this.scenesLoading = false;
      }
    },
    async retryAlbumScenes() {
      const loaded = await this.loadAlbumScenes();
      if (loaded) this.initializeAlbumScenes();
    },
    initializeAlbumScenes() {
      this.rebuildPageCaches();
      this.loadBookmark();
      this.loadResume();
      this.$nextTick(() => {
        this.cacheSceneElements();
        this.applyHashScene();
        this.updateActiveFromScroll();
        this.setupSceneJumpObserver();
        this.setupSnapshotObserver();
      });
    },
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
      return this.scenes.map((scene, index) => ({
        index,
        key: `${this.sceneKey(scene, index)}-${index}`,
        number: scene.scene_number || index + 1,
        hasDeath: Boolean(scene.death),
        hasReporter: Boolean(scene.reporter),
      }));
    },
  },
};
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
  margin-block: 1rem 2rem;
  text-shadow: var(--heading-shadow-sm);
}
.episode-heading {
  display: grid;
  gap: 1.25rem;
  margin-block-end: 0.9rem;
}
.blog h1 {
  padding-block-start: 0;
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  line-height: 1;
}
.blog h1 span {
  margin-inline-start: 0.2rem;
  font-size: 60%;
  white-space: nowrap;
}
.resume-banner {
  justify-self: start;
  margin: 0;
}
.resume-chip {
  padding-block: 0.35rem;
  padding-inline: 0.9rem;
  border: 1px solid #ffbf46;
  border-radius: 999px;
  background: #ffbf46;
  color: #1a1a1a;
  font-size: 0.9rem;
  font-weight: 800;
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
.episode-details-toggle {
  display: none;
}
.albumInfo {
  display: flex;
  flex-flow: row nowrap;
  inline-size: 100%;
  gap: 0.75rem 1.5rem;
  padding: 0;
  margin-block: 0 1rem;
  margin-inline: auto;
}
.column {
  flex: 1 1 0;
  min-inline-size: 0;
}
.column p { margin-block: 0.25rem 0; }
.label {
  color: var(--page-text-color);
  font-size: 0.85rem;
  font-weight: 800;
}
.value {
  color: var(--meta-value-color);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5;
}
.value a {
  color: var(--page-text-color);
  font-weight: 600;
  transition: all 0.2s ease-in-out;
}
.blog h2.scenenumber { font-size: 1.15rem; margin-block: 1rem 0.35rem; }
.abstract {
  font-size: 1.125rem;
  line-height: 1.5;
  margin-block: 0 1rem;
}
.album-scenes-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3rem;
  margin: 1.25rem 0;
  color: var(--text-color);
  font-weight: 700;
}
.album-scenes-status.is-error {
  color: #f1c15f;
}
.album-scenes-status button {
  color: inherit;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font: inherit;
  cursor: pointer;
}
.episode-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem 2.5rem;
  margin-block: 0.9rem 1.2rem;
}
.floating-scene-jump {
  position: fixed;
  right: calc(1rem + env(safe-area-inset-right, 0px));
  bottom: calc(5.25rem + env(safe-area-inset-bottom, 0px));
  z-index: 7;
  inline-size: 3rem;
  block-size: 3rem;
  box-sizing: border-box;
}
.floating-scene-trigger {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--meta-value-color);
  background: color-mix(in srgb, var(--timeline-surface-bg), transparent 22%);
  border: 1px solid color-mix(in srgb, var(--meta-value-color), transparent 18%);
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  padding: 0;
  cursor: pointer;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: opacity 0.16s ease, background-color 0.16s ease;
}
.floating-scene-trigger svg {
  inline-size: 1.35rem;
  block-size: 1.35rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
.floating-scene-trigger:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
.floating-scene-panel {
  position: absolute;
  inset-inline-end: 0;
  inset-block-end: 0;
  inline-size: min(16rem, calc(100vw - 2rem));
  box-sizing: border-box;
  color: var(--page-text-color);
  background: color-mix(in srgb, var(--timeline-surface-bg), #111 12%);
  border: 1px solid color-mix(in srgb, var(--meta-value-color), transparent 18%);
  border-radius: 14px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.36);
  padding: 0.7rem;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: scale(0.97);
  transform-origin: bottom right;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: opacity 0.16s ease, transform 0.16s ease,
    visibility 0s linear 0.16s;
}
.floating-scene-jump:hover .floating-scene-panel,
.floating-scene-jump:focus-within .floating-scene-panel {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: scale(1);
  transition-delay: 0s;
}
.floating-scene-jump:hover .floating-scene-trigger,
.floating-scene-jump:focus-within .floating-scene-trigger {
  opacity: 0;
}
.floating-scene-jump-enter-active,
.floating-scene-jump-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.floating-scene-jump-enter,
.floating-scene-jump-leave-to {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.98);
}
.mobile-album-bar {
  display: none;
}
.scene-count {
  color: var(--panel-muted-color);
  font-size: 0.95rem;
  font-weight: 600;
}
.scene-timeline {
  position: sticky;
  z-index: 5;
  inset-block-start: 0;
  overflow-x: auto;
  background: var(--timeline-surface-bg);
  padding-block: 0.5rem;
  padding-inline: 0;
  margin-block: 0 2rem;
  overflow-x: clip;
}
.timeline-track {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  inline-size: 100%;
  min-inline-size: 520px;
  block-size: 6px;
  padding-block: 0;
  padding-inline: 0.2rem;
  border-radius: 999px;
  background: var(--timeline-track-bg);
}
.timeline-track::before {
  content: "";
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 0;
  inline-size: var(--progress);
  block-size: 100%;
  border-radius: inherit;
  background: var(--accent-color);
}
.timeline-dot {
  position: relative;
  z-index: 1;
  inline-size: 0.65rem;
  block-size: 0.65rem;
  padding: 0;
  border: 1px solid var(--timeline-dot-border);
  border-radius: 50%;
  background: var(--timeline-dot-bg);
  cursor: pointer;
  transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out,
    background 0.15s ease-in-out;
}
.timeline-dot.completed:not(.death):not(.reporter) {
  border-color: var(--timeline-track-bg);
  background: #e67300;
}
.timeline-dot.active {
  transform: scale(1.35);
  box-shadow: 0 0 0 3px rgba(255, 191, 70, 0.45);
}
.timeline-dot.active:not(.death):not(.reporter) {
  border-color: color-mix(in srgb, var(--accent-color), black 35%);
  background: var(--accent-color);
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
  margin-block-start: 0.6rem;
  color: var(--panel-muted-color);
  font-size: 0.85rem;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.legend-dot {
  display: inline-block;
  inline-size: 0.6rem;
  block-size: 0.6rem;
  border: 1px solid var(--timeline-dot-border);
  border-radius: 50%;
  background: var(--timeline-dot-bg);
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
.scenes {
  display: grid;
  inline-size: 100%;
  max-inline-size: 1050px;
  min-inline-size: 0;
  block-size: auto;
  margin-block-start: 1rem;
  gap: 3rem;
}
.scenes > * {
  min-inline-size: 0;
  max-inline-size: 100%;
}
.episode-snapshot-sentinel {
  height: 1px;
}
h2 {
  margin-block: 1.5rem 1rem;
  font-size: 3.5rem;
  font-weight: 900;
  color: var(--page-text-color);
}
@media (max-width: 799px) {
  .scene-timeline {
    margin-block-end: 1.4rem;
  }
  .timeline-track {
    min-inline-size: 420px;
  }
  .timeline-dot {
    inline-size: 0.55rem;
    block-size: 0.55rem;
  }
  .episode-tools {
    align-items: flex-start;
  }
  .episode-details {
    margin-block: 0.75rem 1rem;
  }
  .episode-details-toggle {
    inline-size: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--page-text-color);
    background: color-mix(in srgb, var(--timeline-surface-bg), #111 8%);
    border: 1px solid color-mix(in srgb, var(--accent-color), transparent 30%);
    border-radius: 10px;
    padding: 0.8rem 0.9rem;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .episode-details-toggle svg {
    inline-size: 1.2rem;
    block-size: 1.2rem;
    transition: transform 0.2s ease;
  }
  .episode-details.is-open .episode-details-toggle svg {
    transform: rotate(180deg);
  }
  .episode-details:not(.is-open) .albumInfo {
    display: none;
  }
  .albumInfo {
    flex-flow: column nowrap;
    gap: 0.7rem;
    background: color-mix(in srgb, var(--timeline-surface-bg), transparent 12%);
    border: 1px solid color-mix(in srgb, var(--accent-color), transparent 55%);
    border-block-start: 0;
    border-radius: 0 0 10px 10px;
    box-sizing: border-box;
    padding: 1rem;
    margin: 0;
  }
  .column {
    flex: 0 1 auto;
  }
  .pswp img {
    inline-size: 100% !important;
    block-size: 100% !important;
  }
}
@media (max-width: 600px) {
  .floating-scene-jump {
    display: none;
  }
  .blog {
    padding-block-end: calc(4.75rem + env(safe-area-inset-bottom, 0px));
  }
  .mobile-album-bar {
    position: fixed;
    inset-inline: 0;
    inset-block-end: 0;
    z-index: 14;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.2rem;
    box-sizing: border-box;
    color: var(--panel-text-color);
    background: color-mix(in srgb, var(--timeline-surface-bg), transparent 5%);
    border-block-start: 1px solid
      color-mix(in srgb, var(--accent-color), transparent 30%);
    box-shadow: 0 -10px 28px rgba(0, 0, 0, 0.28);
    padding: 0.35rem 0.4rem
      calc(0.35rem + env(safe-area-inset-bottom, 0px));
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .mobile-jump-panel {
    position: absolute;
    inset-inline: 0.5rem;
    inset-block-end: calc(100% + 0.5rem);
    box-sizing: border-box;
    color: var(--page-text-color);
    background: color-mix(in srgb, var(--timeline-surface-bg), #111 10%);
    border: 1px solid color-mix(in srgb, var(--accent-color), transparent 18%);
    border-radius: 12px;
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.38);
    padding: 0.75rem;
  }
  .mobile-album-action {
    min-inline-size: 0;
    min-block-size: 3.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    color: var(--panel-muted-color);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 9px;
    padding: 0.25rem 0.15rem;
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .mobile-album-action svg {
    inline-size: 1.25rem;
    block-size: 1.25rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .mobile-album-action span {
    overflow: hidden;
    max-inline-size: 100%;
    font-size: 0.62rem;
    font-weight: 800;
    line-height: 1;
    text-overflow: ellipsis;
  }
  .mobile-album-action.active {
    color: var(--accent-color);
    background: color-mix(in srgb, var(--accent-color), transparent 88%);
    border-color: color-mix(in srgb, var(--accent-color), transparent 65%);
  }
  .mobile-album-action:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: -2px;
  }
  .mobile-album-action:disabled {
    opacity: 0.35;
    cursor: default;
  }
}
@media (max-width: 980px) {
  .blog {
    margin-block: 0;
    margin-inline: 1rem;
  }

}
@media (max-width: 450px) {
  .blog__title {
    font-size: 2.5rem;
  }
}
</style>

<style>
/* Keep focus visible across album controls, including content rendered in child components. */
.blog :is(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 3px solid var(--accent-color);
  outline-offset: 3px;
}
.blog .timeline-dot:focus-visible,
.blog .mobile-album-action:focus-visible {
  outline-offset: -2px;
}
</style>
