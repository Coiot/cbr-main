import {
  SUPABASE_UNDO_FUNCTION,
  SUPABASE_MAP_ID,
  serializeSupabaseError,
  COMBO_MAX_RESULTS,
} from "./mapSettings.js";
import {
  ownerNameForId,
  worldWondersInputValue,
  isCitadelImprovement,
  unitInputValueForUnit,
  unitOwnerInputValueForUnit,
  resolveOwnerInput,
  normalizeUnitInput,
  unitRoleFromType,
  unitLabelFromType,
  setCitadelImprovement,
  clearCitadelImprovement,
  buildHexVertices,
  formatOwnerOptionLabel,
  worldWondersFromInput,
} from "./mapModel.js";
import { getBrushOverlayStyle, getBrushOwnerChange } from "../communityTileMapBrushUtils";
import { s5OwnerList, ALL_UNITS } from "../communityTileMapConstants";

// map Editing. Methods run on the owning Vue component instance.

export const mapEditingComputed = {
  showNotesTab() {
    return (
      this.editAccessAllowed ||
      (this.selectedTile && !!this.selectedTile.notes)
    );
  },
  ownerOptions() {
    return s5OwnerList;
  },
  ownerOptionMatches() {
    return this.filterOwnerOptions(this.editOwnerName);
  },
  originalOwnerOptionMatches() {
    return this.filterOwnerOptions(this.editOriginalOwnerName);
  },
  combatOwnerOptionMatches() {
    return this.filterOwnerOptions(this.editCombatUnitOwnerName);
  },
  civilianOwnerOptionMatches() {
    return this.filterOwnerOptions(this.editCivilianUnitOwnerName);
  },
  overlayOwnerOptionMatches() {
    return this.filterOwnerOptions(this.overlayOwnerName);
  },
  combatUnitOptions() {
    return ALL_UNITS.filter((unit) => unit.role === "combat");
  },
  civilianUnitOptions() {
    return ALL_UNITS.filter((unit) => unit.role === "civilian");
  },
  combatUnitOptionMatches() {
    return this.filterUnitOptions(
      this.editCombatUnitType,
      this.combatUnitOptions
    );
  },
  civilianUnitOptionMatches() {
    return this.filterUnitOptions(
      this.editCivilianUnitType,
      this.civilianUnitOptions
    );
  },
};

