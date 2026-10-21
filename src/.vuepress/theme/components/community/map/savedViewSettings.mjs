export const MAP_VIEW_VERSION = 1;
export const CONTRAST_FIELDS = ['contrastHideDecorations', 'contrastFlattenLandWater', 'contrastGrayscaleTerrain', 'contrastBoostOwnerOpacity', 'contrastLargeCityBanners'];
export const MAP_OVERLAYS = ['none', 'civilization', 'population', 'religion', 'contrast'];
export const SAVED_VIEW_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeMapViewSettings(value) {
  if (!value || value.version !== MAP_VIEW_VERSION) return null;
  const { x, y, zoom } = value;
  if (![x, y, zoom].every(n => typeof n === 'number' && Number.isFinite(n)) || Math.abs(x) > 1e7 || Math.abs(y) > 1e7 || zoom <= 0 || zoom > 1000) return null;
  if (!MAP_OVERLAYS.includes(value.overlay) || !/^[01]{5}$/.test(value.contrast)) return null;
  for (const key of ['owner', 'tile', 'snapshot', 'compare']) {
    if (typeof value[key] !== 'string' || value[key].length > 120) return null;
  }
  if (value.tile && !/^\d{1,3},\d{1,3}$/.test(value.tile)) return null;
  if (value.snapshot === '__live__' || (value.compare && !value.snapshot)) return null;
  return { version: MAP_VIEW_VERSION, x, y, zoom, overlay: value.overlay,
    owner: value.overlay === 'civilization' ? value.owner : '', contrast: value.contrast,
    tile: value.tile, snapshot: value.snapshot, compare: value.compare };
}

export function mapViewSettingsFromQuery(query) {
  if (typeof query.view !== 'string') return null;
  const values = query.view.split(',');
  if (values.length !== 3 || values.some(v => !v.trim())) return null;
  const [x, y, zoom] = values.map(Number);
  return normalizeMapViewSettings({ version: 1, x: Math.max(-1e7, Math.min(1e7, x)), y: Math.max(-1e7, Math.min(1e7, y)), zoom: Math.min(1000, zoom),
    overlay: MAP_OVERLAYS.includes(query.overlay) ? query.overlay : 'none',
    owner: typeof query.owner === 'string' ? query.owner : '',
    contrast: typeof query.contrast === 'string' && /^[01]{5}$/.test(query.contrast) ? query.contrast : '00000',
    tile: typeof query.tile === 'string' && /^\d{1,3},\d{1,3}$/.test(query.tile) ? query.tile : '',
    snapshot: typeof query.snapshot === 'string' ? query.snapshot : '',
    compare: typeof query.snapshot === 'string' && typeof query.compare === 'string' ? query.compare : '',
  });
}

export function mapViewSettingsQuery(settings) {
  const value = normalizeMapViewSettings(settings);
  if (!value) throw new Error('This map view cannot be saved. Please try again once the map has loaded.');
  const query = { view: [value.x, value.y, value.zoom].join(','), overlay: value.overlay, contrast: value.contrast };
  if (value.owner) query.owner = value.owner;
  if (value.tile) query.tile = value.tile;
  if (value.snapshot) { query.snapshot = value.snapshot; query.compare = value.compare; }
  return query;
}

export function savedViewLabel(settings) {
  const timeline=/^timeline:[0-9a-f-]{36}:(\d+)$/.exec(settings?.snapshot||'');
  if(timeline)return `Turn ${timeline[1]}`;
  return settings?.snapshot ? `Episode ${/^s5-episode-(.+)$/.exec(settings.snapshot)?.[1]?.replace(/-/g, '.') || 'snapshot'}` : 'Live map';
}

export function savedViewCanChange({ signedIn, allowed, checking, failed, local, loading }) {
  return !!signedIn && !!allowed && !checking && !failed && !local && !loading;
}
