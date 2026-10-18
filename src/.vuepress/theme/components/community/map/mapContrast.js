import { MAP_CONTRAST_SETTINGS_KEY, SUPABASE_MAP_ID, MAP_CONTRAST_CLOUD_KEYS } from "./mapSettings.js";
import { SUPABASE_USER_SETTINGS_TABLE } from "../../../supabaseClient";

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
  restoreContrastSettingsForAuthUser() {
    if (!this.supabase || !this.authUser || !this.authUser.id) {
      return;
    }
    if (this.contrastSettingsSyncing) {
      return;
    }
    this.contrastSettingsSyncing = true;
    (async () => {
      let didApplyCloud = false;
      try {
        const { data, error } = await this.supabase
          .from(SUPABASE_USER_SETTINGS_TABLE)
          .select("settings")
          .eq("user_id", this.authUser.id)
          .maybeSingle();
        if (!error) {
          const cloudSettings =
            data && data.settings && typeof data.settings === "object"
              ? data.settings
              : {};
          const mapped = this.fromCloudContrastSettings(cloudSettings);
          if (mapped.hasAny && mapped.values) {
            this.applyContrastSettings(mapped.values);
            this.writeLocalContrastSettingsForCurrentUser(mapped.values);
            didApplyCloud = true;
          } else {
            const localFallback =
              this.readLocalContrastSettingsForCurrentUser();
            if (localFallback) {
              this.applyContrastSettings(localFallback);
              const merged = {
                ...cloudSettings,
                ...this.toCloudContrastSettings(localFallback),
              };
              await this.supabase
                .from(SUPABASE_USER_SETTINGS_TABLE)
                .upsert(
                  { user_id: this.authUser.id, settings: merged },
                  { onConflict: "user_id" }
                );
            }
          }
        }
      } catch (error) {
        // Fall back to local settings only when cloud read fails.
      }
      if (!didApplyCloud) {
        const localFallback = this.readLocalContrastSettingsForCurrentUser();
        if (localFallback) {
          this.applyContrastSettings(localFallback);
        }
      }
    })().finally(() => {
      this.contrastSettingsSyncing = false;
    });
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
    this.contrastSettingsSaveTimer = window.setTimeout(() => {
      this.contrastSettingsSaveTimer = null;
      this.persistContrastSettingsToCloud();
    }, 250);
  },
  async persistContrastSettingsToCloud() {
    if (!this.supabase || !this.authUser || !this.authUser.id) {
      return false;
    }
    try {
      const { data, error } = await this.supabase
        .from(SUPABASE_USER_SETTINGS_TABLE)
        .select("settings")
        .eq("user_id", this.authUser.id)
        .maybeSingle();
      if (error) {
        return false;
      }
      const existing =
        data && data.settings && typeof data.settings === "object"
          ? data.settings
          : {};
      const merged = {
        ...existing,
        ...this.toCloudContrastSettings(this.currentContrastSettings()),
      };
      const { error: upsertError } = await this.supabase
        .from(SUPABASE_USER_SETTINGS_TABLE)
        .upsert(
          {
            user_id: this.authUser.id,
            settings: merged,
          },
          { onConflict: "user_id" }
        );
      return !upsertError;
    } catch (error) {
      return false;
    }
  },
  persistContrastSettingsForCurrentUser() {
    if (this.contrastSettingsLoading) {
      return false;
    }
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
