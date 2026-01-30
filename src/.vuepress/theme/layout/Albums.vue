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
                <div class="scene-reactions">
                  <div class="reaction-list">
                    <button
                      v-for="reaction in reactionDisplay(sceneNumber(index))
                        .top"
                      :key="reaction.key"
                      type="button"
                      class="reaction-pill"
                      :class="{
                        active:
                          userReaction(sceneNumber(index)) === reaction.key,
                      }"
                      :aria-pressed="
                        userReaction(sceneNumber(index)) === reaction.key
                      "
                      :aria-label="reaction.label"
                      :title="reaction.label"
                      :disabled="!authUser"
                      @click.stop="
                        toggleReaction(sceneNumber(index), reaction.key)
                      "
                    >
                      <span class="reaction-emoji">{{ reaction.emoji }}</span>
                      <span class="reaction-count">
                        {{ reaction.count }}
                      </span>
                    </button>
                    <button
                      v-if="reactionDisplay(sceneNumber(index)).rest.length"
                      type="button"
                      class="reaction-more"
                      :aria-expanded="isReactionMenuOpen(sceneNumber(index))"
                      @click.stop="toggleReactionMenu(sceneNumber(index))"
                    >
                      {{
                        isReactionMenuOpen(sceneNumber(index))
                          ? "Less"
                          : `+${
                              reactionDisplay(sceneNumber(index)).rest.length
                            }`
                      }}
                    </button>
                  </div>
                  <div
                    v-if="
                      isReactionMenuOpen(sceneNumber(index)) &&
                      reactionDisplay(sceneNumber(index)).rest.length
                    "
                    class="reaction-more-panel"
                  >
                    <button
                      v-for="reaction in reactionDisplay(sceneNumber(index))
                        .rest"
                      :key="reaction.key"
                      type="button"
                      class="reaction-pill"
                      :class="{
                        active:
                          userReaction(sceneNumber(index)) === reaction.key,
                      }"
                      :aria-pressed="
                        userReaction(sceneNumber(index)) === reaction.key
                      "
                      :aria-label="reaction.label"
                      :title="reaction.label"
                      :disabled="!authUser"
                      @click.stop="
                        toggleReaction(sceneNumber(index), reaction.key)
                      "
                    >
                      <span class="reaction-emoji">{{ reaction.emoji }}</span>
                      <span class="reaction-count">{{ reaction.count }}</span>
                    </button>
                  </div>
                  <span v-if="!authUser" class="reaction-hint">
                    Sign in to react
                  </span>
                </div>
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
              <div class="scene-reactions">
                <div class="reaction-list">
                  <button
                    v-for="reaction in reactionDisplay(sceneNumber(index)).top"
                    :key="reaction.key"
                    type="button"
                    class="reaction-pill"
                    :class="{
                      active: userReaction(sceneNumber(index)) === reaction.key,
                    }"
                    :aria-pressed="
                      userReaction(sceneNumber(index)) === reaction.key
                    "
                    :aria-label="reaction.label"
                    :title="reaction.label"
                    :disabled="!authUser"
                    @click.stop="
                      toggleReaction(sceneNumber(index), reaction.key)
                    "
                  >
                    <span class="reaction-emoji">{{ reaction.emoji }}</span>
                    <span class="reaction-count">
                      {{ reaction.count }}
                    </span>
                  </button>
                  <button
                    v-if="reactionDisplay(sceneNumber(index)).rest.length"
                    type="button"
                    class="reaction-more"
                    :aria-expanded="isReactionMenuOpen(sceneNumber(index))"
                    @click.stop="toggleReactionMenu(sceneNumber(index))"
                  >
                    {{
                      isReactionMenuOpen(sceneNumber(index))
                        ? "Less"
                        : `+${reactionDisplay(sceneNumber(index)).rest.length}`
                    }}
                  </button>
                </div>
                <div
                  v-if="
                    isReactionMenuOpen(sceneNumber(index)) &&
                    reactionDisplay(sceneNumber(index)).rest.length
                  "
                  class="reaction-more-panel"
                >
                  <button
                    v-for="reaction in reactionDisplay(sceneNumber(index)).rest"
                    :key="reaction.key"
                    type="button"
                    class="reaction-pill"
                    :class="{
                      active: userReaction(sceneNumber(index)) === reaction.key,
                    }"
                    :aria-pressed="
                      userReaction(sceneNumber(index)) === reaction.key
                    "
                    :aria-label="reaction.label"
                    :title="reaction.label"
                    :disabled="!authUser"
                    @click.stop="
                      toggleReaction(sceneNumber(index), reaction.key)
                    "
                  >
                    <span class="reaction-emoji">{{ reaction.emoji }}</span>
                    <span class="reaction-count">{{ reaction.count }}</span>
                  </button>
                </div>
                <span v-if="!authUser" class="reaction-hint">
                  Sign in to react
                </span>
              </div>
            </div>
          </article>
        </section>

        <Content class="custom" />

        <section v-if="showComments" class="album-comments">
          <div class="comments-header">
            <h2>Supporter Comments</h2>
            <p class="comments-subtitle">
              Supporters can leave one comment within a week of release.
              <span v-if="commentWindowLabel">
                Comments close {{ commentWindowLabel }}.
              </span>
            </p>
          </div>
          <div class="comment-form">
            <p v-if="!authUser" class="comment-note">
              Sign in to leave a comment.
            </p>
            <p v-else-if="!canSupporterComment" class="comment-note">
              Supporters only can comment.
            </p>
            <p v-else-if="!commentWindowOpen" class="comment-note">
              Comment window has closed for this episode.
            </p>
            <div v-else>
              <div
                v-if="userComment && !commentEditing"
                class="comment-note comment-note--row"
              >
                <span>You already left a comment.</span>
                <div class="comment-inline-actions" v-if="commentWindowOpen">
                  <button
                    type="button"
                    class="comment-link"
                    @click="startEditComment"
                  >
                    Edit comment
                  </button>
                  <button
                    type="button"
                    class="comment-link comment-link--danger"
                    @click="deleteComment"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div v-else class="comment-editor">
                <textarea
                  class="comment-input"
                  v-model="commentDraft"
                  :maxlength="commentMaxLength"
                  rows="4"
                  placeholder="Post a comment for all posterity..."
                ></textarea>
                <div class="comment-actions">
                  <button
                    type="button"
                    class="comment-button comment-button--ghost"
                    :disabled="commentSaving || !commentDraft.trim()"
                    @click="previewComment"
                  >
                    Preview before Posting
                  </button>
                  <button
                    type="button"
                    class="comment-button"
                    :disabled="commentSaving || !canSubmitComment"
                    @click="submitComment"
                  >
                    {{ userComment ? "Update Comment" : "Post Comment" }}
                  </button>
                  <button
                    v-if="userComment"
                    type="button"
                    class="comment-link"
                    @click="cancelEditComment"
                  >
                    Cancel
                  </button>
                  <button
                    v-if="userComment"
                    type="button"
                    class="comment-link comment-link--danger"
                    @click="deleteComment"
                  >
                    Delete
                  </button>
                  <span class="comment-count">
                    {{ commentDraft.length }}/{{ commentMaxLength }}
                  </span>
                </div>
                <div v-if="commentPreview" class="comment-preview">
                  <div class="comment-preview-label">Preview</div>
                  <article class="comment-card comment-card--preview">
                    <div
                      class="comment-civ"
                      :style="commentCivStyle(commentPreview)"
                    >
                      <span class="comment-civ-tooltip">
                        {{ commentPreview.civ_label || "No civ preference" }}
                      </span>
                    </div>
                    <div class="comment-body">
                      <div class="comment-header">
                        <span class="comment-name">
                          {{ commentPreview.username || "Supporter" }}
                        </span>
                        <span v-if="commentPreview.flair" class="comment-flair">
                          {{ commentPreview.flair }}
                        </span>
                      </div>
                      <p class="comment-text">{{ commentPreview.message }}</p>
                    </div>
                  </article>
                </div>
                <p v-if="commentMessage" class="comment-note">
                  {{ commentMessage }}
                </p>
              </div>
            </div>
          </div>
          <div class="comment-list">
            <p v-if="commentsLoading" class="comment-note">
              Loading comments...
            </p>
            <p
              v-else-if="!comments.length"
              class="comment-note comment-note--empty"
            >
              No comments yet.
            </p>
            <div v-else class="comment-cards">
              <article
                v-for="comment in comments"
                :key="comment.id"
                class="comment-card"
              >
                <div class="comment-civ" :style="commentCivStyle(comment)">
                  <span class="comment-civ-tooltip">
                    {{ comment.civ_label || "No civ preference" }}
                  </span>
                </div>
                <div class="comment-body">
                  <div class="comment-header">
                    <span class="comment-name">
                      {{ comment.username || "Supporter" }}
                    </span>
                    <span v-if="comment.flair" class="comment-flair">
                      {{ comment.flair }}
                    </span>
                  </div>
                  <p class="comment-text">{{ comment.message }}</p>
                </div>
              </article>
            </div>
          </div>
        </section>
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
import { normalizeOwnerKey, OWNER_COLOR_MAP } from "../../data/civColors.mjs";
import {
  getSupabaseClient,
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

const DEFAULT_REACTION_OPTIONS = [
  { key: "fire", label: "Fire", emoji: "🔥" },
  { key: "heart", label: "Love", emoji: "❤️" },
  { key: "clap", label: "Clap", emoji: "👏" },
  { key: "wow", label: "Wow", emoji: "🤯" },
  { key: "sad", label: "Sad", emoji: "😢" },
];
const REACTION_POLL_INTERVAL = 60000;
const COMMENT_WINDOW_DAYS = 7;
const COMMENT_MAX_LENGTH = 600;
const COMMENT_FALLBACK_PRIMARY = "#6c6c6c";
const COMMENT_FALLBACK_SECONDARY = "#d1c3a1";
const SEASON_FIVE_COMMENT_CUTOFF = new Date(2026, 1, 11, 23, 59, 59, 999);
const SEASON_FIVE_COMMENT_LABEL = new Date(2026, 1, 11);
const RESUME_SYNC_DEBOUNCE = 4000;

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
      commentSaving: false,
      commentEditing: false,
      favoriteCiv: "",
      customFlair: "",
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
          this.$page.frontmatter.edition) ||
        "";
      const normalized = String(edition).trim().toLowerCase();
      return (
        normalized === "s5" ||
        normalized === "season5" ||
        normalized === "season 5"
      );
    },
    showComments() {
      return this.isSeasonFive;
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
      this.jumpToScene = 1;
      this.bookmarkedScene = null;
      this.lastSeenScene = null;
      this.activeSceneIndex = 0;
      this.copiedScene = null;
      this.resetReactions();
      this.comments = [];
      this.commentDraft = "";
      this.commentPreview = null;
      this.commentMessage = "";
      this.commentEditing = false;
      this.$nextTick(() => {
        this.loadBookmark();
        this.loadResume();
        this.loadReactionCounts();
        if (this.showComments) {
          this.loadComments();
        }
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
    window.addEventListener("keydown", this.handleKeydown, true);
    window.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    window.addEventListener(
      "albums-bookmark-updated",
      this.handleBookmarkUpdate
    );
    window.addEventListener("user-settings-synced", this.handleSettingsSync);
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
      this.authProfile = null;
      this.loadReactionCounts();
      if (this.authUser) {
        this.fetchProfile();
        this.loadCloudState();
        return;
      }
      this.loadBookmarkLocal();
      this.loadResumeLocal();
      this.authProfile = null;
      this.commentEditing = false;
      this.commentDraft = "";
      this.commentPreview = null;
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
    reactionCount(sceneNumber, reactionKey) {
      const sceneCounts = this.reactionCounts[sceneNumber] || {};
      return sceneCounts[reactionKey] || 0;
    },
    userReaction(sceneNumber) {
      return this.userReactions[sceneNumber] || null;
    },
    reactionDisplay(sceneNumber) {
      const counts = this.reactionCounts[sceneNumber] || {};
      const userKey = this.userReaction(sceneNumber);
      const ranked = this.reactionOptions
        .map((option, index) => ({
          ...option,
          count: counts[option.key] || 0,
          order: index,
          isUser: option.key === userKey,
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
    isReactionMenuOpen(sceneNumber) {
      return Boolean(this.reactionMenuOpen[sceneNumber]);
    },
    toggleReactionMenu(sceneNumber) {
      this.$set(
        this.reactionMenuOpen,
        sceneNumber,
        !this.reactionMenuOpen[sceneNumber]
      );
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
          .eq("page_path", this.$page.path);
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
          const key = row.reaction_key;
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
            .eq("page_path", this.$page.path)
            .eq("user_id", this.authUser.id);
          if (userError) {
            console.warn("Unable to load user reactions.", userError);
          } else {
            (userData || []).forEach((row) => {
              const scene = parseInt(row.scene_number, 10);
              if (!Number.isFinite(scene)) {
                return;
              }
              if (!row.reaction_key) {
                return;
              }
              userReactions[scene] = row.reaction_key;
            });
          }
        }
        this.reactionCounts = counts;
        this.userReactions = userReactions;
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
      this.reactionUpdating = true;
      const current = this.userReactions[sceneNumber] || null;
      this.userReactions = {
        ...this.userReactions,
        [sceneNumber]: current === reactionKey ? null : reactionKey,
      };
      try {
        if (current === reactionKey) {
          const { error } = await this.supabase
            .from(SUPABASE_ALBUM_REACTIONS_TABLE)
            .delete()
            .eq("user_id", this.authUser.id)
            .eq("page_path", this.$page.path)
            .eq("scene_number", sceneNumber);
          if (error) {
            console.warn("Unable to remove reaction.", error);
          }
        } else {
          const { error } = await this.supabase
            .from(SUPABASE_ALBUM_REACTIONS_TABLE)
            .upsert(
              {
                user_id: this.authUser.id,
                page_path: this.$page.path,
                scene_number: sceneNumber,
                reaction_key: reactionKey,
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
    async fetchProfile() {
      if (!this.useCloud) {
        return;
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
      this.authProfile = data || null;
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
        this._lastCloudResumeScene = Number.isFinite(mergedResume)
          ? mergedResume
          : null;
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
    toggleView() {
      this.isToggle = !this.isToggle;
      if (typeof window !== "undefined") {
        const viewMode = this.isToggle ? "horizontal" : "vertical";
        window.localStorage.setItem("albumsViewMode", viewMode);
        window.dispatchEvent(
          new CustomEvent("user-settings-updated", {
            detail: { albumsViewMode: viewMode },
          })
        );
      }
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
      const mode = event.detail.albumsViewMode;
      if (mode === "horizontal") {
        this.isToggle = true;
      } else if (mode === "vertical") {
        this.isToggle = false;
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
      this.commentMessage = "";
    },
    cancelEditComment() {
      this.commentEditing = false;
      this.commentDraft = "";
      this.commentPreview = null;
      this.commentMessage = "";
    },
    previewComment() {
      if (!this.authUser) {
        this.commentMessage = "Sign in to leave a comment.";
        return;
      }
      if (!this.canSupporterComment) {
        this.commentMessage = "Supporters only can comment.";
        return;
      }
      if (!this.commentWindowOpen) {
        this.commentMessage = "Comment window has closed.";
        return;
      }
      const message = String(this.commentDraft || "").trim();
      if (!message) {
        this.commentMessage = "Enter a comment before previewing.";
        return;
      }
      if (message.length > COMMENT_MAX_LENGTH) {
        this.commentMessage = `Comment must be ${COMMENT_MAX_LENGTH} characters or less.`;
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
      this.commentMessage = "";
    },
    async submitComment() {
      if (!this.authUser) {
        this.commentMessage = "Sign in to leave a comment.";
        return;
      }
      if (!this.canSupporterComment) {
        this.commentMessage = "Supporters only can comment.";
        return;
      }
      if (!this.commentWindowOpen) {
        this.commentMessage = "Comment window has closed.";
        return;
      }
      const message = String(this.commentDraft || "").trim();
      if (!message) {
        this.commentMessage = "Enter a comment before posting.";
        return;
      }
      if (message.length > COMMENT_MAX_LENGTH) {
        this.commentMessage = `Comment must be ${COMMENT_MAX_LENGTH} characters or less.`;
        return;
      }
      if (!this.canSubmitComment) {
        this.commentMessage = "Preview before posting.";
        return;
      }
      if (!this.supabase) {
        this.supabase = getSupabaseClient();
      }
      if (!this.supabase || this.commentSaving) {
        return;
      }
      this.commentSaving = true;
      this.commentMessage = "";
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
            this.commentMessage = "Unable to update comment.";
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
            this.commentMessage = "Unable to save comment.";
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
        this.commentMessage = "Comment window has closed.";
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
        this.commentMessage = "Unable to delete comment.";
        return;
      }
      this.commentDraft = "";
      this.commentPreview = null;
      this.commentEditing = false;
      this.loadComments();
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
  color: lighten($textColor, 20%);
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
  color: $navColor;
  font-size: 1.6rem;
  font-weight: 800;
  color: $navColor;
}

.value {
  color: $accentColor;
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.5;
  color: $accentColor;
}

.value a {
  color: #fff;
  font-weight: 600;
  color: #fff;
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
  color: $navColor;
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
  background-color: darken(#d20083, 35%);
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

.scene-reactions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  margin-block-start: 1.5rem;
  padding-block: 1.5rem .75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.reaction-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reaction-more {
  border: 1px dashed rgba(255, 191, 70, 0.5);
  border-radius: 999px;
  padding-block: 0.15rem;
  padding-inline: 0.6rem;
  background: transparent;
  color: lighten($textColor, 25%);
  font-size: 0.85rem;
  font-weight: 700;
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
  width: 100%;
}

.reaction-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid rgba(255, 191, 70, 0.35);
  border-radius: 999px;
  padding-block: 0.35rem;
  padding-inline: 0.6rem;
  background: rgba(255, 255, 255, 0.06);
  color: lighten($textColor, 20%);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.reaction-pill:hover {
background: #222;
  border-color: rgba(255, 191, 70, 0.9);
  color: #fff;
}

.reaction-pill.active {
  background: #ffbf46;
  color: #1a1a1a;
  border-color: #ffbf46;
}

.reaction-pill:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.reaction-emoji {
  font-size: 1rem;
  line-height: 1;
}

.reaction-count {
  font-weight: 700;
  font-size: 0.75rem;
}

.reaction-hint {
  font-size: 0.75rem;
  color: lighten($textColor, 35%);
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

.album-comments {
  margin-block: 0 1.5rem;
  padding-block-start: 2rem;
  border-top: 1px solid $borderColor;
}

.comments-header h2 {
  font-size: 1.75rem;
  margin: 0;
}

.comments-subtitle {
  font-size: 0.95rem;
  color: lighten($textColor, 25%);
  margin: 0.5rem 0 1rem;
}

.comment-form {
  position: relative;
  background: linear-gradient(145deg, #0f0f0f 0%, #171717 100%);
  border: 1px solid #2b2b2b;
  border-radius: 12px;
  padding: 1rem;
  margin-block-end: 1rem;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}

.comment-input {
  width: -webkit-fill-available;
  min-height: 110px;
  background: radial-gradient(circle at top, #161616 0%, #0b0b0b 70%);
  color: #f5f1e6;
  border: 1px solid rgba(255, 191, 70, 0.25);
  border-radius: 8px;
  padding: 0.75rem 0.9rem;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03),
    0 6px 12px rgba(0, 0, 0, 0.25);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.comment-input:focus {
  outline: none;
  border-color: lighten($accentColor, 5%);
  box-shadow: 0 0 0 2px rgba(255, 191, 70, 0.18),
    0 10px 18px rgba(0, 0, 0, 0.35);
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-block-start: 0.6rem;
}

.comment-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid #f6c55b;
  background: linear-gradient(135deg, #ffbf46 0%, #f7a726 100%);
  color: #1a1a1a;
  font-weight: 800;
  padding: 0.35rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
}

.comment-button:hover {
  background: linear-gradient(135deg, #ffd27a 0%, #ffb13b 100%);
  border-color: #ffd27a;
  transform: translateY(-1px);
}

.comment-button--ghost {
  background: rgba(255, 191, 70, 0.3);
  color: #ffcf70;
  border-color: rgba(255, 191, 70, 0.5);
  box-shadow: none;
}

.comment-button--ghost:hover {
  background: rgba(255, 191, 70, 0.4);
  transform: translateY(-1px);
}

.comment-button:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.comment-link {
  background: transparent;
  border: 0;
  color: $accentColor;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
}

.comment-count {
  margin-inline-start: auto;
  font-size: 0.8rem;
  color: lighten($textColor, 30%);
}

.comment-preview {
  margin-block-start: 0.9rem;
  padding: 0.85rem;
  border-radius: 10px;
  border: 1px dashed rgba(255, 191, 70, 0.35);
  background: #121212;
}

.comment-preview-label {
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: lighten($textColor, 30%);
  margin-block-end: 0.6rem;
}

.comment-list {
  display: grid;
  gap: 0.8rem;
}

.comment-cards {
  display: grid;
  gap: 0.8rem;
}

.comment-card {
  display: flex;
  gap: 0.85rem;
  background: linear-gradient(145deg, #111 0%, #191919 100%);
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 0.9rem 1rem;
}

.comment-civ {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: var(--civ-primary);
  border: 2px solid var(--civ-secondary);
  flex: 0 0 auto;
  position: relative;
  margin-block-start: 0.1rem;
  cursor: pointer;
}

.comment-civ-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #1a1a1a;
  color: #fff;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  white-space: nowrap;
  font-size: 0.95rem;
  font-weight: 500;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  margin-bottom: 0.5rem;
  z-index: 10;
  border: 1px solid rgba(255, 191, 70, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.comment-civ-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #1a1a1a;
  filter: drop-shadow(0 1px 0px rgba(255,191,70,0.3));
}

.comment-civ:hover .comment-civ-tooltip {
  opacity: 1;
}

.comment-body {
  flex: 1;
}

  .comment-header {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 0.75rem;
    margin-block-end: 0.25rem;
  }

.comment-name {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
}

.comment-flair {
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
  text-shadow: none;
  background: #171717;
  border: 1px solid rgba(255, 191, 70, 0.35);
  border-radius: 1rem;
  padding: 0.25rem 0.75rem;
}

.comment-text {
  margin: 0;
  line-height: 1.4;
  color: #f0f0f0;
  white-space: pre-line;
}

.comment-note {
  margin: 0;
  font-size: 0.9rem;
  color: lighten($textColor, 25%);
}

.comment-note--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.comment-inline-actions {
  display: inline-flex;
  gap: 0.7rem;
  align-items: center;
}

.comment-note--empty {
  text-align: center;
  padding-block: 0.5rem;
}

.comment-link--danger {
  color: #f08c7a;
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
