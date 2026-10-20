import { normalizeCollection } from './collectionModel.mjs';
import { validPublicId } from '../supporters/showcaseModel.mjs';
export function checked(result) {
  if (result.error) throw new Error(result.error.code === '42501' ? 'This change requires current supporter access. Check your account and try again.'
    : result.error.code === '40001' ? 'This collection changed in another tab. Reload it before saving again.'
    : result.error.code === '23514' ? 'A collection can hold 100 scenes. You can create 20 collections and feature three on your showcase.'
    : 'Collections could not be loaded or saved. Please try again.');
  return result.data;
}
export async function ownCollections(client, userId) {
  if (!client) throw new Error('The account connection is unavailable.');
  return checked(await client.from('scene_collections').select('id,title,description,scenes,published,featured,is_hidden,revision,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }));
}
export async function listCollections(client, { search = '', offset = 0, showcase = null } = {}) {
  if (!client) throw new Error('Collections could not be loaded.');
  return checked(await client.rpc('list_scene_collections', { p_search: search.trim().slice(0,80), p_offset: offset, p_showcase: showcase }));
}
export async function getCollection(client, id) {
  if (!validPublicId(id)) return null;
  if (!client) throw new Error('Collections could not be loaded.');
  return checked(await client.rpc('get_scene_collection', { p_id: id }));
}
export async function changeCollection(client, action, row, draft, scenes = []) {
  const payload = action === 'save' ? normalizeCollection(draft) : { title: String(draft?.title || '').trim() };
  return checked(await client.rpc('change_scene_collection', { p_action: action, p_id: row?.id || null, p_revision: row?.revision || null, p_draft: payload, p_scenes: scenes.map(s => ({path:s.path,number:Number(s.number),note:s.note || ''})) }));
}
