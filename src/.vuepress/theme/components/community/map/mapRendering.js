import {
  buildHexVertices,
  tilesInViewport,
  terrainColor,
  buildStarVertices,
  desaturateColor,
  adjustedTerrainFill,
  clampValue,
  riverPathPointsForStroke,
  buildRiverOverlayFromTiles,
  strokeRiverPathsOnCanvas,
  featureColor,
  ownerColorEntryById,
  blendHexColors,
  wonderColor,
  formatEnumLabel,
  deriveSecondaryColor,
  resolveOwnerInput,
  cityLabelColors,
  textStrokeStyleForFill,
  unitMarkerColors,
  isCitadelImprovement,
  ownerNameForId,
  isWorldWonderCity,
  worldWondersLabel,
  colorFromString,
  buildOwnerLegend,
  buildOwnerBorders,
  buildHexPoints,
  buildStarPath,
  buildRegularStarPoints,
} from "./mapModel.js";
import {
  NOTE_PIN_PATHS,
  RUINS_PATHS,
  RESOURCE_COLOR_OPTIONS,
  IMPROVEMENT_COLOR_OPTIONS,
  s5OwnerList,
  SQRT3,
} from "../communityTileMapConstants";
import { ownerPalette, mapConfig } from "../../../../data/communityTileMap";
import { MINI_MAP_MAX_WIDTH, MINI_MAP_MAX_HEIGHT } from "./mapSettings.js";

// map Rendering. Methods run on the owning Vue component instance.

export const mapRenderingComputed = {
  canvasRenderScale() {
    if (this.isMobileBrowser) {
      const pixels = this.gridWidth * this.gridHeight;
      const maxPixels = this.isSnapshotEmbed ? 900000 : 1300000;
      const scale = pixels > 0 ? Math.sqrt(maxPixels / pixels) : 1;
      return Math.max(0.42, Math.min(1, scale));
    }
    return 1;
  },
  hexSize() {
    return this.mapConfig.hexSize;
  },
  hexWidth() {
    return this.hexSize * SQRT3;
  },
  hexHeight() {
    return this.hexSize * 2;
  },
  gridWidth() {
    if (!this.mapConfig.columns) {
      return 0;
    }
    const extra = this.mapConfig.rows > 1 ? this.hexWidth / 2 : 0;
    return this.hexWidth * this.mapConfig.columns + extra;
  },
  gridHeight() {
    if (!this.mapConfig.rows) {
      return 0;
    }
    return this.hexHeight + (this.mapConfig.rows - 1) * this.hexSize * 1.5;
  },
  hexPoints() {
    return buildHexPoints(this.hexSize);
  },
  resourcePoints() {
    const size = this.hexSize * 0.2;
    return `${-size} 0 0 ${-size} ${size} 0 0 ${size}`;
  },
  routePath() {
    const size = this.hexSize * 0.45;
    return `M ${-size} ${size * 0.6} L ${size} ${size * 0.6}`;
  },
  wonderPath() {
    const outer = this.hexSize * 0.25;
    const inner = this.hexSize * 0.25;
    return buildStarPath(outer, inner);
  },
  capitalCityPath() {
    const outer = this.hexSize * 0.28;
    const inner = this.hexSize * 0.12;
    return buildStarPath(outer, inner);
  },
  canvasStyle() {
    return {
      width: `${this.gridWidth}px`,
      height: `${this.gridHeight}px`,
      transform: `translate(${this.translate.x}px, ${this.translate.y}px) scale(${this.scale})`,
    };
  },
  viewportStyle() {
    return {
      maxWidth: `${this.mapConfig.viewWidth}px`,
      maxHeight: `${this.mapConfig.viewHeight}px`,
      aspectRatio: `${this.mapConfig.viewWidth} / ${this.mapConfig.viewHeight}`,
    };
  },
  scaleLabel() {
    return `${Math.round(this.scale * 100)}%`;
  },
  featureHexPoints() {
    return buildHexPoints(this.hexSize * 0.5);
  },
  unitPath() {
    const size = this.hexSize * 0.18;
    return `M 0 ${-size} L ${size} 0 L 0 ${size} L ${-size} 0 Z`;
  },
  unitMarkerRadius() {
    return this.hexSize * 0.34;
  },
  unitTrianglePoints() {
    const size = this.hexSize * 0.56;
    return `0 ${size * 0.6} ${-size * 0.55} ${-size * 0.4} ${size * 0.55} ${
      -size * 0.4
    }`;
  },
  citadelStarPoints() {
    const outer = this.hexSize * 0.5;
    const inner = outer * 0.65;
    return buildRegularStarPoints(8, outer, inner);
  },
  showDecorations() {
    return this.scale >= 0.55 && !this.contrastHideDecorations;
  },
  showLabels() {
    return this.scale >= 0.75;
  },
  showCitadels() {
    return this.scale > 1;
  },
  useTerrainCanvas() {
    if (this.zoomRendererMode) {
      return this.zoomRendererMode === "canvas";
    }
    return this.scale <= 1;
  },
  renderOwnerBorders() {
    return true;
  },
  canvasWidth() {
    const scale = this.canvasRenderScale || 1;
    return Math.max(1, Math.ceil(this.gridWidth * scale));
  },
  canvasHeight() {
    const scale = this.canvasRenderScale || 1;
    return Math.max(1, Math.ceil(this.gridHeight * scale));
  },
  showMiniMap() {
    return this.miniMapEnabled;
  },
  showEmbeddedMiniMapToggle() {
    return this.embedded && this.scale > 1;
  },
  miniMapScale() {
    if (!this.gridWidth || !this.gridHeight) {
      return 0;
    }
    const scaleX = MINI_MAP_MAX_WIDTH / this.gridWidth;
    const scaleY = MINI_MAP_MAX_HEIGHT / this.gridHeight;
    return Math.min(scaleX, scaleY);
  },
  miniMapWidth() {
    return Math.max(0, Math.round(this.gridWidth * this.miniMapScale));
  },
  miniMapHeight() {
    return Math.max(0, Math.round(this.gridHeight * this.miniMapScale));
  },
  miniMapViewport() {
    if (!this.gridWidth || !this.gridHeight) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const width = this.viewportSize.width / this.scale;
    const height = this.viewportSize.height / this.scale;
    const maxX = Math.max(0, this.gridWidth - width);
    const maxY = Math.max(0, this.gridHeight - height);
    const x = clampValue(-this.translate.x / this.scale, 0, maxX);
    const y = clampValue(-this.translate.y / this.scale, 0, maxY);
    return {
      x,
      y,
      width: Math.min(width, this.gridWidth),
      height: Math.min(height, this.gridHeight),
    };
  },
  visibleTiles() {
    if (this.useTerrainCanvas) {
      return [];
    }
    if (!this.tiles.length || !this.viewportSize.width) {
      return this.tiles;
    }
    return tilesInViewport(this.tileLookup, this.mapConfig.columns, this.mapConfig.rows,
      this.hexSize, this.translate, this.scale, this.viewportSize);
  },
  visibleRiverOverlay() {
    if (!this.showDecorations || !this.visibleTiles.length) {
      return { paths: [], endpoints: [] };
    }
    return buildRiverOverlayFromTiles(this.visibleTiles);
  },
  visibleCityLabels() {
    if (!this.showLabels) {
      return [];
    }
    return this.visibleTiles.filter(
      (tile) => tile.city && tile.city.name && this.shouldShowCity(tile)
    );
  },
};

