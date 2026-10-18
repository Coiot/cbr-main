import {
  SUPABASE_OVERRIDE_TABLE,
  SUPABASE_MAP_ID,
  ENABLE_OVERRIDE_CLEANUP,
  SUPABASE_EDIT_LOG_TABLE,
} from "./mapSettings.js";
import { buildSnapshotLookup, snapshotValueEqual } from "../communityTileMapSnapshotUtils";
import {
  nextUnitIdFromTiles,
  cloneUnit,
  cloneCity,
  setCitadelImprovement,
  clearCitadelImprovement,
  isCitadelImprovement,
} from "./mapModel.js";

// map Persistence. Methods run on the owning Vue component instance.

export const mapPersistenceMethods = {
  async loadTileOverrides() {
    if (!this.supabase) {
      return;
    }
    if (!this.liveBaseSnapshotId && !this.liveBaseSnapshotPayload) {
      await this.loadLiveBaseSnapshot({
        includePayload: !this.isMobileBrowser,
      });
    }
    await this.ensureLiveBaseSnapshotApplied();
    try {
      const pageSize = 1000;
      const mergedRowsByKey = new Map();
      let page = 0;
      while (page < 50) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        let query = this.supabase
          .from(SUPABASE_OVERRIDE_TABLE)
          .select("tile_key,payload")
          .eq("map_id", SUPABASE_MAP_ID)
          .order("tile_key", { ascending: true });
        if (!this.forceLegacyOverrideConflict) {
          if (this.liveBaseSnapshotId) {
            query = query.eq("snapshot_id", this.liveBaseSnapshotId);
          } else {
            query = query.is("snapshot_id", null);
          }
        }
        const { data, error } = await query.range(from, to);
        if (error || !Array.isArray(data)) {
          return;
        }
        if (!data.length) {
          break;
        }
        const pageRows = ENABLE_OVERRIDE_CLEANUP
          ? this.filterOverrideRows(data)
          : data;
        pageRows.forEach((row) => {
          const key = row && (row.tile_key || row.tileKey);
          if (!key) {
            return;
          }
          mergedRowsByKey.set(key, row);
        });
        if (data.length < pageSize) {
          break;
        }
        page += 1;
      }
      const filtered = Array.from(mergedRowsByKey.values());
      this.liveOverrideLookup = buildSnapshotLookup(filtered);
      this.liveSnapshotPayload = [];
      if (!this.snapshotViewId) {
        this.applyTileOverrides(filtered, { markRecent: false });
      }
    } finally {
      this.hasLoadedOverrides = true;
    }
  },
  applyTileOverrides(rows, options = {}) {
    if (!this.tileLookup || !Array.isArray(rows) || !rows.length) {
      return;
    }
    const { markRecent = false, applyLocal = true } = options;
    let needsBorderRebuild = false;
    rows.forEach((row) => {
      const tileKey = row.tile_key || row.tileKey;
      if (!tileKey) {
        return;
      }
      const tile = this.tileLookup.get(tileKey);
      if (!tile) {
        return;
      }
      const ownerChanged = this.applyTileOverride(tile, row.payload);
      if (ownerChanged) {
        needsBorderRebuild = true;
      }
      if (markRecent) {
        this.markTileRecentlyEdited(tile);
      }
      if (
        applyLocal &&
        this.localEditsEnabled &&
        this.localOverrides.has(tileKey)
      ) {
        const localPayload = this.localOverrides.get(tileKey);
        if (localPayload) {
          const localChanged = this.applyTileOverride(tile, localPayload);
          if (localChanged) {
            needsBorderRebuild = true;
          }
        }
      }
    });
    if (needsBorderRebuild) {
      this.scheduleOwnerBordersRebuild();
    }
    this.nextUnitId = nextUnitIdFromTiles(this.tiles);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyTileOverride(tile, payload) {
    if (!tile || !payload) {
      return false;
    }
    if (payload.__clear && tile.baseState) {
      const base = tile.baseState;
      const ownerChanged = tile.owner !== base.owner;
      tile.owner = Number.isFinite(base.owner) ? base.owner : null;
      tile.customOwner = false;
      tile.originalOwner = Number.isFinite(base.originalOwner)
        ? base.originalOwner
        : null;
      tile.customOriginalOwner = false;
      tile.pillaged = !!base.pillaged;
      tile.ruins = !!base.ruins;
      tile.improvement = base.improvement || null;
      tile.improvementId = base.improvementId || "";
      tile.improvementColor = base.improvementColor || null;
      tile.notes = base.notes || null;
      tile.combatUnit = cloneUnit(base.combatUnit);
      tile.civilianUnit = cloneUnit(base.civilianUnit);
      tile.city = cloneCity(base.city);
      if (Number.isFinite(tile.owner)) {
        this.ensureOwnerColors(tile.owner);
      }
      if (tile.city && Number.isFinite(tile.city.owner)) {
        this.ensureOwnerColors(tile.city.owner);
      }
      if (tile.combatUnit && Number.isFinite(tile.combatUnit.owner)) {
        this.ensureOwnerColors(tile.combatUnit.owner);
      }
      if (tile.civilianUnit && Number.isFinite(tile.civilianUnit.owner)) {
        this.ensureOwnerColors(tile.civilianUnit.owner);
      }
      if (this.selectedTile && this.selectedTile.key === tile.key) {
        this.syncEditFieldsFromTile(tile);
      }
      return ownerChanged;
    }
    let ownerChanged = false;
    if (Object.prototype.hasOwnProperty.call(payload, "owner")) {
      const nextOwner = Number.isFinite(payload.owner) ? payload.owner : null;
      ownerChanged = tile.owner !== nextOwner;
      tile.owner = nextOwner;
      tile.customOwner = Number.isFinite(nextOwner);
      if (Number.isFinite(nextOwner)) {
        this.ensureOwnerColors(nextOwner);
      }
      this.syncCityOwnerWithTileOwner(tile);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "originalOwner")) {
      const nextOriginal = Number.isFinite(payload.originalOwner)
        ? payload.originalOwner
        : null;
      tile.originalOwner = nextOriginal;
      tile.customOriginalOwner = Number.isFinite(nextOriginal);
    }
    if (
      tile.city &&
      Number.isFinite(tile.owner) &&
      !Number.isFinite(tile.originalOwner)
    ) {
      tile.originalOwner = tile.owner;
      tile.customOriginalOwner = false;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "pillaged")) {
      tile.pillaged = !!payload.pillaged;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "ruins")) {
      tile.ruins = !!payload.ruins;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "citadel")) {
      if (payload.citadel) {
        setCitadelImprovement(tile);
      } else {
        clearCitadelImprovement(tile);
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "combatUnit")) {
      tile.combatUnit = this.normalizeUnitPayload(payload.combatUnit);
      if (tile.combatUnit && Number.isFinite(tile.combatUnit.owner)) {
        this.ensureOwnerColors(tile.combatUnit.owner);
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "civilianUnit")) {
      tile.civilianUnit = this.normalizeUnitPayload(payload.civilianUnit);
      if (tile.civilianUnit && Number.isFinite(tile.civilianUnit.owner)) {
        this.ensureOwnerColors(tile.civilianUnit.owner);
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "city")) {
      tile.city = this.normalizeCityPayload(payload.city, tile);
      if (tile.city) {
        if (Number.isFinite(tile.city.owner)) {
          this.ensureOwnerColors(tile.city.owner);
        }
        clearCitadelImprovement(tile);
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "notes")) {
      const nextNotes = payload.notes ? String(payload.notes).trim() : "";
      tile.notes = nextNotes || null;
      this.invalidateTooltipCache(tile.key);
    }
    if (this.selectedTile && this.selectedTile.key === tile.key) {
      this.syncEditFieldsFromTile(tile);
    }
    return ownerChanged;
  },
  normalizeUnitPayload(payload) {
    if (!payload || !payload.type) {
      return null;
    }
    const owner = Number.isFinite(payload.owner) ? payload.owner : null;
    const id = Number.isFinite(payload.id) ? payload.id : null;
    return {
      id,
      type: payload.type,
      owner,
    };
  },
  normalizeCityPayload(payload, tile) {
    if (!payload) {
      return null;
    }
    const owner = Number.isFinite(payload.owner)
      ? payload.owner
      : tile
      ? tile.owner
      : null;
    return {
      id: payload.id !== undefined && payload.id !== null ? payload.id : null,
      name: payload.name || "",
      size: Number.isFinite(payload.size) ? payload.size : 1,
      owner,
      religion: payload.religion || "",
      worldWonders: Array.isArray(payload.worldWonders)
        ? [...payload.worldWonders]
        : [],
      isPuppeted: !!payload.isPuppeted,
      isOccupied: !!payload.isOccupied,
      isResistance: !!payload.isResistance,
      isCustom: true,
      isCapital: !!payload.isCapital,
    };
  },
  buildTileOverridePayload(tile) {
    return {
      owner: Number.isFinite(tile.owner) ? tile.owner : null,
      originalOwner: Number.isFinite(tile.originalOwner)
        ? tile.originalOwner
        : null,
      notes: tile.notes ? String(tile.notes) : null,
      pillaged: !!tile.pillaged,
      ruins: !!tile.ruins,
      citadel: isCitadelImprovement(tile),
      combatUnit: tile.combatUnit
        ? {
            id:
              tile.combatUnit.id !== undefined && tile.combatUnit.id !== null
                ? tile.combatUnit.id
                : null,
            type: tile.combatUnit.type,
            owner: Number.isFinite(tile.combatUnit.owner)
              ? tile.combatUnit.owner
              : null,
          }
        : null,
      civilianUnit: tile.civilianUnit
        ? {
            id:
              tile.civilianUnit.id !== undefined &&
              tile.civilianUnit.id !== null
                ? tile.civilianUnit.id
                : null,
            type: tile.civilianUnit.type,
            owner: Number.isFinite(tile.civilianUnit.owner)
              ? tile.civilianUnit.owner
              : null,
          }
        : null,
      city: tile.city
        ? {
            id:
              tile.city.id !== undefined && tile.city.id !== null
                ? tile.city.id
                : null,
            name: tile.city.name || "",
            size: Number.isFinite(tile.city.size) ? tile.city.size : 1,
            owner: Number.isFinite(tile.city.owner) ? tile.city.owner : null,
            religion: tile.city.religion || "",
            worldWonders: Array.isArray(tile.city.worldWonders)
              ? [...tile.city.worldWonders]
              : [],
            isPuppeted: !!tile.city.isPuppeted,
            isOccupied: !!tile.city.isOccupied,
            isResistance: !!tile.city.isResistance,
            isCapital: !!tile.city.isCapital,
          }
        : null,
    };
  },
  buildTileOverrideDiff(tile) {
    if (!tile) {
      return null;
    }
    const current = this.buildTileOverridePayload(tile);
    if (!tile.baseState) {
      return current;
    }
    const base = this.buildFullPayloadFromBase(tile.baseState, null);
    const diff = {};
    Object.keys(current).forEach((key) => {
      if (!snapshotValueEqual(current[key], base[key])) {
        diff[key] = current[key];
      }
    });
    return Object.keys(diff).length ? diff : null;
  },
  filterOverrideRows(rows) {
    if (!Array.isArray(rows)) {
      return [];
    }
    if (!this.tileLookup) {
      return rows;
    }
    const filtered = [];
    const deleteKeys = [];
    rows.forEach((row) => {
      const key = row.tile_key || row.tileKey;
      if (!key) {
        return;
      }
      const tile = this.tileLookup.get(key);
      if (!tile || !tile.baseState) {
        filtered.push(row);
        return;
      }
      const basePayload = this.buildFullPayloadFromBase(tile.baseState, null);
      const mergedPayload = this.buildFullPayloadFromBase(
        tile.baseState,
        row.payload || null
      );
      if (snapshotValueEqual(mergedPayload, basePayload)) {
        deleteKeys.push(key);
        return;
      }
      filtered.push(row);
    });
    if (ENABLE_OVERRIDE_CLEANUP && deleteKeys.length) {
      // Cleanup currently disabled; left as a hook for future use.
    }
    return filtered;
  },
  queueTileSave(tile) {
    if (this.snapshotViewId) {
      return;
    }
    if (this.modeSwitching) {
      return;
    }
    if (!this.supabase || !this.canEdit || !tile) {
      if (this.localEditsEnabled && tile) {
        const payload = this.buildTileOverrideDiff(tile);
        if (payload) {
          this.localOverrides.set(tile.key, payload);
        } else {
          this.localOverrides.delete(tile.key);
        }
        this.markTileRecentlyEdited(tile);
      }
      return;
    }
    if (this.localEditsEnabled) {
      const payload = this.buildTileOverrideDiff(tile);
      if (payload) {
        this.localOverrides.set(tile.key, payload);
      } else {
        this.localOverrides.delete(tile.key);
      }
      this.markTileRecentlyEdited(tile);
      return;
    }
    const payload = this.buildTileOverridePayload(tile);
    this.tileSaveQueue.set(tile.key, {
      tile_key: tile.key,
      payload,
    });
    this.markTileRecentlyEdited(tile);
    if (this.tileSaveTimer) {
      return;
    }
    this.tileSaveTimer = window.setTimeout(() => {
      this.flushTileSaves();
    }, 500);
  },
  async flushTileSaves() {
    if (!this.supabase || !this.tileSaveQueue.size) {
      this.tileSaveTimer = null;
      return;
    }
    const now = new Date().toISOString();
    const rows = Array.from(this.tileSaveQueue.values()).map((entry) => ({
      map_id: SUPABASE_MAP_ID,
      tile_key: entry.tile_key,
      payload: entry.payload,
      snapshot_id: this.liveBaseSnapshotId || null,
      updated_at: now,
      updated_by: this.authUser ? this.authUser.id : null,
    }));
    this.tileSaveTimer = null;
    let upsertError = null;
    if (rows.length) {
      const useSnapshotConflict =
        this.liveBaseSnapshotId && !this.forceLegacyOverrideConflict;
      const conflictTarget = useSnapshotConflict
        ? "map_id,snapshot_id,tile_key"
        : "map_id,tile_key";
      const { error } = await this.supabase
        .from(SUPABASE_OVERRIDE_TABLE)
        .upsert(rows, {
          onConflict: conflictTarget,
        });
      upsertError = error;
      if (
        upsertError &&
        useSnapshotConflict &&
        this.isSnapshotConflictError(upsertError)
      ) {
        const fallback = await this.supabase
          .from(SUPABASE_OVERRIDE_TABLE)
          .upsert(rows, {
            onConflict: "map_id,tile_key",
          });
        if (!fallback.error) {
          this.forceLegacyOverrideConflict = true;
        }
        upsertError = fallback.error;
      }
    }
    if (upsertError) {
      const message = upsertError.message || "Unable to sync edits.";
      this.lastSupabaseError = message;
      this.authMessage = "Unable to sync edits. Retrying...";
      this.scheduleTileSaveRetry();
      return;
    }
    this.lastSupabaseError = "";
    this.updateConnectionStatus();
    this.tileSaveQueue.clear();
    this.tileSaveRetryCount = 0;
    if (rows.length) {
      const logRows = rows.map((row) => ({
        map_id: row.map_id,
        tile_key: row.tile_key,
        payload: row.payload,
        edited_by: row.updated_by,
        edited_at: now,
      }));
      await this.supabase.from(SUPABASE_EDIT_LOG_TABLE).insert(logRows);
    }
  },
  scheduleTileSaveRetry() {
    if (this.tileSaveRetryTimer) {
      return;
    }
    const retryDelay = Math.min(8000, 1000 * (this.tileSaveRetryCount + 1));
    this.tileSaveRetryTimer = window.setTimeout(() => {
      this.tileSaveRetryTimer = null;
      this.tileSaveRetryCount += 1;
      this.flushTileSaves();
    }, retryDelay);
  },
  isSnapshotConflictError(error) {
    if (!error) {
      return false;
    }
    const code = String(error.code || "");
    if (code === "23505") {
      return true;
    }
    const message = String(error.message || "").toLowerCase();
    return message.includes("tile_overrides_pkey");
  },
  subscribeToTileOverrides() {
    if (!this.supabase || this.tileOverrideSubscription) {
      return;
    }
    this.tileOverrideSubscription = this.supabase
      .channel(`tile-overrides-${SUPABASE_MAP_ID}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: SUPABASE_OVERRIDE_TABLE,
          filter: `map_id=eq.${SUPABASE_MAP_ID}`,
        },
        (payload) => {
          if (this.snapshotViewId) {
            return;
          }
          const record = payload.new || payload.old;
          if (!record || !this.tileLookup) {
            return;
          }
          const expectedSnapshotId = this.liveBaseSnapshotId || null;
          const recordSnapshotId = Object.prototype.hasOwnProperty.call(
            record,
            "snapshot_id"
          )
            ? record.snapshot_id
            : null;
          if (
            !this.forceLegacyOverrideConflict &&
            recordSnapshotId !== expectedSnapshotId
          ) {
            return;
          }
          this.applyTileOverrides([record], {
            markRecent: this.hasLoadedOverrides,
          });
        }
      )
      .subscribe();
  },
};
