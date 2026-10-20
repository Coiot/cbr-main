import { OWNER_COLOR_MAP, normalizeOwnerKey } from '../../../data/civColors.mjs';
import { normalizePath } from '../spotlight/spotlightModel.mjs';
export const DIRECTORY_PAGE_SIZE = 24;
export const MAX_SHOWCASE_COMPETITORS = 10;
export const MAX_ADDITIONAL_COMPETITORS = MAX_SHOWCASE_COMPETITORS - 1;
export const MAX_SHOWCASE_PINS = 100;
export const validPublicId = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
export const showcaseLink = id => validPublicId(id) ? `/supporters/profile/?id=${encodeURIComponent(id)}` : '';
export const isSupportersScene = scene => /(?:^|\/)s\d+ep\d+(?:\.\d+)?-supporters\.svg(?:[?#].*)?$/i.test(String(scene?.slide_svg || ''));
export function civStyle(name) {
  const colors = OWNER_COLOR_MAP[normalizeOwnerKey(name)] || { primary: '#51452f', secondary: '#f4c35e' };
  return { backgroundColor: colors.primary, borderColor: colors.secondary };
}
export const sceneKey = scene => `${normalizePath(scene.path)}#scene-${Number(scene.number)}`;
export const showcasePinKey = pin => `${pin.map_id}:${pin.tile_key}:${pin.name.toLowerCase()}`;
export function normalizeShowcasePins(pins = []) {
  if (!Array.isArray(pins) || pins.length > MAX_SHOWCASE_PINS) throw new Error('Choose up to 100 map pins to share.');
  const rows = pins.map(pin => ({ map_id: String(pin?.map_id || '').trim(), name: String(pin?.name || '').trim(),
    tile_key: String(pin?.tile_key || '').trim(), city_name: String(pin?.city_name || '').trim(), owner_name: String(pin?.owner_name || '').trim() }));
  if (rows.some(pin => !/^[A-Za-z0-9_-]{1,64}$/.test(pin.map_id) || !pin.name || pin.name.length > 40
    || !/^\d{1,3},\d{1,3}$/.test(pin.tile_key) || pin.city_name.length > 80 || pin.owner_name.length > 80)
    || new Set(rows.map(showcasePinKey)).size !== rows.length) throw new Error('Choose different named pins with valid map locations.');
  return rows;
}
export function localShowcasePins(stored, mapId) {
  let rows;
  try { rows = JSON.parse(stored || '[]'); } catch { return []; }
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  return rows.flatMap(pin => {
    try {
      const [row] = normalizeShowcasePins([{ map_id: mapId, name: pin.name, tile_key: pin.tileKey, city_name: pin.cityName, owner_name: pin.ownerName }]);
      const key = showcasePinKey(row); if (seen.has(key)) return []; seen.add(key); return [row];
    } catch { return []; }
  }).slice(0, MAX_SHOWCASE_PINS);
}
export function showcaseMapLink({ tile_key = '', snapshot_id = '' } = {}) {
  const query = {};
  if (/^\d{1,3},\d{1,3}$/.test(tile_key)) query.tile = tile_key;
  if (validPublicId(snapshot_id)) query.snapshot = snapshot_id;
  return { path: '/community-tile-map/', query };
}
export function additionalCompetitors(favourite, competitors = []) {
  return [...new Set(competitors.filter(name => name && name !== favourite))].slice(0, MAX_ADDITIONAL_COMPETITORS);
}
export function sceneCards(episodes, selections, through = 'all', season = '') {
  const byPath = new Map(episodes.map(episode => [episode.path, episode]));
  return selections.flatMap(selection => {
    const episode = byPath.get(normalizePath(selection.path));
    if (!episode || (season && episode.season !== season) || (through !== 'all' && episode.number > Number(through))) return [];
    const scene = episode.scenes.find(scene => Number(scene.number) === Number(selection.number));
    if (!scene) return [];
    const id = `${episode.path}#scene-${scene.number}`;
    return [{ id, to: id, path: episode.path, number: Number(scene.number), sceneNumber: Number(scene.number),
      episodeNumber: episode.number, season: episode.season, title: scene.title || `Scene ${scene.number}`,
      episodeTitle: episode.title, previewUrl: scene.previewUrl || '', reactions: {} }];
  });
}
export function normalizeShowcaseDraft(draft) {
  const introduction = String(draft.introduction || '').trim();
  const competitors = [...new Set((draft.competitors || []).filter(Boolean).map(s => String(s).trim()))];
  const scenes = (draft.scenes || []).map(s => ({ path: normalizePath(s.path), number: Number(s.number) }));
  const map_views = [...new Set(draft.map_views || [])];
  const map_pins = normalizeShowcasePins(draft.map_pins);
  if (introduction.length > 400 || competitors.length > MAX_ADDITIONAL_COMPETITORS || competitors.some(c => c.length > 80) || scenes.length > 6 || map_views.length > 3 || map_views.some(id => !validPublicId(id))
    || scenes.some(s => !/^\/albums\/s\d+\/[A-Za-z0-9._-]+\/$/.test(s.path) || !Number.isInteger(s.number) || s.number < 1 || s.number > 99999)
    || new Set(scenes.map(sceneKey)).size !== scenes.length) throw new Error('Choose up to six different favourite scenes, three public map views, and nine additional competitors. Your introduction can have up to 400 characters.');
  return { introduction, competitors, scenes, map_views, map_pins, published: draft.published === true };
}
