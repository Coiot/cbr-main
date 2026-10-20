import { MAP_CONTRAST_SETTINGS_KEY, SUPABASE_MAP_ID, MAP_CONTRAST_CLOUD_KEYS } from "./mapSettings.js";
import { getAccountSync } from "../../../account/accountSync.js";

// map Contrast. Methods run on the owning Vue component instance.

export const mapContrastMethods = {
  contrastSettingsStorageKeyForUser(userId) {
    const id = String(userId || "").trim();
    if (!id) {
      return "";
    }
    return `${MAP_CONTRAST_SETTINGS_KEY}:${SUPABASE_MAP_ID}:${id}`;
  },
  contrastSettingsStorageKeyForGuest() {
    return `${MAP_CONTRAST_SETTINGS_KEY}:${SUPABASE_MAP_ID}:guest`;
  },
  contrastSettingsStorageKeyForCurrentUser() {
    if (this.authUser && this.authUser.id) {
      return this.contrastSettingsStorageKeyForUser(this.authUser.id);
    }
    return this.contrastSettingsStorageKeyForGuest();
  },
  currentContrastSettings() {
    return {
      contrastHideDecorations: !!this.contrastHideDecorations,
      contrastFlattenLandWater: !!this.contrastFlattenLandWater,
      contrastGrayscaleTerrain: !!this.contrastGrayscaleTerrain,
      contrastBoostOwnerOpacity: !!this.contrastBoostOwnerOpacity,
      contrastLargeCityBanners: !!this.contrastLargeCityBanners,
    };
  },
  toCloudContrastSettings(settings) {
    const source =
      settings && typeof settings === "object"
        ? settings
        : this.currentContrastSettings();
    return {
      [MAP_CONTRAST_CLOUD_KEYS.contrastHideDecorations]:
        !!source.contrastHideDecorations,
      [MAP_CONTRAST_CLOUD_KEYS.contrastFlattenLandWater]:
        !!source.contrastFlattenLandWater,
      [MAP_CONTRAST_CLOUD_KEYS.contrastGrayscaleTerrain]:
        !!source.contrastGrayscaleTerrain,
      [MAP_CONTRAST_CLOUD_KEYS.contrastBoostOwnerOpacity]:
        !!source.contrastBoostOwnerOpacity,
      [MAP_CONTRAST_CLOUD_KEYS.contrastLargeCityBanners]:
        !!source.contrastLargeCityBanners,
    };
  },
  fromCloudContrastSettings(settings) {
    if (!settings || typeof settings !== "object") {
      return { values: null, hasAny: false };
    }
    const values = {};
    let hasAny = false;
    Object.keys(MAP_CONTRAST_CLOUD_KEYS).forEach((localKey) => {
      const cloudKey = MAP_CONTRAST_CLOUD_KEYS[localKey];
      if (Object.prototype.hasOwnProperty.call(settings, cloudKey)) {
        values[localKey] = !!settings[cloudKey];
        hasAny = true;
      }
    });
    return { values: hasAny ? values : null, hasAny };
  },
  applyContrastSettings(settings) {
    const source =
      settings && typeof settings === "object"
        ? settings
        : Object.create(null);
    this._contrastEditVersion = (this._contrastEditVersion || 0) + 1;
    this.contrastSettingsLoading = true;
    this.contrastHideDecorations = !!source.contrastHideDecorations;
    this.contrastFlattenLandWater = !!source.contrastFlattenLandWater;
    this.contrastGrayscaleTerrain = !!source.contrastGrayscaleTerrain;
    this.contrastBoostOwnerOpacity = !!source.contrastBoostOwnerOpacity;
    this.contrastLargeCityBanners = !!source.contrastLargeCityBanners;
    this.$nextTick(() => {
      this.contrastSettingsLoading = false;
    });
  },
  readLocalContrastSettings(key) {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    if (!key) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  },
  writeLocalContrastSettings(key, settings) {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    if (!key) {
      return false;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(settings));
      return true;
    } catch (error) {
      return false;
    }
  },
  readLocalContrastSettingsForCurrentUser() {
    const key = this.contrastSettingsStorageKeyForCurrentUser();
    return this.readLocalContrastSettings(key);
  },
  writeLocalContrastSettingsForCurrentUser(settings) {
    const key = this.contrastSettingsStorageKeyForCurrentUser();
    return this.writeLocalContrastSettings(key, settings);
  },
  restoreContrastSettingsForAnonymous() {
    const localFallback = this.readLocalContrastSettingsForCurrentUser();
    if (localFallback) {
      this.applyContrastSettings(localFallback);
    }
  },
  handleAccountSettings(event) {
    if (event.detail?.userId !== this.authUser?.id || this.contrastSettingsSaveTimer) return;
    const mapped = this.fromCloudContrastSettings(event.detail);
    if (mapped.hasAny) {
      this.applyContrastSettings(mapped.values);
      this.writeLocalContrastSettingsForCurrentUser(mapped.values);
    }
  },
  async restoreContrastSettingsForAuthUser() {
    if (!this.supabase || !this.authUser?.id) return;
    const user = this.authUser;
    if (this.contrastSettingsSyncing && this._contrastSyncUser === user.id) return;
    this._contrastSyncUser = user.id;
    this.contrastSettingsSyncing = true;
    const version = this._contrastEditVersion || 0;
    const local = this.readLocalContrastSettingsForCurrentUser();
    try {
      const { data, error } = await getAccountSync(this.supabase).loadSettings(user, local ? this.toCloudContrastSettings(local) : {});
      if (this.authUser?.id !== user.id || version !== (this._contrastEditVersion || 0)) return;
      const mapped = this.fromCloudContrastSettings(data || {});
      const values = !error && mapped.hasAny ? mapped.values : local;
      if (values) { this.applyContrastSettings(values); this.writeLocalContrastSettingsForCurrentUser(values); }
    } finally {
      if (this._contrastSyncUser === user.id) this.contrastSettingsSyncing = false;
    }
  },
  queueContrastSettingsCloudSave() {
    if (
      typeof window === "undefined" ||
      !this.supabase ||
      !this.authUser ||
      !this.authUser.id
    ) {
      return;
    }
    if (this.contrastSettingsSaveTimer) {
      window.clearTimeout(this.contrastSettingsSaveTimer);
    }
    const user = this.authUser;
    const patch = this.toCloudContrastSettings(this.currentContrastSettings());
    this.contrastSettingsSaveTimer = window.setTimeout(() => {
      this.contrastSettingsSaveTimer = null;
      this.persistContrastSettingsToCloud(user, patch);
    }, 250);
  },
  async persistContrastSettingsToCloud(user = this.authUser, patch = this.toCloudContrastSettings(this.currentContrastSettings())) {
    if (!this.supabase || !user?.id || this.authUser?.id !== user.id) return false;
    const { error } = await getAccountSync(this.supabase).saveSettings(user, patch);
    return !error;
  },
  persistContrastSettingsForCurrentUser() {
    if (this.contrastSettingsLoading) {
      return false;
    }
    this._contrastEditVersion = (this._contrastEditVersion || 0) + 1;
    const savedLocal = this.writeLocalContrastSettingsForCurrentUser(
      this.currentContrastSettings()
    );
    if (this.authUser && this.authUser.id) {
      this.queueContrastSettingsCloudSave();
    }
    return savedLocal;
  },
  resetContrastOptions() {
    this.contrastHideDecorations = false;
    this.contrastFlattenLandWater = false;
    this.contrastGrayscaleTerrain = false;
    this.contrastBoostOwnerOpacity = false;
    this.contrastLargeCityBanners = false;
  },
};
