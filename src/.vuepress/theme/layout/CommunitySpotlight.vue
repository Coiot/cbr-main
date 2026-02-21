<template>
  <transition name="fade">
    <div class="community-spotlight">
      <!-- <div class="spotlight-intro">
        <Content custom />
      </div> -->

      <header class="spotlight-hero">
        <h1>Spotlight</h1>
        <p>Community reaction highlights for each episode.</p>
        <!-- <div class="spotlight-hero-meta">
          <span class="spotlight-chip">Season {{ latestSeasonLabel }}</span>
          <span class="spotlight-chip"
            >{{ episodeSpotlights.length }} episodes</span
          >
        </div> -->
      </header>

      <div class="spotlight-toolbar">
        <label
          v-if="seasonOptions.length > 1"
          class="spotlight-season-filter"
          for="spotlight-season-select"
        >
          <span class="spotlight-season-label">Season</span>
          <select
            id="spotlight-season-select"
            v-model="selectedSeasonToken"
            class="spotlight-season-select"
            :disabled="isLoading"
            @change="onSeasonChange"
          >
            <option
              v-for="option in seasonOptions"
              :key="option.token"
              :value="option.token"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <button
          type="button"
          class="spotlight-refresh"
          :disabled="isLoading"
          @click="refreshSpotlights"
        >
          {{ isLoading ? "Refreshing..." : "Refresh Reactions" }}
        </button>
        <span v-if="lastUpdatedLabel" class="spotlight-updated">
          Updated {{ lastUpdatedLabel }}
        </span>
      </div>

      <div class="spotlight-layout">
        <section
          class="spotlight-main"
          aria-label="Spotlight reaction activity"
          :aria-busy="isLoading ? 'true' : 'false'"
        >
          <div v-if="loadError" class="spotlight-error" role="alert">
            {{ loadError }}
          </div>
          <div
            v-else-if="isLoading && !episodeSpotlights.length"
            class="spotlight-loading"
            role="status"
            aria-live="polite"
          >
            Loading spotlight reaction activity...
          </div>
          <div
            v-else-if="!episodeSpotlights.length"
            class="spotlight-empty"
            role="status"
            aria-live="polite"
          >
            No reaction activity is available yet.
            <router-link
              v-if="latestEpisodePath"
              class="spotlight-empty-cta"
              :to="latestEpisodePath"
            >
              Go react to latest episode
            </router-link>
          </div>
          <div v-else class="spotlight-grid">
            <article
              v-for="episode in episodeSpotlights"
              :key="episode.path"
              class="spotlight-card"
            >
              <header class="spotlight-card-header">
                <router-link class="spotlight-episode-link" :to="episode.path">
                  {{ episode.title }}
                </router-link>
                <p class="spotlight-episode-meta">
                  <span v-if="episode.edition">{{ episode.edition }}</span>
                  <span v-if="episode.releaseDate">{{
                    episode.releaseDate
                  }}</span>
                </p>
              </header>

              <div
                v-if="episode.topReactions.length"
                class="spotlight-reaction-tabs"
                role="tablist"
                :aria-label="`Top reactions for ${episode.title}`"
                @keydown="handleReactionTabKeydown($event, episode)"
              >
                <button
                  v-for="reaction in episode.topReactions"
                  :key="`${episode.path}:tab:${reaction.key}`"
                  type="button"
                  class="spotlight-reaction-tab"
                  role="tab"
                  :class="{
                    'is-active': episode.selectedReactionKey === reaction.key,
                  }"
                  :id="reactionTabId(episode, reaction.key)"
                  :aria-selected="
                    episode.selectedReactionKey === reaction.key
                      ? 'true'
                      : 'false'
                  "
                  :aria-controls="reactionPanelId(episode)"
                  :tabindex="
                    episode.selectedReactionKey === reaction.key ? 0 : -1
                  "
                  :title="`${reaction.label} (${reaction.count.toLocaleString(
                    'en-US'
                  )})`"
                  :aria-label="`${
                    reaction.label
                  }, ${reaction.count.toLocaleString('en-US')} reactions`"
                  :data-reaction-key="reaction.key"
                  @click="selectEpisodeReaction(episode, reaction.key)"
                >
                  <span class="spotlight-reaction-emoji">{{
                    reaction.emoji
                  }}</span>
                  <span class="spotlight-reaction-total">{{
                    reaction.count.toLocaleString("en-US")
                  }}</span>
                </button>
              </div>

              <div
                v-if="
                  selectedReactionForEpisode(episode) &&
                  selectedReactionForEpisode(episode).bestScene
                "
                class="spotlight-reaction-panel"
                role="tabpanel"
                :id="reactionPanelId(episode)"
                :aria-labelledby="
                  reactionTabId(
                    episode,
                    selectedReactionForEpisode(episode).key
                  )
                "
              >
                <template
                  v-for="selectedReaction in [
                    selectedReactionForEpisode(episode),
                  ]"
                >
                  <header
                    :key="`${episode.path}:header:${selectedReaction.key}`"
                    class="spotlight-reaction-head"
                  >
                    <span class="spotlight-reaction-left">
                      <span class="spotlight-reaction-emoji">{{
                        selectedReaction.emoji
                      }}</span>
                      <span class="spotlight-reaction-name">{{
                        selectedReaction.label
                      }}</span>
                    </span>
                  </header>

                  <figure
                    :key="`${episode.path}:figure:${selectedReaction.key}`"
                    class="spotlight-reaction-figure"
                  >
                    <img
                      v-if="selectedReaction.bestScene.previewUrl"
                      class="spotlight-scene-preview"
                      :src="selectedReaction.bestScene.previewUrl"
                      :alt="selectedReaction.bestScene.label"
                      loading="lazy"
                    />
                    <div
                      v-else
                      class="spotlight-scene-preview spotlight-scene-preview-empty"
                    >
                      No preview
                    </div>
                    <figcaption class="spotlight-scene-caption">
                      <router-link
                        class="spotlight-scene-link"
                        :to="selectedReaction.bestScene.to"
                        :ref="sceneFocusRef(episode)"
                      >
                        <span class="spotlight-scene-number"
                          >Scene
                          {{ selectedReaction.bestScene.sceneNumber }}</span
                        >
                        <span class="spotlight-scene-title">{{
                          selectedReaction.bestScene.title ||
                          selectedReaction.bestScene.label
                        }}</span>
                      </router-link>
                      <span
                        class="spotlight-scene-count"
                        :title="`${selectedReaction.label} reactions on this scene`"
                      >
                        {{
                          selectedReaction.bestScene.count.toLocaleString(
                            "en-US"
                          )
                        }}
                      </span>
                    </figcaption>
                  </figure>

                  <section
                    v-if="additionalScenesForReaction(selectedReaction).length"
                    :key="`${episode.path}:more:${selectedReaction.key}`"
                    class="spotlight-scene-secondary"
                  >
                    <h3>More Scenes</h3>
                    <ul class="spotlight-scene-secondary-list">
                      <li
                        v-for="scene in additionalScenesForReaction(
                          selectedReaction
                        )"
                        :key="`${episode.path}:scene:${selectedReaction.key}:${scene.sceneNumber}`"
                      >
                        <router-link
                          class="spotlight-scene-secondary-link"
                          :to="scene.to"
                        >
                          <img
                            v-if="scene.previewUrl"
                            class="spotlight-scene-secondary-thumb"
                            :src="scene.previewUrl"
                            :alt="`${scene.label} preview`"
                            loading="lazy"
                          />
                          <span class="spotlight-scene-secondary-label">{{
                            scene.label
                          }}</span>
                        </router-link>
                      </li>
                    </ul>
                  </section>
                </template>
              </div>
            </article>
          </div>
        </section>

        <aside class="spotlight-auth" aria-label="Your spotlight activity">
          <h2 class="spotlight-auth-title">Your Spotlight</h2>
          <div v-if="!authUser" class="spotlight-auth-empty">
            Sign in to view your personal reaction spotlight.
          </div>
          <div v-else-if="userStatsLoading" class="spotlight-auth-muted">
            Loading your reaction activity...
          </div>
          <div v-else class="spotlight-auth-content">
            <p class="spotlight-auth-user">
              Signed in as <strong>{{ authDisplayName }}</strong>
            </p>

            <section class="spotlight-auth-section">
              <h3>Most Used Reactions</h3>
              <ul
                v-if="userTopReactions.length"
                class="spotlight-user-reaction-list"
              >
                <li
                  v-for="reaction in userTopReactions"
                  :key="`user-reaction:${reaction.key}`"
                >
                  <span>{{ reaction.emoji }} {{ reaction.label }}</span>
                  <span>{{ reaction.count.toLocaleString("en-US") }}</span>
                </li>
              </ul>
              <p v-else class="spotlight-auth-muted">
                No reactions recorded yet.
                <router-link
                  v-if="latestEpisodePath"
                  class="spotlight-empty-cta"
                  :to="latestEpisodePath"
                >
                  Go react to latest episode
                </router-link>
              </p>
            </section>

            <div
              v-if="compactUserTabs"
              class="spotlight-auth-tabs"
              role="tablist"
              aria-label="Your spotlight scene tabs"
            >
              <button
                type="button"
                class="spotlight-auth-tab"
                role="tab"
                id="user-spotlight-tab-starred"
                :class="{ 'is-active': userSpotlightTab === 'starred' }"
                :aria-selected="
                  userSpotlightTab === 'starred' ? 'true' : 'false'
                "
                aria-controls="user-spotlight-panel-starred"
                :tabindex="userSpotlightTab === 'starred' ? 0 : -1"
                @click="setUserSpotlightTab('starred')"
              >
                Starred
              </button>
              <button
                type="button"
                class="spotlight-auth-tab"
                role="tab"
                id="user-spotlight-tab-hearted"
                :class="{ 'is-active': userSpotlightTab === 'hearted' }"
                :aria-selected="
                  userSpotlightTab === 'hearted' ? 'true' : 'false'
                "
                aria-controls="user-spotlight-panel-hearted"
                :tabindex="userSpotlightTab === 'hearted' ? 0 : -1"
                @click="setUserSpotlightTab('hearted')"
              >
                Hearted
              </button>
            </div>

            <section
              v-show="!compactUserTabs || userSpotlightTab === 'starred'"
              class="spotlight-auth-section"
              role="tabpanel"
              id="user-spotlight-panel-starred"
              aria-labelledby="user-spotlight-tab-starred"
              :aria-hidden="
                compactUserTabs && userSpotlightTab !== 'starred'
                  ? 'true'
                  : 'false'
              "
            >
              <h3>⭐ Starred Scenes</h3>
              <ul
                v-if="userStarredScenes.length"
                class="spotlight-user-scene-list spotlight-user-scene-list-rich"
              >
                <li
                  v-for="scene in userStarredScenes"
                  :key="`star:${scene.path}:${scene.sceneNumber}`"
                  class="spotlight-user-scene-item"
                >
                  <div class="spotlight-user-scene-top">
                    <span
                      v-if="scene.count > 1"
                      class="spotlight-user-scene-count"
                    >
                      {{ scene.count.toLocaleString("en-US") }}
                    </span>
                  </div>
                  <div class="spotlight-user-scene-link">
                    <img
                      v-if="scene.previewUrl"
                      class="spotlight-user-scene-thumb"
                      :src="scene.previewUrl"
                      :alt="`${scene.sceneLabel} preview`"
                      loading="lazy"
                    />
                    <div class="spotlight-user-scene-meta">
                      <router-link
                        class="spotlight-user-scene-target"
                        :to="scene.to"
                      >
                        {{ scene.sceneLabel }}
                      </router-link>
                      <router-link
                        class="spotlight-user-scene-episode"
                        :to="scene.path"
                        >{{ scene.episodeTitle }}</router-link
                      >
                    </div>
                  </div>
                </li>
              </ul>
              <p v-else class="spotlight-auth-muted">
                You have not starred any scenes yet.
                <router-link
                  v-if="latestEpisodePath"
                  class="spotlight-empty-cta"
                  :to="latestEpisodePath"
                >
                  Go react to latest episode
                </router-link>
              </p>
            </section>

            <section
              v-show="!compactUserTabs || userSpotlightTab === 'hearted'"
              class="spotlight-auth-section"
              role="tabpanel"
              id="user-spotlight-panel-hearted"
              aria-labelledby="user-spotlight-tab-hearted"
              :aria-hidden="
                compactUserTabs && userSpotlightTab !== 'hearted'
                  ? 'true'
                  : 'false'
              "
            >
              <h3>❤️ Hearted Scenes</h3>
              <ul
                v-if="userHeartScenes.length"
                class="spotlight-user-scene-list spotlight-user-scene-list-rich"
              >
                <li
                  v-for="scene in userHeartScenes"
                  :key="`heart:${scene.path}:${scene.sceneNumber}`"
                  class="spotlight-user-scene-item"
                >
                  <div class="spotlight-user-scene-link">
                    <img
                      v-if="scene.previewUrl"
                      class="spotlight-user-scene-thumb"
                      :src="scene.previewUrl"
                      :alt="`${scene.sceneLabel} preview`"
                      loading="lazy"
                    />
                    <div class="spotlight-user-scene-meta">
                      <router-link
                        class="spotlight-user-scene-target"
                        :to="scene.to"
                      >
                        {{ scene.sceneLabel }}
                      </router-link>
                      <router-link
                        class="spotlight-user-scene-episode"
                        :to="scene.path"
                        >{{ scene.episodeTitle }}</router-link
                      >
                    </div>
                  </div>
                </li>
              </ul>
              <p v-else class="spotlight-auth-muted">
                No heart reactions yet.
                <router-link
                  v-if="latestEpisodePath"
                  class="spotlight-empty-cta"
                  :to="latestEpisodePath"
                >
                  Go react to latest episode
                </router-link>
              </p>
            </section>
          </div>
        </aside>
      </div>
    </div>
  </transition>
</template>

<script>
import {
  getSupabaseClient,
  SUPABASE_ALBUM_REACTIONS_TABLE,
} from "../supabaseClient";

const DEFAULT_REACTIONS = [
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

const FETCH_PAGE_SIZE = 1000;
const MAX_FETCH_PAGES = 500;
const SPOTLIGHT_AGGREGATE_TABLE = "album_reaction_spotlight";
const SPOTLIGHT_CACHE_KEY = "community-spotlight-cache-v2";
const SPOTLIGHT_CACHE_TTL_MS = 10 * 60 * 1000;

function normalizeReactionKey(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normalizePagePath(path) {
  const raw = String(path || "").trim();
  if (!raw) {
    return "";
  }
  let next = raw;
  if (!next.startsWith("/")) {
    next = `/${next}`;
  }
  next = next.replace(/\.html?$/i, "/");
  next = next.replace(/\/{2,}/g, "/");
  if (next !== "/" && !next.endsWith("/")) {
    next = `${next}/`;
  }
  return next;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSceneNumber(scene, fallback) {
  const raw =
    scene && scene.scene_number !== undefined && scene.scene_number !== null
      ? scene.scene_number
      : fallback;
  const number = parseInt(raw, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function seasonTokenFromPath(path) {
  const normalized = normalizePagePath(path);
  const match = normalized.match(/^\/albums\/(s\d+)\//i);
  return match && match[1] ? String(match[1]).toLowerCase() : "";
}

function seasonNumberFromToken(token) {
  const match = String(token || "").match(/^s(\d+)$/i);
  const number = match ? parseInt(match[1], 10) : NaN;
  return Number.isFinite(number) ? number : -1;
}

function expandEpisodePathCandidates(paths) {
  const set = new Set();
  (paths || []).forEach((rawPath) => {
    const path = normalizePagePath(rawPath);
    if (!path) {
      return;
    }
    set.add(path);
    if (path !== "/") {
      const noSlash = path.replace(/\/+$/, "");
      set.add(noSlash);
      if (!/\.html?$/i.test(noSlash)) {
        set.add(`${noSlash}.html`);
      }
    }
  });
  return Array.from(set);
}

export default {
  name: "CommunitySpotlight",

  data() {
    return {
      supabase: null,
      isLoading: false,
      loadError: "",
      episodeSpotlights: [],
      episodeLookup: {},
      latestSeasonToken: "",
      selectedSeasonToken: "",
      availableSeasonTokens: [],
      lastUpdatedAt: "",
      authUser: null,
      authDisplayName: "",
      userReactionRows: [],
      userTopReactions: [],
      userStarredScenes: [],
      userHeartScenes: [],
      compactUserTabs: false,
      userSpotlightTab: "starred",
      userStatsLoading: false,
      authSubscription: null,
    };
  },

  computed: {
    reactionOptions() {
      const configured =
        this.$site &&
        this.$site.themeConfig &&
        Array.isArray(this.$site.themeConfig.reactions)
          ? this.$site.themeConfig.reactions
          : [];
      const options = configured.length ? configured : DEFAULT_REACTIONS;
      const seen = new Set();
      return options
        .map((option) => ({
          key: normalizeReactionKey(option && option.key),
          label: String((option && option.label) || option.key || "").trim(),
          emoji: String((option && option.emoji) || "").trim(),
        }))
        .filter((option) => {
          if (!option.key || seen.has(option.key)) {
            return false;
          }
          seen.add(option.key);
          return true;
        });
    },

    reactionMetadataByKey() {
      const lookup = {};
      this.reactionOptions.forEach((reaction, index) => {
        lookup[reaction.key] = {
          key: reaction.key,
          label: reaction.label || reaction.key,
          emoji: reaction.emoji || "*",
          order: index,
        };
      });
      return lookup;
    },

    lastUpdatedLabel() {
      if (!this.lastUpdatedAt) {
        return "";
      }
      const date = new Date(this.lastUpdatedAt);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    },

    latestSeasonLabel() {
      if (!this.latestSeasonToken) {
        return "N/A";
      }
      return this.latestSeasonToken.toUpperCase();
    },

    activeSeasonToken() {
      return this.selectedSeasonToken || this.latestSeasonToken || "";
    },

    seasonOptions() {
      return (this.availableSeasonTokens || []).map((token) => ({
        token,
        label: token.toUpperCase(),
      }));
    },

    latestEpisodePath() {
      if (
        Array.isArray(this.episodeSpotlights) &&
        this.episodeSpotlights.length
      ) {
        const latest = this.episodeSpotlights[0];
        if (latest && latest.path) {
          return latest.path;
        }
      }
      const episodes = Object.values(this.episodeLookup || {});
      if (!episodes.length) {
        return "/albums/";
      }
      const latest = episodes.sort((a, b) => {
        if ((b.sortDate || 0) !== (a.sortDate || 0)) {
          return (b.sortDate || 0) - (a.sortDate || 0);
        }
        return String(a.title || "").localeCompare(String(b.title || ""), "en");
      })[0];
      return (latest && latest.path) || "/albums/";
    },

    spotlightSettings() {
      const themeConfig =
        this.$site && this.$site.themeConfig ? this.$site.themeConfig : {};
      const settings = themeConfig.communitySpotlight;
      return settings && typeof settings === "object" ? settings : {};
    },

    spotlightAggregateTableName() {
      const configured =
        this.spotlightSettings.aggregateTable ||
        this.spotlightSettings.aggregateView;
      const name = configured || SPOTLIGHT_AGGREGATE_TABLE;
      return String(name || "").trim();
    },

    spotlightUseAggregate() {
      if (this.spotlightSettings.useAggregate === false) {
        return false;
      }
      return !!this.spotlightAggregateTableName;
    },

    spotlightCacheTtlMs() {
      const value = Number(this.spotlightSettings.cacheTtlMs);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
      return SPOTLIGHT_CACHE_TTL_MS;
    },
  },

  mounted() {
    this.supabase = getSupabaseClient();
    this.handleViewportChange();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleViewportChange, {
        passive: true,
      });
    }
    this.bindAuth();
    this.loadSpotlights();
  },

  beforeDestroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener(
        "supabase-auth-session",
        this.handleAuthBroadcast
      );
      window.removeEventListener("resize", this.handleViewportChange);
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
  },

  methods: {
    slugFromPath(path) {
      return String(path || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    },
    reactionTabId(episode, reactionKey) {
      return `spotlight-tab-${this.slugFromPath(
        episode && episode.path
      )}-${normalizeReactionKey(reactionKey)}`;
    },
    reactionPanelId(episode) {
      return `spotlight-panel-${this.slugFromPath(episode && episode.path)}`;
    },
    sceneFocusRef(episode) {
      return `spotlight-scene-focus-${this.slugFromPath(
        episode && episode.path
      )}`;
    },
    focusPrimarySceneForEpisode(episode) {
      this.$nextTick(() => {
        const ref = this.$refs[this.sceneFocusRef(episode)];
        const target = Array.isArray(ref) ? ref[0] : ref;
        if (target && typeof target.focus === "function") {
          target.focus();
        }
      });
    },
    handleReactionTabKeydown(event, episode) {
      const key = event && event.key ? event.key : "";
      if (
        key !== "ArrowLeft" &&
        key !== "ArrowRight" &&
        key !== "Home" &&
        key !== "End" &&
        key !== "ArrowDown"
      ) {
        return;
      }

      if (key === "ArrowDown") {
        event.preventDefault();
        this.focusPrimarySceneForEpisode(episode);
        return;
      }

      const tablist = event.currentTarget;
      if (!tablist) {
        return;
      }
      const tabs = Array.from(
        tablist.querySelectorAll(".spotlight-reaction-tab")
      );
      if (!tabs.length) {
        return;
      }

      event.preventDefault();
      let currentIndex = tabs.findIndex(
        (tab) => tab === document.activeElement
      );
      if (currentIndex < 0) {
        currentIndex = tabs.findIndex((tab) =>
          tab.classList.contains("is-active")
        );
      }
      if (currentIndex < 0) {
        currentIndex = 0;
      }

      let nextIndex = currentIndex;
      if (key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (key === "Home") {
        nextIndex = 0;
      } else if (key === "End") {
        nextIndex = tabs.length - 1;
      }

      const nextTab = tabs[nextIndex];
      if (!nextTab) {
        return;
      }
      const reactionKey = normalizeReactionKey(
        nextTab.getAttribute("data-reaction-key")
      );
      if (reactionKey) {
        this.selectEpisodeReaction(episode, reactionKey);
      }
      this.$nextTick(() => {
        nextTab.focus();
      });
    },
    handleViewportChange() {
      if (typeof window === "undefined") {
        this.compactUserTabs = false;
        return;
      }
      const nextCompact = window.innerWidth <= 900;
      if (this.compactUserTabs && !nextCompact) {
        this.userSpotlightTab = "starred";
      }
      this.compactUserTabs = nextCompact;
      if (
        nextCompact &&
        this.userSpotlightTab === "starred" &&
        !this.userStarredScenes.length &&
        this.userHeartScenes.length
      ) {
        this.userSpotlightTab = "hearted";
      }
    },
    setUserSpotlightTab(tab) {
      const normalized = tab === "hearted" ? "hearted" : "starred";
      this.userSpotlightTab = normalized;
    },
    reactionOrderIndex(key) {
      const entry = this.reactionMetadataByKey[key];
      return entry && Number.isFinite(entry.order) ? entry.order : 9999;
    },

    sceneLabelForEpisode(episode, sceneNumber) {
      const title =
        episode && episode.scenesByNumber && episode.scenesByNumber[sceneNumber]
          ? episode.scenesByNumber[sceneNumber]
          : "";
      if (title) {
        return `Scene ${sceneNumber}: ${title}`;
      }
      return `Scene ${sceneNumber}`;
    },

    selectedReactionForEpisode(episode) {
      if (!episode || !Array.isArray(episode.topReactions)) {
        return null;
      }
      if (!episode.topReactions.length) {
        return null;
      }
      const selectedKey = normalizeReactionKey(episode.selectedReactionKey);
      const selected = episode.topReactions.find(
        (reaction) => reaction.key === selectedKey
      );
      return selected || episode.topReactions[0] || null;
    },

    selectEpisodeReaction(episode, reactionKey) {
      if (!episode) {
        return;
      }
      episode.selectedReactionKey = normalizeReactionKey(reactionKey);
    },

    additionalScenesForReaction(reaction) {
      if (!reaction || !Array.isArray(reaction.sceneRankings)) {
        return [];
      }
      return reaction.sceneRankings.slice(1, 5);
    },
    refreshSpotlights() {
      this.loadSpotlights({ forceRefresh: true });
    },
    onSeasonChange() {
      this.loadSpotlights();
    },
    cachePathSignature(episodeLookup) {
      return Object.keys(episodeLookup || {})
        .sort()
        .join("|");
    },
    normalizeSpotlightEpisodes(episodes) {
      return (Array.isArray(episodes) ? episodes : [])
        .map((episode) => {
          const topReactions = Array.isArray(episode.topReactions)
            ? episode.topReactions
            : [];
          const selectedKey = normalizeReactionKey(episode.selectedReactionKey);
          const hasSelected = topReactions.some(
            (reaction) =>
              normalizeReactionKey(reaction && reaction.key) === selectedKey
          );
          return {
            ...episode,
            topReactions,
            selectedReactionKey: hasSelected
              ? selectedKey
              : normalizeReactionKey(
                  topReactions[0] && topReactions[0].key
                    ? topReactions[0].key
                    : ""
                ),
          };
        })
        .filter((episode) => episode && episode.path);
    },
    readSpotlightCache(episodeLookup) {
      if (
        typeof window === "undefined" ||
        !window.localStorage ||
        this.spotlightCacheTtlMs <= 0
      ) {
        return null;
      }
      try {
        const raw = window.localStorage.getItem(SPOTLIGHT_CACHE_KEY);
        if (!raw) {
          return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
          return null;
        }
        if ((parsed.expiresAt || 0) <= Date.now()) {
          window.localStorage.removeItem(SPOTLIGHT_CACHE_KEY);
          return null;
        }
        if ((parsed.seasonToken || "") !== (this.activeSeasonToken || "")) {
          return null;
        }
        if (
          (parsed.pathSignature || "") !==
          this.cachePathSignature(episodeLookup)
        ) {
          return null;
        }
        if (!Array.isArray(parsed.episodeSpotlights)) {
          return null;
        }
        if (this.hasUnknownReactionKeysInEpisodes(parsed.episodeSpotlights)) {
          window.localStorage.removeItem(SPOTLIGHT_CACHE_KEY);
          return null;
        }
        return parsed;
      } catch (error) {
        return null;
      }
    },
    writeSpotlightCache(
      episodeLookup,
      episodeSpotlights,
      lastUpdatedAt,
      source
    ) {
      if (
        typeof window === "undefined" ||
        !window.localStorage ||
        this.spotlightCacheTtlMs <= 0
      ) {
        return;
      }
      try {
        const now = Date.now();
        const payload = {
          cachedAt: now,
          expiresAt: now + this.spotlightCacheTtlMs,
          seasonToken: this.activeSeasonToken || "",
          pathSignature: this.cachePathSignature(episodeLookup),
          source: source || "raw",
          lastUpdatedAt: lastUpdatedAt || new Date(now).toISOString(),
          episodeSpotlights: this.normalizeSpotlightEpisodes(episodeSpotlights),
        };
        window.localStorage.setItem(
          SPOTLIGHT_CACHE_KEY,
          JSON.stringify(payload)
        );
      } catch (error) {
        // Ignore storage quota/security errors.
      }
    },
    isMissingAggregateSourceError(error) {
      const code = String((error && error.code) || "");
      if (code === "42P01" || code === "PGRST205") {
        return true;
      }
      const message = String((error && error.message) || "").toLowerCase();
      return (
        message.includes("does not exist") ||
        message.includes("could not find the table")
      );
    },
    shouldRejectAggregateRows(rows) {
      const list = Array.isArray(rows) ? rows : [];
      if (!list.length) {
        return false;
      }
      const unknown = list.reduce((count, row) => {
        const key = normalizeReactionKey(row && row.reaction_key);
        if (!key) {
          return count + 1;
        }
        return this.reactionMetadataByKey[key] ? count : count + 1;
      }, 0);
      return unknown > 0;
    },
    hasUnknownReactionKeysInEpisodes(episodes) {
      const list = Array.isArray(episodes) ? episodes : [];
      return list.some((episode) => {
        const reactions = Array.isArray(episode && episode.topReactions)
          ? episode.topReactions
          : [];
        return reactions.some((reaction) => {
          const key = normalizeReactionKey(reaction && reaction.key);
          return !key || !this.reactionMetadataByKey[key];
        });
      });
    },

    buildEpisodeLookup() {
      const pages = (this.$site && this.$site.pages) || [];
      const lookup = {};
      const seasonTokens = new Set();
      pages.forEach((page) => {
        if (!page || typeof page.path !== "string") {
          return;
        }
        const frontmatter = page.frontmatter || {};
        if (frontmatter.pr || frontmatter.exclude) {
          return;
        }
        const path = normalizePagePath(page.path);
        if (!path || path === "/albums/" || !path.startsWith("/albums/")) {
          return;
        }
        const seasonToken = seasonTokenFromPath(path);
        if (!seasonToken) {
          return;
        }
        const title = String(frontmatter.title || page.title || "").trim();
        if (!title) {
          return;
        }
        const scenesByNumber = {};
        const scenePreviewByNumber = {};
        const scenes = Array.isArray(frontmatter.scenes)
          ? frontmatter.scenes
          : [];
        scenes.forEach((scene, index) => {
          const sceneNumber = parseSceneNumber(scene, index + 1);
          const sceneTitle = stripHtml(
            (scene && (scene.scene_title || scene.scene_title_html)) || ""
          );
          if (sceneTitle) {
            scenesByNumber[sceneNumber] = sceneTitle;
          }
          const previewUrl = String(
            (scene && (scene.slide_url || scene.slide_svg || "")) || ""
          ).trim();
          if (previewUrl) {
            scenePreviewByNumber[sceneNumber] = previewUrl;
          }
        });
        const sortDateValue = new Date(
          frontmatter.date || frontmatter.release_date || 0
        ).getTime();
        seasonTokens.add(seasonToken);
        lookup[path] = {
          path,
          seasonToken,
          title,
          edition: String(frontmatter.edition || "").trim(),
          releaseDate: String(frontmatter.release_date || "").trim(),
          sortDate: Number.isFinite(sortDateValue) ? sortDateValue : 0,
          scenesByNumber,
          scenePreviewByNumber,
        };
      });
      const latestSeasonToken = Array.from(seasonTokens).sort(
        (a, b) => seasonNumberFromToken(b) - seasonNumberFromToken(a)
      )[0];
      this.latestSeasonToken = latestSeasonToken || "";
      const orderedTokens = Array.from(seasonTokens).sort(
        (a, b) => seasonNumberFromToken(b) - seasonNumberFromToken(a)
      );
      this.availableSeasonTokens = orderedTokens;
      const chosenToken =
        this.selectedSeasonToken &&
        orderedTokens.includes(this.selectedSeasonToken)
          ? this.selectedSeasonToken
          : latestSeasonToken || "";
      if (this.selectedSeasonToken !== chosenToken) {
        this.selectedSeasonToken = chosenToken;
      }
      if (!chosenToken) {
        return lookup;
      }
      const filtered = {};
      Object.keys(lookup).forEach((path) => {
        const episode = lookup[path];
        if (episode && episode.seasonToken === chosenToken) {
          filtered[path] = episode;
        }
      });
      return filtered;
    },
    async fetchAggregatedReactionRows() {
      const tableName = this.spotlightAggregateTableName;
      if (!tableName) {
        return [];
      }
      const rows = [];
      for (let page = 0; page < MAX_FETCH_PAGES; page += 1) {
        const from = page * FETCH_PAGE_SIZE;
        const to = from + FETCH_PAGE_SIZE - 1;
        const { data, error } = await this.supabase
          .from(tableName)
          .select("page_path,scene_number,reaction_key,reaction_count")
          .like("page_path", "/albums/%")
          .range(from, to);
        if (error) {
          throw error;
        }
        const batch = Array.isArray(data) ? data : [];
        if (!batch.length) {
          break;
        }
        rows.push(...batch);
        if (batch.length < FETCH_PAGE_SIZE) {
          break;
        }
      }
      return rows;
    },

    async fetchAllReactionRows(queryBuilder, options = {}) {
      const albumsOnly = options.albumsOnly !== false;
      const rows = [];
      for (let page = 0; page < MAX_FETCH_PAGES; page += 1) {
        const from = page * FETCH_PAGE_SIZE;
        const to = from + FETCH_PAGE_SIZE - 1;
        let query = queryBuilder
          ? queryBuilder(this.supabase.from(SUPABASE_ALBUM_REACTIONS_TABLE))
          : this.supabase.from(SUPABASE_ALBUM_REACTIONS_TABLE);
        query = query.select("page_path,scene_number,reaction_key");
        if (albumsOnly) {
          query = query.like("page_path", "/albums/%");
        }
        const { data, error } = await query.range(from, to);
        if (error) {
          throw error;
        }
        const batch = Array.isArray(data) ? data : [];
        if (!batch.length) {
          break;
        }
        rows.push(...batch);
        if (batch.length < FETCH_PAGE_SIZE) {
          break;
        }
      }
      return rows;
    },
    async fetchSpotlightRows() {
      if (this.spotlightUseAggregate) {
        try {
          const rows = await this.fetchAggregatedReactionRows();
          if (!this.shouldRejectAggregateRows(rows)) {
            return {
              rows,
              source: "aggregate",
            };
          }
        } catch (error) {
          if (!this.isMissingAggregateSourceError(error)) {
            throw error;
          }
        }
      }
      const rows = await this.fetchAllReactionRows();
      return {
        rows,
        source: "raw",
      };
    },

    buildSpotlights(reactionRows, episodeLookup) {
      const perEpisode = {};
      (reactionRows || []).forEach((row) => {
        const pagePath = normalizePagePath(row && row.page_path);
        if (!pagePath || !episodeLookup[pagePath]) {
          return;
        }
        const sceneNumber = parseInt(row.scene_number, 10);
        if (!Number.isFinite(sceneNumber) || sceneNumber <= 0) {
          return;
        }
        const reactionKey = normalizeReactionKey(row.reaction_key);
        if (!reactionKey) {
          return;
        }
        const rawCount =
          row && row.reaction_count !== undefined && row.reaction_count !== null
            ? Number(row.reaction_count)
            : NaN;
        const weight = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 1;
        if (!perEpisode[pagePath]) {
          perEpisode[pagePath] = {
            reactionTotals: {},
            sceneTotals: {},
          };
        }
        const bucket = perEpisode[pagePath];
        bucket.reactionTotals[reactionKey] =
          (bucket.reactionTotals[reactionKey] || 0) + weight;
        if (!bucket.sceneTotals[sceneNumber]) {
          bucket.sceneTotals[sceneNumber] = {};
        }
        bucket.sceneTotals[sceneNumber][reactionKey] =
          (bucket.sceneTotals[sceneNumber][reactionKey] || 0) + weight;
      });

      return Object.keys(perEpisode)
        .map((pagePath) => {
          const episode = episodeLookup[pagePath];
          const totals = perEpisode[pagePath].reactionTotals;
          const sceneTotals = perEpisode[pagePath].sceneTotals;
          const topReactions = Object.keys(totals)
            .sort((a, b) => {
              if (totals[b] !== totals[a]) {
                return totals[b] - totals[a];
              }
              return this.reactionOrderIndex(a) - this.reactionOrderIndex(b);
            })
            .map((reactionKey) => {
              const meta = this.reactionMetadataByKey[reactionKey] || {
                key: reactionKey,
                label: reactionKey,
                emoji: "*",
              };
              const sceneRankings = Object.keys(sceneTotals)
                .map((sceneRaw) => parseInt(sceneRaw, 10))
                .filter((sceneNumber) => Number.isFinite(sceneNumber))
                .sort((a, b) => {
                  const countA = sceneTotals[a][reactionKey] || 0;
                  const countB = sceneTotals[b][reactionKey] || 0;
                  if (countB !== countA) {
                    return countB - countA;
                  }
                  return a - b;
                })
                .map((sceneNumber) => ({
                  sceneNumber,
                  label: this.sceneLabelForEpisode(episode, sceneNumber),
                  title:
                    (episode.scenesByNumber &&
                      episode.scenesByNumber[sceneNumber]) ||
                    "",
                  to: `${episode.path}#scene-${sceneNumber}`,
                  count:
                    (sceneTotals[sceneNumber] &&
                      sceneTotals[sceneNumber][reactionKey]) ||
                    0,
                  previewUrl:
                    (episode.scenePreviewByNumber &&
                      episode.scenePreviewByNumber[sceneNumber]) ||
                    "",
                }))
                .filter((scene) => scene.count > 0);
              const bestScene = sceneRankings[0] || null;
              return {
                key: reactionKey,
                label: meta.label,
                emoji: meta.emoji,
                count: totals[reactionKey] || 0,
                bestScene,
                sceneRankings,
              };
            })
            .filter((reaction) => reaction.bestScene);
          if (!episode || !topReactions.length) {
            return null;
          }
          return {
            ...episode,
            topReactions,
            selectedReactionKey: topReactions[0].key,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if ((b.sortDate || 0) !== (a.sortDate || 0)) {
            return (b.sortDate || 0) - (a.sortDate || 0);
          }
          return a.title.localeCompare(b.title, "en");
        });
    },

    async bindAuth() {
      if (!this.supabase) {
        return;
      }
      if (typeof window !== "undefined") {
        window.addEventListener(
          "supabase-auth-session",
          this.handleAuthBroadcast
        );
      }
      const { data } = this.supabase.auth.onAuthStateChange(
        (_event, session) => {
          this.setAuthUser(session && session.user ? session.user : null);
        }
      );
      this.authSubscription = data ? data.subscription : null;
      const { data: sessionData } = await this.supabase.auth.getSession();
      this.setAuthUser(
        sessionData && sessionData.session ? sessionData.session.user : null
      );
    },

    handleAuthBroadcast(event) {
      const detail = (event && event.detail) || {};
      const user =
        detail.user || (detail.session && detail.session.user) || null;
      this.setAuthUser(user);
    },

    async setAuthUser(user) {
      const nextId = user && user.id ? user.id : "";
      const currentId =
        this.authUser && this.authUser.id ? this.authUser.id : "";
      this.authUser = user || null;
      if (!nextId) {
        this.authDisplayName = "";
        this.userReactionRows = [];
        this.userTopReactions = [];
        this.userStarredScenes = [];
        this.userHeartScenes = [];
        this.userStatsLoading = false;
        return;
      }
      if (nextId === currentId && this.userReactionRows.length) {
        return;
      }
      await this.loadAuthProfileName();
      await this.loadUserReactionStats();
    },

    async loadAuthProfileName() {
      if (!this.supabase || !this.authUser || !this.authUser.id) {
        this.authDisplayName = "";
        return;
      }
      let fallback = String(this.authUser.email || "").trim();
      if (fallback.includes("@")) {
        fallback = fallback.split("@")[0];
      }
      try {
        const { data, error } = await this.supabase
          .from("profiles")
          .select("username")
          .eq("id", this.authUser.id)
          .maybeSingle();
        if (!error && data && data.username) {
          this.authDisplayName =
            String(data.username).trim() || fallback || "User";
          return;
        }
      } catch (error) {
        // fall through to fallback
      }
      this.authDisplayName = fallback || "User";
    },

    buildUserReactionSummaries(rows, episodeLookup) {
      const reactionCounts = {};
      const scenesByReaction = {};
      (rows || []).forEach((row) => {
        const path = normalizePagePath(row && row.page_path);
        const episode = episodeLookup[path];
        if (!episode) {
          return;
        }
        const sceneNumber = parseInt(row.scene_number, 10);
        if (!Number.isFinite(sceneNumber) || sceneNumber <= 0) {
          return;
        }
        const reactionKey = normalizeReactionKey(row.reaction_key);
        if (!reactionKey) {
          return;
        }
        reactionCounts[reactionKey] = (reactionCounts[reactionKey] || 0) + 1;
        if (!scenesByReaction[reactionKey]) {
          scenesByReaction[reactionKey] = {};
        }
        const sceneKey = `${path}::${sceneNumber}`;
        if (!scenesByReaction[reactionKey][sceneKey]) {
          scenesByReaction[reactionKey][sceneKey] = {
            path,
            episodeTitle: episode.title,
            sceneNumber,
            sceneLabel: this.sceneLabelForEpisode(episode, sceneNumber),
            to: `${path}#scene-${sceneNumber}`,
            previewUrl:
              (episode.scenePreviewByNumber &&
                episode.scenePreviewByNumber[sceneNumber]) ||
              "",
            sortDate: episode.sortDate || 0,
            count: 0,
          };
        }
        scenesByReaction[reactionKey][sceneKey].count += 1;
      });

      this.userTopReactions = Object.keys(reactionCounts)
        .sort((a, b) => {
          if (reactionCounts[b] !== reactionCounts[a]) {
            return reactionCounts[b] - reactionCounts[a];
          }
          return this.reactionOrderIndex(a) - this.reactionOrderIndex(b);
        })
        .slice(0, 5)
        .map((key) => {
          const meta = this.reactionMetadataByKey[key] || {
            label: key,
            emoji: "*",
          };
          return {
            key,
            label: meta.label,
            emoji: meta.emoji,
            count: reactionCounts[key] || 0,
          };
        });

      const topScenesForReaction = (reactionKey, limit = 8) =>
        Object.values(scenesByReaction[reactionKey] || {})
          .sort((a, b) => {
            if ((b.count || 0) !== (a.count || 0)) {
              return (b.count || 0) - (a.count || 0);
            }
            if ((b.sortDate || 0) !== (a.sortDate || 0)) {
              return (b.sortDate || 0) - (a.sortDate || 0);
            }
            return a.sceneNumber - b.sceneNumber;
          })
          .slice(0, limit);

      this.userStarredScenes = topScenesForReaction("star", 8);
      this.userHeartScenes = topScenesForReaction("heart", 6);
    },

    async loadUserReactionStats() {
      if (!this.supabase || !this.authUser || !this.authUser.id) {
        this.userReactionRows = [];
        this.userTopReactions = [];
        this.userStarredScenes = [];
        this.userHeartScenes = [];
        this.userStatsLoading = false;
        return;
      }
      this.userStatsLoading = true;
      try {
        const latestEpisodePaths = Object.keys(this.episodeLookup || {});
        const pathCandidates = expandEpisodePathCandidates(latestEpisodePaths);
        if (!pathCandidates.length) {
          this.userReactionRows = [];
          this.userTopReactions = [];
          this.userStarredScenes = [];
          this.userHeartScenes = [];
          return;
        }
        const rows = [];
        const chunkSize = 100;
        for (let i = 0; i < pathCandidates.length; i += chunkSize) {
          const chunk = pathCandidates.slice(i, i + chunkSize);
          const { data, error } = await this.supabase
            .from(SUPABASE_ALBUM_REACTIONS_TABLE)
            .select("page_path,scene_number,reaction_key")
            .eq("user_id", this.authUser.id)
            .in("page_path", chunk);
          if (error) {
            throw error;
          }
          if (Array.isArray(data) && data.length) {
            rows.push(...data);
          }
        }
        this.userReactionRows = rows;
        this.buildUserReactionSummaries(rows, this.episodeLookup || {});
      } catch (error) {
        this.userReactionRows = [];
        this.userTopReactions = [];
        this.userStarredScenes = [];
        this.userHeartScenes = [];
      } finally {
        this.userStatsLoading = false;
      }
    },

    async loadSpotlights(options = {}) {
      const forceRefresh = !!(options && options.forceRefresh);
      if (this.isLoading) {
        return;
      }
      if (!this.supabase) {
        this.supabase = getSupabaseClient();
      }
      if (!this.supabase) {
        this.loadError = "Unable to connect to reaction data.";
        return;
      }
      this.isLoading = true;
      this.loadError = "";
      try {
        const episodes = this.buildEpisodeLookup();
        this.episodeLookup = episodes;

        if (!forceRefresh) {
          const cached = this.readSpotlightCache(episodes);
          if (cached) {
            this.episodeSpotlights = this.normalizeSpotlightEpisodes(
              cached.episodeSpotlights
            );
            this.lastUpdatedAt =
              cached.lastUpdatedAt ||
              new Date(cached.cachedAt || Date.now()).toISOString();
            if (this.authUser && this.authUser.id) {
              await this.loadUserReactionStats();
            }
            return;
          }
        }

        const spotlightData = await this.fetchSpotlightRows();
        const rows =
          spotlightData && Array.isArray(spotlightData.rows)
            ? spotlightData.rows
            : [];
        this.episodeSpotlights = this.normalizeSpotlightEpisodes(
          this.buildSpotlights(rows, episodes)
        );
        this.lastUpdatedAt = new Date().toISOString();
        this.writeSpotlightCache(
          episodes,
          this.episodeSpotlights,
          this.lastUpdatedAt,
          spotlightData && spotlightData.source ? spotlightData.source : "raw"
        );
        if (this.authUser && this.authUser.id) {
          await this.loadUserReactionStats();
        }
      } catch (error) {
        this.loadError = "Unable to load spotlight right now.";
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style>
.community-spotlight {
  --spotlight-surface: var(--panel-bg-color);
  --spotlight-surface-soft: var(--panel-bg-soft-color);
  --spotlight-surface-elevated: var(--panel-bg-elevated-color);
  --spotlight-border: var(--panel-border-color);
  --spotlight-card-border: color-mix(
    in oklch,
    var(--spotlight-border),
    var(--spotlight-text) 18%
  );
  --spotlight-text: var(--panel-text-color);
  --spotlight-muted: var(--panel-muted-color);
  --spotlight-header-bg: color-mix(
    in oklch,
    var(--spotlight-surface-elevated),
    var(--accent-color) 12%
  );
  --spotlight-header-text: var(--spotlight-text);
  --spotlight-count-bg: color-mix(
    in oklch,
    var(--accent-color),
    var(--spotlight-surface-elevated) 65%
  );
  --spotlight-count-text: var(--spotlight-text);
  max-width: 1320px;
  width: 100%;
  box-sizing: border-box;
  padding: 1rem 1rem 0;
  margin: 0 auto;

  .spotlight-intro {
    max-width: 72ch;
  }

  .spotlight-hero {
    margin: 1rem 0 1.5rem;

    h1 {
      margin: 0;
      font-size: 3rem;
      line-height: 1.1;
    }

    p {
      margin: 0.75rem 0 1rem;
      color: var(--spotlight-muted);
      font-size: 1.075rem;
      font-weight: 400;
    }
  }

  .spotlight-hero-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .spotlight-chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--field-label-color);
    border-radius: 999px;
    padding: 0.35rem 0.75rem 0.425rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--spotlight-text);
    background: var(--spotlight-surface-elevated);
  }

  .spotlight-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0 0 2rem;
  }

  .spotlight-season-filter {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.85rem;
    border: 1px solid
      color-mix(in oklch, var(--spotlight-border), var(--spotlight-text) 12%);
    border-radius: 999px;
    background: var(--spotlight-surface-elevated);
  }

  .spotlight-season-label {
    color: var(--spotlight-text);
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    opacity: 0.92;
  }

  .spotlight-season-select {
    appearance: none;
    border: 1px solid color-mix(in oklch, var(--accent-color), black 22%);
    background: color-mix(
      in oklch,
      var(--spotlight-surface-elevated),
      var(--accent-color) 10%
    );
    color: var(--spotlight-text);
    border-radius: 999px;
    font-size: 0.84rem;
    font-weight: 800;
    letter-spacing: 0.01em;
    line-height: 1.2;
    text-align: center;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
  }

  .spotlight-season-select:disabled {
    opacity: 0.65;
    cursor: default;
  }

  .spotlight-refresh {
    appearance: none;
    border: 1px solid var(--field-label-color);
    background: var(--spotlight-surface-elevated);
    color: var(--spotlight-text);
    border-radius: 999px;
    font-size: 0.86rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    padding: 0.55rem 0.9rem;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  }

  .spotlight-updated {
    color: var(--spotlight-muted);
    font-size: 0.84rem;
  }

  .spotlight-layout {
    display: grid;
    grid-template-columns: 1.75fr 1fr;
    gap: 2rem;
    align-items: start;
  }

  .spotlight-main {
    min-width: 0;
  }

  .spotlight-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .spotlight-card {
    border: 1px solid var(--spotlight-card-border);
    border-radius: 14px;
    background: var(--spotlight-surface);
    padding: 0 1rem 1rem;
    overflow: hidden;
  }

  .spotlight-card-header {
    margin: 0 -1rem 1.15em;
    padding: 1rem 1.25rem 0.5rem;
    background: var(--spotlight-header-bg);
    border-bottom: 1px solid var(--spotlight-card-border);
    box-shadow: inset 0 -1px 0 color-mix(in oklch, var(--spotlight-text), transparent
          82%);
  }

  .spotlight-episode-link {
    color: var(--spotlight-header-text);
    text-decoration: none;
    font-size: 1.25rem;
    font-weight: 800;
    display: inline-block;

    &:hover {
      text-decoration: underline;
    }
  }

  .spotlight-episode-meta {
    margin: 0.45rem 0;
    font-size: 0.9rem;
    color: color-mix(in oklch, var(--spotlight-header-text), transparent 25%);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .spotlight-reaction-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0 0 1rem;
  }

  .spotlight-reaction-tab {
    border: 1px solid var(--accent-color);
    background: var(--spotlight-surface-elevated);
    color: var(--spotlight-text);
    border-radius: 999px;
    padding: 0.3rem 0.55rem;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    font: inherit;
    transition: all 0.2s ease-in-out;

    &:hover {
      border-color: rgba(255, 191, 70, 0.9);
      background: var(--spotlight-surface-soft);
    }

    &.is-active {
      border-color: #ffbf46;
      background: #ffbf46;
      color: #1a1a1a;

      .spotlight-reaction-total {
        color: #1a1a1a;
      }
    }
  }

  .spotlight-reaction-tab:focus-visible,
  .spotlight-scene-link:focus-visible,
  .spotlight-empty-cta:focus-visible,
  .spotlight-auth-tab:focus-visible,
  .spotlight-season-select:focus-visible,
  .spotlight-user-scene-target:focus-visible,
  .spotlight-user-scene-episode:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
  }

  .spotlight-reaction-panel {
    border: 1px solid var(--spotlight-border);
    border-radius: 12px;
    margin-top: 0.05rem;
    padding: 1.25rem;
    background: var(--spotlight-surface-elevated);
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .spotlight-reaction-head {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.8rem;
    padding-bottom: 0.5rem;
  }

  .spotlight-reaction-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .spotlight-reaction-emoji {
    font-size: 1.25rem;
  }

  .spotlight-reaction-name {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .spotlight-reaction-total {
    color: var(--spotlight-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .spotlight-reaction-figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-width: 0;
  }

  .spotlight-scene-preview {
    width: 100%;
    height: 190px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid var(--spotlight-border);
    flex-shrink: 0;
  }

  .spotlight-scene-preview-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--spotlight-muted);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    border-style: dashed;
  }

  .spotlight-scene-caption {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-block: 0.75rem;
  }

  .spotlight-scene-link {
    color: var(--spotlight-text);
    text-decoration: none;
    font-size: 0.9rem;
    white-space: normal;
    overflow-wrap: anywhere;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.12rem;

    &:hover {
      text-decoration: underline;
    }
  }

  .spotlight-scene-number {
    color: var(--spotlight-muted);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .spotlight-scene-title {
    font-size: 1.125rem;
    line-height: 1.25;
  }

  .spotlight-scene-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 1rem;
    border: 2px solid var(--accent-color);
    background: var(--panel-bg-soft-color);
    color: var(--spotlight-count-text);
    font-size: 1rem;
    font-weight: 700;
    line-height: 1;
    padding: 0.4rem 0.65rem;
    min-width: 1.75rem;
    font-variant-numeric: tabular-nums;
  }

  .spotlight-scene-secondary {
    border-top: 1px solid var(--spotlight-border);
    padding-top: 1rem;

    h3 {
      margin: 0 0 0.6rem;
      font-size: 0.9rem;
      color: var(--spotlight-muted);
    }
  }

  .spotlight-scene-secondary-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;

    li {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .spotlight-scene-secondary-link {
      color: var(--spotlight-text);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;

      &:hover {
        text-decoration: underline;
      }
    }

    .spotlight-scene-secondary-thumb {
      width: 62px;
      height: 38px;
      object-fit: cover;
      flex-shrink: 0;
      border-radius: 6px;
      border: 1px solid var(--spotlight-border);
      background: var(--spotlight-surface-soft);
    }

    .spotlight-scene-secondary-label {
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .spotlight-auth {
    border: 1px solid var(--spotlight-card-border);
    border-radius: 14px;
    background: var(--spotlight-surface);
    padding: 0;
    overflow: clip;
  }

  .spotlight-auth-title {
    margin: 0;
    font-size: 1rem;
    padding: 0.85rem 1rem 0.7rem;
    background: var(--spotlight-header-bg);
    border-bottom: 1px solid var(--spotlight-card-border);
    color: var(--spotlight-header-text);
    box-shadow: inset 0 -1px 0 color-mix(in oklch, var(--spotlight-text), transparent
          82%);
  }

  .spotlight-auth-user {
    margin: 0 0 0.8rem;
    color: var(--spotlight-muted);
    font-size: 1.125rem;
  }

  .spotlight-auth-content,
  .spotlight-auth-muted,
  .spotlight-auth-empty {
    padding: 0.9rem 1rem 1rem;
  }

  .spotlight-auth-section {
    margin-top: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--spotlight-border);

    h3 {
      margin: 0 0 1rem;
      font-size: 0.9rem;
    }
  }

  .spotlight-auth-tabs {
    display: none;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--spotlight-border);
  }

  .spotlight-auth-tab {
    appearance: none;
    border: 1px solid var(--spotlight-border);
    background: var(--spotlight-surface-elevated);
    color: var(--spotlight-text);
    border-radius: 999px;
    padding: 0.32rem 0.72rem;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    cursor: pointer;
  }

  .spotlight-auth-tab.is-active {
    border-color: #ffbf46;
    background: #ffbf46;
    color: #1a1a1a;
  }

  .spotlight-user-reaction-list,
  .spotlight-user-scene-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .spotlight-user-reaction-list li {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    font-variant-numeric: tabular-nums;
  }

  .spotlight-user-scene-list li {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .spotlight-user-scene-list-rich {
    gap: 0.55rem;
  }

  .spotlight-user-scene-item {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--spotlight-border);
    border-radius: 10px;
    background: var(--spotlight-surface-elevated);
    gap: 0.2rem;
  }

  .spotlight-user-scene-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.1rem;
  }

  .spotlight-user-scene-tag {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    border: 1px solid color-mix(in oklch, var(--accent-color), black 18%);
    background: color-mix(
      in oklch,
      var(--spotlight-surface-elevated),
      var(--accent-color) 14%
    );
    color: var(--spotlight-text);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.01em;
    padding: 0.15rem 0.45rem;
  }

  .spotlight-user-scene-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.5rem;
    border-radius: 999px;
    border: 1px solid color-mix(in oklch, var(--accent-color), black 22%);
    background: var(--spotlight-count-bg);
    color: var(--spotlight-count-text);
    font-size: 0.75rem;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    padding: 0 0.35rem;
  }

  .spotlight-user-scene-list a {
    color: var(--spotlight-text);
    text-decoration: none;
    font-weight: 700;
    display: block;
    max-block-size: 3.15em;
    text-overflow: ellipsis;

    padding-inline-end: 0.15rem;

    &:hover {
      text-decoration: underline;
    }
  }

  .spotlight-user-scene-link {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    min-width: 0;
  }

  .spotlight-user-scene-meta {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .spotlight-user-scene-thumb {
    width: 62px;
    height: 38px;
    object-fit: cover;
    flex-shrink: 0;
    border-radius: 6px;
    border: 1px solid var(--spotlight-border);
    background: var(--spotlight-surface-soft);
  }

  .spotlight-user-scene-episode {
    color: var(--spotlight-muted);
    font-size: 0.75rem;
    letter-spacing: 0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-block-size: none;
  }

  .spotlight-user-scene-target {
    color: var(--spotlight-text);
    font-size: 1rem;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    max-block-size: none;
  }

  .spotlight-auth-muted,
  .spotlight-auth-empty {
    color: var(--spotlight-muted);
    font-size: 0.9rem;
  }

  .spotlight-empty-cta {
    display: inline-flex;
    align-items: center;
    margin-top: 0.6rem;
    border: 1px solid var(--accent-color);
    border-radius: 999px;
    background: var(--spotlight-surface-elevated);
    color: var(--spotlight-text);
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.01em;
    padding: 0.35rem 0.7rem;

    &:hover {
      text-decoration: none;
      background: color-mix(
        in oklch,
        var(--spotlight-surface-soft),
        var(--accent-color) 16%
      );
      border-color: color-mix(in oklch, var(--accent-color), white 6%);
    }
  }

  .spotlight-loading,
  .spotlight-error,
  .spotlight-empty {
    border: 1px solid var(--spotlight-border);
    border-radius: 12px;
    background: var(--spotlight-surface);
    padding: 0.95rem 1rem;
    color: var(--spotlight-text);
  }

  .spotlight-error {
    border-color: color-mix(in srgb, #cb4b4b, var(--border-color) 45%);
  }

  @media (max-width: 1100px) {
    .spotlight-layout {
      grid-template-columns: 1fr;
      gap: 0.85rem;
    }

    .spotlight-auth {
      position: static;
    }
  }

  @media (max-width: 900px) {
    width: 100%;
    max-width: 760px;
    padding-inline: 0.65rem;

    .spotlight-hero {
      margin: 0.8rem 0 1rem;

      h1 {
        font-size: 2.35rem;
      }
    }

    .spotlight-toolbar {
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 1rem;
    }

    .spotlight-season-filter {
      width: 100%;
      justify-content: flex-start;
    }

    .spotlight-updated {
      font-size: 0.78rem;
    }

    .spotlight-card {
      padding: 0 0.75rem 0.75rem;
    }

    .spotlight-card-header {
      margin-inline: -0.75rem;
      padding: 0.75rem 0.75rem 0.55rem;
    }

    .spotlight-episode-link {
      font-size: 1.08rem;
    }

    .spotlight-episode-meta {
      font-size: 0.82rem;
    }

    .spotlight-reaction-panel {
      padding: 0.75rem;
    }

    .spotlight-scene-preview {
      height: 162px;
    }

    .spotlight-scene-caption {
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.6rem;
      padding-block: 0.5rem;
    }

    .spotlight-scene-number {
      font-size: 1.02rem;
    }

    .spotlight-scene-title {
      font-size: 0.98rem;
    }

    .spotlight-scene-count {
      margin-inline-start: auto;
    }

    .spotlight-scene-secondary-list {
      /*.spotlight-scene-secondary-link {
        display: block;
      }*/
      .spotlight-scene-secondary-thumb {
        display: none;
      }
      .spotlight-scene-secondary-label {
        white-space: normal;
      }
    }

    .spotlight-auth-tabs {
      display: flex;
    }

    .spotlight-auth-title {
      padding: 0.72rem 0.8rem 0.62rem;
    }

    .spotlight-auth-content,
    .spotlight-auth-muted,
    .spotlight-auth-empty {
      padding: 0.75rem 0.8rem 0.8rem;
    }

    .spotlight-auth-section {
      padding-top: 1rem;
      margin-top: 0.9rem;
    }

    .spotlight-user-scene-link {
      display: block;
    }

    .spotlight-user-scene-thumb {
      display: none;
    }
  }

  @media (max-width: 640px) {
    width: 100%;
    padding-inline: 0.4rem;

    .spotlight-hero h1 {
      font-size: 1.95rem;
    }

    .spotlight-chip {
      font-size: 0.72rem;
      padding: 0.16rem 0.45rem;
    }

    .spotlight-refresh {
      font-size: 0.8rem;
      padding: 0.45rem 0.72rem;
    }

    .spotlight-reaction-tab {
      padding: 0.24rem 0.45rem;
      gap: 0.25rem;
    }

    .spotlight-reaction-total {
      font-size: 0.72rem;
    }

    .spotlight-reaction-name {
      font-size: 1.05rem;
    }

    .spotlight-scene-preview {
      height: 140px;
    }

    .spotlight-user-scene-item {
      padding: 0.5rem 0.55rem;
    }

    .spotlight-user-scene-tag {
      font-size: 0.68rem;
      padding: 0.12rem 0.38rem;
    }

    .spotlight-user-scene-target {
      font-size: 0.88rem;
      max-block-size: 2.9em;
    }
  }
}
:root[data-theme="light"] .community-spotlight {
  --spotlight-card-border: color-mix(
    in oklch,
    var(--spotlight-border),
    oklch(0 0 0) 16%
  );
  --spotlight-header-bg: color-mix(
    in oklch,
    var(--spotlight-surface-elevated),
    var(--accent-color) 5%
  );
  --spotlight-header-text: color-mix(
    in oklch,
    var(--spotlight-text),
    oklch(0 0 0) 8%
  );
  --spotlight-count-bg: color-mix(
    in oklch,
    var(--accent-color),
    var(--spotlight-surface-elevated) 76%
  );
}
</style>
