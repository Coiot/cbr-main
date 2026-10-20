import { normalizeShowcaseDraft, validPublicId } from './showcaseModel.mjs';
export const SHOWCASE_UNAVAILABLE = 'Supporters could not be loaded. Please try again.';
export function checked(result, reading = false) {
  if (result.error) throw new Error(reading ? SHOWCASE_UNAVAILABLE : result.error.code === '42501'
    ? 'This change requires current supporter access. Check your account and try again.'
    : 'Your changes could not be saved. Please try again.');
  return result.data;
}
export async function listDirectory(client, { search = '', civ = '', offset = 0 } = {}) {
  if (!client) throw new Error(SHOWCASE_UNAVAILABLE);
  return checked(await client.rpc('list_supporter_directory', { p_search: search.trim().slice(0, 80), p_civ: civ, p_offset: offset }), true);
}
export async function listFullDirectory(client, { search = '', civ = '' } = {}) {
  const entries = [];
  let result;
  do {
    result = await listDirectory(client, { search, civ, offset: entries.length });
    if (!result.entries.length && entries.length < result.total) throw new Error(SHOWCASE_UNAVAILABLE);
    entries.push(...result.entries);
  } while (entries.length < result.total);
  return { ...result, entries };
}
export async function getShowcase(client, id) {
  if (!validPublicId(id)) return null;
  if (!client) throw new Error(SHOWCASE_UNAVAILABLE);
  return checked(await client.rpc('get_supporter_showcase', { p_id: id }), true);
}
export async function listShowrunners(client) {
  if (!client) throw new Error(SHOWCASE_UNAVAILABLE);
  return checked(await client.rpc('list_showrunner_showcases'), true);
}
export async function loadShowcaseAccess(client) {
  if (!client) throw new Error(SHOWCASE_UNAVAILABLE);
  return checked(await client.rpc('get_my_showcase_access'), true);
}
export async function getShowcaseContent(client, id) {
  if (!validPublicId(id)) return null;
  if (!client) throw new Error(SHOWCASE_UNAVAILABLE);
  return checked(await client.rpc('get_showcase_public_content', { p_id: id }), true);
}
export async function loadOwnShowcase(client, userId) {
  const [showcase, preference] = await Promise.all([
    client.from('supporter_showcases').select('id,introduction,competitors,scenes,map_views,map_pins,published').eq('user_id', userId).maybeSingle(),
    client.from('supporter_directory_preferences').select('hidden').eq('user_id', userId).maybeSingle(),
  ]);
  return { showcase: checked(showcase, true), hidden: checked(preference, true)?.hidden === true };
}
export async function saveShowcase(client, userId, draft, existing) {
  const payload = normalizeShowcaseDraft(draft);
  const query = existing ? client.from('supporter_showcases').update(payload).eq('id', existing.id).eq('user_id', userId)
    : client.from('supporter_showcases').insert({ ...payload, user_id: userId });
  const saved = checked(await query.select('id,introduction,competitors,scenes,map_views,map_pins,published').single());
  clearShowcaseNames(client); return saved;
}
export async function unpublishShowcase(client, userId, id) {
  const row = checked(await client.from('supporter_showcases').update({ published: false }).eq('user_id', userId).eq('id', id).select('id').single());
  clearShowcaseNames(client); return row;
}
export async function deleteShowcase(client, userId, id) {
  const rows = checked(await client.from('supporter_showcases').delete().eq('user_id', userId).eq('id', id).select('id'));
  if (!rows?.length) throw new Error('This showcase is no longer available. Refresh and try again.');
  clearShowcaseNames(client);
}
export async function setDirectoryHidden(client, userId, hidden) {
  checked(await client.from('supporter_directory_preferences').upsert({ user_id: userId, hidden }, { onConflict: 'user_id' }));
}
// Batch visible bylines into one request, rather than a request per comment or card.
const lookups = new WeakMap();
export function clearShowcaseNames(client) { lookups.delete(client); }
export function lookupShowcaseName(client, userId) {
  if (!client || !validPublicId(userId)) return Promise.resolve(null);
  let state = lookups.get(client);
  if (!state) { state = { cache: new Map(), pending: new Map(), scheduled: false }; lookups.set(client, state); }
  const cached = state.cache.get(userId);
  if (cached && Date.now() - cached.time < 60000) return Promise.resolve(cached.id);
  return new Promise(resolve => {
    const listeners = state.pending.get(userId) || []; listeners.push(resolve); state.pending.set(userId, listeners);
    if (state.scheduled) return;
    state.scheduled = true;
    queueMicrotask(async () => {
      while (state.pending.size) {
        const batch = [...state.pending.entries()].slice(0, 100);
        let rows = [], succeeded = false;
        try {
          const data = checked(await client.rpc('lookup_supporter_showcases', { p_user_ids: batch.map(([id]) => id) }), true);
          rows = Array.isArray(data) ? data : []; succeeded = Array.isArray(data);
        } catch { /* A profile link is optional; the name remains usable. */ }
        for (const [id, listeners] of batch) {
          const showcase = rows.find(row => row.user_id === id)?.showcase_id || null;
          if (succeeded) state.cache.set(id, { id: showcase, time: Date.now() });
          state.pending.delete(id); listeners.forEach(done => done(showcase));
        }
      }
      state.scheduled = false;
    });
  });
}
