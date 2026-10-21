// Sharing, fullscreen, and keyboard selection for the public map viewer.
import { CONTRAST_FIELDS, mapViewSettingsFromQuery, mapViewSettingsQuery } from './savedViewSettings.mjs';

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
  captureMapViewSettings() {
    const round = value => Number(value.toFixed(4));
    return {
      version: 1,
      x: round((this.viewportSize.width / 2 - this.translate.x) / this.scale),
      y: round((this.viewportSize.height / 2 - this.translate.y) / this.scale),
      zoom: round(this.scale),
      overlay: this.isOverlayTabActive ? this.overlayView : 'none',
      owner: this.isOverlayTabActive && this.overlayView === 'civilization' ? this.overlayOwnerName || '' : '',
      contrast: CONTRAST_FIELDS.map(key => this[key] ? '1' : '0').join(''),
      tile: this.selectedTile?.key || '', snapshot: this.officialSource?.source || this.snapshotViewId || '',
      compare: this.officialSource?.compareSource || (this.snapshotViewId ? this.snapshotCompareId || '' : ''),
    };
  },
  applyMapViewSettings(settings, isCurrent = () => !this._mapDisposed) {
    if (!this.tiles.length || !this.gridWidth || !this.gridHeight) return;
    const supported=!(this.officialSource&&['population','religion'].includes(settings.overlay));
    this.overlayView = !supported||settings.overlay === 'none' ? 'civilization' : settings.overlay;
    this.overlayEnabled = supported&&settings.overlay !== 'none';
    this.overlayOwnerName = settings.owner;
    if (this.overlayEnabled) this.editPanelTab = 'overlays';
    const contrast = Object.fromEntries(CONTRAST_FIELDS.map((key, index) => [key, settings.contrast[index] === '1']));
    // Shared display settings belong to this session, not the reader's preferences.
    if (this.applyContrastSettings) this.applyContrastSettings(contrast);
    else Object.assign(this, contrast);
    if (this.snapshotViewId) this.snapshotCompareId = settings.compare;
    this.selectedTile = this.tileLookup?.get(settings.tile) || null;
    this.hasUserViewportInteraction = true;
    this.$nextTick(() => {
      if (!isCurrent()) return;
      this.updateViewportSize();
      this.scale = Math.min(this.maxScale, Math.max(this.minScale, settings.zoom));
      this.translate = this.clampTranslate({
        x: this.viewportSize.width / 2 - Math.max(0, Math.min(this.gridWidth, settings.x)) * this.scale,
        y: this.viewportSize.height / 2 - Math.max(0, Math.min(this.gridHeight, settings.y)) * this.scale,
      }, this.scale);
    });
  },
  applySharedMapView() {
    const settings = mapViewSettingsFromQuery(this.$route?.query || {});
    const requested = this.resolveRouteMapView();
    if (!requested || !settings) return false;
    const query = this.$route?.query || {};
    if (!settings.tile) settings.tile = this.resolveRouteTileKey() || '';
    if (typeof query.contrast !== 'string' || !/^[01]{5}$/.test(query.contrast)) settings.contrast = CONTRAST_FIELDS.map(key => this[key] ? '1' : '0').join('');
    if (typeof query.compare !== 'string') settings.compare = this.snapshotCompareId || '';
    // The route can arrive before the cached map has loaded.
    this.applyMapViewSettings(settings, () => {
      const current = this.resolveRouteMapView();
      return !this._mapDisposed && current?.x === requested.x && current?.y === requested.y && current?.zoom === requested.zoom;
    });
    return true;
  },
  buildMapViewUrl() {
    const path = this.$withBase ? this.$withBase('/community-tile-map/') : '/community-tile-map/';
    const url = new URL(path, window.location.origin);
    Object.entries(mapViewSettingsQuery(this.captureMapViewSettings())).forEach(([key, value]) => url.searchParams.set(key, value));
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
    if (event.defaultPrevented || event.target?.closest?.('dialog[open]')) return;
    if (event.key === 'Escape') {
      this.showMapShortcuts = false;
      this.hideHoverTooltip();
      if (this.isMapFullscreen) { event.preventDefault(); this.toggleMapFullscreen(); }
    }
    if (event.key === 'Tab' && this.isMapFullscreen) {
      const nodes = Array.from(this.$refs.mapRoot.querySelectorAll('button, summary, input, select, textarea, a[href], [tabindex="0"]'))
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
