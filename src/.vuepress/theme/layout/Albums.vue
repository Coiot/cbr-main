<template>
  <transition name="fade">
    <div class="blog">
      <div class="page-nav" v-if="prev || next">
        <div class="nextprev">
          <router-link v-if="prev" class="nav-card prev" :to="prev.path">
            <span class="nav-arrow">←</span>
            <span class="nav-kicker">Previous</span>
            <span class="nav-title">{{ prev.title || prev.path }}</span>
          </router-link>
          <router-link v-if="next" class="nav-card next" :to="next.path">
            <span class="nav-kicker">Next</span>
            <span class="nav-title">{{ next.title || next.path }}</span>
            <span class="nav-arrow">→</span>
          </router-link>
        </div>
      </div>

      <h1 class>
        {{ $page.frontmatter.title }}
        <span>– {{ $page.frontmatter.edition }}</span>
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
        <div class="view-toggle">
          <span class="view-status">
            Viewing: {{ isToggle ? "Horizontal" : "Vertical" }}
          </span>
          <button
            class="toggle-button"
            type="button"
            :aria-pressed="isToggle"
            @click="toggleView"
          >
            Switch to {{ isToggle ? "Vertical" : "Horizontal" }} View
          </button>
        </div>
        <div class="scene-jump">
          <label class="jump-label" for="scene-jump">Jump to scene</label>
          <div class="jump-controls">
            <select id="scene-jump" v-model.number="jumpToScene">
              <option v-for="index in sceneCount" :key="index" :value="index">
                Scene {{ index }}
              </option>
            </select>
            <button type="button" class="scene-button" @click="goToScene">
              Go
            </button>
          </div>
        </div>
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

      <div v-if="isToggle === true">
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
            :image="scene.slide_url"
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
          class="medium"
          :transition-speed="900"
          style="background-size: contain"
        >
          <vueper-slide
            v-for="(scene, index) in $page.frontmatter.scenes"
            :image="scene.slide_url"
            :key="sceneKey(scene, index)"
            :title="scene.scene_title"
            :content="scene.narration"
            :class="{ civdeathBorder: scene.death }"
          >
            <template v-slot:content>
              <article class="h-narration" style="flex-direction: column">
                <h3
                  v-if="scene.scene_number == scene.scene_title"
                  class="scene-heading"
                >
                  <span class="scene-title">{{ scene.scene_number }}</span>
                  <BookmarkButton
                    :active="isBookmarked(index)"
                    :aria-label="bookmarkAria(index)"
                    :title="bookmarkAria(index)"
                    @toggle="bookmarkScene(index)"
                  />
                  <!-- <button
                    type="button"
                    class="scene-link"
                    :class="{ copied: copiedScene === index + 1 }"
                    :aria-label="copyLabel(index)"
                    :title="copyLabel(index)"
                    @click.stop="copySceneLink(index)"
                  >
                    {{ copyLabel(index) }}
                  </button> -->
                </h3>
                <h3 v-else-if="scene.scene_title_html" class="scene-heading">
                  <span class="scene-title">
                    {{ scene.scene_number }}:
                    <span v-html="scene.scene_title_html"></span>
                  </span>
                  <BookmarkButton
                    :active="isBookmarked(index)"
                    :aria-label="bookmarkAria(index)"
                    :title="bookmarkAria(index)"
                    @toggle="bookmarkScene(index)"
                  />
                  <!-- <button
                    type="button"
                    class="scene-link"
                    :class="{ copied: copiedScene === index + 1 }"
                    :aria-label="copyLabel(index)"
                    :title="copyLabel(index)"
                    @click.stop="copySceneLink(index)"
                  >
                    {{ copyLabel(index) }}
                  </button> -->
                </h3>
                <h3 v-else-if="scene.scene_title" class="scene-heading">
                  <span class="scene-title">
                    {{ scene.scene_number }}:
                    {{ scene.scene_title }}
                  </span>
                  <BookmarkButton
                    :active="isBookmarked(index)"
                    :aria-label="bookmarkAria(index)"
                    :title="bookmarkAria(index)"
                    @toggle="bookmarkScene(index)"
                  />
                  <!-- <button
                    type="button"
                    class="scene-link"
                    :class="{ copied: copiedScene === index + 1 }"
                    :aria-label="copyLabel(index)"
                    :title="copyLabel(index)"
                    @click.stop="copySceneLink(index)"
                  >
                    {{ copyLabel(index) }}
                  </button> -->
                </h3>
                <h3 v-else class="scene-heading">
                  <span class="scene-title">{{ scene.scene_number }}</span>
                  <BookmarkButton
                    :active="isBookmarked(index)"
                    :aria-label="bookmarkAria(index)"
                    :title="bookmarkAria(index)"
                    @toggle="bookmarkScene(index)"
                  />
                  <!-- <button
                    type="button"
                    class="scene-link"
                    :class="{ copied: copiedScene === index + 1 }"
                    :aria-label="copyLabel(index)"
                    :title="copyLabel(index)"
                    @click.stop="copySceneLink(index)"
                  >
                    {{ copyLabel(index) }}
                  </button> -->
                </h3>
                <p class="narrations" v-html="scene.narration" tabindex="0"></p>
                <p
                  class="narrations"
                  v-if="scene.reporter"
                  v-html="scene.reporter"
                  tabindex="0"
                  v-bind:class="{
                    reporter: scene.reporter,
                  }"
                ></p>
              </article>
            </template>
          </vueper-slide>
        </vueper-slides>
      </div>
      <div v-if="isToggle === false">
        <section class="scenes">
          <article
            class="medium"
            v-for="(scene, index) in $page.frontmatter.scenes"
            :key="sceneKey(scene, index)"
            :id="sceneAnchor(index)"
          >
            <img
              v-lazy="scene.slide_url"
              tabindex="0"
              :alt="sceneAlt(scene)"
              class="scene-image"
              v-bind:class="{ civdeathImage: scene.death }"
            />
            <div class="text" v-bind:class="{ civdeathBorder: scene.death }">
              <h3
                v-if="scene.scene_number == scene.scene_title"
                class="scene-heading"
              >
                <span class="scene-title">{{ scene.scene_number }}</span>
                <BookmarkButton
                  :active="isBookmarked(index)"
                  :aria-label="bookmarkAria(index)"
                  :title="bookmarkAria(index)"
                  @toggle="bookmarkScene(index)"
                />
                <!-- <button
                  type="button"
                  class="scene-link"
                  :class="{ copied: copiedScene === index + 1 }"
                  :aria-label="copyLabel(index)"
                  :title="copyLabel(index)"
                  @click.stop="copySceneLink(index)"
                >
                  {{ copyLabel(index) }}
                </button> -->
              </h3>
              <h3 v-else-if="scene.scene_title_html" class="scene-heading">
                <span class="scene-title">
                  {{ scene.scene_number }}:
                  <span v-html="scene.scene_title_html"></span>
                </span>
                <BookmarkButton
                  :active="isBookmarked(index)"
                  :aria-label="bookmarkAria(index)"
                  :title="bookmarkAria(index)"
                  @toggle="bookmarkScene(index)"
                />
                <!-- <button
                  type="button"
                  class="scene-link"
                  :class="{ copied: copiedScene === index + 1 }"
                  :aria-label="copyLabel(index)"
                  :title="copyLabel(index)"
                  @click.stop="copySceneLink(index)"
                >
                  {{ copyLabel(index) }}
                </button> -->
              </h3>
              <h3 v-else-if="scene.scene_title" class="scene-heading">
                <span class="scene-title">
                  {{ scene.scene_number }}:
                  {{ scene.scene_title }}
                </span>
                <BookmarkButton
                  :active="isBookmarked(index)"
                  :aria-label="bookmarkAria(index)"
                  :title="bookmarkAria(index)"
                  @toggle="bookmarkScene(index)"
                />
                <!-- <button
                  type="button"
                  class="scene-link"
                  :class="{ copied: copiedScene === index + 1 }"
                  :aria-label="copyLabel(index)"
                  :title="copyLabel(index)"
                  @click.stop="copySceneLink(index)"
                >
                  {{ copyLabel(index) }}
                </button> -->
              </h3>
              <h3 v-else class="scene-heading">
                <span class="scene-title">{{ scene.scene_number }}</span>
                <BookmarkButton
                  :active="isBookmarked(index)"
                  :aria-label="bookmarkAria(index)"
                  :title="bookmarkAria(index)"
                  @toggle="bookmarkScene(index)"
                />
                <!-- <button
                  type="button"
                  class="scene-link"
                  :class="{ copied: copiedScene === index + 1 }"
                  :aria-label="copyLabel(index)"
                  :title="copyLabel(index)"
                  @click.stop="copySceneLink(index)"
                >
                  {{ copyLabel(index) }}
                </button> -->
              </h3>

              <div
                class="narrations"
                v-html="scene.narration"
                tabindex="0"
              ></div>
              <div
                class="narrations"
                v-if="scene.reporter"
                v-html="scene.reporter"
                tabindex="0"
                v-bind:class="{
                  reporter: scene.reporter,
                }"
              ></div>
            </div>
          </article>
        </section>

        <Content class="custom" />
      </div>

      <div class="page-nav" v-if="prev || next">
        <div class="nextprev">
          <router-link v-if="prev" class="nav-card prev" :to="prev.path">
            <span class="nav-kicker">Previous</span>
            <span class="nav-title">{{ prev.title || prev.path }}</span>
            <span class="nav-arrow">←</span>
          </router-link>
          <router-link v-if="next" class="nav-card next" :to="next.path">
            <span class="nav-kicker">Next</span>
            <span class="nav-title">{{ next.title || next.path }}</span>
            <span class="nav-arrow">→</span>
          </router-link>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { normalize } from "../util.js";