export const mapRenderingMethods = {
  resetMiniMapCache() {
    if (this.miniMapBaseCanvas) {
      this.miniMapBaseCanvas.width = 0;
      this.miniMapBaseCanvas.height = 0;
    }
    this.miniMapBaseCanvas = null;
    this.miniMapBaseCacheKey = "";
  },
  resetTerrainBaseCache() {
    if (this.terrainBaseCanvas) {
      this.terrainBaseCanvas.width = 0;
      this.terrainBaseCanvas.height = 0;
    }
    this.terrainBaseCanvas = null;
    this.terrainBaseCacheKey = "";
  },
  shouldUseTerrainBaseCache() {
    if (this.isMobileBrowser) {
      return false;
    }
    if (this.hasActiveCivilizationOverlay || this.isPopulationOverlayActive) {
      return false;
    }
    return true;
  },
  terrainBaseLayerKey(width, height, scale) {
    return [
      width,
      height,
      Number(scale || 1).toFixed(4),
      this.hexSize,
      this.gridWidth,
      this.gridHeight,
      this.tiles.length,
      this.contrastFlattenLandWater ? 1 : 0,
      this.contrastGrayscaleTerrain ? 1 : 0,
    ].join("|");
  },
  scheduleMiniMapDraw() {
    if (!this.showMiniMap) {
      return;
    }
    if (!this.tiles.length) {
      return;
    }
    if (this.miniMapFrameId) {
      return;
    }
    this.miniMapFrameId = window.requestAnimationFrame(() => {
      this.miniMapFrameId = null;
      this.drawMiniMap();
    });
  },
  drawMiniMap() {
    if (!this.gridWidth || !this.gridHeight) {
      return;
    }
    const canvas = this.$refs.miniMapCanvas;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const width = this.miniMapWidth;
    const height = this.miniMapHeight;
    if (!width || !height) {
      return;
    }
    if (canvas.width !== width) {
      canvas.width = width;
    }
    if (canvas.height !== height) {
      canvas.height = height;
    }
    context.clearRect(0, 0, width, height);
    const scale = this.miniMapScale;
    if (!scale) {
      return;
    }
    const cacheKey = `${width}:${height}:${this.hexSize}:${this.terrainRevision}`;
    if (!this.miniMapBaseCanvas || this.miniMapBaseCacheKey !== cacheKey) {
      const base = this.miniMapBaseCanvas || document.createElement("canvas");
      base.width = width;
      base.height = height;
      const baseContext = base.getContext("2d");
      if (!baseContext) return;
      const vertices = buildHexVertices(this.hexSize);
      const terrainCache = new Map();
      baseContext.setTransform(scale, 0, 0, scale, 0, 0);
      this.tiles.forEach((tile) => {
        if (!terrainCache.has(tile.terrainId)) terrainCache.set(tile.terrainId, terrainColor(tile.terrainId));
        baseContext.beginPath();
        baseContext.moveTo(tile.x + vertices[0].x, tile.y + vertices[0].y);
        for (let i = 1; i < vertices.length; i += 1) {
          baseContext.lineTo(tile.x + vertices[i].x, tile.y + vertices[i].y);
        }
        baseContext.closePath();
        baseContext.fillStyle = terrainCache.get(tile.terrainId);
        baseContext.fill();
      });
      this.miniMapBaseCanvas = base;
      this.miniMapBaseCacheKey = cacheKey;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(this.miniMapBaseCanvas, 0, 0);
    const viewport = this.miniMapViewport;
    context.fillStyle = "rgba(255, 255, 255, 0.05)";
    context.strokeStyle = "rgba(255, 255, 255, 0.75)";
    context.lineWidth = 1.15;
    context.fillRect(
      viewport.x * scale,
      viewport.y * scale,
      viewport.width * scale,
      viewport.height * scale
    );
    context.strokeRect(
      viewport.x * scale,
      viewport.y * scale,
      viewport.width * scale,
      viewport.height * scale
    );
  },
  requestTerrainCanvasDraw() {
    if (!this.useTerrainCanvas) {
      return;
    }
    if (this.canvasDrawFrameId) {
      return;
    }
    this.canvasDrawFrameId = window.requestAnimationFrame(() => {
      this.canvasDrawFrameId = null;
      this.drawTerrainCanvasImmediate();
    });
  },
  drawTerrainCanvas() {
    this.requestTerrainCanvasDraw();
  },
  drawTerrainCanvasImmediate() {
    const canvas = this.$refs.terrainCanvas;
    if (!canvas || !this.tiles.length) {
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
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    const tiles = this.tiles;
    const vertices = buildHexVertices(this.hexSize);
    const terrainCache = new Map();
    const getColor = (terrainId) => {
      if (!terrainCache.has(terrainId)) {
        terrainCache.set(terrainId, terrainColor(terrainId));
      }
      return terrainCache.get(terrainId);
    };
    const drawHexPath = (tile) => {
      context.beginPath();
      context.moveTo(tile.x + vertices[0].x, tile.y + vertices[0].y);
      for (let i = 1; i < vertices.length; i += 1) {
        context.lineTo(tile.x + vertices[i].x, tile.y + vertices[i].y);
      }
      context.closePath();
    };
    const drawTerrainLayer = (targetContext) => {
      tiles.forEach((tile) => {
        const fill = this.tileTerrainFillStyle(tile, getColor);
        const previousAlpha = targetContext.globalAlpha;
        const fillColor = fill.color;
        const fillAlpha = Number.isFinite(fill.alpha)
          ? fill.alpha
          : previousAlpha;
        targetContext.globalAlpha = fillAlpha;
        targetContext.beginPath();
        targetContext.moveTo(tile.x + vertices[0].x, tile.y + vertices[0].y);
        for (let i = 1; i < vertices.length; i += 1) {
          targetContext.lineTo(
            tile.x + vertices[i].x,
            tile.y + vertices[i].y
          );
        }
        targetContext.closePath();
        targetContext.fillStyle = fillColor;
        targetContext.fill();
        targetContext.globalAlpha = previousAlpha;
      });
      targetContext.lineWidth = 0.2;
      targetContext.strokeStyle = "rgba(0, 0, 0, 0.05)";
      tiles.forEach((tile) => {
        targetContext.beginPath();
        targetContext.moveTo(tile.x + vertices[0].x, tile.y + vertices[0].y);
        for (let i = 1; i < vertices.length; i += 1) {
          targetContext.lineTo(
            tile.x + vertices[i].x,
            tile.y + vertices[i].y
          );
        }
        targetContext.closePath();
        targetContext.stroke();
      });
    };
    const shouldCacheTerrainBase = this.shouldUseTerrainBaseCache();
    if (shouldCacheTerrainBase) {
      const cacheKey = this.terrainBaseLayerKey(width, height, scale);
      if (!this.terrainBaseCanvas || this.terrainBaseCacheKey !== cacheKey) {
        const baseCanvas =
          this.terrainBaseCanvas || document.createElement("canvas");
        if (baseCanvas.width !== width) {
          baseCanvas.width = width;
        }
        if (baseCanvas.height !== height) {
          baseCanvas.height = height;
        }
        const baseContext = baseCanvas.getContext("2d");
        if (baseContext) {
          baseContext.setTransform(1, 0, 0, 1, 0, 0);
          baseContext.clearRect(0, 0, width, height);
          baseContext.setTransform(scale, 0, 0, scale, 0, 0);
          drawTerrainLayer(baseContext);
          this.terrainBaseCanvas = baseCanvas;
          this.terrainBaseCacheKey = cacheKey;
        } else {
          this.resetTerrainBaseCache();
        }
      }
      if (this.terrainBaseCanvas && this.terrainBaseCacheKey === cacheKey) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.drawImage(this.terrainBaseCanvas, 0, 0);
        context.setTransform(scale, 0, 0, scale, 0, 0);
      } else {
        drawTerrainLayer(context);
      }
    } else {
      if (this.terrainBaseCanvas || this.terrainBaseCacheKey) {
        this.resetTerrainBaseCache();
      }
      drawTerrainLayer(context);
    }

    const previousAlpha = context.globalAlpha;
    let hasOverlayTiles = false;
    tiles.forEach((tile) => {
      if (!this.shouldShowOwnerOverlay(tile)) {
        return;
      }
      const style = this.ownerOverlayStyle(tile);
      if (!style || !style.fill || !Number.isFinite(style.fillOpacity)) {
        return;
      }
      if (style.fillOpacity <= 0) {
        return;
      }
      hasOverlayTiles = true;
      context.globalAlpha = style.fillOpacity;
      drawHexPath(tile);
      context.fillStyle = style.fill;
      context.fill();
    });
    context.globalAlpha = previousAlpha;

    if (hasOverlayTiles && this.renderOwnerBorders) {
      context.lineWidth = 2;
      context.lineJoin = "round";
      context.lineCap = "round";
      const previousBorderAlpha = context.globalAlpha;
      tiles.forEach((tile) => {
        if (!this.shouldShowOwnerOverlay(tile)) {
          return;
        }
        const borderSegments = this.ownerBorderSegmentsForTile(tile);
        if (!borderSegments.length) {
          return;
        }
        borderSegments.forEach((segment) => {
          const borderStyle = this.ownerBorderStyle(tile, segment);
          context.beginPath();
          context.moveTo(tile.x + segment.x1, tile.y + segment.y1);
          context.lineTo(tile.x + segment.x2, tile.y + segment.y2);
          context.strokeStyle =
            (borderStyle && borderStyle.stroke) ||
            this.ownerBorderColor(tile, segment);
          context.lineWidth =
            (borderStyle && Number(borderStyle.strokeWidth)) || 2;
          context.globalAlpha =
            borderStyle && Number.isFinite(borderStyle.opacity)
              ? borderStyle.opacity
              : previousBorderAlpha;
          context.stroke();
        });
      });
      context.globalAlpha = previousBorderAlpha;
    }

    if (this.showDecorations) {
      this.drawCanvasRiverOverlay(context, tiles);
    }

    const capitalOuter = this.hexSize * 0.44;
    const capitalInner = this.hexSize * 0.2;
    const capitalVertices = buildStarVertices(capitalOuter, capitalInner);
    context.globalAlpha = 1;
    tiles.forEach((tile) => {
      if (!this.shouldShowCity(tile)) {
        return;
      }
      if (tile.city.isCapital) {
        context.beginPath();
        context.moveTo(
          tile.x + capitalVertices[0].x,
          tile.y + capitalVertices[0].y
        );
        for (let i = 1; i < capitalVertices.length; i += 1) {
          context.lineTo(
            tile.x + capitalVertices[i].x,
            tile.y + capitalVertices[i].y
          );
        }
        context.closePath();
        context.fillStyle = "#fff";
        context.fill();
        context.strokeStyle = "rgba(0, 0, 0, 0.9)";
        context.lineWidth = 1.25;
        context.stroke();
        return;
      }
      context.beginPath();
      context.arc(tile.x, tile.y, this.hexSize * 0.35, 0, Math.PI * 2);
      context.fillStyle = "#fff";
      context.fill();
      context.strokeStyle = "rgba(0, 0, 0, 0.9)";
      context.lineWidth = 1.5;
      context.stroke();
    });

    this.drawCanvasMapPins(context);

    context.lineJoin = "round";
    context.lineCap = "round";
    const diffKeys = this.snapshotDiffLookup || null;
    let hasDiffKeys = false;
    if (diffKeys) {
      for (const key in diffKeys) {
        if (diffKeys[key]) {
          hasDiffKeys = true;
          break;
        }
      }
    }
    if (hasDiffKeys) {
      context.lineJoin = "round";
      context.lineCap = "round";
      tiles.forEach((tile) => {
        if (!diffKeys[tile.key]) {
          return;
        }
        drawHexPath(tile);
        context.strokeStyle = "rgba(255, 210, 90, 0.9)";
        context.lineWidth = 2.5;
        context.stroke();
      });
    }

    // Unit markers render in SVG at higher zoom levels.

  },
  handleOverlayVisualizationChange() {
    if (this.useTerrainCanvas) {
      this.drawTerrainCanvas();
    }
  },
  isWaterTile(tile) {
    return (
      !!tile && (tile.terrainId === "ocean" || tile.terrainId === "coast")
    );
  },
  contrastTerrainColor(tile, color) {
    let nextColor = color;
    if (this.contrastFlattenLandWater) {
      nextColor = this.isWaterTile(tile) ? "#294a5f" : "#8e8e69";
    }
    if (this.contrastGrayscaleTerrain) {
      nextColor = desaturateColor(nextColor, 1);
    }
    return nextColor;
  },
  tileTerrainFillStyle(tile, getColor) {
    const fill = adjustedTerrainFill(tile, getColor);
    let fillColor = this.contrastTerrainColor(tile, fill.color);
    let fillAlpha = Number.isFinite(fill.alpha) ? fill.alpha : 1;
    if (
      this.hasActiveCivilizationOverlay &&
      !this.tileBelongsToOverlayCiv(tile)
    ) {
      fillColor = desaturateColor(fillColor, 0.6);
      fillAlpha = this.isWaterTile(tile) ? 0.12 : 0.3;
    } else if (this.isPopulationOverlayActive) {
      fillColor = desaturateColor(fillColor, 0.35);
    }
    return {
      color: fillColor,
      alpha: fillAlpha,
    };
  },
  ownerIdForCity(tile) {
    if (!tile || !tile.city) {
      return null;
    }
    if (Number.isFinite(tile.city.owner)) {
      return tile.city.owner;
    }
    return Number.isFinite(tile.owner) ? tile.owner : null;
  },
  ownerIdForUnit(unit, tile) {
    if (unit && Number.isFinite(unit.owner)) {
      return unit.owner;
    }
    if (tile && Number.isFinite(tile.owner)) {
      return tile.owner;
    }
    return null;
  },
  tileBelongsToOverlayCiv(tile) {
    if (!tile || !this.hasActiveCivilizationOverlay) {
      return false;
    }
    return tile.owner === this.activeOverlayOwnerId;
  },
  unitBelongsToOverlayCiv(unit, tile) {
    if (!this.hasActiveCivilizationOverlay) {
      return true;
    }
    return this.ownerIdForUnit(unit, tile) === this.activeOverlayOwnerId;
  },
  shouldShowOwnerOverlay(tile) {
    if (!tile || !Number.isFinite(tile.owner)) {
      return false;
    }
    if (!this.hasActiveCivilizationOverlay) {
      return true;
    }
    return this.tileBelongsToOverlayCiv(tile);
  },
  ownerBorderSegmentsForTile(tile) {
    if (!this.renderOwnerBorders) {
      return [];
    }
    if (!tile || !Array.isArray(tile.ownerBorderSegments)) {
      return [];
    }
    if (!this.hasActiveCivilizationOverlay) {
      return tile.ownerBorderSegments;
    }
    return this.tileBelongsToOverlayCiv(tile) ? tile.ownerBorderSegments : [];
  },
  ownerBorderColor(tile, segment) {
    if (this.isPopulationOverlayActive) {
      const style = this.populationOverlayStyle(tile);
      return (style && style.fill) || "#ffffff";
    }
    if (this.isReligionOverlayActive) {
      const style = this.religionOverlayStyle(tile);
      return (style && style.fill) || "#ffffff";
    }
    return (segment && segment.color) || "#ffffff";
  },
  ownerBorderStyle(tile, segment) {
    const stroke = this.ownerBorderColor(tile, segment);
    return { stroke };
  },
  shouldShowCity(tile) {
    if (!tile || !tile.city) {
      return false;
    }
    if (!this.hasActiveCivilizationOverlay) {
      return true;
    }
    return this.ownerIdForCity(tile) === this.activeOverlayOwnerId;
  },
  shouldShowPrimaryUnit(tile) {
    if (!tile) {
      return false;
    }
    const unit = this.primaryUnit(tile);
    if (!unit) {
      return false;
    }
    return this.unitBelongsToOverlayCiv(unit, tile);
  },
  showUnitMarker(tile, role) {
    if (!tile || this.scale <= 1) {
      return false;
    }
    const unit = role === "combat" ? tile.combatUnit : tile.civilianUnit;
    if (!unit) {
      return false;
    }
    return this.unitBelongsToOverlayCiv(unit, tile);
  },
  overlayDensityColor(ratio) {
    const clamped = clampValue(Number(ratio) || 0, 0, 1);
    const steps = [
      "hsl(50, 100%, 77.5%)",
      "hsl(30, 90%, 70%)",
      "hsl(25, 100%, 62.5%)",
      "hsl(0, 75%, 57.5%)",
      "hsl(340, 75%, 52.5%)",
      "hsl(315, 60%, 45%)",
      "hsl(290, 80%, 37.5%)",
      "hsl(280, 80%, 22.5%)",
    ];
    if (clamped >= 1) {
      return steps[steps.length - 1];
    }
    const index = Math.min(
      steps.length - 2,
      Math.floor(clamped * (steps.length - 1))
    );
    return steps[index];
  },
  populationOverlayStyle(tile) {
    if (!tile || !Number.isFinite(tile.owner)) {
      return { fill: "transparent", fillOpacity: 0 };
    }
    if (
      Number.isFinite(this.babylonOwnerId) &&
      tile.owner === this.babylonOwnerId
    ) {
      return { fill: "transparent", fillOpacity: 0 };
    }
    if(this.officialSource&&!Object.prototype.hasOwnProperty.call(this.populationDensityByOwner,tile.owner))return {fill:'transparent',fillOpacity:0};
    const density = this.populationDensityByOwner[tile.owner] || 0;
    const maxDensity = this.populationOverlayMetrics.maxDensity || 0;
    const ratio = maxDensity > 0 ? clampValue(density / maxDensity, 0, 1) : 0;
    const isWater = this.isWaterTile(tile);
    const fillOpacity = clampValue(
      isWater ? 0.1 + ratio * 0.04 : 0.5 + ratio * 0.75,
      0,
      1
    );
    return {
      fill: this.overlayDensityColor(ratio),
      fillOpacity,
    };
  },
  religionOverlayStyle(tile) {
    if (!tile || !Number.isFinite(tile.owner)) {
      return { fill: "transparent", fillOpacity: 0 };
    }
    const religion = this.religionOverlayByOwner[tile.owner];
    if (!religion || !religion.color) {
      return { fill: "transparent", fillOpacity: 0 };
    }
    const isWater = this.isWaterTile(tile);
    let fillOpacity = isWater ? 0.14 : 0.8;
    if (this.contrastBoostOwnerOpacity) {
      fillOpacity = isWater ? fillOpacity : 1;
    }
    return {
      fill: religion.color,
      fillOpacity,
    };
  },
  formatOverlayDensity(value) {
    if (!Number.isFinite(value)) {
      return this.officialSource ? 'Unknown' : "0.00";
    }
    return Number(value).toFixed(2);
  },
  formatOverlayCount(value) {
    if (!Number.isFinite(value)) {
      return "0";
    }
    return Math.round(value).toLocaleString("en-US");
  },
  tileStrokeStyle(tile) {
    return { stroke: "rgba(0, 0, 0, 0.05)", strokeWidth: 1 };
  },
  tileHexStyle(tile) {
    const stroke = this.tileStrokeStyle(tile);
    if (!tile) {
      return stroke;
    }
    const baseColor = terrainColor(tile.terrainId);
    const fill = this.tileTerrainFillStyle(tile, () => baseColor);
    const nextStyle = { ...stroke, fill: fill.color };
    if (Number.isFinite(fill.alpha) && fill.alpha < 1) {
      nextStyle.fillOpacity = fill.alpha;
    }
    return nextStyle;
  },
  ownerOverlayStyle(tile) {
    if (!tile || !Number.isFinite(tile.owner)) {
      return { fill: "transparent", fillOpacity: 0 };
    }
    if (this.isPopulationOverlayActive) {
      return this.populationOverlayStyle(tile);
    }
    if (this.isReligionOverlayActive) {
      return this.religionOverlayStyle(tile);
    }
    const color = this.ownerColors[tile.owner] || "#ffffff";
    const isWater = this.isWaterTile(tile);
    if (
      this.hasActiveCivilizationOverlay &&
      !this.tileBelongsToOverlayCiv(tile)
    ) {
      return { fill: "transparent", fillOpacity: 0 };
    }
    let fillOpacity = this.hasActiveCivilizationOverlay
      ? isWater
        ? 0.2
        : 0.9
      : isWater
      ? 0.1
      : 0.72;
    if (this.contrastBoostOwnerOpacity) {
      fillOpacity = isWater ? fillOpacity : 1;
    }
    return {
      fill: color,
      fillOpacity,
    };
  },
  miniMapHexStyle(tile) {
    const baseColor = terrainColor(tile.terrainId);
    return { fill: baseColor };
  },
  terrainClass(tile) {
    return tile.terrainId ? `terrain-${tile.terrainId}` : "terrain-grass";
  },
  elevationClass(tile) {
    return tile.elevation === 2 ? "elevation-mountain" : "elevation-hill";
  },
  riverOverlayLayerConfig(layer) {
    const grayscale = !!this.contrastGrayscaleTerrain;
    const layers = {
      back: {
        width: Math.max(1.8, this.hexSize * 0.3),
        color: grayscale
          ? "hsl(0deg 0% 12% / 0.72)"
          : "hsl(207deg 90% 15% / 0.72)",
      },
      mid: {
        width: Math.max(1, this.hexSize * 0.2),
        color: grayscale
          ? "hsl(0deg 0% 85% / 0.98)"
          : "hsl(202deg 95% 50% / 0.98)",
      },
      top: {
        width: Math.max(0.7, this.hexSize * 0.125),
        color: "hsl(200deg 100% 90% / 0.95)",
      },
    };
    return layers[layer] || layers.mid;
  },
  riverOverlayLayerStyle(layer) {
    const config = this.riverOverlayLayerConfig(layer);
    return {
      fill: "none",
      stroke: config.color,
      strokeWidth: config.width,
    };
  },
  riverOverlayPathData(points) {
    const pathPoints = riverPathPointsForStroke(
      points,
      Math.max(0.6, this.hexSize * 0.08)
    );
    if (!Array.isArray(pathPoints) || pathPoints.length < 2) {
      return "";
    }
    if (pathPoints.length === 2) {
      return `M ${pathPoints[0].x} ${pathPoints[0].y} L ${pathPoints[1].x} ${pathPoints[1].y}`;
    }
    let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let index = 1; index < pathPoints.length - 1; index += 1) {
      const current = pathPoints[index];
      const next = pathPoints[index + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      d += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
    }
    const last = pathPoints[pathPoints.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  },
  drawCanvasRiverOverlay(context, tiles) {
    if (!context || !Array.isArray(tiles) || !tiles.length) {
      return;
    }
    const overlay = buildRiverOverlayFromTiles(tiles);
    if (!overlay.paths.length) {
      return;
    }
    context.save();
    context.lineJoin = "round";
    context.lineCap = "butt";
    const trimDistance = Math.max(0.6, this.hexSize * 0.08);
    ["back", "mid", "top"].forEach((layer) => {
      const config = this.riverOverlayLayerConfig(layer);
      context.lineWidth = config.width;
      context.strokeStyle = config.color;
      strokeRiverPathsOnCanvas(context, overlay.paths, trimDistance);
    });
    context.restore();
  },
  featureStyle(tile) {
    let color = featureColor(tile.featureId);
    if (tile && Number.isFinite(tile.owner)) {
      const override = ownerColorEntryById(tile.owner);
      const ownerColor =
        (override && override.primary) || this.ownerColors[tile.owner];
      if (ownerColor) {
        color = blendHexColors(color, ownerColor, 0.2);
        color = desaturateColor(color, 0.15);
      }
    }
    return { fill: color, stroke: "rgba(0, 0, 0, 0.32)", fillOpacity: 0.3 };
  },
  wonderStyle(tile) {
    const color = wonderColor(tile.wonderId);
    return { fill: color, stroke: "rgba(0, 0, 0, 0.4)" };
  },
  routeClass(tile) {
    return tile.route ? `route-${tile.route}` : "";
  },
  tileTitle(tile) {
    return `Tile ${tile.col},${tile.row}`;
  },
  formatLabel(value) {
    if (!value) {
      return "None";
    }
    return formatEnumLabel(value);
  },
  notePinPaths() {
    return NOTE_PIN_PATHS;
  },
  notePinTransform() {
    const offsetX = this.hexSize * 0.3;
    const offsetY = this.hexSize * 0.5;
    const scale = (this.hexSize * 0.8) / 640;
    return `translate(${offsetX}, ${offsetY}) scale(${scale}) translate(-320, -576)`;
  },
  notePinStyle(tile) {
    let fill = "#fff";
    if (tile && Number.isFinite(tile.owner)) {
      const ownerId = tile.owner;
      const override = ownerColorEntryById(ownerId);
      if (override && override.secondary) {
        fill = override.secondary;
      } else if (this.ownerSecondaryColors[ownerId]) {
        fill = this.ownerSecondaryColors[ownerId];
      } else {
        const baseColor =
          (override && override.primary) ||
          this.ownerColors[ownerId] ||
          this.ownerPalette[ownerId % this.ownerPalette.length];
        fill = deriveSecondaryColor(baseColor);
      }
    }
    return {
      fill,
      stroke: "rgba(0, 0, 0, 0.8)",
    };
  },
  ruinsPaths() {
    return RUINS_PATHS;
  },
  ruinsTransform() {
    const offsetX = 0;
    const offsetY = this.hexSize * 0.05;
    const scale = (this.hexSize * 1.1) / 640;
    return `translate(${offsetX}, ${offsetY}) scale(${scale}) translate(-320, -320)`;
  },
  ruinsStyle(tile) {
    let ownerId = null;
    if (tile && Number.isFinite(tile.originalOwner)) {
      ownerId = tile.originalOwner;
    } else if (tile && Number.isFinite(tile.owner)) {
      ownerId = tile.owner;
    }
    let fill = "#ffffff";
    let stroke = "rgba(0, 0, 0, 0.7)";
    let primary = fill;
    let secondary = fill;
    if (Number.isFinite(ownerId)) {
      const override = ownerColorEntryById(ownerId);
      primary =
        (override && override.primary) ||
        this.ownerColors[ownerId] ||
        this.ownerPalette[ownerId % this.ownerPalette.length];
      secondary =
        (override && override.secondary) ||
        this.ownerSecondaryColors[ownerId] ||
        deriveSecondaryColor(primary);
      fill = primary;
      stroke = secondary;
    }
    return { fill, stroke, primary, secondary };
  },
  ruinsPathStyle(ruinsPath, index, tile) {
    const colors = this.ruinsStyle(tile) || {};
    if (index === 0) {
      return { fill: colors.primary || colors.fill };
    }
    if (index === 1) {
      return { fill: colors.secondary || colors.stroke || colors.fill };
    }
    return null;
  },
  elevationLabel(value) {
    if (value === 2) {
      return "Mountain";
    }
    if (value === 1) {
      return "Hills";
    }
    return "Flat";
  },
  cityLabelTransform(tile) {
    return `translate(${tile.x}, ${tile.y - this.hexSize * 0.7})`;
  },
  cityLabelHeight() {
    const base = Math.max(10, this.hexSize * 0.8);
    return this.contrastLargeCityBanners ? base * 1.75 : base;
  },
  cityLabelBadgeRadius() {
    return this.cityLabelHeight() * 0.46;
  },
  cityLabelOriginalBadgeRadius() {
    return this.cityLabelHeight() * 0.3;
  },
  cityLabelTextGap() {
    return this.cityLabelHeight() * 0.3;
  },
  cityLabelTextY() {
    return this.cityLabelHeight() * 0.06 - 0.5;
  },
  cityLabelPopTextY() {
    return this.cityLabelTextY() + 0.5;
  },
  cityLabelTextFontSize() {
    const size = this.cityLabelHeight() * 0.52;
    return Math.max(6, Math.round(size * 10) / 10);
  },
  cityLabelNameWidth(tile) {
    const name =
      tile && tile.city && tile.city.name ? String(tile.city.name) : "";
    const height = this.cityLabelHeight();
    const unitWidth = height * 0.45;
    const nameUnits = Array.from(name).reduce((total, char) => {
      if (char === " ") {
        return total + 0.5;
      }
      if (/[ilI1'`]/.test(char)) {
        return total + 0.6;
      }
      if (/[mwMW]/.test(char)) {
        return total + 1.2;
      }
      if (/[0-9]/.test(char)) {
        return total + 0.85;
      }
      return total + 0.95;
    }, 0);
    return nameUnits * unitWidth;
  },
  cityLabelWidth(tile) {
    const height = this.cityLabelHeight();
    const badgeDiameter = this.cityLabelBadgeRadius() * 2;
    const nameWidth = this.cityLabelNameWidth(tile);
    const rightPad = height * 0.38;
    const originalBadgeWidth = this.cityHasOriginalOwnerBadge(tile)
      ? this.cityLabelOriginalBadgeRadius() * 1.25 + height * 0.2
      : 0;
    return (
      badgeDiameter +
      this.cityLabelTextGap() +
      nameWidth +
      rightPad +
      originalBadgeWidth
    );
  },
  ownerLegendStyle(owner) {
    const fill = owner && owner.color ? owner.color : "#ffffff";
    const border =
      owner && owner.secondaryColor ? owner.secondaryColor : fill;
    return { backgroundColor: fill, borderColor: border };
  },
  ownerInputStyle(value) {
    const ownerId = resolveOwnerInput(value);
    if (!Number.isFinite(ownerId)) {
      return null;
    }
    const entry = ownerColorEntryById(ownerId);
    if (!entry) {
      return null;
    }
    return {
      backgroundColor: entry.primary,
      borderColor: entry.secondary,
      color: entry.secondary,
    };
  },
  cityLabelPillStyle(tile) {
    const colors = cityLabelColors(
      tile,
      this.ownerColors,
      this.ownerSecondaryColors
    );
    if (!colors) {
      return null;
    }
    return { fill: colors.primary, stroke: colors.secondary };
  },
  cityLabelBadgeStyle(tile) {
    const colors = cityLabelColors(
      tile,
      this.ownerColors,
      this.ownerSecondaryColors
    );
    if (!colors) {
      return null;
    }
    return { fill: "#111", stroke: colors.secondary };
  },
  cityLabelTextStyle(tile) {
    const colors = cityLabelColors(
      tile,
      this.ownerColors,
      this.ownerSecondaryColors
    );
    if (!colors) {
      return null;
    }
    return {
      fill: colors.secondary,
      stroke: "none",
      fontSize: `${this.cityLabelTextFontSize()}px`,
    };
  },
  cityLabelPopTextStyle(tile) {
    const colors = cityLabelColors(
      tile,
      this.ownerColors,
      this.ownerSecondaryColors
    );
    if (!colors) {
      return null;
    }
    const fill = "#ffffff";
    return {
      fill,
      ...textStrokeStyleForFill(fill),
      fontSize: `${this.cityLabelTextFontSize()}px`,
    };
  },
  cityHasOriginalOwnerBadge(tile) {
    if (!tile || !tile.city) {
      return false;
    }
    const ownerId = Number.isFinite(tile.city.owner) ? tile.city.owner : null;
    const originalOwner = Number.isFinite(tile.originalOwner)
      ? tile.originalOwner
      : null;
    return (
      Number.isFinite(originalOwner) &&
      Number.isFinite(ownerId) &&
      originalOwner !== ownerId
    );
  },
  cityLabelOriginalOwnerStyle(tile) {
    if (!this.cityHasOriginalOwnerBadge(tile)) {
      return null;
    }
    const ownerId = tile.originalOwner;
    const override = ownerColorEntryById(ownerId);
    const primary =
      (override && override.primary) ||
      this.ownerColors[ownerId] ||
      this.ownerPalette[ownerId % this.ownerPalette.length];
    const secondary =
      (override && override.secondary) ||
      this.ownerSecondaryColors[ownerId] ||
      deriveSecondaryColor(primary);
    return { fill: primary, stroke: secondary };
  },
  primaryUnit(tile) {
    if (!tile) {
      return null;
    }
    return tile.combatUnit || tile.civilianUnit || null;
  },
  unitMarkerStyle(unit) {
    if (!unit) {
      return null;
    }
    const colors = unitMarkerColors(
      unit.owner,
      this.ownerColors,
      this.ownerSecondaryColors
    );
    if (!colors) {
      return null;
    }
    return {
      fill: colors.primary,
      stroke: colors.secondary,
    };
  },
  unitMarkerTransform(tile, role) {
    if (!tile) {
      return "translate(0, 0)";
    }
    const hasCombat = !!tile.combatUnit;
    const hasCivilian = !!tile.civilianUnit;
    if (hasCombat && hasCivilian) {
      const offset = this.hexSize * 0.28;
      return `translate(0, ${role === "civilian" ? -offset : offset})`;
    }
    return "translate(0, 0)";
  },
  isCitadelImprovement(tile) {
    return isCitadelImprovement(tile);
  },
  resourceLabel(tile) {
    if (!tile.resource) {
      return "None";
    }
    const amount = tile.resourceAmount ? ` x${tile.resourceAmount}` : "";
    return `${formatEnumLabel(tile.resource)}${amount}`;
  },
  routeLabel(route) {
    if (!route) {
      return "None";
    }
    return route === "railroad" ? "Railroad" : "Road";
  },
  ownerLabel(owner) {
    if (owner === null || owner === undefined) {
      return "None";
    }
    const name = ownerNameForId(owner);
    return name || "Unknown";
  },
  unitLabel(unit) {
    if (!unit || !unit.type) {
      return "";
    }
    return formatEnumLabel(unit.type).slice(0, 2).toUpperCase();
  },
  describeUnit(unit) {
    if (!unit) {
      return "None";
    }
    const owner = Number.isFinite(unit.owner)
      ? ` (${ownerNameForId(unit.owner) || "Unknown"})`
      : "";
    return `${formatEnumLabel(unit.type || "Unit")}${owner}`;
  },
  describeCity(city) {
    if (!city) {
      return "None";
    }
    const name = city.name || "City";
    const capital = city.isCapital ? " • Capital" : "";
    return `${name}${capital}`;
  },
  isWorldWonderCity(city) {
    return isWorldWonderCity(city);
  },
  worldWondersLabel(city) {
    return worldWondersLabel(city);
  },
  continentLabel(continent) {
    if (!continent) {
      return "None";
    }
    const label = {
      1: "Americas",
      2: "Asia",
      3: "Africa",
      4: "Europe",
    }[continent];
    return label || `Continent ${continent}`;
  },
  featureLegendStyle(feature) {
    return {
      backgroundColor: featureColor(feature.id),
      borderColor: featureColor(feature.id),
    };
  },
  wonderLegendStyle(wonder) {
    return {
      backgroundColor: wonderColor(wonder.id),
      borderColor: wonderColor(wonder.id),
    };
  },
  resourceLegendStyle(resource) {
    const color =
      resource.color ||
      colorFromString(resource.name, RESOURCE_COLOR_OPTIONS);
    return {
      backgroundColor: color,
      borderColor: color,
    };
  },
  elevationPoints(tile) {
    const size = this.hexSize * 0.3;
    const isMountain = tile && tile.elevation === 2;
    if (isMountain) {
      return `0 ${-size} ${size} ${size} ${-size} ${size}`;
    }
    const top = size * 0.6;
    const bottom = size * 0.9;
    const height = size * 0.7;
    return `${-top} ${-height} ${top} ${-height} ${bottom} ${height} ${-bottom} ${height}`;
  },
  improvementLegendStyle(improvement) {
    const color =
      improvement.color ||
      colorFromString(improvement.name, IMPROVEMENT_COLOR_OPTIONS);
    return {
      backgroundColor: color,
      borderColor: color,
    };
  },
  ensureOwnerColors(ownerId) {
    if (!Number.isFinite(ownerId)) {
      return;
    }
    const override = ownerColorEntryById(ownerId);
    if (!this.ownerColors[ownerId]) {
      this.ownerColors[ownerId] =
        (override && override.primary) ||
        this.ownerPalette[ownerId % this.ownerPalette.length];
    }
    if (!this.ownerSecondaryColors[ownerId]) {
      this.ownerSecondaryColors[ownerId] =
        (override && override.secondary) ||
        deriveSecondaryColor(this.ownerColors[ownerId]);
    }
    this.ownerLegend = buildOwnerLegend(
      this.ownerColors,
      s5OwnerList,
      this.ownerPalette,
      this.ownerSecondaryColors
    );
  },
  rebuildOwnerBorders(changedKeys = null) {
    if (!this.renderOwnerBorders) {
      if (Array.isArray(this.tiles)) {
        this.tiles.forEach((tile) => {
          if (
            tile &&
            Array.isArray(tile.ownerBorderSegments) &&
            tile.ownerBorderSegments.length
          ) {
            tile.ownerBorderSegments = [];
          }
        });
      }
      return;
    }
    this.tiles = buildOwnerBorders(
      this.tiles,
      this.mapConfig.columns,
      this.mapConfig.rows,
      this.ownerSecondaryColors,
      this.hexSize,
      changedKeys,
      this.tileLookup
    );
  },
  scheduleOwnerBordersRebuild(changedKeys = null) {
    if (!this.deferOwnerBorders) {
      this.rebuildOwnerBorders(changedKeys);
      return;
    }
    if (this.ownerBordersRebuildId) {
      return;
    }
    this.ownerBordersRebuildId = window.requestAnimationFrame(() => {
      this.ownerBordersRebuildId = null;
      this.deferOwnerBorders = false;
      this.rebuildOwnerBorders();
    });
  },
};
