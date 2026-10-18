import { getSupabaseClient, checkSupporterAccess } from "../../../supabaseClient";
import {
  SUPABASE_ADMIN_TABLE,
  SUPABASE_MAP_ID,
  serializeSupabaseError,
  REQUIRE_AUTH_FOR_LOCAL,
} from "./mapSettings.js";

// map Access. Methods run on the owning Vue component instance.

export const mapAccessComputed = {
  editAccessAllowed() {
    if (this.isLoading || this.isLiveSyncing || this.liveSyncError || this.snapshotViewId) {
      return false;
    }
    if (this.localEditsEnabled) {
      return REQUIRE_AUTH_FOR_LOCAL ? !!this.authUser : true;
    }
    return this.canEdit;
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
    const { data } = this.supabase.auth.onAuthStateChange(
      (_event, session) => {
        this.handleAuthSession(session);
      }
    );
    this.authSubscription = data ? data.subscription : null;
    this.supabase.auth.getSession().then(({ data: sessionData }) => {
      this.handleAuthSession(sessionData ? sessionData.session : null);
    });
  },
  teardownSupabase() {
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
    this.authUser = session ? session.user : null;
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
    const { data, error } = await this.supabase
      .from(SUPABASE_ADMIN_TABLE)
      .select("user_id")
      .eq("map_id", SUPABASE_MAP_ID)
      .eq("user_id", this.authUser.id)
      .maybeSingle();
    if (error) {
      this.isAdmin = false;
      return;
    }
    this.isAdmin = !!data;
    this.loadSnapshotsIfActive();
  },
  async refreshEditPermission() {
    if (!this.supabase || !this.authUser) {
      this.canEdit = false;
      return;
    }
    this.authChecking = true;
    this.authMessage = "";
    const debugMeta = {
      mapId: SUPABASE_MAP_ID,
      userId: this.authUser.id || null,
      email: this.authUser.email || "",
    };
    try {
      const { data: profile, error: profileError } = await this.supabase
        .from("profiles")
        .select("can_edit")
        .eq("id", this.authUser.id)
        .maybeSingle();
      if (profileError) {
        console.warn(
          "[CommunityTileMapGrid] profiles.can_edit lookup failed; trying supporter function.",
          {
            ...debugMeta,
            error: serializeSupabaseError(profileError),
          }
        );
      }

      let allowed = Boolean(profile && profile.can_edit);
      let supporterError = null;

      if (!allowed || profileError) {
        const { allowed: supporterAllowed, error } =
          await checkSupporterAccess(this.supabase, this.authUser);
        supporterError = error || null;
        if (supporterError) {
          console.warn(
            "[CommunityTileMapGrid] supporter permission check failed.",
            {
              ...debugMeta,
              profileCanEdit: Boolean(profile && profile.can_edit),
              error: serializeSupabaseError(supporterError),
            }
          );
        }
        if (!supporterError) {
          allowed = Boolean(supporterAllowed);
        }
      }

      this.canEdit = allowed;
      if (!this.canEdit) {
        this.ownerBrushEnabled = false;
        this.isPaintingOwner = false;
        this.ownerBrushId = null;
        this.authMessage =
          supporterError && profileError
            ? supporterError.message || "Unable to verify edit permissions."
            : "Viewer mode: this email is not on the edit list.";
        if (supporterError || profileError) {
          console.warn(
            "[CommunityTileMapGrid] edit permission unresolved; keeping viewer mode.",
            {
              ...debugMeta,
              profileCanEdit: Boolean(profile && profile.can_edit),
              profileError: serializeSupabaseError(profileError),
              supporterError: serializeSupabaseError(supporterError),
            }
          );
        }
        return;
      }

      this.authMessage = supporterError
        ? "Editing enabled for this account (using cached supporter access)."
        : "Editing enabled for this account.";
    } finally {
      this.authChecking = false;
    }
  },
  ensureEditAccess() {
    if (this.isLoading || this.isLiveSyncing || this.liveSyncError) {
      this.authMessage = "Wait for the live map to finish updating before editing.";
      return false;
    }
    if (this.snapshotViewId) {
      this.authMessage = "Snapshots are view-only.";
      return false;
    }
    if (this.localEditsEnabled) {
      if (REQUIRE_AUTH_FOR_LOCAL && !this.authUser) {
        this.authMessage = "Sign in to enable local edits.";
        return false;
      }
      return true;
    }
    if (this.canEdit) {
      return true;
    }
    if (!this.authUser) {
      this.authMessage = "Sign in with your subscriber email to edit.";
    } else if (!this.authChecking) {
      this.authMessage = "This account does not have edit access.";
    }
    return false;
  },
  setLocalEdits(enabled) {
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
