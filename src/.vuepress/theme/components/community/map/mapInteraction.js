import { resolveBrushOwnerId } from "../communityTileMapBrushUtils";
import { wrapValue, nearestWorldX } from './mapWrapping.mjs';
import { resolveOwnerInput, buildHexVertices, pointInPolygon } from "./mapModel.js";
import { mapConfig } from "../../../../data/communityTileMap";
import { computeTooltipCoords, computeTooltipBridgeRect } from "../communityTileMapTooltipUtils";

// map Interaction. Methods run on the owning Vue component instance.

export const mapInteractionComputed = {
  tooltipStyle() {
    if (!this.hoverTooltipCoords) {
      return null;
    }
    return {
      left: `${this.hoverTooltipCoords.left}px`,
      top: `${this.hoverTooltipCoords.top}px`,
    };
  },
  hoverTooltipCoords() {
    return computeTooltipCoords({
      viewportWidth: this.viewportSize.width,
      viewportHeight: this.viewportSize.height,
      tooltipWidth: this.hoverTooltipSize.width || 240,
      tooltipHeight: this.hoverTooltipSize.height || 200,
      position: this.hoverTooltipPosition,
    });
  },
  hoverTooltipBridgeStyle() {
    const rect = computeTooltipBridgeRect({
      position: this.hoverTooltipPosition,
      tooltipCoords: this.hoverTooltipCoords,
    });
    if (!rect) {
      return null;
    }
    return {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    };
  },
};

