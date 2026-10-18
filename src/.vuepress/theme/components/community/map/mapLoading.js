import { parseCiv5Map } from "../civ5MapParser";
import { mapConfig, ownerPalette } from "../../../../data/communityTileMap";
import {
  mergeMapState,
  buildLegendItems,
  collectImprovementNames,
  buildColorLookup,
  buildTiles,
  nextUnitIdFromTiles,
  buildTileLookup,
  buildSecondaryColorMap,
  applyOwnerColorOverrides,
  buildOwnerLegend,
} from "./mapModel.js";
import { RESOURCE_COLOR_OPTIONS, IMPROVEMENT_COLOR_OPTIONS, s5OwnerList } from "../communityTileMapConstants";

// map Loading. Methods run on the owning Vue component instance.

export const mapLoadingMethods = {
  async parseMapBuffer(buffer) {
    if (!(buffer instanceof ArrayBuffer)) {
      throw new Error("Unable to parse map data.");
    }
    if (this.isMobileSafari) {
      return parseCiv5Map(buffer);
    }
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return parseCiv5Map(buffer);
    }
    const workerPath = this.$withBase
      ? this.$withBase("/community/civ5map-parser-worker.js")
      : "/community/civ5map-parser-worker.js";
    if (!workerPath) {
      return parseCiv5Map(buffer);
    }
    let worker = null;
    try {
      worker = new Worker(workerPath);
    } catch (error) {
      return parseCiv5Map(buffer);
    }
    try {
      return await new Promise((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
          if (worker) {
            worker.onmessage = null;
            worker.onerror = null;
            worker.terminate();
            worker = null;
          }
        };
        const finalize = (fn) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          fn();
        };
        worker.onmessage = (event) => {
          const payload = event && event.data ? event.data : {};
          if (!payload || payload.ok === false || !payload.result) {
            const message =
              (payload && payload.error) || "Unable to parse map data.";
            finalize(() => reject(new Error(message)));
            return;
          }
          finalize(() => resolve(payload.result));
        };
        worker.onerror = () => {
          finalize(() => reject(new Error("Unable to parse map data.")));
        };
        try {
          worker.postMessage({ buffer }, [buffer]);
        } catch (error) {
          try {
            worker.postMessage({ buffer });
          } catch (nextError) {
            finalize(() => reject(nextError));
          }
        }
      });
    } catch (error) {
      return parseCiv5Map(buffer);
    }
  },
  scheduleDeferredStateHydration(mapData) {
    if (!this.isMobileSafari || !mapData) {
      return;
    }
    if (this.deferredStateLoadTimer) {
      window.clearTimeout(this.deferredStateLoadTimer);
      this.deferredStateLoadTimer = null;
    }
    this.deferredStateLoadTimer = window.setTimeout(async () => {
      this.deferredStateLoadTimer = null;
      try {
        const stateData = await this.loadJson(this.mapConfig.stateCacheUrl);
        if (!stateData) {
          return;
        }
        await this.applyMapData(mapData, stateData);
        this.applyConfiguredSnapshotPayload();
      } catch (error) {
        // Keep the base map usable if deferred hydration fails.
      } finally {
        this.$nextTick(() => {
          this.updateViewportSize();
          this.scheduleInitialFitToView();
          this.applyRequestedTileFromRoute();
        });
      }
    }, 280);
  },
  async loadMap(options = {}) {
    const deferStateData = !!(options && options.deferStateData && this.isMobileSafari);
    this.isLoading = true;
    this.loadError = "";
    try {
      const [baseData, stateData] = await Promise.all([
        this.loadJson(this.mapConfig.baseCacheUrl),
        deferStateData ? Promise.resolve(null) : this.loadJson(this.mapConfig.stateCacheUrl),
      ]);
      let mapData = baseData;
      if (!mapData) {
        const url = this.$withBase
          ? this.$withBase(this.mapConfig.sourceUrl)
          : this.mapConfig.sourceUrl;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Unable to load map data.");
        }
        const buffer = await response.arrayBuffer();
        mapData = await this.parseMapBuffer(buffer);
      }
      if (deferStateData) {
        await this.applyMapData(mapData, null, { deferLiveSync: true });
        this.applyConfiguredSnapshotPayload();
        this.scheduleDeferredStateHydration(mapData);
      } else {
        await this.applyMapData(mapData, stateData);
        this.applyConfiguredSnapshotPayload();
      }
    } catch (error) {
      this.loadError = error.message || "Unable to load map data.";
    } finally {
      this.isLoading = false;
      this.$nextTick(() => {
        this.updateViewportSize();
        this.scheduleInitialFitToView();
        this.applyRequestedTileFromRoute();
      });
    }
  },
  async loadJson(url) {
    if (!url) {
      return null;
    }
    try {
      const resolved = this.$withBase ? this.$withBase(url) : url;
      const response = await fetch(resolved);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  },
  async applyMapData(mapData, stateData, options = {}) {
    const deferLiveSync = !!(options && options.deferLiveSync);
    const mergedMapData = mergeMapState(mapData, stateData);
    this.mapConfig.columns = mergedMapData.width;
    this.mapConfig.rows = mergedMapData.height;
    this.mapName = mergedMapData.mapName || "";
    this.mapDescription = mergedMapData.mapDescription || "";
    this.hoveredTile = null;
    this.selectedTile = null;
    this.resetTerrainBaseCache();
    this.baseSnapshotPayload = null;
    this.snapshotPayloadCache = Object.create(null);
    this.snapshotPayloadRequests = Object.create(null);
    this.liveBaseSnapshotAppliedId = null;

    this.terrainLegend = buildLegendItems(mergedMapData.terrainList);
    this.featureLegend = buildLegendItems(mergedMapData.featureTerrainList);
    this.wonderLegend = buildLegendItems(mergedMapData.featureWonderList);
    const improvementNames = collectImprovementNames(
      mergedMapData.improvementList,
      stateData
    );
    const resourceColors = buildColorLookup(
      mergedMapData.resourceList,
      RESOURCE_COLOR_OPTIONS
    );
    const improvementColors = buildColorLookup(
      improvementNames,
      IMPROVEMENT_COLOR_OPTIONS
    );
    this.resourceLegend = buildLegendItems(mergedMapData.resourceList).map(
      (item) => ({
        ...item,
        color: resourceColors.get(item.name),
      })
    );
    this.improvementLegend = buildLegendItems(improvementNames).map(
      (item) => ({
        ...item,
        color: improvementColors.get(item.name),
      })
    );

    const { tiles, ownerColors } = buildTiles(
      mergedMapData,
      this.hexSize,
      this.ownerPalette,
      resourceColors,
      improvementColors
    );
    this.tiles = tiles;
    this.nextUnitId = nextUnitIdFromTiles(tiles);
    this.tileLookup = buildTileLookup(tiles);
    this.ownerColors = ownerColors;
    this.ownerSecondaryColors = buildSecondaryColorMap(ownerColors);
    applyOwnerColorOverrides(this.ownerColors, this.ownerSecondaryColors);
    this.ownerLegend = buildOwnerLegend(
      this.ownerColors,
      s5OwnerList,
      this.ownerPalette,
      this.ownerSecondaryColors
    );
    if (!deferLiveSync) {
      await this.loadLiveBaseSnapshot({
        includePayload: !this.isMobileBrowser,
      });
      await this.ensureLiveBaseSnapshotApplied();
    }
    this.deferOwnerBorders = this.isSnapshotEmbed && this.isMobileBrowser;
    this.scheduleOwnerBordersRebuild();
    if (!deferLiveSync) {
      this.hasLoadedOverrides = false;
      this.loadTileOverrides();
      this.subscribeToTileOverrides();
    }
    this.$nextTick(() => {
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    });
  },
};
