import { normalizeMapViewSettings } from './savedViewSettings.mjs';

const FIELDS = 'id,user_id,map_id,title,description,visibility,settings,is_hidden,created_at,updated_at';
export const MAP_VIEW_PAGE_SIZE = 20;
export const savedViewsUnavailable = 'Community views could not be loaded. Please try again. The map and regular sharing links are still available.';

function checked(result, reading = false) {
  if (result.error && reading) throw new Error(savedViewsUnavailable);
  if (result.error) throw new Error(result.error.code === '42501'
    ? 'This change is not available for your account. Check your current supporter access and try again.'
    : 'The change could not be saved. Please try again.');
  return result.data;
}

export async function listSavedViews(client, { mapId, section, search = '', offset = 0 }) {
  if (!client) throw new Error(savedViewsUnavailable);
  return checked(await client.rpc('list_map_saved_views', { p_map_id: mapId, p_section: section, p_search: search.trim().slice(0, 80), p_offset: offset }), true) || [];
}

export async function getSavedView(client, id) {
  if (!client) throw new Error(savedViewsUnavailable);
  const rows = checked(await client.rpc('get_map_saved_view', { p_id: id }), true);
  return rows?.[0] || null;
}

export async function saveMapView(client, userId, mapId, draft, existing = null) {
  if (!client || !userId) throw new Error('Sign in before saving a map view.');
  const title = String(draft.title || '').trim(), description = String(draft.description || '').trim();
  if (!title || title.length > 80 || description.length > 300 || !['public', 'private'].includes(draft.visibility)) throw new Error('Enter a title of 1–80 characters and a description of up to 300 characters.');
  const settings = normalizeMapViewSettings(draft.settings);
  if (!settings) throw new Error('The map settings are unavailable. Close this form and try again after the map loads.');
  const payload = { title, description, visibility: draft.visibility, settings };
  const query = existing
    ? client.from('map_saved_views').update(payload).eq('id', existing.id).eq('user_id', userId)
    : client.from('map_saved_views').insert({ ...payload, user_id: userId, map_id: mapId });
  return checked(await query.select(FIELDS).single());
}

export async function setViewPrivate(client, userId, id) {
  return checked(await client.from('map_saved_views').update({ visibility: 'private' }).eq('id', id).eq('user_id', userId).select(FIELDS).single());
}

export async function deleteSavedView(client, userId, id) {
  const rows = checked(await client.from('map_saved_views').delete().eq('id', id).eq('user_id', userId).select('id'));
  if (!rows?.length) throw new Error('This view is no longer available. Refresh the list and try again.');
}

export async function setSavedViewFollow(client, userId, viewId, following) {
  if (!client || !userId) throw new Error('Sign in to follow views across devices.');
  checked(await (following
    ? client.from('map_view_follows').upsert({ user_id: userId, view_id: viewId }, { onConflict: 'user_id,view_id', ignoreDuplicates: true })
    : client.from('map_view_follows').delete().eq('user_id', userId).eq('view_id', viewId)));
}