export const mapEditingMethods = {
  async undoRecentEdits() {
    if (!this.ensureEditAccess() || !this.supabase) {
      return;
    }
    this.undoLoading = true;
    this.authMessage = "";
    const { data: sessionData } = await this.supabase.auth.getSession();
    const accessToken =
      sessionData && sessionData.session
        ? sessionData.session.access_token
        : null;
    const { data, error } = await this.supabase.functions.invoke(
      SUPABASE_UNDO_FUNCTION,
      {
        body: {
          map_id: SUPABASE_MAP_ID,
          window_seconds: 60,
        },
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      }
    );
    this.undoLoading = false;
    if (error) {
      console.warn("[CommunityTileMapGrid] undo-tile-edits failed.", {
        mapId: SUPABASE_MAP_ID,
        userId: this.authUser && this.authUser.id ? this.authUser.id : null,
        email:
          this.authUser && this.authUser.email ? this.authUser.email : "",
        error: serializeSupabaseError(error),
      });
      this.authMessage = error.message || "Unable to undo edits.";
      return;
    }
    const reverted =
      data && Number.isFinite(data.reverted) ? data.reverted : 0;
    this.authMessage = reverted
      ? `Reverted ${reverted} tile${reverted === 1 ? "" : "s"}.`
      : "No recent edits to undo.";
  },
  toggleEditPanel() {
    if (this.isMobileView) {
      return;
    }
    this.editPanelCollapsed = !this.editPanelCollapsed;
  },
  ensureEditPanelTab() {
    if (!this.showNotesTab && this.editPanelTab === "notes") {
      this.editPanelTab = "edit";
    }
  },
  resetTilesToBaseState() {
    if (!Array.isArray(this.tiles) || !this.tiles.length) {
      return;
    }
    let needsBorderRebuild = false;
    this.tiles.forEach((tile) => {
      const ownerChanged = this.applyTileOverride(tile, { __clear: true });
      if (ownerChanged) {
        needsBorderRebuild = true;
      }
    });
    if (needsBorderRebuild) {
      this.scheduleOwnerBordersRebuild();
    }
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  syncEditFieldsFromTile(tile) {
    if (tile) {
      this.editOwnerName = ownerNameForId(tile.owner);
      this.editOriginalOwnerName = ownerNameForId(tile.originalOwner);
      this.editCityValue =
        tile.city && Number.isFinite(tile.city.size) ? tile.city.size : null;
      this.editCityName = tile.city ? tile.city.name || "" : "";
      this.editCityReligion = tile.city ? tile.city.religion || "" : "";
      this.editWorldWonders = tile.city
        ? worldWondersInputValue(tile.city.worldWonders)
        : "";
      this.editCitadel = isCitadelImprovement(tile);
      this.editCityCapital = tile.city ? !!tile.city.isCapital : false;
      this.editCityPuppeted = tile.city ? !!tile.city.isPuppeted : false;
      this.editCityOccupied = tile.city ? !!tile.city.isOccupied : false;
      this.editCityResistance = tile.city ? !!tile.city.isResistance : false;
      this.editCombatUnitType = unitInputValueForUnit(tile.combatUnit);
      this.editCombatUnitOwnerName = unitOwnerInputValueForUnit(
        tile.combatUnit
      );
      this.editCivilianUnitType = unitInputValueForUnit(tile.civilianUnit);
      this.editCivilianUnitOwnerName = unitOwnerInputValueForUnit(
        tile.civilianUnit
      );
      this.editPillaged = !!tile.pillaged;
      this.editRuins = !!tile.ruins;
      this.editTileNotes = tile.notes || "";
    } else {
      this.editOwnerName = "";
      this.editOriginalOwnerName = "";
      this.editCityValue = null;
      this.editCityName = "";
      this.editCityReligion = "";
      this.editWorldWonders = "";
      this.editCitadel = false;
      this.editCityCapital = false;
      this.editCityPuppeted = false;
      this.editCityOccupied = false;
      this.editCityResistance = false;
      this.editCombatUnitType = "";
      this.editCombatUnitOwnerName = "";
      this.editCivilianUnitType = "";
      this.editCivilianUnitOwnerName = "";
      this.editPillaged = false;
      this.editRuins = false;
      this.editTileNotes = "";
    }
  },
  applyOwnerEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    const ownerId = resolveOwnerInput(this.editOwnerName);
    if (!Number.isFinite(ownerId) || ownerId < 0) {
      return;
    }
    const normalized = Math.round(ownerId);
    this.selectedTile.owner = normalized;
    this.selectedTile.customOwner = true;
    this.syncCityOwnerWithTileOwner(this.selectedTile);
    this.editOwnerName = ownerNameForId(normalized);
    this.ensureOwnerColors(normalized);
    this.rebuildOwnerBorders();
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyCombatUnitEdit() {
    this.applyUnitEditForRole("combat");
  },
  applyCivilianUnitEdit() {
    this.applyUnitEditForRole("civilian");
  },
  applyUnitEditForRole(role) {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    const typeInput =
      role === "combat" ? this.editCombatUnitType : this.editCivilianUnitType;
    const ownerInput =
      role === "combat"
        ? this.editCombatUnitOwnerName
        : this.editCivilianUnitOwnerName;
    const unitType = normalizeUnitInput(typeInput);
    if (!unitType) {
      return;
    }
    if (unitRoleFromType(unitType) !== role) {
      return;
    }
    const ownerInputId = resolveOwnerInput(ownerInput);
    const owner = Number.isFinite(ownerInputId)
      ? ownerInputId
      : Number.isFinite(this.selectedTile.owner)
      ? this.selectedTile.owner
      : null;
    const existingUnit =
      role === "combat"
        ? this.selectedTile.combatUnit
        : this.selectedTile.civilianUnit;
    const nextId =
      existingUnit && Number.isFinite(existingUnit.id)
        ? existingUnit.id
        : this.nextUnitId++;
    const unitData = {
      id: nextId,
      type: unitType,
      owner,
    };
    if (role === "combat") {
      this.selectedTile.combatUnit = unitData;
      this.editCombatUnitType = unitLabelFromType(unitType);
      this.editCombatUnitOwnerName = ownerNameForId(owner);
    } else {
      this.selectedTile.civilianUnit = unitData;
      this.editCivilianUnitType = unitLabelFromType(unitType);
      this.editCivilianUnitOwnerName = ownerNameForId(owner);
    }
    if (Number.isFinite(owner)) {
      this.ensureOwnerColors(owner);
    }
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyCitadelEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    if (this.editCitadel) {
      setCitadelImprovement(this.selectedTile);
    } else {
      clearCitadelImprovement(this.selectedTile);
    }
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyPillagedEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    this.selectedTile.pillaged = !!this.editPillaged;
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyRuinsEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    this.selectedTile.ruins = !!this.editRuins;
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyTileNotesEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    const trimmed = String(this.editTileNotes || "").trim();
    const nextNotes = trimmed || null;
    if (this.selectedTile.notes === nextNotes) {
      return;
    }
    this.selectedTile.notes = nextNotes;
    this.queueTileSave(this.selectedTile);
    this.invalidateTooltipCache(this.selectedTile.key);
    if (this.tileNotesStatusTimer) {
      window.clearTimeout(this.tileNotesStatusTimer);
    }
    this.tileNotesStatus = "Saved";
    this.tileNotesStatusTimer = window.setTimeout(() => {
      this.tileNotesStatus = "";
      this.tileNotesStatusTimer = null;
    }, 2000);
  },
  clearCombatUnitEdit() {
    this.clearUnitEditForRole("combat");
  },
  clearCivilianUnitEdit() {
    this.clearUnitEditForRole("civilian");
  },
  scheduleUnitEdit(role) {
    if (!this.unitEditTimers) {
      return;
    }
    const timer = this.unitEditTimers[role];
    if (timer) {
      window.clearTimeout(timer);
    }
    this.unitEditTimers[role] = window.setTimeout(() => {
      if (role === "combat") {
        this.applyCombatUnitEdit();
      } else {
        this.applyCivilianUnitEdit();
      }
      this.unitEditTimers[role] = null;
    }, 500);
  },
  scheduleFieldEdit(field) {
    if (!this.editDebounceTimers) {
      return;
    }
    const timer = this.editDebounceTimers[field];
    if (timer) {
      window.clearTimeout(timer);
    }
    this.editDebounceTimers[field] = window.setTimeout(() => {
      switch (field) {
        case "owner":
          this.applyOwnerEdit();
          break;
        case "originalOwner":
          this.applyOriginalOwnerEdit();
          break;
        case "cityName":
          this.applyCityNameEdit();
          break;
        case "cityValue":
          this.applyCityEdit();
          break;
        case "cityReligion":
          this.applyCityReligionEdit();
          break;
        case "worldWonders":
          this.applyWorldWondersEdit();
          break;
        default:
          break;
      }
      this.editDebounceTimers[field] = null;
    }, 500);
  },
  filterOwnerOptions(query) {
    const options = this.ownerOptions || [];
    if (!options.length) {
      return [];
    }
    const needle = String(query || "")
      .trim()
      .toLowerCase();
    if (!needle) {
      return options.slice(0, COMBO_MAX_RESULTS);
    }
    return options
      .filter((owner, index) =>
        this.ownerOptionLabel(owner, index).toLowerCase().includes(needle)
      )
      .slice(0, COMBO_MAX_RESULTS);
  },
  filterUnitOptions(query, options) {
    const list = options || [];
    if (!list.length) {
      return [];
    }
    const needle = String(query || "")
      .trim()
      .toLowerCase();
    if (!needle) {
      return list.slice(0, COMBO_MAX_RESULTS);
    }
    return list
      .filter((unit) =>
        String(unit.name || "")
          .toLowerCase()
          .includes(needle)
      )
      .slice(0, COMBO_MAX_RESULTS);
  },
  getComboValue(key) {
    switch (key) {
      case "owner":
        return this.editOwnerName;
      case "originalOwner":
        return this.editOriginalOwnerName;
      case "combatUnit":
        return this.editCombatUnitType;
      case "combatOwner":
        return this.editCombatUnitOwnerName;
      case "civilianUnit":
        return this.editCivilianUnitType;
      case "civilianOwner":
        return this.editCivilianUnitOwnerName;
      case "overlayOwner":
        return this.overlayOwnerName;
      default:
        return "";
    }
  },
  setComboValue(key, value) {
    switch (key) {
      case "owner":
        this.editOwnerName = value;
        break;
      case "originalOwner":
        this.editOriginalOwnerName = value;
        break;
      case "combatUnit":
        this.editCombatUnitType = value;
        break;
      case "combatOwner":
        this.editCombatUnitOwnerName = value;
        break;
      case "civilianUnit":
        this.editCivilianUnitType = value;
        break;
      case "civilianOwner":
        this.editCivilianUnitOwnerName = value;
        break;
      case "overlayOwner":
        this.overlayOwnerName = value;
        break;
      default:
        break;
    }
  },
  comboOptionValue(key, option) {
    if (!option) {
      return "";
    }
    switch (key) {
      case "owner":
      case "originalOwner":
      case "combatOwner":
      case "civilianOwner":
      case "overlayOwner":
        return option.name || "";
      case "combatUnit":
      case "civilianUnit":
        return option.name || "";
      default:
        return "";
    }
  },
  openCombo(key, options) {
    if (!this.comboOpen || !(key in this.comboOpen)) {
      return;
    }
    this.comboOpen[key] = true;
    this.syncComboHighlight(key, options);
  },
  closeCombo(key) {
    if (!this.comboOpen || !(key in this.comboOpen)) {
      return;
    }
    this.comboOpen[key] = false;
    if (this.comboHighlight && key in this.comboHighlight) {
      this.comboHighlight[key] = -1;
    }
  },
  syncComboHighlight(key, options) {
    if (!this.comboHighlight || !(key in this.comboHighlight)) {
      return;
    }
    if (!options || !options.length) {
      this.comboHighlight[key] = -1;
      return;
    }
    const currentValue = this.getComboValue(key);
    const normalized = String(currentValue || "")
      .trim()
      .toLowerCase();
    let index = -1;
    if (normalized) {
      index = options.findIndex(
        (option) =>
          this.comboOptionValue(key, option).toLowerCase() === normalized
      );
    }
    this.comboHighlight[key] = index >= 0 ? index : 0;
  },
  onComboInput(key, options) {
    if (!this.comboOpen[key]) {
      this.comboOpen[key] = true;
    }
    this.syncComboHighlight(key, options);
  },
  setComboHighlight(key, index) {
    if (!this.comboHighlight || !(key in this.comboHighlight)) {
      return;
    }
    this.comboHighlight[key] = index;
  },
  selectComboOption(key, option, applyFn) {
    const value = this.comboOptionValue(key, option);
    this.setComboValue(key, value);
    if (typeof applyFn === "function") {
      applyFn.call(this);
    }
    this.closeCombo(key);
  },
  handleComboBlur(key, applyFn) {
    this.closeCombo(key);
    if (typeof applyFn === "function") {
      applyFn.call(this);
    }
  },
  onComboKeydown(event, key, options, applyFn) {
    const list = options || [];
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!this.comboOpen[key]) {
        this.comboOpen[key] = true;
      }
      if (!list.length) {
        this.setComboHighlight(key, -1);
        return;
      }
      const maxIndex = list.length - 1;
      let index = this.comboHighlight[key];
      if (!Number.isFinite(index) || index < 0 || index > maxIndex) {
        index = event.key === "ArrowUp" ? maxIndex : 0;
      } else {
        index += event.key === "ArrowUp" ? -1 : 1;
        if (index < 0) {
          index = maxIndex;
        }
        if (index > maxIndex) {
          index = 0;
        }
      }
      this.setComboHighlight(key, index);
      return;
    }
    if (event.key === "Enter") {
      if (this.comboOpen[key] && list.length) {
        const index = this.comboHighlight[key];
        if (Number.isFinite(index) && index >= 0 && index < list.length) {
          event.preventDefault();
          this.selectComboOption(key, list[index], applyFn);
          return;
        }
      }
      if (typeof applyFn === "function") {
        applyFn.call(this);
      }
      this.closeCombo(key);
      return;
    }
    if (event.key === "Escape") {
      if (this.comboOpen[key]) {
        event.preventDefault();
        this.closeCombo(key);
      }
    }
  },
  clearUnitEdits() {
    this.clearUnitEditForRole("combat");
    this.clearUnitEditForRole("civilian");
  },
  clearUnitEditForRole(role) {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    if (role === "combat") {
      this.selectedTile.combatUnit = null;
      this.editCombatUnitType = "";
      this.editCombatUnitOwnerName = "";
    } else {
      this.selectedTile.civilianUnit = null;
      this.editCivilianUnitType = "";
      this.editCivilianUnitOwnerName = "";
    }
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
    this.queueTileSave(this.selectedTile);
  },
  applyOriginalOwnerEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    const ownerId = resolveOwnerInput(this.editOriginalOwnerName);
    if (!Number.isFinite(ownerId) || ownerId < 0) {
      return;
    }
    const normalized = Math.round(ownerId);
    this.selectedTile.originalOwner = normalized;
    this.selectedTile.customOriginalOwner = true;
    this.editOriginalOwnerName = ownerNameForId(normalized);
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  clearOwnerEdit() {
    if (!this.ensureEditAccess()) {
      return;
    }
    if (this.ownerBrushEnabled) {
      this.ownerBrushMode =
        this.ownerBrushMode === "clear" ? "paint" : "clear";
      return;
    }
    if (!this.selectedTile) {
      return;
    }
    this.selectedTile.owner = null;
    this.selectedTile.customOwner = false;
    this.syncCityOwnerWithTileOwner(this.selectedTile);
    this.editOwnerName = "";
    this.rebuildOwnerBorders();
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  clearOriginalOwnerEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    this.selectedTile.originalOwner = null;
    this.selectedTile.customOriginalOwner = false;
    this.editOriginalOwnerName = "";
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  toggleOwnerBrush() {
    if (!this.ensureEditAccess()) {
      return;
    }
    if (!this.ownerBrushEnabled || this.ownerBrushMode !== "paint") {
      this.ownerBrushEnabled = true;
      this.ownerBrushMode = "paint";
    } else {
      this.ownerBrushEnabled = false;
    }
    if (!this.ownerBrushEnabled) {
      this.isPaintingOwner = false;
      this.ownerBrushId = null;
      this.flushBrushEdits();
    }
  },
  scheduleBrushApply(tile) {
    if (!tile) {
      return;
    }
    this.brushPendingTile = tile;
    if (this.brushFrameId) {
      return;
    }
    this.brushFrameId = window.requestAnimationFrame(() => {
      this.brushFrameId = null;
      const nextTile = this.brushPendingTile;
      this.brushPendingTile = null;
      if (nextTile) {
        this.applyBrushTile(nextTile);
      }
    });
  },
  applyBrushTile(tile) {
    if (!tile) {
      return;
    }
    const canApply =
      this.ownerBrushMode === "clear" || Number.isFinite(this.ownerBrushId);
    if (!canApply) {
      return;
    }
    const key = tile.key;
    const alreadyTouched = this.brushDirtyKeys
      ? this.brushDirtyKeys.has(key)
      : false;
    this.applyOwnerToTile(tile, this.ownerBrushId, {
      deferSave: true,
      deferBorders: true,
      deferRender: true,
      mode: this.ownerBrushMode,
    });
    if (this.brushDirtyKeys) {
      this.brushDirtyKeys.add(key);
    }
    if (this.useTerrainCanvas && !alreadyTouched) {
      this.drawBrushOverlayTile(tile);
    }
  },
  flushBrushEdits() {
    if (this.brushFrameId) {
      window.cancelAnimationFrame(this.brushFrameId);
      this.brushFrameId = null;
    }
    this.brushPendingTile = null;
    if (!this.brushDirtyKeys || !this.brushDirtyKeys.size) {
      this.clearBrushOverlay();
      return;
    }
    const lookup = this.tileLookup;
    const useMap = lookup instanceof Map;
    this.rebuildOwnerBorders();
    this.brushDirtyKeys.forEach((key) => {
      const tile = useMap ? lookup.get(key) : lookup ? lookup[key] : null;
      if (tile) {
        this.queueTileSave(tile);
      }
    });
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
    this.clearBrushOverlay();
    this.brushDirtyKeys.clear();
  },
  clearBrushOverlay() {
    const canvas = this.$refs.brushCanvas;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
  },
  drawBrushOverlayTile(tile) {
    const canvas = this.$refs.brushCanvas;
    if (!canvas || !tile) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const width = this.canvasWidth;
    const height = this.canvasHeight;
    const scale = this.canvasRenderScale || 1;
    if (canvas.width !== width) {
      canvas.width = width;
    }
    if (canvas.height !== height) {
      canvas.height = height;
    }
    context.setTransform(scale, 0, 0, scale, 0, 0);
    const vertices = buildHexVertices(this.hexSize);
    context.beginPath();
    context.moveTo(tile.x + vertices[0].x, tile.y + vertices[0].y);
    for (let i = 1; i < vertices.length; i += 1) {
      context.lineTo(tile.x + vertices[i].x, tile.y + vertices[i].y);
    }
    context.closePath();
    const style = getBrushOverlayStyle({
      mode: this.ownerBrushMode,
      ownerId: this.ownerBrushId,
      ownerColors: this.ownerColors,
    });
    const previousAlpha = context.globalAlpha;
    context.globalAlpha = style.fillAlpha;
    context.fillStyle = style.color;
    context.fill();
    context.globalAlpha = style.strokeAlpha;
    context.lineWidth = 1.5;
    context.strokeStyle = style.color;
    context.stroke();
    context.globalAlpha = previousAlpha;
  },
  applyOwnerToTile(tile, ownerId, options = {}) {
    if (!this.ensureEditAccess() || !tile) {
      return;
    }
    const mode = options.mode || this.ownerBrushMode;
    const change = getBrushOwnerChange({
      tileOwner: tile.owner,
      tileCustomOwner: tile.customOwner,
      ownerId,
      mode,
    });
    if (!change) {
      return;
    }
    tile.owner = change.owner;
    tile.customOwner = change.customOwner;
    if (Number.isFinite(tile.owner)) {
      this.ensureOwnerColors(tile.owner);
    }
    this.syncCityOwnerWithTileOwner(tile);
    if (!options.deferBorders) {
      this.rebuildOwnerBorders();
    }
    if (!options.deferSave) {
      this.queueTileSave(tile);
    }
    if (this.useTerrainCanvas && !options.deferRender) {
      this.drawTerrainCanvas();
    }
  },
  ownerOptionLabel(owner, index) {
    return formatOwnerOptionLabel(owner, index);
  },
  applyCityEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    const population = Number(this.editCityValue);
    if (!Number.isFinite(population) || population < 1) {
      this.clearCityEdit();
      return;
    }
    const name =
      typeof this.editCityName === "string" && this.editCityName.trim()
        ? this.editCityName.trim()
        : this.selectedTile.city
        ? this.selectedTile.city.name
        : `City ${this.selectedTile.col},${this.selectedTile.row}`;
    this.selectedTile.city = {
      id: this.selectedTile.city ? this.selectedTile.city.id : null,
      name,
      size: Math.round(population),
      owner: this.selectedTile.owner,
      religion: this.editCityReligion ? this.editCityReligion.trim() : "",
      worldWonders: worldWondersFromInput(this.editWorldWonders),
      isPuppeted: !!this.editCityPuppeted,
      isOccupied: !!this.editCityOccupied,
      isResistance: !!this.editCityResistance,
      isCustom: true,
      isCapital: !!this.editCityCapital,
    };
    clearCitadelImprovement(this.selectedTile);
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyCityNameEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    const trimmed =
      typeof this.editCityName === "string" ? this.editCityName.trim() : "";
    if (!trimmed) {
      this.clearCityNameEdit();
      return;
    }
    const size = Number.isFinite(this.editCityValue)
      ? Math.max(1, Math.round(this.editCityValue))
      : this.selectedTile.city
      ? this.selectedTile.city.size || 1
      : 1;
    const worldWonders = worldWondersFromInput(this.editWorldWonders);
    this.selectedTile.city = {
      id: this.selectedTile.city ? this.selectedTile.city.id : null,
      name: trimmed,
      size,
      owner: this.selectedTile.owner,
      religion: this.editCityReligion ? this.editCityReligion.trim() : "",
      worldWonders,
      isPuppeted: !!this.editCityPuppeted,
      isOccupied: !!this.editCityOccupied,
      isResistance: !!this.editCityResistance,
      isCustom: true,
      isCapital: !!this.editCityCapital,
    };
    clearCitadelImprovement(this.selectedTile);
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyCityReligionEdit() {
    if (
      !this.ensureEditAccess() ||
      !this.selectedTile ||
      !this.selectedTile.city
    ) {
      return;
    }
    const religion =
      typeof this.editCityReligion === "string"
        ? this.editCityReligion.trim()
        : "";
    this.selectedTile.city = {
      ...this.selectedTile.city,
      religion,
      worldWonders: worldWondersFromInput(this.editWorldWonders),
      isPuppeted: !!this.editCityPuppeted,
      isOccupied: !!this.editCityOccupied,
      isResistance: !!this.editCityResistance,
      isCustom: true,
    };
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyCityCapitalEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    const isCapital = !!this.editCityCapital;
    if (!this.selectedTile.city) {
      if (!isCapital) {
        return;
      }
      const size = Number.isFinite(this.editCityValue)
        ? Math.max(1, Math.round(this.editCityValue))
        : 1;
      const name =
        typeof this.editCityName === "string" && this.editCityName.trim()
          ? this.editCityName.trim()
          : `City ${this.selectedTile.col},${this.selectedTile.row}`;
      this.selectedTile.city = {
        id: null,
        name,
        size,
        owner: this.selectedTile.owner,
        religion: this.editCityReligion ? this.editCityReligion.trim() : "",
        worldWonders: worldWondersFromInput(this.editWorldWonders),
        isPuppeted: !!this.editCityPuppeted,
        isOccupied: !!this.editCityOccupied,
        isResistance: !!this.editCityResistance,
        isCustom: true,
        isCapital: true,
      };
      clearCitadelImprovement(this.selectedTile);
    } else {
      this.selectedTile.city = {
        ...this.selectedTile.city,
        worldWonders: worldWondersFromInput(this.editWorldWonders),
        isCustom: true,
        isCapital,
      };
    }
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyCityPuppetedEdit() {
    if (
      !this.ensureEditAccess() ||
      !this.selectedTile ||
      !this.selectedTile.city
    ) {
      return;
    }
    this.selectedTile.city = {
      ...this.selectedTile.city,
      isPuppeted: !!this.editCityPuppeted,
      isCustom: true,
    };
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyCityOccupiedEdit() {
    if (
      !this.ensureEditAccess() ||
      !this.selectedTile ||
      !this.selectedTile.city
    ) {
      return;
    }
    this.selectedTile.city = {
      ...this.selectedTile.city,
      isOccupied: !!this.editCityOccupied,
      isCustom: true,
    };
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyCityResistanceEdit() {
    if (
      !this.ensureEditAccess() ||
      !this.selectedTile ||
      !this.selectedTile.city
    ) {
      return;
    }
    this.selectedTile.city = {
      ...this.selectedTile.city,
      isResistance: !!this.editCityResistance,
      isCustom: true,
    };
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  clearCityNameEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    this.editCityName = "";
    if (this.selectedTile.city) {
      this.selectedTile.city = {
        ...this.selectedTile.city,
        name: "",
        worldWonders: worldWondersFromInput(this.editWorldWonders),
        isCustom: true,
        isCapital: !!this.editCityCapital,
      };
    }
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  clearCityEdit() {
    if (!this.ensureEditAccess() || !this.selectedTile) {
      return;
    }
    this.selectedTile.city = null;
    this.editCityName = "";
    this.editCityReligion = "";
    this.editCityCapital = false;
    this.editCityPuppeted = false;
    this.editCityOccupied = false;
    this.editCityResistance = false;
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  clearCityReligionEdit() {
    if (
      !this.ensureEditAccess() ||
      !this.selectedTile ||
      !this.selectedTile.city
    ) {
      return;
    }
    this.selectedTile.city = {
      ...this.selectedTile.city,
      religion: "",
      worldWonders: worldWondersFromInput(this.editWorldWonders),
      isCustom: true,
    };
    this.editCityReligion = "";
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  applyWorldWondersEdit() {
    if (
      !this.ensureEditAccess() ||
      !this.selectedTile ||
      !this.selectedTile.city
    ) {
      return;
    }
    this.selectedTile.city = {
      ...this.selectedTile.city,
      worldWonders: worldWondersFromInput(this.editWorldWonders),
      isCustom: true,
    };
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  clearWorldWondersEdit() {
    if (
      !this.ensureEditAccess() ||
      !this.selectedTile ||
      !this.selectedTile.city
    ) {
      return;
    }
    this.editWorldWonders = "";
    this.selectedTile.city = {
      ...this.selectedTile.city,
      worldWonders: [],
      isCustom: true,
    };
    this.queueTileSave(this.selectedTile);
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  syncCityOwnerWithTileOwner(tile) {
    if (!tile || !tile.city) {
      return;
    }
    const nextOwner = Number.isFinite(tile.owner) ? tile.owner : null;
    if (tile.city.owner === nextOwner) {
      return;
    }
    tile.city = {
      ...tile.city,
      owner: nextOwner,
    };
  },
};
