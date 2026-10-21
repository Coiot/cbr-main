import { EXPIRED_SUPPORTER_MESSAGE } from "../../../account/supporterMessage.mjs";
import { mapEditRestriction } from '../../../account/featureAvailability.mjs';
import { getSupabaseClient } from "../../../supabaseClient";
import { getAccountSync, subscribeAccountAuth } from "../../../account/accountSync.js";
import {
  SUPABASE_ADMIN_TABLE,
  SUPABASE_MAP_ID,
  REQUIRE_AUTH_FOR_LOCAL,
} from "./mapSettings.js";

// map Access. Methods run on the owning Vue component instance.

export const mapAccessComputed = {
  editAccessAllowed() {
    if (this.archiveMode) return false;
    if(this.officialSource)return !!this.detailEditing&&!this.isLoading&&!this.loadError;
    if (this.isLoading || this.loadError || this.isLiveSyncing || this.liveSyncError || this.snapshotViewId || this.isEmbeddedSnapshot) return false;
    if (this.localEditsEnabled) return REQUIRE_AUTH_FOR_LOCAL ? !!this.authUser : true;
    return !!this.canEdit;
  },
  editAccessNotice() {
    if(this.officialSource)return null;
    return mapEditRestriction({ snapshot: !!this.snapshotViewId || this.isEmbeddedSnapshot, loading: this.isLoading, loadFailed: !!this.loadError,
      syncing: this.isLiveSyncing, syncFailed: !!this.liveSyncError, local: this.localEditsEnabled,
      localRequiresAuth: REQUIRE_AUTH_FOR_LOCAL, signedIn: !!this.authUser, allowed: this.canEdit,
      checking: this.authChecking, failed: this.supporterCheckFailed, status: this.supporterStatus });
  },
  editAccessMessage() {
    return this.editAccessNotice?.message || (this.localEditsEnabled ? 'Local edits stay on this device.' : this.authMessage);
  },
  authStatusLabel() {
    if (this.authChecking) {
      return "Checking access";
    }
    if (!this.authUser) {
      return "Viewer mode";
    }
    return this.canEdit ? "Editing enabled" : "Viewer only";
  },
};

