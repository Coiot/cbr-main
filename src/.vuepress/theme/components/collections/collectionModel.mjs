import { normalizePath, buildEpisodes } from '../spotlight/spotlightModel.mjs';
import { sceneCards, sceneKey, validPublicId } from '../supporters/showcaseModel.mjs';
export { sceneKey };
export const validCollectionPath = path => /^\/albums\/(?:s\d+\/[A-Za-z0-9._-]+|pr\/s\d+pr\d+)\/$/.test(path);
export const collectionLink = (id, edit = false) => validPublicId(id) ? `/collections/?id=${id}${edit ? '&edit=1' : ''}` : '/collections/';
export const blankCollection = () => ({ title: '', description: '', scenes: [], published: false, featured: false });
export function normalizeCollection(draft) {
  const title = String(draft.title || '').trim(), description = String(draft.description || '').trim();
  const scenes = (draft.scenes || []).map(s => ({ path: normalizePath(s.path), number: Number(s.number), note: String(s.note || '').trim() }));
  if (!title || title.length > 80 || description.length > 600 || scenes.length > 100
    || new Set(scenes.map(sceneKey)).size !== scenes.length
    || scenes.some(s => !validCollectionPath(s.path) || !Number.isInteger(s.number) || s.number < 1 || s.number > 99999 || s.note.length > 400)) {
    throw new Error('Use a title of up to 80 characters, a description of up to 600, and up to 100 different scenes with notes of up to 400 characters.');
  }
  return { title, description, scenes, published: draft.published === true, featured: draft.published === true && draft.featured === true };
}
export function collectionScenes(episodes, selections, season = '', through = 'all') {
  const notes = new Map(selections.map(s => [sceneKey(s), s.note || '']));
  return sceneCards(episodes, selections, through, season).map(s => ({ ...s, note: notes.get(s.id) || '' }));
}
export function moveScene(scenes, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= scenes.length || to >= scenes.length) return scenes;
  const result = [...scenes], [scene] = result.splice(from, 1); result.splice(to, 0, scene); return result;
}
// Collection readers also support PR albums; Spotlight discovery keeps its episode-only catalog.
export function buildCollectionAlbums(catalog, index, now = Date.now()) {
  const scenes = new Map(index.map(album => [normalizePath(album.path), album.scenes]));
  const rankings = catalog.flatMap(album => {
    const path = normalizePath(album.path), match = path.match(/^\/albums\/pr\/(s\d+)pr(\d+)\/$/);
    const sortDate = Date.parse(album.date || album.release_date) || 0;
    if (!match || !album.pr || album.exclude || sortDate > now || !scenes.has(path)) return [];
    return [{ ...album, path, season: match[1], number: Number(match[2]), sortDate, scenes: scenes.get(path) }];
  });
  return [...buildEpisodes(catalog, index, now), ...rankings].sort((a, b) => b.sortDate - a.sortDate || b.number - a.number || a.path.localeCompare(b.path));
}
let metadataPromise;
export function loadCollectionEpisodes(withBase = path => path) {
  if (!metadataPromise) metadataPromise = Promise.all(['index', 'scene-index'].map(async name => {
    const res = await fetch(withBase(`/data/albums/${name}.json`)); if (!res.ok) throw new Error('Episode previews could not be loaded.');
    const data = await res.json(); if (!Array.isArray(data.albums)) throw new Error('Episode previews could not be loaded.'); return data.albums;
  })).then(lists => buildCollectionAlbums(...lists)).catch(error => { metadataPromise = null; throw error; });
  return metadataPromise;
}
