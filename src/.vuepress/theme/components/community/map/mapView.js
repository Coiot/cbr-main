// Sharing, fullscreen, and keyboard selection for the public map viewer.
const CONTRAST_FIELDS = ['contrastHideDecorations', 'contrastFlattenLandWater', 'contrastGrayscaleTerrain', 'contrastBoostOwnerOpacity', 'contrastLargeCityBanners'];
const OVERLAYS = new Set(['civilization', 'population', 'religion', 'contrast']);

export function parseMapView(value) {
  if (typeof value !== 'string') return null;
  const parts = value.split(',');
  if (parts.length !== 3 || parts.some(part => !part.trim())) return null;
  const [x, y, zoom] = parts.map(Number);
  return [x, y, zoom].every(Number.isFinite) && zoom > 0 ? { x, y, zoom } : null;
}

export const mapViewComputed = {
  selectedTileAnnouncement() {
    const tile = this.selectedTile;
    if (!tile) return '';
    return `Tile ${tile.col}, ${tile.row}${tile.city?.name ? `, ${tile.city.name}` : ''}${tile.terrain ? `, ${tile.terrain.replace(/^TERRAIN_/, '').toLowerCase()}` : ''}. Press Enter for details.`;
  },
};

export const mapViewMethods = {
  resolveRouteMapView() {
    if (this.embedded || !String(this.$route?.path || '').includes('/community-tile-map')) return null;
    return parseMapView(this.$route?.query?.view);
  },
  applySharedMapView() {
    const view = this.resolveRouteMapView();
    if (!view) return false;
    // The route can arrive before the cached map has loaded.
    if (!this.tiles.length || !this.gridWidth || !this.gridHeight) return true;
    const query = this.$route?.query || {};
    if (OVERLAYS.has(query.overlay)) {
      this.overlayView = query.overlay;
      this.overlayOwnerName = typeof query.owner === 'string' ? query.owner : '';
      this.editPanelTab = 'overlays';
    }
    if (typeof query.contrast === 'string' && /^[01]{5}$/.test(query.contrast)) {
      CONTRAST_FIELDS.forEach((key, index) => { this[key] = query.contrast[index] === '1'; });
    }
    if (this.snapshotViewId && typeof query.compare === 'string') this.snapshotCompareId = query.compare;
    const tileKey = this.resolveRouteTileKey();
    this.selectedTile = this.tileLookup?.get(tileKey) || null;
    this.hasUserViewportInteraction = true;
    this.$nextTick(() => {
      const current = this.resolveRouteMapView();
      if (this._mapDisposed || !current || current.x !== view.x || current.y !== view.y || current.zoom !== view.zoom) return;
      this.updateViewportSize();
      this.scale = Math.min(this.maxScale, Math.max(this.minScale, view.zoom));
      this.translate = this.clampTranslate({
        x: this.viewportSize.width / 2 - Math.max(0, Math.min(this.gridWidth, view.x)) * this.scale,
        y: this.viewportSize.height / 2 - Math.max(0, Math.min(this.gridHeight, view.y)) * this.scale,
      }, this.scale);
    });
    return true;
  },
  buildMapViewUrl() {
    const path = this.$withBase ? this.$withBase('/community-tile-map/') : '/community-tile-map/';
    const url = new URL(path, window.location.origin);
    const round = value => Number(value.toFixed(4));
    const x = (this.viewportSize.width / 2 - this.translate.x) / this.scale;
    const y = (this.viewportSize.height / 2 - this.translate.y) / this.scale;
    url.searchParams.set('view', [round(x), round(y), round(this.scale)].join(','));
    if (this.snapshotViewId) {
      url.searchParams.set('snapshot', this.snapshotViewId);
      url.searchParams.set('compare', this.snapshotCompareId || '');
    }
    if (this.selectedTile) url.searchParams.set('tile', this.selectedTile.key);
    if (this.isOverlayTabActive && OVERLAYS.has(this.overlayView)) {
      url.searchParams.set('overlay', this.overlayView);
      if (this.overlayView === 'civilization' && this.overlayOwnerName) url.searchParams.set('owner', this.overlayOwnerName);
    }
    url.searchParams.set('contrast', CONTRAST_FIELDS.map(key => this[key] ? '1' : '0').join(''));
    return url.href;
  },
  async copyMapViewLink() {
    this.mapViewLink = this.buildMapViewUrl();
    try {
      await navigator.clipboard.writeText(this.mapViewLink);
      this.mapViewStatus = 'Link copied';
      this.showMapViewLink = false;
    } catch {
      this.mapViewStatus = 'Select and copy this link:';
      this.showMapViewLink = true;
      this.$nextTick(() => { this.$refs.mapViewLink?.focus(); this.$refs.mapViewLink?.select(); });
    }
  },
  selectKeyboardTile(key) {
    let tile = this.selectedTile;
    if (!tile) {
      const row = Math.max(0, Math.min(this.mapConfig.rows - 1,
        Math.round(((this.viewportSize.height / 2 - this.translate.y) / this.scale - this.hexSize) / (this.hexSize * 1.5))));
      const offset = this.hexWidth / 2 + (row % 2 ? 0 : this.hexWidth / 2);
      const col = Math.max(0, Math.min(this.mapConfig.columns - 1,
        Math.round(((this.viewportSize.width / 2 - this.translate.x) / this.scale - offset) / this.hexWidth)));
      tile = this.tileLookup?.get(`${col},${row}`);
    } else if (key.startsWith('Arrow')) {
      const col = tile.col + (key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0);
      const row = tile.row + (key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0);
      tile = this.tileLookup?.get(`${col},${row}`) || tile;
    }
    if (!tile) return;
    this.hasUserViewportInteraction = true;
    this.selectedTile = tile;
    this.ensureTileInViewport(tile);
    if (key === 'Enter') this.showSelectedTooltip(tile);
  },
  resizeFullscreenView(focusTarget) {
    this.$nextTick(() => {
      if (this._mapDisposed) return;
      this.updateViewportSize();
      this.clampView();
      focusTarget?.focus({ preventScroll: true });
    });
  },
  handleFullscreenChange() {
    const active = document.fullscreenElement || document.webkitFullscreenElement;
    const wasFullscreen = this.isMapFullscreen;
    this.isMapFullscreen = this.fullscreenFallback || active === this.$refs.mapRoot;
    if (wasFullscreen !== this.isMapFullscreen) {
      this.resizeFullscreenView(this.isMapFullscreen ? this.$refs.viewport : this._fullscreenPreviousFocus);
    }
  },
  async toggleMapFullscreen() {
    if (this.isMapFullscreen) {
      if (this.fullscreenFallback) {
        this.fullscreenFallback = false;
        document.body.style.overflow = this._fullscreenBodyOverflow || '';
        this.handleFullscreenChange();
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
      }
      return;
    }
    const root = this.$refs.mapRoot;
    this._fullscreenPreviousFocus = document.activeElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (request) {
      try { await request.call(root); this.handleFullscreenChange(); return; } catch { /* Use an expanded page view when native fullscreen is unavailable. */ }
    }
    this._fullscreenBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.fullscreenFallback = true;
    this.handleFullscreenChange();
  },
  onMapViewKeydown(event) {
    if (event.key === 'Escape') {
      this.showMapShortcuts = false;
      this.hideHoverTooltip();
      if (this.isMapFullscreen) { event.preventDefault(); this.toggleMapFullscreen(); }
    }
    if (event.key === 'Tab' && this.isMapFullscreen) {
      const nodes = Array.from(this.$refs.mapRoot.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]'))
        .filter(node => !node.disabled && node.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  },
  teardownMapView() {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    if (this.fullscreenFallback) document.body.style.overflow = this._fullscreenBodyOverflow || '';
    if ((document.fullscreenElement || document.webkitFullscreenElement) === this.$refs.mapRoot) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) Promise.resolve(exit.call(document)).catch(() => {});
    }
  },
};
