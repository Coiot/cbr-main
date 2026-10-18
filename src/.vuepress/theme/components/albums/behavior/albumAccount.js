import { getSupabaseClient, ensureProfileRow, checkSupporterAccess } from "../../../supabaseClient";

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
    let profile = data || null;
    if (error) {
      console.warn(
        "Unable to load profile; attempting supporter verification fallback.",
        error
      );
    }
    const shouldCheckSupporter =
      Boolean(error) || !profile || !profile.can_edit;
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
};