export const mapInteractionMethods = {
  updateTooltipPosition(event) {
    const viewport = this.$refs.viewport;
    if (!viewport || !event) {
      return;
    }
    if (this.hoverTooltipVisible) {
      return;
    }
    const rect = viewport.getBoundingClientRect();
    this.hoverTooltipPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    if (this.hoverTooltipVisible) {
      this.$nextTick(() => {
        this.updateHoverTooltipSize();
      });
    }
  },
  updateHoverTooltipSize() {
    const tooltip = this.$refs.tileTooltip;
    if (!tooltip) {
      return;
    }
    this.hoverTooltipSize = {
      width: tooltip.offsetWidth,
      height: tooltip.offsetHeight,
    };
    if (this.hoverTooltipTile) {
      if (this.hoverTooltipSizeCache.size >= 256) {
        const oldestKey = this.hoverTooltipSizeCache.keys().next().value;
        if (oldestKey !== undefined) {
          this.hoverTooltipSizeCache.delete(oldestKey);
        }
      }
      this.hoverTooltipSizeCache.set(this.hoverTooltipTile.key, {
        ...this.hoverTooltipSize,
      });
    }
  },
  scheduleHoverTooltip(tile) {
    this.clearHoverTooltipTimer();
    this.hoverTooltipVisible = false;
    this.hoverTooltipTile = null;
    if (
      !tile ||
      this.isDragging ||
      this.isPaintingOwner ||
      this.ownerBrushEnabled
    ) {
      return;
    }
    const targetTile = tile;
    this.hoverTooltipTimer = window.setTimeout(() => {
      if (
        this.hoveredTile === targetTile &&
        !this.isDragging &&
        !this.isPaintingOwner
      ) {
        const cached = this.hoverTooltipSizeCache.get(targetTile.key);
        if (cached) {
          this.hoverTooltipSize = { ...cached };
        }
        this.hoverTooltipTile = targetTile;
        this.hoverTooltipVisible = true;
        this.scheduleHoverTooltipSizeUpdate();
      }
    }, 1000);
  },
  clearHoverTooltipTimer() {
    if (this.hoverTooltipTimer) {
      window.clearTimeout(this.hoverTooltipTimer);
      this.hoverTooltipTimer = null;
    }
  },
  hideHoverTooltip() {
    this.clearHoverTooltipTimer();
    if (this.hoverTooltipHideTimer) {
      window.clearTimeout(this.hoverTooltipHideTimer);
      this.hoverTooltipHideTimer = null;
    }
    if (this.hoverTooltipUpdateTimer) {
      window.clearTimeout(this.hoverTooltipUpdateTimer);
      this.hoverTooltipUpdateTimer = null;
    }
    this.hoverTooltipVisible = false;
    this.hoverTooltipTile = null;
  },
  lockHoverTooltip() {
    this.hoverTooltipLocked = true;
    if (this.hoverTooltipHideTimer) {
      window.clearTimeout(this.hoverTooltipHideTimer);
      this.hoverTooltipHideTimer = null;
    }
  },
  unlockHoverTooltip() {
    this.hoverTooltipLocked = false;
    if (!this.hoveredTile) {
      this.hideHoverTooltip();
    }
  },
  invalidateTooltipCache(tileKey) {
    if (!tileKey) {
      return;
    }
    this.hoverTooltipSizeCache.delete(tileKey);
  },
  scheduleHoverTooltipSizeUpdate() {
    if (this.hoverTooltipUpdateTimer) {
      window.clearTimeout(this.hoverTooltipUpdateTimer);
    }
    this.hoverTooltipUpdateTimer = window.setTimeout(() => {
      this.$nextTick(() => {
        this.updateHoverTooltipSize();
      });
    }, 120);
  },
  showSelectedTooltip(tile, pointerWorldX = null) {
    if (!tile) {
      return;
    }
    this.clearHoverTooltipTimer();
    if (this.hoverTooltipHideTimer) {
      window.clearTimeout(this.hoverTooltipHideTimer);
      this.hoverTooltipHideTimer = null;
    }
    const viewport = this.$refs.viewport;
    if (!viewport) {
      return;
    }
    const cached = this.hoverTooltipSizeCache.get(tile.key);
    if (cached) {
      this.hoverTooltipSize = { ...cached };
    }
    this.hoverTooltipTile = tile;
    this.hoverTooltipVisible = true;
    this.hoverTooltipLocked = true;
    this.hoverTooltipPosition = {
      x: (this.wrapActive && Number.isFinite(pointerWorldX)
        ? nearestWorldX(tile.x, pointerWorldX, this.worldPeriod)
        : this.tileWorldX?.(tile) ?? tile.x) * this.scale + this.translate.x,
      y: tile.y * this.scale + this.translate.y,
    };
    this.scheduleHoverTooltipSizeUpdate();
  },
  onPointerDown(event) {
    this.hasUserViewportInteraction = true;
    this.lastPointerType = event.pointerType || null;
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    this.hideHoverTooltip();
    if (event.pointerType === "touch") {
      if (event.cancelable) {
        event.preventDefault();
      }
      this.captureMapPointer(event);
      if (
        !this.activePointers.has(event.pointerId) &&
        this.activePointers.size < 2
      ) {
        this.activePointers.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
      }
      if (this.activePointers.size === 2 && !this.isPinching) {
        this.beginPinchGesture();
      }
      if (
        this.activePointers.size >= 2 ||
        this.isPinching ||
        this.touchGestureHadPinch
      ) {
        return;
      }
    }
    if (this.ownerBrushEnabled) {
      if (!this.ensureEditAccess()) {
        return;
      }
      const ownerId = resolveBrushOwnerId(
        this.editOwnerName,
        resolveOwnerInput
      );
      if (this.ownerBrushMode === "paint" && !Number.isFinite(ownerId)) {
        return;
      }
      this.isPaintingOwner = true;
      this.ownerBrushId = ownerId;
      this.captureMapPointer(event);
      this.clearBrushOverlay();
      const tile = this.getTileAtPointer(event);
      if (tile) {
        this.applyBrushTile(tile);
      }
      return;
    }
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.dragTranslate = { ...this.translate };
    this.captureMapPointer(event);
  },
  onPointerMove(event) {
    const isNavigating = this.isDragging || this.isPinching;
    if (!isNavigating && !this.isPaintingOwner) {
      this.updateTooltipPosition(event);
    }
    if (event.pointerType === "touch") {
      if (event.cancelable) {
        event.preventDefault();
      }
      if (this.activePointers.has(event.pointerId)) {
        this.activePointers.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
      }
      if (this.isPinching && this.activePointers.size >= 2) {
        const points = Array.from(this.activePointers.values());
        const distance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y
        );
        if (this.pinchStartDistance > 0) {
          const ratio = distance / this.pinchStartDistance;
          this.schedulePinchZoom(
            this.pinchStartScale * ratio,
            this.pinchCenter
          );
        }
        return;
      }
      if (this.touchGestureHadPinch) {
        return;
      }
    }
    if (this.useTerrainCanvas && !this.isDragging && !this.isPinching) {
      const tile = this.getTileAtPointer(event);
      if (tile !== this.hoveredTile) {
        this.hoveredTile = tile;
      }
    }
    if (!this.useTerrainCanvas && !this.isDragging && !this.isPinching) {
      const tile = this.getTileAtPointer(event);
      if (tile !== this.hoveredTile) {
        this.hoveredTile = tile;
      }
    }
    if (
      this.isPaintingOwner &&
      (this.ownerBrushMode === "clear" || Number.isFinite(this.ownerBrushId))
    ) {
      const tile = this.getTileAtPointer(event);
      if (tile) {
        this.scheduleBrushApply(tile);
      }
      return;
    }
    if (!this.isDragging) {
      return;
    }
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    if (!this.dragMoved) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this.dragMoved = true;
      } else {
        return;
      }
    }
    const nextTranslate = {
      x: this.dragTranslate.x + dx,
      y: this.dragTranslate.y + dy,
    };
    if (Math.abs(dx) > 5) this.activateHorizontalWrap?.();
    this.translate = this.clampTranslate(nextTranslate, this.scale);
  },
  onPointerUp(event) {
    this.lastPointerType = event.pointerType || this.lastPointerType;
    const wasPinchGesture = this.touchGestureHadPinch;
    const wasCancelled = event.type !== "pointerup";
    const isTrackedTouch =
      event.pointerType === "touch" ||
      this.activePointers.has(event.pointerId);
    if (isTrackedTouch) {
      if (event.cancelable) {
        event.preventDefault();
      }
      this.activePointers.delete(event.pointerId);
      this.releaseMapPointer(event);
      if (this.activePointers.size < 2) {
        this.clearPinchZoomFrame(true);
        this.isPinching = false;
        this.pinchStartDistance = 0;
      }
      if (!this.activePointers.size) {
        this.touchGestureHadPinch = false;
        this.scheduleZoomRendererRelease();
      }
    }
    if (event.type === "pointerleave" && this.hoveredTile) {
      this.hoveredTile = null;
    }
    if (this.isPaintingOwner) {
      this.isPaintingOwner = false;
      this.ownerBrushId = null;
      this.flushBrushEdits();
      this.releaseMapPointer(event);
      return;
    }
    if (wasPinchGesture || wasCancelled) {
      this.isDragging = false;
      this.releaseMapPointer(event);
      return;
    }
    if (this.isDragging) {
      this.isDragging = false;
      this.releaseMapPointer(event);
    }
    if (!this.dragMoved && event.button === 0) {
      if (this.ownerBrushEnabled) {
        return;
      }
      const tile = this.getTileAtPointer(event);
      if (tile) {
        this.selectedTile = tile;
        if (this.lastPointerType === "touch") {
          this.showSelectedTooltip(tile, this._pointerWorldX);
        }
        return;
      }
      if (this.lastPointerType === "touch") {
        this.selectedTile = null;
      }
    }
  },
  onKeydown(event) {
    if (event.target && event.target !== this.$refs.viewport) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Enter' || (event.shiftKey && event.key.startsWith('Arrow'))) {
      event.preventDefault();
      this.selectKeyboardTile(event.key);
      return;
    }
    if (event.key === '?') {
      event.preventDefault();
      this.showMapShortcuts = !this.showMapShortcuts;
      return;
    }
    const panStep = 40;
    const key = event.key;
    if (key === "+" || key === "=") {
      event.preventDefault();
      this.zoomIn();
      return;
    }
    if (key === "-" || key === "_") {
      event.preventDefault();
      this.zoomOut();
      return;
    }
    if (key === "f" || key === "F") {
      event.preventDefault();
      this.fitToView();
      return;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      event.preventDefault();
      this.hasUserViewportInteraction = true;
      if (key === 'ArrowLeft' || key === 'ArrowRight') this.activateHorizontalWrap?.();
      const delta = {
        x:
          key === "ArrowLeft" ? panStep : key === "ArrowRight" ? -panStep : 0,
        y: key === "ArrowUp" ? panStep : key === "ArrowDown" ? -panStep : 0,
      };
      const nextTranslate = {
        x: this.translate.x + delta.x,
        y: this.translate.y + delta.y,
      };
      this.translate = this.clampTranslate(nextTranslate, this.scale);
    }
  },
  setHover(tile) {
    if (this.isDragging || this.isPinching) {
      return;
    }
    this.hoveredTile = tile;
  },
  clearHover() {
    this.hoveredTile = null;
    if (this.hoverTooltipVisible) {
      this.clearHoverTooltipTimer();
      if (this.hoverTooltipHideTimer) {
        window.clearTimeout(this.hoverTooltipHideTimer);
      }
      this.hoverTooltipHideTimer = window.setTimeout(() => {
        if (!this.hoverTooltipLocked) {
          this.hideHoverTooltip();
        }
        this.hoverTooltipHideTimer = null;
      }, 1500);
    }
  },
  selectTile(tile) {
    if (this.dragMoved) {
      return;
    }
    if (this.ownerBrushEnabled || this.isPaintingOwner) {
      return;
    }
    this.selectedTile = tile;
    this.syncEditFieldsFromTile(tile);
  },
  getTileAtPointer(event) {
    const viewport = this.$refs.viewport;
    if (!viewport || !this.tileLookup) {
      return null;
    }
    const rect = viewport.getBoundingClientRect();
    const worldX =
      (event.clientX - rect.left - this.translate.x) / this.scale;
    const worldY = (event.clientY - rect.top - this.translate.y) / this.scale;
    this._pointerWorldX = worldX;
    return this.getTileAtPoint(worldX, worldY);
  },
  getTileAtPoint(worldX, worldY) {
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
      return null;
    }
    const hexWidth = this.hexWidth;
    const hexHeight = this.hexHeight;
    const verticalStep = this.hexSize * 1.5;
    const originX = hexWidth / 2;
    const originY = hexHeight / 2;
    const rowFloat = (worldY - originY) / verticalStep;
    const rowCandidates = [
      Math.floor(rowFloat) - 1,
      Math.floor(rowFloat),
      Math.ceil(rowFloat),
      Math.ceil(rowFloat) + 1,
    ];
    const candidates = [];
    const vertices = buildHexVertices(this.hexSize);

    rowCandidates.forEach((row) => {
      if (row < 0 || row >= this.mapConfig.rows) {
        return;
      }
      const offset = row % 2 ? 0 : hexWidth / 2;
      const colFloat = (worldX - originX - offset) / hexWidth;
      const baseCol = Math.round(colFloat);
      [baseCol - 1, baseCol, baseCol + 1].forEach((col) => {
        if (!this.wrapActive && (col < 0 || col >= this.mapConfig.columns)) {
          return;
        }
        const canonicalCol = this.wrapActive ? wrapValue(col, this.mapConfig.columns) : col;
        const tile = this.tileLookup.get(`${canonicalCol},${row}`);
        if (!tile) {
          return;
        }
        candidates.push({tile, x: tile.x + (col - canonicalCol) * hexWidth});
      });
    });

    for (let i = 0; i < candidates.length; i += 1) {
      const {tile, x} = candidates[i];
      const localX = worldX - x;
      const localY = worldY - tile.y;
      if (pointInPolygon(localX, localY, vertices)) {
        return tile;
      }
    }

    let bestTile = null;
    let bestDistance = Infinity;
    candidates.forEach(({tile, x}) => {
      const dx = worldX - x;
      const dy = worldY - tile.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestTile = tile;
      }
    });

    return bestTile;
  },
  isSelected(tile) {
    return this.selectedTile && this.selectedTile.key === tile.key;
  },
  isSnapshotDiff(tile) {
    if (!tile || !this.snapshotDiffLookup) {
      return false;
    }
    return !!this.snapshotDiffLookup[tile.key];
  },
  clearRecentEdits() {
    if (this.recentEditTimer) window.clearTimeout(this.recentEditTimer);
    this.recentEditTimer = null;
    this._recentEditTiles = new Map();
    this.recentEditTiles = [];
  },
  expireRecentEdits() {
    const now = performance.now();
    const active = this._recentEditTiles || new Map();
    for (const [key, entry] of active) {
      if (entry.expiresAt <= now) active.delete(key);
    }
    this.recentEditTiles = Array.from(active.values());
    if (this.recentEditTimer) window.clearTimeout(this.recentEditTimer);
    this.recentEditTimer = null;
    if (active.size) {
      const expiresAt = Math.min(...this.recentEditTiles.map(entry => entry.expiresAt));
      this.recentEditTimer = window.setTimeout(() => this.expireRecentEdits(), Math.max(1, expiresAt - now));
    }
  },
  markTileRecentlyEdited(tile, durationMs = 4000) {
    if (!tile || this._mapDisposed) return;
    if (!this._recentEditTiles) this._recentEditTiles = new Map();
    const now = performance.now();
    this._recentEditTiles.set(tile.key, {
      key: tile.key, x: tile.x, y: tile.y, durationMs,
      animationKey: `${tile.key}:${++this.recentEditSequence}`,
      expiresAt: now + durationMs,
    });
    this.expireRecentEdits();
  },
};
