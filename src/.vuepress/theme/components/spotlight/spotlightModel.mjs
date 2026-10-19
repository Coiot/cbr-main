export const MOODS = [
  { key: 'all', label: 'All moments', emoji: '', reactions: null },
  { key: 'surprises', label: 'Surprises', emoji: '🤯', reactions: ['mindblown'] },
  { key: 'facepalms', label: 'Facepalms', emoji: '🤦', reactions: ['facepalm'] },
  { key: 'funny', label: 'Funny moments', emoji: '😂', reactions: ['laugh'] },
  { key: 'heartbreak', label: 'Heartbreak', emoji: '😭', reactions: ['tears', 'rip'] },
  { key: 'favourites', label: 'Fan favourites', emoji: '⭐', reactions: ['star', 'heart'] },
];
export const normalizePath = value => String(value || '').trim().replace(/\.html?$/i, '/').replace(/\/*$/, '/');
export const normalizeReaction = value => String(value || '').toLowerCase().replace(/[\s_-]+/g, '').replace(/^mindblow$/, 'mindblown');
export const episodeNumber = album => Number(album.episode_number) || Number(String(album.path).match(/(?:episode|part)(\d+(?:\.\d+)?)/i)?.[1]) || 0;
export function buildEpisodes(catalog, index, now = Date.now()) {
  const scenes = new Map(index.map(album => [normalizePath(album.path), album.scenes]));
  return catalog.flatMap(album => {
    const season = album.path?.match(/^\/albums\/(s\d+)\//i)?.[1].toLowerCase();
    const sortDate = Date.parse(album.date || album.release_date) || 0;
    const number = episodeNumber(album);
    if (!season || !number || album.pr || album.exclude || sortDate > now || !scenes.has(normalizePath(album.path))) return [];
    return [{ ...album, path: normalizePath(album.path), season, number, sortDate, scenes: scenes.get(normalizePath(album.path)) }];
  }).sort((a, b) => b.sortDate - a.sortDate || b.number - a.number || a.path.localeCompare(b.path));
}
export function readFilters(query, episodes) {
  const seasons = [...new Set(episodes.map(e => e.season))].sort((a, b) => Number(b.slice(1)) - Number(a.slice(1)));
  const season = seasons.includes(query.season) ? query.season : seasons[0] || '';
  const limit = String(query.through || 'all');
  const through = limit !== 'all' && episodes.some(e => e.season === season && String(e.number) === limit) ? limit : 'all';
  return { season, through, mood: MOODS.some(m => m.key === query.mood) ? query.mood : 'all', tab: query.view === 'favourites' ? 'favourites' : 'discover' };
}
export function episodeOptions(episodes, season) {
  return [...new Map(episodes.filter(e => e.season === season).map(e => [e.number, e])).values()].sort((a, b) => b.number - a.number);
}
export function eligibleEpisodes(episodes, filters) {
  return episodes.filter(e => e.season === filters.season && (filters.through === 'all' || e.number <= Number(filters.through)));
}
function sceneCard(episode, scene, reactions = {}) {
  return { id: `${episode.path}#scene-${scene.number}`, path: episode.path, to: `${episode.path}#scene-${scene.number}`,
    episodeTitle: episode.title, episodeNumber: episode.number, sceneNumber: Number(scene.number),
    title: scene.title && scene.title !== String(scene.number) ? scene.title : `Scene ${scene.number}`,
    previewUrl: scene.previewUrl || '', reactions, sortDate: episode.sortDate };
}
export function buildDiscovery(episodes, rows, mood = 'all', pick = null) {
  const keys = MOODS.find(m => m.key === mood)?.reactions || null;
  const counts = new Map();
  for (const row of rows) {
    const id = `${normalizePath(row.page_path)}#scene-${Number(row.scene_number)}`;
    const key = normalizeReaction(row.reaction_key);
    const count = row.reaction_count == null ? 1 : Number(row.reaction_count);
    if (!key || !Number.isFinite(count) || count <= 0) continue;
    const reactions = counts.get(id) || {};
    reactions[key] = (reactions[key] || 0) + count;
    counts.set(id, reactions);
  }
  const episodeGroups = new Map();
  for (const episode of episodes) {
    const cards = episode.scenes.map(scene => {
      const card = sceneCard(episode, scene, counts.get(`${episode.path}#scene-${scene.number}`) || {});
      card.score = Object.entries(card.reactions).reduce((sum, [key, count]) => sum + (!keys || keys.includes(key) ? count : 0), 0);
      return card;
    }).filter(card => card.score > 0);
    const key = `${episode.season}:${episode.number}`;
    episodeGroups.set(key, [...(episodeGroups.get(key) || []), ...cards]);
  }
  const groups = [...episodeGroups.values()].map(cards => cards.sort((a, b) => b.score - a.score || a.sceneNumber - b.sceneNumber || a.path.localeCompare(b.path)));
  const scenes = [];
  for (let round = 0; groups.some(group => round < group.length); round++) {
    for (const group of groups) if (group[round]) scenes.push(group[round]);
  }
  let featured = scenes[0] || null;
  if (pick) {
    const episode = episodes.find(e => e.path === normalizePath(pick.path));
    const scene = episode?.scenes.find(s => Number(s.number) === pick.scene);
    if (scene) {
      const card = sceneCard(episode, scene, counts.get(`${episode.path}#scene-${scene.number}`) || {});
      if (!keys || keys.some(key => card.reactions[key] > 0)) featured = { ...card, editorial: true };
    }
  }
  return { featured, gallery: scenes.filter(scene => scene.id !== featured?.id) };
}
export function buildFavourites(episodes, rows) {
  const favourites = rows.filter(row => ['star', 'heart'].includes(normalizeReaction(row.reaction_key)));
  // The favourites tab is a collection; mood filters apply to community discovery only.
  const { featured, gallery } = buildDiscovery(episodes, favourites, 'all');
  return (featured ? [featured, ...gallery] : gallery).map(scene => ({ ...scene, personal: true }));
}
export function validatePicks(picks, albums) {
  for (const [season, pick] of Object.entries(picks)) {
    const album = albums.find(a => normalizePath(a.path) === normalizePath(pick.path));
    if (!/^s\d+$/.test(season) || !album?.path.toLowerCase().startsWith(`/albums/${season}/`) || !Number.isInteger(pick.scene) || !album.scenes.some(s => Number(s.number) === pick.scene)) {
      throw new Error(`Invalid Spotlight pick for ${season}: use an existing episode path and scene number.`);
    }
  }
}
