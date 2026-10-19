const PAGE_SIZE = 1000;
export const CACHE_TTL = 10 * 60 * 1000;
export function cacheKey(season) { return `spotlight-discovery-v1:${season}`; }
export function readCache(storage, season) {
  try {
    const value = JSON.parse(storage.getItem(cacheKey(season)));
    return value && Array.isArray(value.rows) && Number.isFinite(value.time) ? value : null;
  } catch { return null; }
}
export function writeCache(storage, season, rows, time) {
  try { storage.setItem(cacheKey(season), JSON.stringify({ rows, time })); } catch { /* Browsing still works without storage. */ }
}
export async function fetchReactionRows(client, season, { userId = '', table = 'album_reaction_spotlight' } = {}) {
  const rows = [];
  for (let page = 0; page < 500; page++) {
    let query = client.from(table).select(userId || table === 'album_reactions' ? 'page_path,scene_number,reaction_key' : 'page_path,scene_number,reaction_key,reaction_count')
      .ilike('page_path', `/albums/${season}/%`);
    if (userId) query = query.eq('user_id', userId);
    query = query.order('page_path').order('scene_number').order('reaction_key');
    // The raw table can contain many identical scene/reaction combinations.
    if (table === 'album_reactions') query = query.order('user_id');
    const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) {
      if (!userId && table === 'album_reaction_spotlight' && ['42P01', 'PGRST205'].includes(error.code)) {
        return fetchReactionRows(client, season, { table: 'album_reactions' });
      }
      throw error;
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
  throw new Error('Reaction results exceeded the page limit.');
}
