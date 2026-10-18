import { SUPABASE_ALBUM_PROGRESS_TABLE } from "../../../supabaseClient";
import { readingLibrary, LIBRARY_FIELDS } from "../library/readingLibrary.js";
import { RESUME_SYNC_DEBOUNCE } from "./albumSettings.js";

// album Progress. Methods run on the owning Vue component instance.

export const albumProgressComputed = {
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
};

export const albumProgressMethods = {
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
    const updatedKey = key
      .replace(/^albumsBookmark:/, "albumsBookmarkUpdated:")
      .replace(/^albumsResume:/, "albumsResumeUpdated:");
    if (!Number.isFinite(sceneNumber)) {
      window.localStorage.removeItem(key);
      if (updatedKey !== key) {
        window.localStorage.removeItem(updatedKey);
      }
      return;
    }
    window.localStorage.setItem(key, String(sceneNumber));
    if (updatedKey !== key) {
      window.localStorage.setItem(updatedKey, String(Date.now()));
    }
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
  async loadCloudState() {
    if (!this.useCloud) {
      return;
    }
    const path = this.$page.path, userId = this.authUser.id;
    const identity = `${userId}:${path}`;
    if (this._cloudLoadPromise && this._cloudLoadIdentity === identity) return this._cloudLoadPromise;
    this._cloudLoadIdentity = identity;
    const isCurrent = () => this.authUser?.id === userId && this.$page.path === path;
    const pending = (async () => {
      try {
        const localBookmark = this.getLocalSceneNumber(this.bookmarkKey);
        const localResume = this.getLocalSceneNumber(this.resumeKey);
        const { data, error } = await this.supabase
          .from(SUPABASE_ALBUM_PROGRESS_TABLE)
          .select("bookmark_scene, resume_scene")
          .eq("user_id", userId)
          .eq("page_path", path)
          .maybeSingle();
        if (!isCurrent()) return;
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
        if (!isCurrent()) return;
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
            if (isCurrent()) this.goToScene();
          });
        }
      } catch (error) {
        if (!isCurrent()) return;
        console.warn("Unable to load cloud album state.", error);
        this.loadBookmarkLocal();
        this.loadResumeLocal();
      }
    })();
    this._cloudLoadPromise = pending;
    try {
      await pending;
    } finally {
      if (this._cloudLoadPromise === pending) this._cloudLoadPromise = null;
    }
  },
  async upsertCloudState(payload, target = {}) {
    if (!this.useCloud) {
      return;
    }
    if (target.userId && target.userId !== this.authUser.id) return false;
    const row = {
      user_id: this.authUser.id,
      page_path: target.path || this.$page.path,
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
        .select(LIBRARY_FIELDS)
        .limit(1);
      if (updateError) {
        console.warn("Unable to update cloud album state.", updateError);
        return false;
      }
      if (Array.isArray(updatedRows) && updatedRows.length) {
        readingLibrary.publish(updatedRows[0], row.user_id);
        return true;
      }
      const { data: inserted, error: insertError } = await this.supabase
        .from(SUPABASE_ALBUM_PROGRESS_TABLE)
        .insert(row).select(LIBRARY_FIELDS).single();
      if (insertError) {
        // Another tab or the library may have created this episode meanwhile.
        if (insertError.code === '23505') {
          const { data, error } = await this.supabase.from(SUPABASE_ALBUM_PROGRESS_TABLE)
            .update(row).eq('user_id', row.user_id).eq('page_path', row.page_path)
            .select(LIBRARY_FIELDS).single();
          if (!error && data) { readingLibrary.publish(data, row.user_id); return true; }
        }
        console.warn("Unable to insert cloud album state.", insertError);
        return false;
      }
      readingLibrary.publish(inserted, row.user_id);
      return true;
    } catch (error) {
      console.warn("Unable to save cloud album state.", error);
      return false;
    }
  },
  resumePendingKey() {
    return `${this.resumeKey}:pending`;
  },
  clearPendingResume() {
    if (this._resumeSyncTimer) window.clearTimeout(this._resumeSyncTimer);
    this._resumeSyncTimer = null;
    this.setSessionSceneNumber(this._pendingResumeTarget?.key || this.resumePendingKey(), null);
    this._pendingResumeScene = null;
    this._pendingResumeTarget = null;
  },
  async prepareReadingStatusChange(status) {
    const path = this.$page.path, userId = this.authUser?.id;
    if (this._resumeSyncTimer) window.clearTimeout(this._resumeSyncTimer);
    this._resumeSyncTimer = null;
    // Finish older progress requests before an explicit reset or completion.
    await Promise.allSettled([...(this._resumeSaves || [])]);
    if (this.$page.path !== path || this.authUser?.id !== userId) return;
    await this.flushPendingResume(true);
    if (this.$page.path !== path || this.authUser?.id !== userId) return;
    this.clearPendingResume();
    if (status === 'not_started') this.setLocalSceneNumber(this.resumeKey, null);
  },
  queueCloudResumeUpdate(sceneNumber) {
    if (!this.useCloud) {
      return;
    }
    this.setSessionSceneNumber(this.resumePendingKey(), sceneNumber);
    this._pendingResumeScene = sceneNumber;
    this._pendingResumeTarget = { path: this.$page.path, userId: this.authUser.id, key: this.resumePendingKey() };
    if (this._resumeSyncTimer) {
      window.clearTimeout(this._resumeSyncTimer);
    }
    this._resumeSyncTimer = window.setTimeout(() => {
      this._resumeSyncTimer = null;
      this.flushPendingResume();
    }, RESUME_SYNC_DEBOUNCE);
  },
  async flushPendingResume(force) {
    if (!this.useCloud) {
      return;
    }
    const target = this._pendingResumeTarget || { path: this.$page.path, userId: this.authUser.id, key: this.resumePendingKey() };
    if (target.userId !== this.authUser.id) return;
    const pending = this.getSessionSceneNumber(target.key);
    if (!Number.isFinite(pending)) {
      return;
    }
    if (!force && this._lastCloudResumeScene === pending) {
      return;
    }
    const save = this.upsertCloudState({ resume_scene: pending }, target);
    this._resumeSaves ||= new Set();
    this._resumeSaves.add(save);
    let saved;
    try { saved = await save; } finally { this._resumeSaves.delete(save); }
    if (saved && this.authUser?.id === target.userId) {
      if (this.$page.path === target.path) this._lastCloudResumeScene = pending;
      if (this.getSessionSceneNumber(target.key) === pending) this.setSessionSceneNumber(target.key, null);
    }
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
    window.dispatchEvent(new CustomEvent("albums-reading-progress-updated"));
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
  resumeToScene() {
    if (!this.resumeScene) {
      return;
    }
    this.jumpToScene = this.resumeScene;
    this.goToScene();
  },
  isBookmarked(index) {
    return this.bookmarkedScene === index + 1;
  },
  bookmarkAria(index) {
    return this.isBookmarked(index) ? "Remove bookmark" : "Add bookmark";
  },
};
