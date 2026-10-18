import { reactive } from 'vue';
import { getSupabaseClient, SUPABASE_ALBUM_PROGRESS_TABLE } from '../../../supabaseClient';

export const LIBRARY_FIELDS = 'page_path,bookmark_scene,resume_scene,reading_status,updated_at';
export const READING_STATUSES = ['not_started', 'in_progress', 'finished'];
const positiveScene = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
export function readingStatus(row) {
  if (READING_STATUSES.includes(row?.reading_status)) return row.reading_status;
  return positiveScene(row?.resume_scene) || positiveScene(row?.bookmark_scene) ? 'in_progress' : 'not_started';
}
export function readingTarget(post, row) {
  const path = post.path;
  const sceneCount = positiveScene(post.frontmatter?.scene_count) || post.frontmatter?.scenes?.length || Infinity;
  const scene = readingStatus(row) === 'in_progress' ? positiveScene(row?.resume_scene) || positiveScene(row?.bookmark_scene) || 1 : 1;
  return { path, hash: `#scene-${Math.min(scene, sceneCount)}` };
}
export function matchesReadingFilter(row, filter) {
  const status = readingStatus(row);
  return filter === 'all' || (filter === 'unread' ? status !== 'finished' : status === filter);
}

export function createReadingLibrary(getClient = getSupabaseClient) {
  const state = reactive({ userId: null, authReady: false, loaded: false, loading: false,
    records: {}, error: '', pending: {}, errors: {} });
  let client, initialized, generation = 0, request, revision = 0;
  let mutations = new Map();
  function publish(row, userId) {
    if (!row?.page_path || state.userId !== userId) return;
    // An earlier progress request can arrive after a later status save.
    const previous = state.records[row.page_path];
    if (Date.parse(row.updated_at) < Date.parse(previous?.updated_at)) return;
    state.records[row.page_path] = { ...state.records[row.page_path], ...row };
    mutations.set(row.page_path, ++revision);
  }
  async function load() {
    if (!client || !state.userId) return;
    if (request) return request;
    const userId = state.userId, epoch = generation, startingRevision = revision;
    state.loading = true; state.error = '';
    const pending = Promise.resolve().then(async () => {
      try {
        const records = {};
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await client.from(SUPABASE_ALBUM_PROGRESS_TABLE).select(LIBRARY_FIELDS)
            .eq('user_id', userId).order('page_path').range(offset, offset + 999);
          if (epoch !== generation) return;
          if (error || !Array.isArray(data)) throw error || new Error('Invalid library response');
          for (const row of data) records[row.page_path] = row;
          if (data.length < 1000) break;
        }
        // A refresh must not replace a completion or progress save made while it was pending.
        for (const [path, version] of mutations) if (version > startingRevision) records[path] = state.records[path];
        state.records = records; state.loaded = true;
      } catch {
        if (epoch === generation) state.error = 'Your reading library could not load. Please retry.';
      } finally {
        if (epoch === generation) state.loading = false;
      }
    });
    request = pending;
    try { await pending; } finally { if (request === pending) request = null; }
  }
  function setUser(user) {
    const id = user?.id || null;
    if (state.authReady && state.userId === id) return request || Promise.resolve();
    generation++; request = null; revision = 0; mutations = new Map();
    Object.assign(state, { userId: id, authReady: true, loaded: false, loading: false, records: {}, error: '', pending: {}, errors: {} });
    return id ? load() : Promise.resolve();
  }
  async function initialize() {
    if (initialized) return initialized;
    client = getClient();
    if (!client) { state.authReady = true; return; }
    initialized = Promise.resolve().then(async () => {
      client.auth.onAuthStateChange((_event, session) => { void setUser(session?.user); });
      const epoch = generation;
      try {
        const { data, error } = await client.auth.getSession();
        if (epoch !== generation) return request;
        if (error) throw error;
        return setUser(data?.session?.user);
      } catch { if (epoch === generation) { state.authReady = true; state.error = 'Your reading library could not load. Please retry.'; } }
    });
    return initialized;
  }
  async function setStatus(path, status) {
    if (!client || !state.userId || !READING_STATUSES.includes(status) || state.pending[path]) return false;
    const userId = state.userId, epoch = generation;
    state.pending[path] = true; delete state.errors[path];
    const row = { user_id: userId, page_path: path, reading_status: status };
    if (status === 'not_started') row.resume_scene = null;
    if (status === 'in_progress') row.resume_scene = positiveScene(state.records[path]?.resume_scene) || 1;
    try {
      const { data, error } = await client.from(SUPABASE_ALBUM_PROGRESS_TABLE)
        .upsert(row, { onConflict: 'user_id,page_path' }).select(LIBRARY_FIELDS).single();
      if (epoch !== generation) return false;
      if (error || !data) throw error || new Error('Save failed');
      publish(data, userId); return true;
    } catch {
      if (epoch === generation) state.errors[path] = 'Reading status could not be saved. Please try again.';
      return false;
    } finally { if (epoch === generation) delete state.pending[path]; }
  }
  return { state, initialize, setUser, refresh: load, setStatus, publish };
}
export const readingLibrary = createReadingLibrary();