import { VueperSlides, VueperSlide } from "vueperslides";
import BookmarkButton from "./BookmarkButton.vue";
import {
  getSupabaseClient,
  SUPABASE_ALBUM_PROGRESS_TABLE,
} from "../supabaseClient";

const pageDir = (path) => {
  const normalized = normalize(path).replace(/\/$/, "");
  const parts = normalized.split("/");
  parts.pop();
  return parts.join("/") || "/";
};

export default {
  name: "Albums",
  data() {
    return {
      isToggle: false,
      jumpToScene: 1,
      bookmarkedScene: null,
      lastSeenScene: null,
      activeSceneIndex: 0,
      copiedScene: null,
      timelineFocusEnabled: false,
      timelineFocusTimeoutId: null,
      supabase: null,
      authUser: null,
    };
  },
  components: {
    VueperSlides,
    VueperSlide,
    BookmarkButton,
  },
  computed: {
    siblingPages() {
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
  },
  watch: {
    "$page.path"() {
      this.jumpToScene = 1;
      this.bookmarkedScene = null;
      this.lastSeenScene = null;
      this.activeSceneIndex = 0;
      this.copiedScene = null;
      this.$nextTick(() => {
        this.loadBookmark();
        this.loadResume();
        this.cacheSceneElements();
      });
    },
    isToggle() {
      this.$nextTick(() => {
        this.cacheSceneElements();
        if (!this.isToggle) {
          this.updateActiveFromScroll();
        }
      });
    },
    "$route.hash"() {
      this.applyHashScene();
    },
  },
  mounted() {
    if (typeof window === "undefined") {
      return;
    }
    this.initSupabase();
    const saved = window.localStorage.getItem("albumsViewMode");
    if (saved === "horizontal") {
      this.isToggle = true;
    } else if (saved === "vertical") {
      this.isToggle = false;
    }
    this.loadBookmark();
    this.loadResume();
    this.$nextTick(() => {
      this.cacheSceneElements();
      this.applyHashScene();
      this.updateActiveFromScroll();
    });
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("keydown", this.handleKeydown);
    window.addEventListener(
      "albums-bookmark-updated",
      this.handleBookmarkUpdate
    );
  },
  beforeDestroy() {
    if (typeof window === "undefined") {
      return;
    }
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("keydown", this.handleKeydown);
    window.removeEventListener(
      "albums-bookmark-updated",
      this.handleBookmarkUpdate
    );
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
    },
    handleAuthSession(session) {
      this.authUser = session ? session.user : null;
      if (this.authUser) {
        this.loadCloudState();
        return;
      }
      this.loadBookmarkLocal();
      this.loadResumeLocal();
    },
    handleBookmarkUpdate() {
      this.loadBookmark();
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
    async loadCloudState() {
      if (!this.useCloud) {
        return;
      }
      if (this._cloudLoadPromise) {
        return this._cloudLoadPromise;
      }
      this._cloudLoadPromise = (async () => {
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
        const cloudBookmark = data ? parseInt(data.bookmark_scene, 10) : null;
        const cloudResume = data ? parseInt(data.resume_scene, 10) : null;
        const mergedBookmark = Number.isFinite(cloudBookmark)
          ? cloudBookmark
          : localBookmark;
        const mergedResume = Number.isFinite(cloudResume)
          ? cloudResume
          : localResume;
        const needsUpsert =
          (Number.isFinite(localBookmark) && !Number.isFinite(cloudBookmark)) ||
          (Number.isFinite(localResume) && !Number.isFinite(cloudResume));
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
        this.setLocalSceneNumber(this.bookmarkKey, mergedBookmark);
        this.setLocalSceneNumber(this.resumeKey, mergedResume);
        if (this.bookmarkedScene && !this.getHashSceneNumber()) {
          this.jumpToScene = this.bookmarkedScene;
          this.$nextTick(() => {
            this.goToScene();
          });
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
      const { error } = await this.supabase
        .from(SUPABASE_ALBUM_PROGRESS_TABLE)
        .upsert(row, { onConflict: "user_id,page_path" });
      if (error) {
        console.warn("Unable to save cloud album state.", error);
      }
    },
    queueCloudResumeUpdate(sceneNumber) {
      if (!this.useCloud) {
        return;
      }
      this._pendingResumeScene = sceneNumber;
      if (this._resumeSyncTimer) {
        window.clearTimeout(this._resumeSyncTimer);
      }
      this._resumeSyncTimer = window.setTimeout(() => {
        const pending = this._pendingResumeScene;
        this._pendingResumeScene = null;
        this._resumeSyncTimer = null;
        if (Number.isFinite(pending)) {
          this.upsertCloudState({ resume_scene: pending });
        }
      }, 1200);
    },
    toggleView() {
      this.isToggle = !this.isToggle;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "albumsViewMode",
          this.isToggle ? "horizontal" : "vertical"
        );
      }
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
      if (this.isToggle && (key === "ArrowRight" || key === "ArrowLeft")) {
        return;
      }
      const tagName = event.target && event.target.tagName;
      const isInput =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        (event.target && event.target.isContentEditable);
      if (isInput) {
        return;
      }
      if (key === "ArrowRight" || key === "j" || key === "J") {
        event.preventDefault();
        this.enableTimelineFocus();
        this.jumpRelative(1);
        return;
      }
      if (key === "ArrowLeft" || key === "k" || key === "K") {
        event.preventDefault();
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
      });
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

<style lang="stylus" scoped>
@import '../styles/config.styl';
@require '../styles/wrapper.styl';

.blog {
  text-shadow: 2px 2px #083832;
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
  background: lighten(#ffbf46, 10%);
}

.blog h2 {
  font-weight: 700;
  line-height: 1.3;
}

.page-nav {
  margin-block: 0.6rem 1.6rem;
}

.nextprev {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  width: 100%;
}

.nav-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #fff;
  background: linear-gradient(145deg, #111 0%, #161616 100%);
  border: 1px solid #242424;
  border-radius: 0 0 14px 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  padding-block: 0.95rem 1.05rem;
  padding-inline: 1.3rem;
  text-decoration: none;
  transition: transform 0.2s ease, border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.nav-card::after {
  content: '';
  position: absolute;
  height: 4px;
  background: $accentColor;
  inset-block-start: 0;
  inset-inline: 0;
}

.nav-card:hover {
  transform: translateY(-2px);
  border-color: $accentColor;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28);
}

.nav-card.prev {
  padding-inline-start: 2.8rem;
}

.nav-card.next {
  text-align: right;
  padding-inline-end: 2.8rem;
}

.nav-kicker {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: lighten($textColor, 20%);
}

.nav-title {
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.2;
}

.nav-arrow {
  position: absolute;
  transform: translateY(-50%);
  width: 2.1rem;
  height: 2.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #151515;
  background: s('oklch(from %s l c h / 0.9)', $accentColor);
  border-radius: 999px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  text-shadow: none;
  inset-block-start: 50%;
}

.nav-card.prev .nav-arrow {
  inset-inline-start: -0.9rem;
}

.nav-card.next .nav-arrow {
  inset-inline-end: -0.9rem;
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
  color: $navColor;
}

.value {
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.5;
  color: $accentColor;
}

.value a {
  color: #fff;
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

.view-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.view-status {
  font-size: 1rem;
  font-weight: 700;
  color: $navColor;
}

.toggle-button {
  font-size: 1.4rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-weight: 900;
  line-height: 1.4;
  color: #fff;
  text-shadow: 2px 2px #083832;
  background-color: #d20083;
  box-shadow: #d20083 0px 5px 25px -10px;
  border: 1px solid #000;
  border-radius: 10px;
  padding-block: 0.35em 0.42em;
  padding-inline: 1.1em;
  transition: all 0.2s ease-in-out;
  width: auto;
}

.toggle-button:hover {
  background-color: darken(#d20083, 35%);
  transform: scale(1.01);
  cursor: pointer;
}

.scene-jump {
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.jump-label {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: $navColor;
}

.jump-controls {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.jump-controls select {
  width: 6.5rem;
  font-size: 1rem;
  color: #fff;
  background: #1a1a1a;
  border: 1px solid #ffbf46;
  border-radius: 6px;
  padding-block: 0.35rem;
  padding-inline: 0.6rem 1.6rem;
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
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffbf46;
  background: #1a1a1a;
  border: 1px solid #ffbf46;
  border-radius: 999px;
  padding-block: 0.3rem;
  padding-inline: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.scene-button:hover {
  background: #ffbf46;
  color: #1a1a1a;
}

.scene-count {
  font-size: 0.95rem;
  font-weight: 600;
  color: lighten($textColor, 25%);
}

.scene-timeline {
  position: sticky;
  top: 0;
  z-index: 5;
  overflow-x: auto;
  background: #111;
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
  background: #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 999px;
  padding-block: 0;
  padding-inline: 0.2rem;
}

.timeline-track::before {
  content: '';
  position: absolute;
  height: 100%;
  width: var(--progress);
  background: $accentColor;
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
  background: #3a3a3a;
  border: 1px solid #1f1f1f;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out,
    background 0.15s ease-in-out;
}

.timeline-dot.completed:not(.death):not(.reporter) {
  background: hsl(30, 100%, 45%);
  border-color: #2a2a2a;
}

.timeline-dot.active {
  transform: scale(1.35);
  box-shadow: 0 0 0 3px rgba(255, 191, 70, 0.45);
}

.timeline-dot.active:not(.death):not(.reporter) {
  background: $accentColor;
  border-color: darken($accentColor, 35%);
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
  color: lighten($textColor, 25%);
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
  border: 1px solid #1a1a1a;
  border-radius: 50%;
  background: #444;
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
  border-bottom: 3px solid darken($accentColor, 20%);
  background-color: #1a1a1a;
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
  color: lighten($textColor, 25%);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  padding-block: 0.1rem;
  padding-inline: 0.55rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.scene-link:hover {
  color: $accentColor;
  border-color: $accentColor;
}

.scene-link.copied {
  background: $accentColor;
  color: #1a1a1a;
  border-color: $accentColor;
}


.h-narration p {
  font-size: 1.1rem;
  line-height: 1.6 !important;
  padding: 0 !important;
  margin: 0;
  max-height: 9.7rem;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 191, 70, 0.7) rgba(255, 255, 255, 0.08);
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

.h-narration p::-webkit-scrollbar {
  width: 8px;
}

.h-narration p::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}

.h-narration p::-webkit-scrollbar-thumb {
  background: rgba(255, 191, 70, 0.7);
  border-radius: 999px;
}

.scenes {
  width: 100%;
  max-width: 1050px;
  height: auto;
  display: block;
  margin-top: 1rem;
}

article + article {
  margin: 3rem 0;
}

h2 {
  font-size: 3.5rem;
  font-weight: 900;
  color: white;
  margin: 1.5rem 0 1rem;
}

.scene-image {
  width: 100%;
  line-height: 0;
  display: block;
  transition: box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out;
}

.scene-image:hover {
  box-shadow: 0 3px 0 0 hsla(45.3, 75%, 43.7%, 1);
  transform: scale(1.007);
}

.text {
  border-bottom: 3px solid darken($accentColor, 20%);
  background-color: #1a1a1a;
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
  text-shadow: 2px 2px #08201d;
  padding: 0;
  margin: 0;
}

.reporter {
  font-size: 1.1rem;
  font-weight: 400;
}

.blog {
  @extend $wrapper;
}

.page-nav {
  padding: 0.2rem 0 0 0;
}

@media (max-width: $MQMobile) {
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

  .toggle-button {
    width: 100%;
  }

  .scene-jump {
    width: 100%;
  }

  .nextprev {
    grid-template-columns: 1fr;
  }

  .nav-card {
    text-align: left;
    gap: 0.2rem;
    padding-block: 0.6rem 0.7rem;
    padding-inline: 0.9rem;
    border-radius: 0 0 12px 12px;
  }

  .nav-card.next {
    padding-right: 0.9rem;
  }

  .nav-card.next .nav-arrow {
    right: 0.5rem;
  }

  .nav-card.prev {
    padding-left: 0.9rem;
  }

  .nav-card.prev .nav-arrow {
    left: 0.5rem;
  }

  .nav-arrow {
    width: 1.8rem;
    height: 1.8rem;
    display: none;
  }

  .nav-kicker {
    font-size: 0.62rem;
    letter-spacing: 0.08em;
  }

  .nav-title {
    font-size: 0.95rem;
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

@media (max-width: $MQNarrow) {
  .blog {
    margin: 0 1rem;
  }

  .blog h1 {
    margin-top: 0.5rem;
  }
}

@media (max-width: $MQMobileNarrow) {
  .blog__title {
    font-size: 2.5rem;
  }
}
</style>
