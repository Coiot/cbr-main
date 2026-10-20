import { SUPABASE_MAP_ID, QUICK_JUMP_FOCUS_SCALE } from "./mapSettings.js";
import { resolveOwnerInput } from "./mapModel.js";

// map Navigation. Methods run on the owning Vue component instance.

export const mapNavigationMethods = {
  hasRouteFocusRequest() {
    if (this.embedded) {
      return false;
    }
    return !!(
      this.$route?.query?.saved_view ||
      this.resolveRouteMapView() ||
      this.resolveRouteTileKey() ||
      this.resolveRouteCityName() ||
      this.resolveRouteOwnerName()
    );
  },
  scheduleInitialFitToView() {
    if (typeof window === "undefined") {
      return;
    }
    if (this.initialFitTimer) {
      window.clearTimeout(this.initialFitTimer);
      this.initialFitTimer = null;
    }
    this.initialFitAttempts = 0;
    const runAttempt = () => {
      if (this.hasUserViewportInteraction || this.hasRouteFocusRequest()) {
        this.initialFitTimer = null;
        return;
      }
      this.$nextTick(() => {
        this.updateViewportSize();
        this.fitToView();
      });
      if (this.initialFitAttempts >= 6) {
        this.initialFitTimer = null;
        return;
      }
      this.initialFitAttempts += 1;
      this.initialFitTimer = window.setTimeout(runAttempt, 180);
    };
    runAttempt();
  },
  parseTileKeyFromInput(value) {
    const input = String(value || "").trim();
    if (!input) {
      return "";
    }
    const match = input.match(
      /(?:tile[\s#:,-]*)?(-?\d{1,3})\s*[, ]\s*(-?\d{1,3})/i
    );
    if (!match) {
      return "";
    }
    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return "";
    }
    return `${x},${y}`;
  },
  normalizeMapCityName(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  },
  parseCityNameFromInput(value) {
    const decoded = String(value || "").trim();
    if (!decoded) {
      return "";
    }
    try {
      return decodeURIComponent(decoded);
    } catch (error) {
      return decoded;
    }
  },
  parseOwnerNameFromInput(value) {
    const decoded = String(value || "").trim();
    if (!decoded) {
      return "";
    }
    try {
      return decodeURIComponent(decoded);
    } catch (error) {
      return decoded;
    }
  },
  parseSnapshotIdFromInput(value) {
    const decoded = String(value || "").trim();
    if (!decoded) {
      return "";
    }
    try {
      return decodeURIComponent(decoded);
    } catch (error) {
      return decoded;
    }
  },
  staticSnapshotPathFromId(snapshotId) {
    const id = String(snapshotId || "").trim().toLowerCase();
    return /^s5-episode-[0-9]+(?:-[0-9]+)?$/.test(id)
      ? `/community/snapshots/${id}.json`
      : "";
  },
  staticSnapshotLabelFromId(snapshotId) {
    const id = String(snapshotId || "").trim().toLowerCase();
    const match = id.match(/^s5-episode-([0-9]+(?:-[0-9]+)?)$/);
    return match
      ? `Episode ${match[1].replace(/-/g, ".")} Snapshot`
      : "Snapshot";
  },
  resolveRouteSnapshotId() {
    if (this.embedded) {
      return "";
    }
    const route = this.$route || {};
    const path = String(route.path || "");
    if (!path.includes("/community-tile-map")) {
      return "";
    }
    if (
      route.query &&
      Object.prototype.hasOwnProperty.call(route.query, "snapshot")
    ) {
      return this.parseSnapshotIdFromInput(route.query.snapshot);
    }
    return "";
  },
  async ensureSnapshotSelection(snapshotId) {
    const nextSnapshotId = this.parseSnapshotIdFromInput(snapshotId);
    if (!nextSnapshotId) {
      if (this.snapshotViewId) {
        this.snapshotViewId = "";
        this.snapshotCompareId = "";
      }
      return true;
    }
    let availableSnapshots = Array.isArray(this.snapshots)
      ? this.snapshots
      : [];
    if (!availableSnapshots.length) {
      await this.loadSnapshots();
      availableSnapshots = Array.isArray(this.snapshots)
        ? this.snapshots
        : [];
    }
    let selectedSnapshot = availableSnapshots.find(
      (snapshot) => snapshot && snapshot.id === nextSnapshotId
    );
    if (!selectedSnapshot && this.staticSnapshotPathFromId(nextSnapshotId)) {
      selectedSnapshot = {
        id: nextSnapshotId,
        map_id: SUPABASE_MAP_ID,
        episode_label: this.staticSnapshotLabelFromId(nextSnapshotId),
        episode_at: null,
        created_at: null,
        is_published: true,
        is_virtual: true,
        is_static: true,
      };
      this.snapshots = [...availableSnapshots, selectedSnapshot];
    }
    if (!selectedSnapshot) {
      return false;
    }
    if (this.snapshotViewId !== nextSnapshotId) {
      this.snapshotViewId = nextSnapshotId;
    }
    if (!this.snapshotCompareId) {
      this.snapshotCompareId = "__live__";
    }
    return true;
  },
  resolveRouteTileKey() {
    if (this.embedded) {
      return "";
    }
    const route = this.$route || {};
    const path = String(route.path || "");
    if (!path.includes("/community-tile-map")) {
      return "";
    }
    const queryTile =
      route.query && Object.prototype.hasOwnProperty.call(route.query, "tile")
        ? this.parseTileKeyFromInput(route.query.tile)
        : "";
    if (queryTile) {
      return queryTile;
    }
    let hash = String(route.hash || "");
    try {
      hash = decodeURIComponent(hash);
    } catch (error) {
      // Ignore malformed hash and fall back to raw value.
    }
    if (!hash) {
      return "";
    }
    return this.parseTileKeyFromInput(hash.replace(/^#/, ""));
  },
  resolveRouteCityName() {
    if (this.embedded) {
      return "";
    }
    const route = this.$route || {};
    const path = String(route.path || "");
    if (!path.includes("/community-tile-map")) {
      return "";
    }
    if (
      route.query &&
      Object.prototype.hasOwnProperty.call(route.query, "city")
    ) {
      return this.parseCityNameFromInput(route.query.city);
    }
    return "";
  },
  resolveRouteOwnerName() {
    if (this.embedded) {
      return "";
    }
    const route = this.$route || {};
    const path = String(route.path || "");
    if (!path.includes("/community-tile-map")) {
      return "";
    }
    if (
      route.query &&
      Object.prototype.hasOwnProperty.call(route.query, "owner")
    ) {
      return this.parseOwnerNameFromInput(route.query.owner);
    }
    return "";
  },
  centerTileInViewport(tile) {
    if (!tile) {
      return;
    }
    if (!this.viewportSize.width || !this.viewportSize.height) {
      this.updateViewportSize();
    }
    if (!this.viewportSize.width || !this.viewportSize.height) {
      return;
    }
    const nextTranslate = {
      x: this.viewportSize.width / 2 - tile.x * this.scale,
      y: this.viewportSize.height / 2 - tile.y * this.scale,
    };
    this.translate = this.clampTranslate(nextTranslate, this.scale);
  },
  ensureTileInViewport(tile, forceCenter = false) {
    if (!tile) {
      return;
    }
    if (!this.viewportSize.width || !this.viewportSize.height) {
      this.updateViewportSize();
    }
    if (!this.viewportSize.width || !this.viewportSize.height) {
      return;
    }
    const tileScreenX = tile.x * this.scale + this.translate.x;
    const tileScreenY = tile.y * this.scale + this.translate.y;
    const padX = Math.min(120, Math.max(36, this.viewportSize.width * 0.14));
    const padY = Math.min(96, Math.max(28, this.viewportSize.height * 0.14));
    const outOfView =
      tileScreenX < padX ||
      tileScreenX > this.viewportSize.width - padX ||
      tileScreenY < padY ||
      tileScreenY > this.viewportSize.height - padY;
    if (forceCenter || outOfView) {
      this.centerTileInViewport(tile);
    }
  },
  focusTileByKey(tileKey, options = {}) {
    const normalizedOptions =
      typeof options === "boolean" ? { forceCenter: options } : options || {};
    const forceCenter = normalizedOptions.forceCenter !== false;
    const enforceSearchZoom = !!normalizedOptions.enforceSearchZoom;
    const normalizedKey = this.parseTileKeyFromInput(tileKey);
    if (!normalizedKey) {
      return false;
    }
    if (!this.tileLookup) {
      this.pendingRouteTileKey = normalizedKey;
      return false;
    }
    const tile = this.tileLookup.get(normalizedKey);
    if (!tile) {
      this.pendingRouteTileKey = normalizedKey;
      return false;
    }
    this.pendingRouteTileKey = "";
    this.selectedTile = tile;
    this.syncEditFieldsFromTile(tile);
    if (this.isMobileView && this.editPanelCollapsed) {
      this.editPanelCollapsed = false;
    }
    this.$nextTick(() => {
      if (enforceSearchZoom) {
        this.updateViewportSize();
        const targetScale = Math.min(
          this.maxScale,
          Math.max(this.minScale, QUICK_JUMP_FOCUS_SCALE)
        );
        if (Math.abs(this.scale - targetScale) > 0.001) {
          this.applyZoom(targetScale, {
            x: this.viewportSize.width / 2,
            y: this.viewportSize.height / 2,
          });
        }
      }
      this.ensureTileInViewport(tile, forceCenter);
      window.requestAnimationFrame(() => {
        if (enforceSearchZoom) {
          const targetScale = Math.min(
            this.maxScale,
            Math.max(this.minScale, QUICK_JUMP_FOCUS_SCALE)
          );
          if (Math.abs(this.scale - targetScale) > 0.001) {
            this.applyZoom(targetScale, {
              x: this.viewportSize.width / 2,
              y: this.viewportSize.height / 2,
            });
          }
        }
        this.ensureTileInViewport(tile, false);
      });
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    });
    return true;
  },
  focusTileByCityName(cityName, options = {}) {
    const needle = this.normalizeMapCityName(cityName);
    if (!needle || !Array.isArray(this.tiles) || !this.tiles.length) {
      return false;
    }
    const match = this.tiles.find((tile) => {
      if (!tile || !tile.city || !tile.city.name) {
        return false;
      }
      return this.normalizeMapCityName(tile.city.name) === needle;
    });
    if (!match || !match.key) {
      return false;
    }
    return this.focusTileByKey(match.key, options);
  },
  buildOwnerFocusTargets(ownerId) {
    if (
      !Number.isFinite(ownerId) ||
      !Array.isArray(this.tiles) ||
      !this.tiles.length
    ) {
      return [];
    }
    const cityTargets = this.tiles
      .filter(
        (tile) =>
          tile &&
          tile.city &&
          tile.city.name &&
          this.ownerIdForCity(tile) === ownerId
      )
      .slice()
      .sort((a, b) => {
        const aCapital = a.city && a.city.isCapital ? 1 : 0;
        const bCapital = b.city && b.city.isCapital ? 1 : 0;
        if (aCapital !== bCapital) {
          return bCapital - aCapital;
        }
        const aSize = Number(a.city && a.city.size) || 0;
        const bSize = Number(b.city && b.city.size) || 0;
        if (aSize !== bSize) {
          return bSize - aSize;
        }
        const aName = String((a.city && a.city.name) || "");
        const bName = String((b.city && b.city.name) || "");
        return aName.localeCompare(bName, "en");
      });
    const tileTargets = this.tiles
      .filter((tile) => tile && !tile.city && tile.owner === ownerId)
      .slice()
      .sort((a, b) => {
        if (a.row !== b.row) {
          return a.row - b.row;
        }
        return a.col - b.col;
      });
    const seen = new Set();
    return [...cityTargets, ...tileTargets].filter((tile) => {
      if (!tile || !tile.key || seen.has(tile.key)) {
        return false;
      }
      seen.add(tile.key);
      return true;
    });
  },
  focusOwnerByName(ownerName, options = {}) {
    const normalizedOptions =
      typeof options === "boolean" ? { forceCenter: options } : options || {};
    const forceCenter = normalizedOptions.forceCenter !== false;
    const enforceSearchZoom = !!normalizedOptions.enforceSearchZoom;
    const cycle = !!normalizedOptions.cycle;
    const ownerId = resolveOwnerInput(ownerName);
    if (!Number.isFinite(ownerId) || ownerId < 0) {
      return false;
    }
    const targets = this.buildOwnerFocusTargets(ownerId);
    if (!targets.length) {
      return false;
    }
    let nextIndex = 0;
    if (cycle) {
      const currentIndex = Number(this.ownerJumpCycleByOwner[ownerId]);
      nextIndex = Number.isFinite(currentIndex)
        ? (currentIndex + 1) % targets.length
        : 0;
    }
    this.ownerJumpCycleByOwner = {
      ...this.ownerJumpCycleByOwner,
      [ownerId]: nextIndex,
    };
    const target = targets[nextIndex];
    if (!target || !target.key) {
      return false;
    }
    return this.focusTileByKey(target.key, {
      forceCenter,
      enforceSearchZoom,
    });
  },
  async handleQuickJumpTile(event) {
    if (this.embedded) {
      return;
    }
    const route = this.$route || {};
    const path = String(route.path || "");
    if (!path.includes("/community-tile-map")) {
      return;
    }
    const tileKey =
      event && event.detail
        ? this.parseTileKeyFromInput(event.detail.tileKey)
        : "";
    const cityName =
      event && event.detail
        ? this.parseCityNameFromInput(event.detail.cityName)
        : "";
    const ownerName =
      event && event.detail
        ? this.parseOwnerNameFromInput(event.detail.ownerName)
        : "";
    const snapshotId =
      event && event.detail
        ? this.parseSnapshotIdFromInput(event.detail.snapshotId)
        : "";
    if (!tileKey && !cityName && !ownerName && !snapshotId) {
      return;
    }
    if (snapshotId) {
      this.quickJumpRequestedSnapshotId = snapshotId;
      await this.ensureSnapshotSelection(snapshotId);
    } else {
      this.quickJumpRequestedSnapshotId = "";
    }
    if (ownerName) {
      const currentOwnerQuery = this.resolveRouteOwnerName();
      const requestedOwnerId = resolveOwnerInput(ownerName);
      const currentOwnerId = resolveOwnerInput(currentOwnerQuery);
      if (
        Number.isFinite(requestedOwnerId) &&
        Number.isFinite(currentOwnerId) &&
        requestedOwnerId === currentOwnerId
      ) {
        this.focusOwnerByName(ownerName, {
          forceCenter: true,
          enforceSearchZoom: true,
          cycle: true,
        });
        return;
      }
      this.quickJumpRequestedOwnerName = ownerName;
      if (!tileKey && !cityName) {
        return;
      }
    }
    this.quickJumpRequestedTileKey = tileKey;
    this.quickJumpRequestedCityName = cityName;
    if (cityName) {
      const focusedCity = this.focusTileByCityName(cityName, {
        forceCenter: true,
        enforceSearchZoom: true,
      });
      if (focusedCity) {
        return;
      }
    }
    if (tileKey) {
      this.focusTileByKey(tileKey, {
        forceCenter: true,
        enforceSearchZoom: true,
      });
    }
  },
  async applyRequestedTileFromRoute() {
    const requestId = (this._routeViewRequestId || 0) + 1;
    this._routeViewRequestId = requestId;
    const route = this.$route || {};
    const path = String(route.path || "");
    if (!path.includes("/community-tile-map")) {
      this.pendingRouteTileKey = "";
      this.quickJumpRequestedCityName = "";
      this.quickJumpRequestedOwnerName = "";
      this.quickJumpRequestedSnapshotId = "";
      return;
    }
    if (Object.prototype.hasOwnProperty.call(route.query || {}, 'saved_view')) {
      await this.applySavedMapViewFromRoute(requestId);
      return;
    }
    this.activeSavedView = null;
    this.savedViewError = '';
    const snapshotId = this.resolveRouteSnapshotId();
    if (snapshotId) {
      const snapshotApplied = await this.ensureSnapshotSelection(snapshotId);
      if (snapshotApplied) {
        this.quickJumpRequestedSnapshotId = "";
      }
    } else if (
      this.snapshotViewId &&
      (!this.quickJumpRequestedSnapshotId ||
        this.quickJumpRequestedSnapshotId !== this.snapshotViewId)
    ) {
      await this.ensureSnapshotSelection("");
    }
    if (this._mapDisposed || requestId !== this._routeViewRequestId) return;
    if (this.applySharedMapView()) return;
    const query = route.query || {};
    const hasSearchQuery =
      Object.prototype.hasOwnProperty.call(query, "owner") ||
      Object.prototype.hasOwnProperty.call(query, "city") ||
      Object.prototype.hasOwnProperty.call(query, "tile");
    const ownerName = this.resolveRouteOwnerName();
    if (ownerName) {
      const requestedOwnerId = resolveOwnerInput(
        this.quickJumpRequestedOwnerName
      );
      const routeOwnerId = resolveOwnerInput(ownerName);
      const enforceSearchZoomRequested =
        Number.isFinite(requestedOwnerId) &&
        Number.isFinite(routeOwnerId) &&
        requestedOwnerId === routeOwnerId;
      const enforceSearchZoom = enforceSearchZoomRequested || hasSearchQuery;
      if (enforceSearchZoomRequested) {
        this.quickJumpRequestedOwnerName = "";
        this.quickJumpRequestedCityName = "";
        this.quickJumpRequestedTileKey = "";
      }
      const focusedOwner = this.focusOwnerByName(ownerName, {
        forceCenter: true,
        enforceSearchZoom,
        cycle: false,
      });
      if (focusedOwner) {
        return;
      }
    }
    const cityName = this.resolveRouteCityName();
    if (cityName) {
      const enforceSearchZoomRequested =
        !!this.quickJumpRequestedCityName &&
        this.normalizeMapCityName(this.quickJumpRequestedCityName) ===
          this.normalizeMapCityName(cityName);
      const enforceSearchZoom = enforceSearchZoomRequested || hasSearchQuery;
      if (enforceSearchZoomRequested) {
        this.quickJumpRequestedCityName = "";
        this.quickJumpRequestedTileKey = "";
      }
      const focusedCity = this.focusTileByCityName(cityName, {
        forceCenter: true,
        enforceSearchZoom,
      });
      if (focusedCity) {
        return;
      }
    }
    const tileKey = this.resolveRouteTileKey();
    if (tileKey) {
      const enforceSearchZoomRequested =
        !!this.quickJumpRequestedTileKey &&
        this.quickJumpRequestedTileKey === tileKey;
      const enforceSearchZoom =
        enforceSearchZoomRequested ||
        hasSearchQuery ||
        String(route.hash || "").includes("tile-");
      if (enforceSearchZoomRequested) {
        this.quickJumpRequestedTileKey = "";
      }
      this.focusTileByKey(tileKey, {
        forceCenter: true,
        enforceSearchZoom,
      });
      return;
    }
    if (!this.pendingRouteTileKey) {
      return;
    }
    this.focusTileByKey(this.pendingRouteTileKey, {
      forceCenter: true,
      enforceSearchZoom: false,
    });
  },
};
