import { OWNER_COLOR_MAP, normalizeOwnerKey } from '../../../data/civColors.mjs';
import { normalizePath } from '../spotlight/spotlightModel.mjs';
export const DIRECTORY_PAGE_SIZE = 24;
export const validPublicId = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
export const showcaseLink = id => validPublicId(id) ? `/supporters/profile/?id=${encodeURIComponent(id)}` : '';
export const isSupportersScene = scene => /(?:^|\/)s\d+ep\d+(?:\.\d+)?-supporters\.svg(?:[?#].*)?$/i.test(String(scene?.slide_svg || ''));
export function civStyle(name) {
  const colors = OWNER_COLOR_MAP[normalizeOwnerKey(name)] || { primary: '#51452f', secondary: '#f4c35e' };
  return { backgroundColor: colors.primary, borderColor: colors.secondary };
}
export const sceneKey = scene => `${normalizePath(scene.path)}#scene-${Number(scene.number)}`;
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
  if (introduction.length > 400 || competitors.length > 2 || competitors.some(c => c.length > 80) || scenes.length > 6 || map_views.length > 3 || map_views.some(id => !validPublicId(id))
    || scenes.some(s => !/^\/albums\/s\d+\/[A-Za-z0-9._-]+\/$/.test(s.path) || !Number.isInteger(s.number) || s.number < 1 || s.number > 99999)
    || new Set(scenes.map(sceneKey)).size !== scenes.length) throw new Error('Choose up to six different favourite scenes, three public map views, and two additional competitors. Your introduction can have up to 400 characters.');
  return { introduction, competitors, scenes, map_views, published: draft.published === true };
}
