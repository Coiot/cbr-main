import { getSupabaseClient } from "../../../supabaseClient";
import { getAccountSync, subscribeAccountAuth } from "../../../account/accountSync.js";

// album Account. Methods run on the owning Vue component instance.

export const albumAccountMethods = {
  initSupabase() {
    if (this.supabase || typeof window === "undefined") {
      return;
    }
    this.supabase = getSupabaseClient();
    if (!this.supabase) {
      return;
    }
    window.addEventListener("account-profile-updated", this.handleAccountProfile);
    this._authSubscription = subscribeAccountAuth(this.supabase, this.handleAuthSession);

  },
  teardownSupabase() {
    window.removeEventListener("account-profile-updated", this.handleAccountProfile);
    if (this._authSubscription) {
      this._authSubscription.unsubscribe();
      this._authSubscription = null;
    }
    this.clearPendingResume();
  },
  handleAuthSession(session) {
    if (this.authUser?.id !== session?.user?.id) {
      this.clearPendingResume();
      this._lastCloudResumeScene = null;
      this.bookmarkedScene = null;
      this.lastSeenScene = null;
      this.authProfile = null;
      this.supporterChecking = false;
      this.supporterCheckFailed = false;
    }
    this.authUser = session ? session.user : null;
    this.authSession = session || null;
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
  handleAccountProfile(event) {
    const { userId, profile } = event.detail || {};
    if (userId === this.authUser?.id && profile) {
      this.authProfile = { ...this.authProfile, ...profile };
      if (profile.supporter_status) this.supporterCheckFailed = false;
    }
  },
  async fetchProfile(force = false) {
    if (!this.useCloud) return;
    const user = this.authUser, service = getAccountSync(this.supabase);
    this.supporterChecking = true;
    this.supporterCheckFailed = false;
    try {
      const result = await service.refreshSupporter(user, { force });
      const { data } = await service.loadProfile(user);
      if (this.authUser?.id !== user.id) return;
      if (data) this.authProfile = data;
      this.supporterCheckFailed = !!result.error;
    } finally {
      if (this.authUser?.id === user.id) this.supporterChecking = false;
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
    if (!event || !event.detail || (event.detail.userId && event.detail.userId !== this.authUser?.id)) {
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
};
