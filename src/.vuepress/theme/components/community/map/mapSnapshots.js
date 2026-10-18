import {
  MAP_SNAPSHOT_LIST_STORAGE_KEY,
  SUPABASE_MAP_ID,
  MAP_SNAPSHOT_PAYLOAD_STORAGE_KEY,
  SNAPSHOT_PAYLOAD_CACHE_TTL_MS,
  SNAPSHOT_PAYLOAD_CACHE_MAX_ITEMS,
  SUPABASE_SNAPSHOT_TABLE,
  SNAPSHOT_LIST_CACHE_TTL_MS,
  SUPABASE_OVERRIDE_TABLE,
} from "./mapSettings.js";
import { buildBaseState, isCitadelImprovement } from "./mapModel.js";
import {
  buildSnapshotLookup,
  snapshotPayloadEqual,
  snapshotValueEqual,
  buildCityChangeSummary,
} from "../communityTileMapSnapshotUtils";

// map Snapshots. Methods run on the owning Vue component instance.

export const mapSnapshotsComputed = {
  isSnapshotViewing() {
    return !!this.snapshotViewId;
  },
  snapshotView() {
    return (
      this.snapshots.find(
        (snapshot) => snapshot.id === this.snapshotViewId
      ) || null
    );
  },
  snapshotCompare() {
    return (
      this.snapshots.find(
        (snapshot) => snapshot.id === this.snapshotCompareId
      ) || null
    );
  },
  snapshotComparePayload() {
    if (this.snapshotCompareId === "__live__") {
      return this.liveSnapshotPayload || [];
    }
    if (!this.snapshotCompareId) {
      return [];
    }
    if (
      this.snapshotPayloadCache &&
      Array.isArray(this.snapshotPayloadCache[this.snapshotCompareId])
    ) {
      return this.snapshotPayloadCache[this.snapshotCompareId];
    }
    return this.snapshotCompare && Array.isArray(this.snapshotCompare.payload)
      ? this.snapshotCompare.payload
      : [];
  },
  snapshotDiffLegend() {
    const summary = this.snapshotDiffSummary || {};
    return [
      { id: "owner", label: "Owner", count: summary.owner || 0 },
      { id: "city", label: "City", count: summary.city || 0 },
      { id: "units", label: "Units", count: summary.units || 0 },
    ].filter((entry) => entry.count > 0);
  },
  adminSnapshots() {
    return (this.snapshots || []).filter((snapshot) => !snapshot.is_virtual);
  },
};

