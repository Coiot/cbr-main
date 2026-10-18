import { getSupabaseClient, SUPABASE_ALBUM_REACTIONS_TABLE } from "../../../supabaseClient";
import { REACTION_POLL_INTERVAL, DEFAULT_REACTION_OPTIONS } from "./albumSettings.js";

// album Reactions. Methods run on the owning Vue component instance.

export const albumReactionsComputed = {
  reactionOptions() {
    const options =
      this.$site &&
      this.$site.themeConfig &&
      this.$site.themeConfig.reactions;
    return Array.isArray(options) && options.length
      ? options
      : DEFAULT_REACTION_OPTIONS;
  },
};

export const albumReactionsMethods = {
  initReactions() {
    if (typeof window === "undefined") {
      return;
    }
    if (!this.supabase) {
      this.supabase = getSupabaseClient();
    }
    this._reactionsStopped = false;
    document.addEventListener("visibilitychange", this.handleReactionVisibilityChange);
    this.loadReactionCounts();
    this.startReactionPolling();
  },
  teardownReactions() {
    this._reactionsStopped = true;
    document.removeEventListener("visibilitychange", this.handleReactionVisibilityChange);
    this.stopReactionPolling();
    this.reactionUpdating = false;
  },
  stopReactionPolling() {
    if (this._reactionPollId) {
      window.clearInterval(this._reactionPollId);
      this._reactionPollId = null;
    }
  },
  handleReactionVisibilityChange() {
    if (document.hidden) {
      this.stopReactionPolling();
    } else if (!this._reactionsStopped) {
      this.loadReactionCounts();
      this.startReactionPolling();
    }
  },
  resetReactions() {
    this._reactionUserScope = null;
    this.reactionCounts = {};
    this.userReactions = {};
    this.reactionMenuOpen = {};
    this.emitReactionSnapshot({}, {});
  },
  startReactionPolling() {
    if (typeof window === "undefined") return;
    this.stopReactionPolling();
    if (document.hidden || this._reactionsStopped) return;
    this._reactionPollId = window.setInterval(() => {
      this.loadReactionCounts({ refreshUser: false });
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
      this.reactionMenuOpen[key] = nextValue;
      return;
    }
    this.reactionMenuOpen = {
      ...this.reactionMenuOpen,
      [key]: nextValue,
    };
  },
  async loadReactionCounts({ refreshUser = true } = {}) {
    if (typeof window === "undefined" || document.hidden || this._reactionsStopped) {
      return;
    }
    if (!this.supabase) {
      this.supabase = getSupabaseClient();
    }
    if (!this.supabase) return;
    if (this.reactionLoading || this.reactionUpdating) {
      this._reactionRefreshPending = this._reactionRefreshPending || refreshUser;
      return;
    }
    this._reactionRefreshPending = false;
    const paths = this.reactionPathCandidates();
    const pagePath = this.reactionPagePath();
    const userId = this.authUser ? this.authUser.id : null;
    const scope = JSON.stringify([pagePath, userId]);
    const isCurrent = () => !this._reactionsStopped &&
      this.reactionPagePath() === pagePath &&
      (this.authUser ? this.authUser.id : null) === userId;
    this.reactionLoading = true;
    try {
      const settings = this.$site?.themeConfig?.communitySpotlight || {};
      let aggregated = settings.useAggregate !== false && !this._reactionAggregateUnavailable;
      const table = settings.aggregateTable || settings.aggregateView || "album_reaction_spotlight";
      let { data, error } = await this.supabase
        .from(aggregated ? table : SUPABASE_ALBUM_REACTIONS_TABLE)
        .select(aggregated ? "scene_number, reaction_key, reaction_count" : "scene_number, reaction_key")
        .in("page_path", paths);
      // Older deployments may not have the Spotlight view installed yet.
      if (aggregated && error && ["42P01", "PGRST205"].includes(error.code)) {
        this._reactionAggregateUnavailable = true;
        aggregated = false;
        ({ data, error } = await this.supabase
          .from(SUPABASE_ALBUM_REACTIONS_TABLE)
          .select("scene_number, reaction_key")
          .in("page_path", paths));
      }
      if (error) {
        console.warn("Unable to load reactions.", error);
        return;
      }
      if (!isCurrent()) return;
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
        const count = aggregated ? Number(row.reaction_count) : 1;
        if (Number.isFinite(count) && count > 0) {
          counts[scene][key] = (counts[scene][key] || 0) + count;
        }
      });
      let userReactions = userId && this._reactionUserScope === scope ? this.userReactions : {};
      if (userId && (refreshUser || this._reactionUserScope !== scope)) {
        const { data: userData, error: userError } = await this.supabase
          .from(SUPABASE_ALBUM_REACTIONS_TABLE)
          .select("scene_number, reaction_key")
          .in("page_path", paths)
          .eq("user_id", userId);
        if (userError) {
          console.warn("Unable to load user reactions.", userError);
        } else {
          userReactions = {};
          if (isCurrent()) this._reactionUserScope = scope;
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
      if (!isCurrent() || this.reactionUpdating) return;
      this.reactionCounts = counts;
      this.userReactions = userReactions;
      this.emitReactionSnapshot(counts, userReactions);
    } catch (error) {
      console.warn("Unable to load reactions.", error);
    } finally {
      this.reactionLoading = false;
      if (this._reactionRefreshPending || !isCurrent()) {
        this._reactionRefreshPending = false;
        this.loadReactionCounts();
      }
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
};
