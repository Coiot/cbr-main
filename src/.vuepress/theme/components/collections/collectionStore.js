// One account subscription and one shared owner list, even in albums with hundreds of scenes.
import { reactive, computed } from 'vue';
import { getSupabaseClient } from '../../supabaseClient';
import { getAccountSync, subscribeAccountAuth } from '../../account/accountSync.js';
import { sceneKey } from './collectionModel.mjs';
import { ownCollections, changeCollection } from './collectionApi.mjs';
const stores = new WeakMap();
export function getCollectionStore() {
  const client = getSupabaseClient();
  if (!client) return null;
  if (stores.has(client)) return stores.get(client);
  const store = createCollectionStore(client); stores.set(client, store); return store;
}
export function createCollectionStore(client, { sync = getAccountSync(client), subscribe = subscribeAccountAuth, documentTarget = document, windowTarget = window } = {}) {
  const state = reactive({ user: null, rows: [], allowed: false, expired: false, loading: true, error: '', accessError: false });
  state.memberships = computed(() => {
    const memberships = new Map();
    for (const row of state.rows) for (const scene of row.scenes) { const key = sceneKey(scene); if (!memberships.has(key)) memberships.set(key, new Set()); memberships.get(key).add(row.id); }
    return memberships;
  });
  let refs = 0, auth, generation = 0, pending, alive = false, mutationVersion = 0;
  let mutations = Promise.resolve();
  const current = (id, gen) => alive && state.user?.id === id && generation === gen;
  async function access() {
    const user = state.user, gen = generation; if (!user) return;
    try {
      const result = await sync.refreshSupporter(user, { force: true });
      if (current(user.id, gen)) { state.allowed = !result.error && result.allowed; state.expired = result.data?.status === 'expired'; state.accessError = !!result.error; }
    } catch { if (current(user.id, gen)) { state.allowed = false; state.accessError = true; } }
  }
  async function refresh() {
    if (pending) return pending;
    const user = state.user, gen = generation, version = mutationVersion; if (!user) { state.loading = false; return; }
    state.loading = true; state.error = '';
    const task = (async () => {
      try { const [rows] = await Promise.all([ownCollections(client, user.id), access()]); if (current(user.id, gen) && version === mutationVersion) state.rows = rows || []; }
      catch (error) { if (current(user.id, gen)) state.error = error.message; }
      finally { if (current(user.id, gen)) state.loading = false; if (pending === task) pending = null; }
    })();
    pending = task; return task;
  }
  const visibility = () => { if (!documentTarget.hidden && state.user) refresh(); };
  const profile = event => { if (event.detail?.userId === state.user?.id && event.detail.profile?.supporter_status) { state.allowed = event.detail.profile.can_edit === true; state.expired = event.detail.profile.supporter_status === 'expired'; } };
  const store = { state, client, refresh, access,
    retain() {
      if (refs++ === 0) {
        alive = true;
        auth = subscribe(client, session => {
          const user = session?.user || null;
          if (state.user?.id === user?.id && !state.loading) return;
          generation++; pending = null; Object.assign(state, { user, rows: [], allowed: false, expired: false, accessError: false, error: '', loading: !!user }); refresh();
        });
        documentTarget.addEventListener('visibilitychange', visibility); windowTarget.addEventListener('account-profile-updated', profile);
      }
      return () => { if (--refs === 0) { alive = false; generation++; pending = null; auth?.unsubscribe(); documentTarget.removeEventListener('visibilitychange', visibility); windowTarget.removeEventListener('account-profile-updated', profile); Object.assign(state, {user:null,rows:[],allowed:false,loading:true}); } };
    },
    change(action, row, draft, scenes) {
      const id = state.user?.id, gen = generation;
      const task = mutations.then(async () => {
        if (!id || !current(id, gen)) throw new Error('Your account changed. Reopen the collection to continue.');
        mutationVersion++;
        const saved = await changeCollection(client, action, row, draft, scenes);
        if (!current(id, gen)) throw new Error('Your account changed. Reopen the collection to continue.');
        mutationVersion++;
        state.rows = action === 'delete' ? state.rows.filter(r => r.id !== row.id) : [saved, ...state.rows.filter(r => r.id !== saved.id)];
        return saved;
      });
      mutations = task.catch(() => {}); return task;
    },
  };
  return store;
}