export const mapSnapshotsMethods = {
  snapshotListStorageKey() {
    return `${MAP_SNAPSHOT_LIST_STORAGE_KEY}:${SUPABASE_MAP_ID}:${
      this.isAdmin ? "admin" : "published"
    }`;
  },
  snapshotPayloadStorageKey() {
    return `${MAP_SNAPSHOT_PAYLOAD_STORAGE_KEY}:${SUPABASE_MAP_ID}`;
  },
  sanitizeSnapshotListEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const id = String(entry.id || "").trim();
    if (!id) {
      return null;
    }
    const episodeLabel =
      entry.episode_label != null
        ? String(entry.episode_label).trim()
        : entry.episodeLabel != null
        ? String(entry.episodeLabel).trim()
        : "";
    const episodeAt =
      entry.episode_at != null ? entry.episode_at : entry.episodeAt || null;
    const createdAt =
      entry.created_at != null ? entry.created_at : entry.createdAt || null;
    const isPublished =
      entry.is_published != null
        ? !!entry.is_published
        : entry.isPublished != null
        ? !!entry.isPublished
        : true;
    return {
      id,
      episode_label: episodeLabel,
      episode_at: episodeAt,
      created_at: createdAt,
      is_published: isPublished,
    };
  },
  readSnapshotListFromStorage() {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    const key = this.snapshotListStorageKey();
    if (!key) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      const rows = Array.isArray(parsed.rows)
        ? parsed.rows
            .map((entry) => this.sanitizeSnapshotListEntry(entry))
            .filter((entry) => !!entry)
        : null;
      if (!rows) {
        return null;
      }
      const savedAt = Number(parsed.savedAt);
      return {
        rows,
        savedAt: Number.isFinite(savedAt) ? savedAt : 0,
      };
    } catch (error) {
      return null;
    }
  },
  writeSnapshotListToStorage(rows) {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    const key = this.snapshotListStorageKey();
    if (!key) {
      return false;
    }
    try {
      const cleanedRows = Array.isArray(rows)
        ? rows
            .map((entry) => this.sanitizeSnapshotListEntry(entry))
            .filter((entry) => !!entry)
        : [];
      window.localStorage.setItem(
        key,
        JSON.stringify({
          savedAt: Date.now(),
          rows: cleanedRows,
        })
      );
      return true;
    } catch (error) {
      return false;
    }
  },
  readSnapshotPayloadStore() {
    if (this.isMobileSafari) {
      return null;
    }
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    const key = this.snapshotPayloadStorageKey();
    if (!key) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      const entries = Array.isArray(parsed.entries)
        ? parsed.entries
            .map((entry) => {
              if (!entry || typeof entry !== "object") {
                return null;
              }
              const id = String(entry.id || "").trim();
              if (!id || !Array.isArray(entry.payload)) {
                return null;
              }
              const savedAt = Number(entry.savedAt);
              return {
                id,
                payload: entry.payload,
                savedAt: Number.isFinite(savedAt) ? savedAt : 0,
              };
            })
            .filter((entry) => !!entry)
        : [];
      return { entries };
    } catch (error) {
      return null;
    }
  },
  writeSnapshotPayloadStore(entries) {
    if (this.isMobileSafari) {
      return false;
    }
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    const key = this.snapshotPayloadStorageKey();
    if (!key) {
      return false;
    }
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          savedAt: Date.now(),
          entries,
        })
      );
      return true;
    } catch (error) {
      return false;
    }
  },
  readSnapshotPayloadFromStorage(snapshotId) {
    const id = String(snapshotId || "").trim();
    if (!id) {
      return null;
    }
    const store = this.readSnapshotPayloadStore();
    if (!store || !Array.isArray(store.entries) || !store.entries.length) {
      return null;
    }
    const now = Date.now();
    const entry = store.entries.find((item) => item && item.id === id);
    if (!entry || !Array.isArray(entry.payload)) {
      return null;
    }
    if (
      entry.savedAt &&
      now - entry.savedAt > SNAPSHOT_PAYLOAD_CACHE_TTL_MS
    ) {
      return null;
    }
    return entry.payload;
  },
  writeSnapshotPayloadToStorage(snapshotId, payload) {
    const id = String(snapshotId || "").trim();
    if (!id || !Array.isArray(payload)) {
      return false;
    }
    const now = Date.now();
    const store = this.readSnapshotPayloadStore();
    const entries = Array.isArray(store && store.entries)
      ? store.entries.filter((entry) => entry && entry.id !== id)
      : [];
    entries.unshift({
      id,
      payload,
      savedAt: now,
    });
    const filtered = entries
      .filter((entry) => {
        if (!entry || !entry.id || !Array.isArray(entry.payload)) {
          return false;
        }
        if (!entry.savedAt) {
          return true;
        }
        return now - entry.savedAt <= SNAPSHOT_PAYLOAD_CACHE_TTL_MS;
      })
      .slice(0, SNAPSHOT_PAYLOAD_CACHE_MAX_ITEMS);
    return this.writeSnapshotPayloadStore(filtered);
  },
  pruneSnapshotPayloadStorage(validIds) {
    const store = this.readSnapshotPayloadStore();
    if (!store || !Array.isArray(store.entries)) {
      return;
    }
    const now = Date.now();
    const filtered = store.entries
      .filter((entry) => {
        if (!entry || !entry.id || !Array.isArray(entry.payload)) {
          return false;
        }
        if (validIds && !validIds.has(entry.id)) {
          return false;
        }
        if (
          entry.savedAt &&
          now - entry.savedAt > SNAPSHOT_PAYLOAD_CACHE_TTL_MS
        ) {
          return false;
        }
        return true;
      })
      .slice(0, SNAPSHOT_PAYLOAD_CACHE_MAX_ITEMS);
    this.writeSnapshotPayloadStore(filtered);
  },
  applySnapshotRows(rows) {
    this.snapshots = this.withBaseSnapshot(rows);
    const validIds = new Set(
      (this.snapshots || []).map((snapshot) => snapshot.id)
    );
    this.clearSnapshotPayloadCache(validIds);
    this.pruneSnapshotPayloadStorage(validIds);
    if (
      this.snapshotViewId &&
      !this.snapshots.find((snapshot) => snapshot.id === this.snapshotViewId)
    ) {
      this.snapshotViewId = "";
    }
    if (
      this.snapshotCompareId &&
      !this.snapshots.find(
        (snapshot) => snapshot.id === this.snapshotCompareId
      )
    ) {
      this.snapshotCompareId = "";
    }
  },
  cacheSnapshotPayload(id, payload) {
    if (this._mapDisposed) return payload;
    const cache = Object.assign(Object.create(null), this.snapshotPayloadCache || {});
    delete cache[id];
    cache[id] = payload;
    const pinned = new Set([this.snapshotViewId, this.snapshotCompareId, this.liveBaseSnapshotId]);
    for (const key of Object.keys(cache)) {
      if (Object.keys(cache).length <= SNAPSHOT_PAYLOAD_CACHE_MAX_ITEMS) break;
      if (!pinned.has(key)) delete cache[key];
    }
    this.snapshotPayloadCache = cache;
    return payload;
  },
  clearSnapshotPayloadCache(validIds) {
    const source = this.snapshotPayloadCache || Object.create(null);
    if (!source || !Object.keys(source).length) {
      return;
    }
    const next = Object.create(null);
    Object.keys(source).forEach((id) => {
      if (validIds && !validIds.has(id)) {
        return;
      }
      next[id] = source[id];
    });
    this.snapshotPayloadCache = next;
  },
  async getSnapshotPayloadById(snapshotId) {
    const id = String(snapshotId || "").trim();
    if (!id) {
      return null;
    }
    if (id === "__live__") {
      if (!this.liveSnapshotPayload || !this.liveSnapshotPayload.length) {
        this.liveSnapshotPayload = this.buildLiveSnapshotPayload(
          this.liveOverrideLookup
        );
      }
      return this.liveSnapshotPayload || [];
    }
    if (id === "episode-0-base") {
      return this.getBaseSnapshotPayload();
    }
    const cache = this.snapshotPayloadCache || Object.create(null);
    if (Array.isArray(cache[id])) {
      return this.cacheSnapshotPayload(id, cache[id]);
    }
    const currentRequests =
      this.snapshotPayloadRequests || Object.create(null);
    if (currentRequests[id]) {
      return currentRequests[id];
    }
    const snapshot = Array.isArray(this.snapshots)
      ? this.snapshots.find((entry) => entry && entry.id === id)
      : null;
    if (snapshot && Array.isArray(snapshot.payload)) {
      this.cacheSnapshotPayload(id, snapshot.payload);
      this.writeSnapshotPayloadToStorage(id, snapshot.payload);
      return snapshot.payload;
    }
    const localPayload = this.readSnapshotPayloadFromStorage(id);
    if (Array.isArray(localPayload)) {
      this.cacheSnapshotPayload(id, localPayload);
      return localPayload;
    }
    const staticPath = this.staticSnapshotPathFromId(id);
    if (staticPath) {
      const request = (async () => {
        try {
          const resolved = this.$withBase
            ? this.$withBase(staticPath)
            : staticPath;
          const response = await fetch(resolved);
          if (!response.ok) {
            return null;
          }
          const payload = await response.json();
          if (!Array.isArray(payload) || !payload.length) {
            return null;
          }
          this.cacheSnapshotPayload(id, payload);
          this.writeSnapshotPayloadToStorage(id, payload);
          return payload;
        } catch (error) {
          return null;
        }
      })();
      this.snapshotPayloadRequests = {
        ...currentRequests,
        [id]: request,
      };
      try {
        return await request;
      } finally {
        const nextRequests = { ...(this.snapshotPayloadRequests || {}) };
        delete nextRequests[id];
        this.snapshotPayloadRequests = nextRequests;
      }
    }
    if (!this.supabase) {
      return null;
    }
    const request = (async () => {
      const { data, error } = await this.supabase
        .from(SUPABASE_SNAPSHOT_TABLE)
        .select("payload")
        .eq("map_id", SUPABASE_MAP_ID)
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        return null;
      }
      const payload = Array.isArray(data.payload) ? data.payload : [];
      this.cacheSnapshotPayload(id, payload);
      this.writeSnapshotPayloadToStorage(id, payload);
      return payload;
    })();
    this.snapshotPayloadRequests = {
      ...currentRequests,
      [id]: request,
    };
    try {
      return await request;
    } finally {
      const nextRequests = { ...(this.snapshotPayloadRequests || {}) };
      delete nextRequests[id];
      this.snapshotPayloadRequests = nextRequests;
    }
  },
  async loadSnapshots() {
    const cached = this.readSnapshotListFromStorage();
    const hasCachedRows = !!cached && Array.isArray(cached.rows);
    const offline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    if (hasCachedRows) {
      this.applySnapshotRows(cached.rows);
      const age = Date.now() - (cached.savedAt || 0);
      if (offline || age <= SNAPSHOT_LIST_CACHE_TTL_MS) {
        this.snapshotLoading = false;
        return;
      }
    }
    if (!this.supabase) {
      return;
    }
    this.snapshotLoading = !hasCachedRows;
    let query = this.supabase
      .from(SUPABASE_SNAPSHOT_TABLE)
      .select("id,episode_label,episode_at,created_at,is_published")
      .eq("map_id", SUPABASE_MAP_ID);
    if (!this.isAdmin) {
      query = query.eq("is_published", true);
    }
    const { data, error } = await query.order("episode_at", {
      ascending: false,
    });
    this.snapshotLoading = false;
    if (error || !Array.isArray(data)) {
      return;
    }
    this.applySnapshotRows(data);
    this.writeSnapshotListToStorage(data);
  },
  async loadLiveBaseSnapshot(options = {}) {
    if (!this.supabase) {
      return;
    }
    const includePayload = options.includePayload !== false;
    const selectFields = includePayload
      ? "id,episode_label,episode_at,created_at,payload,is_published"
      : "id,episode_label,episode_at,created_at,is_published";
    const { data, error } = await this.supabase
      .from(SUPABASE_SNAPSHOT_TABLE)
      .select(selectFields)
      .eq("map_id", SUPABASE_MAP_ID)
      .eq("is_published", true)
      .order("episode_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);
    if (this._mapDisposed) return;
    if (error && options.throwOnError) throw error;
    if (error || !Array.isArray(data) || !data.length) {
      this.liveBaseSnapshotId = null;
      this.liveBaseSnapshotPayload = null;
      this.liveBaseSnapshotAppliedId = null;
      return;
    }
    const snapshot = data[0];
    this.liveBaseSnapshotId = snapshot.id || null;
    this.liveBaseSnapshotPayload =
      includePayload && Array.isArray(snapshot.payload)
        ? snapshot.payload
        : null;
  },
  async ensureLiveBaseSnapshotApplied() {
    if (this._mapDisposed || this.snapshotViewId) return;
    if (!this.liveBaseSnapshotId) {
      return;
    }
    if (this.liveBaseSnapshotAppliedId === this.liveBaseSnapshotId) {
      return;
    }
    if (!Array.isArray(this.liveBaseSnapshotPayload)) {
      const payload = await this.getSnapshotPayloadById(
        this.liveBaseSnapshotId
      );
      if (Array.isArray(payload)) {
        this.liveBaseSnapshotPayload = payload;
      }
    }
    if (!Array.isArray(this.liveBaseSnapshotPayload)) {
      return;
    }
    if (this._mapDisposed || this.snapshotViewId) return;
    this.applyLiveBaseSnapshot();
    this.liveBaseSnapshotAppliedId = this.liveBaseSnapshotId;
  },
  applyLiveBaseSnapshot() {
    if (
      !this.liveBaseSnapshotPayload ||
      !this.liveBaseSnapshotPayload.length
    ) {
      return;
    }
    this.resetTilesToBaseState();
    this.applyTileOverrides(this.liveBaseSnapshotPayload, {
      markRecent: false,
      applyLocal: false,
    });
    if (Array.isArray(this.tiles) && this.tiles.length) {
      this.tiles.forEach((tile) => {
        tile.baseState = buildBaseState(tile);
      });
    }
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
    this.liveOverrideLookup = {};
    this.liveSnapshotPayload = [];
    this.liveBaseSnapshotAppliedId = this.liveBaseSnapshotId || null;
  },
  withBaseSnapshot(rows) {
    const snapshots = Array.isArray(rows) ? [...rows] : [];
    if (!Array.isArray(this.tiles) || !this.tiles.length) {
      return snapshots;
    }
    const existingBase = snapshots.find(
      (snapshot) => snapshot.id === "episode-0-base"
    );
    if (existingBase) {
      return snapshots;
    }
    snapshots.push({
      id: "episode-0-base",
      map_id: SUPABASE_MAP_ID,
      episode_label: "Episode 0 Snapshot",
      episode_at: null,
      created_at: null,
      is_published: true,
      is_virtual: true,
    });
    return snapshots;
  },
  getBaseSnapshotPayload() {
    if (this.baseSnapshotPayload) {
      return this.baseSnapshotPayload;
    }
    if (!Array.isArray(this.tiles) || !this.tiles.length) {
      return [];
    }
    const payload = this.tiles.map((tile) => ({
      tile_key: tile.key,
      payload: this.buildBaseSnapshotPayload(tile),
    }));
    this.baseSnapshotPayload = payload;
    return payload;
  },
  buildBaseSnapshotPayload(tile) {
    const base =
      tile && (tile.baseStateOriginal || tile.baseState)
        ? tile.baseStateOriginal || tile.baseState
        : null;
    if (!base) {
      return this.buildTileOverridePayload(tile);
    }
    return {
      owner: Number.isFinite(base.owner) ? base.owner : null,
      originalOwner: Number.isFinite(base.originalOwner)
        ? base.originalOwner
        : null,
      notes: base.notes ? String(base.notes) : null,
      pillaged: !!base.pillaged,
      ruins: !!base.ruins,
      citadel:
        !!base.improvement &&
        isCitadelImprovement({ improvement: base.improvement }),
      combatUnit: base.combatUnit ? { ...base.combatUnit } : null,
      civilianUnit: base.civilianUnit ? { ...base.civilianUnit } : null,
      city: base.city ? { ...base.city } : null,
    };
  },
  async applySnapshotView() {
    this.clearRecentEdits();
    const requestId = this.snapshotApplyRequestId + 1;
    this.snapshotApplyRequestId = requestId;
    if (!this.snapshotViewId) {
      this.restoreLiveView();
      return;
    }
    if (!this.liveSnapshotPayload || !this.liveSnapshotPayload.length) {
      this.liveSnapshotPayload = this.buildLiveSnapshotPayload(
        this.liveOverrideLookup
      );
    }
    const payload = await this.getSnapshotPayloadById(this.snapshotViewId);
    if (this.snapshotApplyRequestId !== requestId) {
      return;
    }
    if (!Array.isArray(payload)) {
      return;
    }
    this.resetTilesToBaseState();
    this.applyTileOverrides(payload, {
      markRecent: false,
      applyLocal: false,
    });
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  restoreLiveView() {
    this.resetTilesToBaseState();
    this.loadTileOverrides();
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
    this.snapshotDiffLookup = {};
    this.snapshotDiffList = [];
  },
  async computeSnapshotDiffs() {
    const requestId = this.snapshotDiffRequestId + 1;
    this.snapshotDiffRequestId = requestId;
    if (!this.snapshotViewId || !this.snapshotCompareId) {
      this.snapshotDiffLookup = {};
      this.snapshotDiffList = [];
      this.snapshotDiffSummary = { owner: 0, city: 0, units: 0, other: 0 };
      this.snapshotCityChanges = { founded: [], captured: [], removed: [] };
      return;
    }
    if (
      this.snapshotCompareId === "__live__" &&
      (!this.liveSnapshotPayload || !this.liveSnapshotPayload.length)
    ) {
      this.liveSnapshotPayload = this.buildLiveSnapshotPayload(
        this.liveOverrideLookup
      );
    }
    const [viewPayload, comparePayload] = await Promise.all([
      this.getSnapshotPayloadById(this.snapshotViewId),
      this.getSnapshotPayloadById(this.snapshotCompareId),
    ]);
    if (this.snapshotDiffRequestId !== requestId) {
      return;
    }
    if (!Array.isArray(viewPayload) || !Array.isArray(comparePayload)) {
      this.snapshotDiffLookup = {};
      this.snapshotDiffList = [];
      this.snapshotDiffSummary = { owner: 0, city: 0, units: 0, other: 0 };
      this.snapshotCityChanges = { founded: [], captured: [], removed: [] };
      return;
    }
    const viewLookup = buildSnapshotLookup(viewPayload);
    const compareLookup = buildSnapshotLookup(comparePayload);
    const keys = new Set([
      ...Object.keys(viewLookup),
      ...Object.keys(compareLookup),
    ]);
    const diffLookup = {};
    const diffList = [];
    const summary = { owner: 0, city: 0, units: 0, other: 0 };
    keys.forEach((key) => {
      const a = viewLookup[key] || null;
      const b = compareLookup[key] || null;
      if (!snapshotPayloadEqual(a, b)) {
        diffLookup[key] = true;
        const ownerChanged = (a && a.owner) !== (b && b.owner);
        const cityChanged = !snapshotValueEqual(
          a ? a.city : null,
          b ? b.city : null
        );
        const unitsChanged =
          !snapshotValueEqual(
            a ? a.combatUnit : null,
            b ? b.combatUnit : null
          ) ||
          !snapshotValueEqual(
            a ? a.civilianUnit : null,
            b ? b.civilianUnit : null
          );
        if (ownerChanged) {
          summary.owner += 1;
        }
        if (cityChanged) {
          summary.city += 1;
        }
        if (unitsChanged) {
          summary.units += 1;
        }
        if (!ownerChanged && !cityChanged && !unitsChanged) {
          summary.other += 1;
        }
        diffList.push({ key, from: a, to: b });
      }
    });
    const cityChanges = buildCityChangeSummary(compareLookup, viewLookup);
    summary.city =
      cityChanges.founded.length +
      cityChanges.captured.length +
      cityChanges.removed.length;
    this.snapshotDiffLookup = diffLookup;
    this.snapshotDiffList = diffList;
    this.snapshotDiffSummary = summary;
    this.snapshotCityChanges = cityChanges;
  },
  buildLiveSnapshotPayload(overrideLookup) {
    if (!Array.isArray(this.tiles) || !this.tiles.length) {
      return [];
    }
    return this.tiles.map((tile) => ({
      tile_key: tile.key,
      payload: this.buildFullPayloadFromBase(
        tile.baseState,
        overrideLookup ? overrideLookup[tile.key] : null
      ),
    }));
  },
  buildFullPayloadFromBase(baseState, overridePayload) {
    const base = baseState || {};
    const payload = overridePayload || {};
    return {
      owner: Object.prototype.hasOwnProperty.call(payload, "owner")
        ? payload.owner
        : base.owner ?? null,
      originalOwner: Object.prototype.hasOwnProperty.call(
        payload,
        "originalOwner"
      )
        ? payload.originalOwner
        : base.originalOwner ?? null,
      notes: Object.prototype.hasOwnProperty.call(payload, "notes")
        ? payload.notes
        : base.notes || null,
      pillaged: Object.prototype.hasOwnProperty.call(payload, "pillaged")
        ? !!payload.pillaged
        : !!base.pillaged,
      ruins: Object.prototype.hasOwnProperty.call(payload, "ruins")
        ? !!payload.ruins
        : !!base.ruins,
      citadel: Object.prototype.hasOwnProperty.call(payload, "citadel")
        ? !!payload.citadel
        : !!base.improvement &&
          isCitadelImprovement({ improvement: base.improvement }),
      combatUnit: Object.prototype.hasOwnProperty.call(payload, "combatUnit")
        ? payload.combatUnit
        : base.combatUnit || null,
      civilianUnit: Object.prototype.hasOwnProperty.call(
        payload,
        "civilianUnit"
      )
        ? payload.civilianUnit
        : base.civilianUnit || null,
      city: Object.prototype.hasOwnProperty.call(payload, "city")
        ? payload.city
        : base.city || null,
    };
  },
  snapshotCityLabel(entry) {
    if (!entry) {
      return "";
    }
    const owner = Number.isFinite(entry.owner)
      ? this.ownerLabel(entry.owner)
      : "Unknown";
    const original = Number.isFinite(entry.originalOwner)
      ? this.ownerLabel(entry.originalOwner)
      : null;
    const suffix = original ? ` (was ${original})` : "";
    return `${entry.name} @ ${entry.key} \u2014 ${owner}${suffix}`;
  },
  formatSnapshotLabel(snapshot) {
    if (!snapshot) {
      return "Snapshot";
    }
    const label = snapshot.episode_label || "Snapshot";
    // const date = snapshot.episode_at
    //   ? this.formatSnapshotDate(snapshot.episode_at)
    //   : null;
    // const base = date ? `${label} \u2014 ${date}` : label;
    const base = label;
    if (this.isAdmin && snapshot.is_published === false) {
      return `${base} (Unpublished)`;
    }
    return base;
  },
  formatSnapshotDate(value) {
    try {
      const date = new Date(value);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        hour12: false,
      });
    } catch (error) {
      return String(value);
    }
  },
  parseUtcDateTimeInput(value) {
    if (!value) {
      return null;
    }
    const normalized = value.includes("Z")
      ? value
      : `${value}:00Z`.replace("T", "T");
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  },
  async saveSnapshot() {
    if (!this.supabase || !this.isAdmin) {
      return;
    }
    const number = String(this.snapshotEpisodeNumber || "").trim();
    if (!number) {
      this.snapshotMessage = "Enter an episode number.";
      return;
    }
    const episodeLabel = `Episode ${number} Snapshot`;
    const episodeAt =
      this.parseUtcDateTimeInput(this.snapshotEpisodeAt) ||
      new Date().toISOString();
    const payload = this.tiles.map((tile) => ({
      tile_key: tile.key,
      payload: this.buildTileOverridePayload(tile),
    }));
    this.snapshotSaving = true;
    this.snapshotMessage = "";
    const { error } = await this.supabase
      .from(SUPABASE_SNAPSHOT_TABLE)
      .insert([
        {
          map_id: SUPABASE_MAP_ID,
          episode_label: episodeLabel,
          episode_at: episodeAt,
          payload,
          created_by: this.authUser ? this.authUser.id : null,
          is_published: true,
        },
      ]);
    this.snapshotSaving = false;
    if (error) {
      this.snapshotMessage = "Unable to save snapshot.";
      return;
    }
    this.snapshotEpisodeNumber = "";
    this.snapshotEpisodeAt = "";
    this.snapshotMessage = "Snapshot saved.";
    await this.loadSnapshots();
  },
  async toggleSnapshotPublish(snapshot) {
    if (!this.supabase || !this.isAdmin || !snapshot) {
      return;
    }
    this.snapshotPublishLoadingId = snapshot.id;
    const nextValue = !snapshot.is_published;
    const { error } = await this.supabase
      .from(SUPABASE_SNAPSHOT_TABLE)
      .update({ is_published: nextValue })
      .eq("id", snapshot.id);
    this.snapshotPublishLoadingId = null;
    if (error) {
      this.snapshotMessage = "Unable to update publish status.";
      return;
    }
    this.snapshotMessage = nextValue
      ? "Snapshot published."
      : "Snapshot unpublished.";
    await this.loadSnapshots();
  },
  async publishSnapshotAndClearOverrides(snapshot) {
    if (!this.supabase || !this.isAdmin || !snapshot) {
      return;
    }
    if (snapshot.is_virtual) {
      return;
    }
    const previousSnapshotId = this.liveBaseSnapshotId || null;
    this.snapshotResetLoadingId = snapshot.id;
    const { error: publishError } = await this.supabase
      .from(SUPABASE_SNAPSHOT_TABLE)
      .update({ is_published: true })
      .eq("id", snapshot.id);
    if (publishError) {
      this.snapshotMessage = "Unable to publish snapshot.";
      this.snapshotResetLoadingId = null;
      return;
    }
    if (previousSnapshotId !== snapshot.id) {
      let deleteQuery = this.supabase
        .from(SUPABASE_OVERRIDE_TABLE)
        .delete()
        .eq("map_id", SUPABASE_MAP_ID);
      if (previousSnapshotId) {
        deleteQuery = deleteQuery.eq("snapshot_id", previousSnapshotId);
      } else {
        deleteQuery = deleteQuery.is("snapshot_id", null);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        this.snapshotMessage =
          "Snapshot published, but overrides could not be cleared.";
        this.snapshotResetLoadingId = null;
        await this.loadSnapshots();
        return;
      }
    }
    await this.loadSnapshots();
    await this.loadLiveBaseSnapshot();
    this.applyLiveBaseSnapshot();
    this.loadTileOverrides();
    this.snapshotMessage = "Snapshot published and overrides cleared.";
    this.snapshotResetLoadingId = null;
  },
  applyConfiguredSnapshotPayload() {
    if (Array.isArray(this.snapshotPayload) && this.snapshotPayload.length) {
      this.applyTileOverrides(this.snapshotPayload, {
        markRecent: false,
        applyLocal: false,
      });
    } else if (this.useBaseSnapshot) {
      const payload = this.getBaseSnapshotPayload();
      if (payload && payload.length) {
        this.applyTileOverrides(payload, {
          markRecent: false,
          applyLocal: false,
        });
      }
    }
  },
};