export const mapAccessMethods = {
  initSupabase() {
    if (this.supabase || typeof window === "undefined") {
      return;
    }
    this.supabase = getSupabaseClient();
    if (!this.supabase) {
      return;
    }
    window.addEventListener("account-profile-updated", this.handleAccountProfile);
    window.addEventListener("user-settings-synced", this.handleAccountSettings);
    this.authSubscription = subscribeAccountAuth(this.supabase, this.handleAuthSession);

  },
  teardownSupabase() {
    window.removeEventListener("account-profile-updated", this.handleAccountProfile);
    window.removeEventListener("user-settings-synced", this.handleAccountSettings);
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    if (this.tileOverrideSubscription && this.supabase) {
      this.supabase.removeChannel(this.tileOverrideSubscription);
      this.tileOverrideSubscription = null;
    }
    if (this.tileSaveTimer) {
      window.clearTimeout(this.tileSaveTimer);
      this.tileSaveTimer = null;
    }
    if (this.tileSaveRetryTimer) {
      window.clearTimeout(this.tileSaveRetryTimer);
      this.tileSaveRetryTimer = null;
    }
  },
  handleAuthSession(session) {
    const previousId = this.authUser?.id;
    this.authUser = session ? session.user : null;
    if (previousId !== this.authUser?.id) {
      this.canEdit = false; this.isAdmin = false; this.authChecking = false;
      this.supporterStatus = ''; this.supporterCheckFailed = false;
    }
    if (this._accountAuthInitialized && previousId === this.authUser?.id) return;
    this._accountAuthInitialized = true;
    if (this.authUser && this.authUser.id) {
      this.restoreContrastSettingsForAuthUser();
    } else {
      this.restoreContrastSettingsForAnonymous();
    }
    if (this.authUser) {
      if (!this.authEmail) {
        this.authEmail = this.authUser.email || "";
      }
      this.refreshEditPermission();
      this.updateAdminStatus();
      this.updateConnectionStatus();
      if (this.tiles.length && !this.isLoading && !this.isLiveSyncing) this.refreshLiveMap();
      this.subscribeToTileOverrides();
    } else {
      this.canEdit = false;
      this.isAdmin = false;
      this.ownerBrushEnabled = false;
      this.isPaintingOwner = false;
      this.ownerBrushId = null;
    }
  },
  handleExternalAuth(event) {
    const session =
      event &&
      event.detail &&
      Object.prototype.hasOwnProperty.call(event.detail, "session")
        ? event.detail.session
        : null;
    if (!session && event && event.detail && event.detail.user) {
      this.handleAuthSession({ user: event.detail.user });
      return;
    }
    this.handleAuthSession(session || null);
  },
  async signInWithEmail() {
    if (!this.supabase) {
      return;
    }
    this.updateConnectionStatus();
    const email = String(this.authEmail || "").trim();
    if (!email) {
      this.authMessage = "Enter your email to receive a login link.";
      return;
    }
    this.authLoading = true;
    this.authMessage = "";
    const isLocal = window.location.hostname === "localhost";
    const redirectBase = isLocal
      ? `${window.location.origin}${window.location.pathname}`
      : "https://civbattleroyale.tv/community-tile-map/";
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectBase,
      },
    });
    this.authLoading = false;
    if (error) {
      this.authMessage = error.message || "Unable to send login link.";
      return;
    }
    this.authMessage = "Check your email for the login link to unlock edits.";
  },
  async signOut() {
    if (!this.supabase) {
      return;
    }
    if (this.contrastSettingsSaveTimer) {
      window.clearTimeout(this.contrastSettingsSaveTimer);
      this.contrastSettingsSaveTimer = null;
    }
    await this.supabase.auth.signOut();
    this.authUser = null;
    this.canEdit = false;
    this.isAdmin = false;
    this.authMessage = "Signed out.";
    this.ownerBrushEnabled = false;
    this.isPaintingOwner = false;
    this.ownerBrushId = null;
  },
  handleOnline() {
    this.refreshSupabaseConnections();
  },
  refreshSupabaseConnections() {
    if (!this.supabase) {
      return;
    }
    this.lastSupabaseError = "";
    this.updateConnectionStatus();
    if (this.tileOverrideSubscription) {
      this.supabase.removeChannel(this.tileOverrideSubscription);
      this.tileOverrideSubscription = null;
    }
    this.refreshLiveMap();
    this.loadSnapshotsIfActive();
    if (this.tileSaveQueue.size) {
      this.scheduleTileSaveRetry();
    }
  },
  updateConnectionStatus() {
    if (!navigator.onLine) {
      this.authMessage = "Offline. Edits will sync when back online.";
      return;
    }
    if (this.lastSupabaseError) {
      this.authMessage = "Connection issue. Retrying to sync edits...";
    }
  },
  async updateAdminStatus() {
    if (!this.supabase || !this.authUser) {
      this.isAdmin = false;
      return;
    }
    const userId = this.authUser.id;
    const { data, error } = await this.supabase
      .from(SUPABASE_ADMIN_TABLE)
      .select("user_id")
      .eq("map_id", SUPABASE_MAP_ID)
      .eq("user_id", userId)
      .maybeSingle();
    if (this.authUser?.id !== userId) return;
    if (error) {
      this.isAdmin = false;
      return;
    }
    this.isAdmin = !!data;
    this.loadSnapshotsIfActive();
  },
  handleAccountProfile(event) {
    const { userId, profile } = event.detail || {};
    if (userId !== this.authUser?.id || typeof profile?.can_edit !== 'boolean') return;
    this.canEdit = profile.can_edit;
    if (profile.supporter_status) {
      this.supporterStatus = profile.supporter_status;
      this.supporterCheckFailed = false;
    }
    if (this.canEdit) this.authMessage = "Editing enabled for this account.";
    if (!this.canEdit) {
      if (profile.supporter_status === 'expired') this.authMessage = EXPIRED_SUPPORTER_MESSAGE;
      this.ownerBrushEnabled = false; this.isPaintingOwner = false; this.ownerBrushId = null;
    }
  },
  async refreshEditPermission(force = false) {
    if (!this.supabase || !this.authUser) { this.canEdit = false; return; }
    const user = this.authUser;
    this.authChecking = true;
    this.supporterCheckFailed = false;
    this.authMessage = "Checking donation access…";
    try {
      const { allowed, error, data } = await getAccountSync(this.supabase).refreshSupporter(user, { force });
      if (this.authUser?.id !== user.id) return;
      if (!error) this.canEdit = allowed;
      this.supporterCheckFailed = !!error;
      if (!error) this.supporterStatus = data?.status || (allowed ? 'active' : 'none');
      if (!this.canEdit) {
        this.ownerBrushEnabled = false; this.isPaintingOwner = false; this.ownerBrushId = null;
      }
      this.authMessage = error
        ? "Donation access could not be verified. Retry from the account menu."
        : this.canEdit ? "Editing enabled for this account."
        : data?.status === 'expired' ? EXPIRED_SUPPORTER_MESSAGE
        : "Viewer mode. Use your Ko-fi donation email and check donation access in the account menu.";
    } finally { if (this.authUser?.id === user.id) this.authChecking = false; }
  },
  ensureEditAccess() {
    return this.editAccessAllowed;
  },
  handleEditAccessAction(action) {
    if (action === 'account') window.dispatchEvent(new CustomEvent('open-account-menu'));
    else if (action === 'retry-access') this.refreshEditPermission(true);
    else if (action === 'retry-map') this.refreshLiveMap();
    else if (action === 'reload-map') this.loadMap();
    else if (action === 'live-map') {
      this.snapshotCompareId = '';
      this.setLocalEdits(false);
      this.snapshotViewId = '';
    }
  },
  setLocalEdits(enabled) {
    if (this.officialSource || this.archiveMode) return;
    const nextValue = !!enabled;
    if (this.localEditsEnabled === nextValue) {
      return;
    }
    this.localEditsEnabled = nextValue;
    if (this.localEditsEnabled) {
      // this.authMessage = REQUIRE_AUTH_FOR_LOCAL
      //   ? "Local mode requires sign-in."
      //   : "Local mode: edits stay on this device only.";
    } else {
      // this.authMessage = "Local mode off. Syncing live map.";
      this.localOverrides.clear();
      this.modeSwitching = true;
      this.resetTilesToBaseState();
      const maybePromise = this.loadTileOverrides();
      if (maybePromise && typeof maybePromise.finally === "function") {
        maybePromise.finally(() => {
          this.modeSwitching = false;
        });
      } else {
        this.modeSwitching = false;
      }
    }
  },
};
