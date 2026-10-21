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
  buildOwnerBorders,
  setCitadelImprovement,
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
  usesLiveMap() {
    return !this.officialSource && !this.snapshotPayload && !this.useBaseSnapshot && this.resolvedEmbeddedMode !== "snapshot";
  },
  scheduleLiveMapRefresh() {
    if (!this.usesLiveMap() || this._mapDisposed) return;
    this.isLiveSyncing = true;
    if (this._liveSyncFrame) window.cancelAnimationFrame(this._liveSyncFrame);
    // Give Vue and the browser a frame to display the cached terrain first.
    this.$nextTick(() => {
      if (this._mapDisposed) return;
      this._liveSyncFrame = window.requestAnimationFrame(() => {
        this._liveSyncFrame = window.requestAnimationFrame(() => {
          this._liveSyncFrame = null;
          this.refreshLiveMap();
        });
      });
    });
  },
  async refreshLiveMap() {
    if (!this.usesLiveMap() || this._mapDisposed || !this.tiles.length) return;
    if (this._liveRefreshPromise) return this._liveRefreshPromise;
    this.isLiveSyncing = true;
    this.liveSyncError = "";
    this.hasLoadedOverrides = false;
    this._liveRefreshPromise = Promise.resolve().then(async () => {
      try {
        if (!this.supabase) this.initSupabase();
        if (!this.supabase) throw new Error("Live map unavailable");
        await this.loadLiveBaseSnapshot({ includePayload: !this.isMobileBrowser, throwOnError: true });
        if (this._mapDisposed) return;
        await this.ensureLiveBaseSnapshotApplied();
        if (this._mapDisposed) return;
        if (this.liveBaseSnapshotId && !this.snapshotViewId &&
            this.liveBaseSnapshotAppliedId !== this.liveBaseSnapshotId) throw new Error("Snapshot unavailable");
        // Buffer incoming changes while the initial override request is pending.
        this.subscribeToTileOverrides();
        const loaded = await this.loadTileOverrides();
        if (loaded === false) throw new Error("Live changes unavailable");
      } catch (error) {
        if (!this._mapDisposed) this.liveSyncError = "Showing cached map. Live updates unavailable.";
      } finally {
        this._liveRefreshPromise = null;
        if (!this._mapDisposed) {
          this.isLiveSyncing = false;
          this.scheduleLiveOverridesFlush();
        }
      }
    });
    return this._liveRefreshPromise;
  },
  scheduleDeferredStateHydration(mapData) {
    if (!this.isMobileSafari || !mapData) return;
    if (this.deferredStateLoadTimer) window.clearTimeout(this.deferredStateLoadTimer);
    this.deferredStateLoadTimer = window.setTimeout(async () => {
      this.deferredStateLoadTimer = null;
      try {
        const stateData = await this.loadJson(this.mapConfig.stateCacheUrl);
        if (this._mapDisposed) return;
        if (stateData) {
          await this.applyMapData(mapData, stateData, { deferLiveSync: true });
          this.applyConfiguredSnapshotPayload();
        }
      } catch (error) {
        // Keep the base map usable if deferred hydration fails.
      } finally {
        if (!this._mapDisposed) {
          this.$nextTick(() => {
            this.updateViewportSize();
            this.scheduleInitialFitToView();
            this.applyRequestedTileFromRoute();
          });
          this.scheduleLiveMapRefresh();
        }
      }
    }, 280);
  },
  async loadMap(options = {}) {
    if (this.officialSource) {
      this.isLoading = true;
      try {
        // Geography only: never hydrate the legacy live cache or overrides.
        await this.applyMapData({...this.officialSource.base,cities:[],units:[]}, null, {deferLiveSync:true});
        this.applyOfficialFrame();
      } catch (error) { this.loadError = error.message; }
      finally {
        this.isLoading=false;
        this.$nextTick(()=>{this.updateViewportSize();this.scheduleInitialFitToView();this.applyRequestedTileFromRoute();});
      }
      return;
    }
    const deferStateData = !!(options && options.deferStateData && this.isMobileSafari);
    this.isLoading = true;
    this.isLiveSyncing = this.usesLiveMap();
    this.loadError = "";
    try {
      const [baseData, stateData] = await Promise.all([
        this.loadJson(this.mapConfig.baseCacheUrl),
        deferStateData ? Promise.resolve(null) : this.loadJson(this.mapConfig.stateCacheUrl),
      ]);
      let mapData = baseData;
      if (!mapData) {
        const url = this.$withBase ? this.$withBase(this.mapConfig.sourceUrl) : this.mapConfig.sourceUrl;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Unable to load map data.");
        mapData = await this.parseMapBuffer(await response.arrayBuffer());
      }
      if (this._mapDisposed) return;
      await this.applyMapData(mapData, stateData, { deferLiveSync: true });
      this.applyConfiguredSnapshotPayload();
      if (deferStateData) this.scheduleDeferredStateHydration(mapData);
    } catch (error) {
      this.loadError = error.message || "Unable to load map data.";
      this.isLiveSyncing = false;
    } finally {
      if (!this._mapDisposed) {
        this.isLoading = false;
        this.$nextTick(() => {
          this.updateViewportSize();
          this.scheduleInitialFitToView();
          this.applyRequestedTileFromRoute();
        });
        if (!deferStateData && !this.loadError) this.scheduleLiveMapRefresh();
      }
    }
  },
  applyOfficialFrame() {
    if (!this.officialSource || !this.tiles.length) return;
    const {frame}=this.officialSource, cities=new Map(frame.cities.map(c=>[c.index,c]));
    const changedTurn=this._officialTurn!==frame.turn;this._officialTurn=frame.turn;
    const editingField=typeof document!=='undefined'&&document.activeElement?.closest('.tile-edit-form,.tile-notes-editor');
    const details=new Map((frame.details||[]).map(d=>[d.index,d])),ruins=new Map((frame.ruins||[]).map(r=>[r.index,r]));
    const ideologies=new Map(frame.cities.filter(c=>c.ideology!==undefined).map(c=>[c.owner,c.ideology]));
    if(changedTurn)for(const timers of [this.editDebounceTimers,this.unitEditTimers])for(const key of Object.keys(timers||{})){if(timers[key])window.clearTimeout(timers[key]);timers[key]=null;}
    const selected=this.selectedTile?.key;
    this.tiles.forEach((tile,index)=>{
      tile.owner=frame.owners[index]<0?null:frame.owners[index];
      const city=cities.get(index);tile.city=city?JSON.parse(JSON.stringify(city)):null;
      const d=details.get(index)||{};
      tile.originalOwner=tile.city?.originalOwner??ruins.get(index)?.originalOwner??null;
      tile.units=JSON.parse(JSON.stringify(d.units||[]));tile.combatUnit=tile.units.find(u=>u.role==='combat')||null;tile.civilianUnit=tile.units.find(u=>u.role==='civilian')||null;tile.notes=d.notes||null;tile.ideology=ideologies.get(tile.owner)||null;
      tile.improvement=d.improvement||null;tile.improvementId='';tile.improvementColor=null;
      if(/^(IMPROVEMENT_)?CITADEL$/i.test(tile.improvement||''))setCitadelImprovement(tile);
      tile.route=d.route||null;tile.ruins=!tile.city&&(d.ruins??(ruins.has(index)&&!tile.improvement));tile.pillaged=!!d.pillaged;
      tile.detailAttribution=d.attribution||{};
    });
    for(const owner of new Set(frame.owners))if(owner>=0)this.ensureOwnerColors(owner);
    applyOwnerColorOverrides(this.ownerColors,this.ownerSecondaryColors);
    buildOwnerBorders(this.tiles,this.mapConfig.columns,this.mapConfig.rows,this.ownerSecondaryColors,this.hexSize,null,this.tileLookup,this.wrappingEnabled);
    this.ownerLegend=buildOwnerLegend(this.ownerColors,s5OwnerList,this.ownerPalette,this.ownerSecondaryColors);
    this.terrainRevision++;this.resetTerrainBaseCache();this.resetMiniMapCache();
    this.selectedTile=selected?this.tileLookup.get(selected):null;
    if(changedTurn||!editingField)this.syncEditFieldsFromTile(this.selectedTile);
    this.hoverTooltipSizeCache?.clear();
    if(this.hoverTooltipVisible)this.scheduleHoverTooltipSizeUpdate();
    this.$emit('official-select',this.selectedTile);
    // Keep overlay settings across turns. Missing observations stay uncoloured.
    this.$nextTick(()=>{if(this.useTerrainCanvas)this.drawTerrainCanvas();this.scheduleMiniMapDrawIfVisible();});
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
    this.clearRecentEdits();
    this.terrainRevision += 1;
    this.resetMiniMapCache();
    this.nextUnitId = nextUnitIdFromTiles(tiles);
    const tileLookup = buildTileLookup(tiles);
    this.tileLookup = tileLookup;
    this.ownerColors = ownerColors;
    this.ownerSecondaryColors = buildSecondaryColorMap(ownerColors);
    applyOwnerColorOverrides(this.ownerColors, this.ownerSecondaryColors);
    this.ownerLegend = buildOwnerLegend(
      this.ownerColors,
      s5OwnerList,
      this.ownerPalette,
      this.ownerSecondaryColors
    );
    // Build initial geometry on plain objects, before Vue wraps all 16,920 tiles.
    buildOwnerBorders(tiles, mergedMapData.width, mergedMapData.height,
      this.ownerSecondaryColors, this.hexSize, null, tileLookup, this.wrappingEnabled);
    this.tiles = tiles;
    if (!deferLiveSync) {
      await this.loadLiveBaseSnapshot({
        includePayload: !this.isMobileBrowser,
      });
      await this.ensureLiveBaseSnapshotApplied();
    }
    this.deferOwnerBorders = this.isSnapshotEmbed && this.isMobileBrowser;
    if (!deferLiveSync) this.scheduleOwnerBordersRebuild();
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
