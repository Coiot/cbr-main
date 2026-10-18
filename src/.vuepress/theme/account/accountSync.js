import { ensureProfileRow, checkSupporterAccess } from '../supabaseClient';

const PROFILE_FIELDS = 'username,can_edit,updated_at';
const services = new WeakMap();
const cancelled = () => ({ data: null, error: new Error('Account changed. Please retry.') });
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

// Supabase emits INITIAL_SESSION itself. Defer work out of its auth callback
// and coalesce repeated session events instead of starting duplicate loads.
export function subscribeAccountAuth(client, onSession) {
  let active = true, timer;
  const { data } = client.auth.onAuthStateChange((event, session) => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (active) onSession(session, event); }, 0);
  });
  return { unsubscribe() { active = false; clearTimeout(timer); data?.subscription?.unsubscribe(); } };
}

// One coordinator per Supabase client. Components receive account-scoped events;
// reads cannot replace edits made while they were in flight.
export function createAccountSync(client, {
  ensure = ensureProfileRow, verify = checkSupporterAccess,
  emit = (name, detail) => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name, { detail }));
  },
  now = Date.now,
} = {}) {
  const accounts = new Map();
  function entryFor(user) {
    if (!user?.id) throw new Error('Sign in to save account changes.');
    if (!accounts.has(user.id)) accounts.set(user.id, {
      profile: null, profileVersion: 0, profileVersions: new Map(), profileRequest: null,
      settings: {}, settingsLoaded: false, settingsRequest: null,
      settingsVersion: 0, edits: new Map(), queue: Promise.resolve(),
      supporterRequest: null, supporterResult: null, checkedAt: 0, expiryTimer: null,
    });
    return accounts.get(user.id);
  }
  const current = (user, entry) => accounts.get(user.id) === entry;
  function publishProfile(user, entry, patch) {
    if (!current(user, entry)) return;
    entry.profile = { ...entry.profile, ...patch };
    entry.profileVersion++;
    for (const key of Object.keys(patch || {})) entry.profileVersions.set(key, entry.profileVersion);
    emit('account-profile-updated', { userId: user.id, profile: { ...entry.profile } });
  }
  function publishSettings(user, entry, data) {
    if (!current(user, entry)) return;
    entry.settings = { ...object(data) };
    for (const [key, edit] of entry.edits) entry.settings[key] = edit.value;
    emit('user-settings-synced', { ...entry.settings, userId: user.id });
  }
  async function loadProfile(user, { force = false } = {}) {
    const entry = entryFor(user);
    if (entry.profileRequest) return entry.profileRequest;
    if (entry.profile && !force) return { data: entry.profile, error: null };
    const version = entry.profileVersion;
    const request = Promise.resolve().then(async () => {
      try {
        let result = await client.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).maybeSingle();
        if (!current(user, entry)) return cancelled();
        if (result.error) return result;
        if (!result.data) {
          const ensured = await ensure(client, user);
          if (ensured.error) return { data: null, error: ensured.error };
          result = await client.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).single();
        }
        if (!current(user, entry)) return cancelled();
        if (result.error) return result;
        const data = { ...result.data };
        for (const [key, changedAt] of entry.profileVersions) {
          if (changedAt > version) data[key] = entry.profile[key];
        }
        if (entry.supporterResult) data.can_edit = entry.supporterResult.allowed === true;
        publishProfile(user, entry, data);
        return { data: entry.profile, error: null };
      } catch (error) { return { data: null, error }; }
    });
    entry.profileRequest = request;
    try { return await request; } finally { if (entry.profileRequest === request) entry.profileRequest = null; }
  }
  async function refreshSupporter(user, { force = false } = {}) {
    const entry = entryFor(user);
    if (entry.supporterRequest) return entry.supporterRequest;
    if (!force && entry.supporterResult && now() - entry.checkedAt < 60000) return entry.supporterResult;
    const request = Promise.resolve().then(async () => {
      const profile = await loadProfile(user, { force: true });
      if (!current(user, entry)) return { allowed: false, error: cancelled().error };
      const result = await verify(client, user);
      if (!current(user, entry)) return { allowed: false, error: cancelled().error };
      if (!result.error) {
        clearTimeout(entry.expiryTimer);
        const access = result.data || {};
        publishProfile(user, entry, { can_edit: result.allowed === true,
          supporter_status: access.status || (result.allowed ? 'active' : 'none'),
          supporter_expires_at: access.expires_at || null });
        // Expire an open page too; hidden tabs also refresh on returning to view.
        if (result.allowed && access.expires_at && typeof window !== 'undefined') {
          const remaining = Date.parse(access.expires_at) - Date.parse(access.server_now || new Date(now()).toISOString());
          const deadline = now() + Math.max(0, remaining);
          const expire = () => {
            if (!current(user, entry)) return;
            if (now() < deadline) { entry.expiryTimer = setTimeout(expire, Math.min(deadline - now(), 2147483647)); return; }
            entry.supporterResult = { allowed: false, error: null, data: { ...access, status: 'expired' } };
            entry.checkedAt = 0;
            publishProfile(user, entry, { can_edit: false, supporter_status: 'expired' });
          };
          if (Number.isFinite(remaining)) entry.expiryTimer = setTimeout(expire, Math.min(Math.max(0,remaining),2147483647));
        }
      }
      return result;
    }).catch(error => ({ allowed: false, error }));
    entry.supporterRequest = request;
    try {
      const result = await request;
      if (current(user, entry) && !result.error) { entry.supporterResult = result; entry.checkedAt = now(); }
      return result;
    } finally { if (entry.supporterRequest === request) entry.supporterRequest = null; }
  }
  async function saveUsername(user, username) {
    const value = String(username || '').trim();
    if (!value || value.length > 32) return { data: null, error: new Error('Enter a username of 1–32 characters.') };
    const entry = entryFor(user);
    try {
      const { data, error } = await client.from('profiles').upsert({ id: user.id, username: value,
        updated_at: new Date().toISOString() }, { onConflict: 'id' }).select('username').single();
      if (!current(user, entry)) return cancelled();
      if (error || !data) return { data: null, error: error || new Error('Username was not saved.') };
      publishProfile(user, entry, { username: data.username });
      return { data: entry.profile, error: null };
    } catch (error) { return { data: null, error }; }
  }
  async function loadSettings(user, defaults = {}) {
    const entry = entryFor(user);
    if (entry.settingsRequest) {
      const result = await entry.settingsRequest;
      if (result.error || !current(user, entry)) return result;
      return loadSettings(user, defaults);
    }
    if (entry.settingsLoaded && Object.keys(defaults).every(key => Object.hasOwn(entry.settings, key))) return { data: entry.settings, error: null };
    const version = entry.settingsVersion;
    const request = Promise.resolve().then(async () => {
      try {
        // Defaults are inserted only for missing keys, atomically with other saves.
        const { data, error } = await client.rpc('patch_user_settings', {
          expected_user_id: user.id, patch: object(defaults), only_missing: true,
        });
        if (!current(user, entry)) return cancelled();
        if (error) return { data: null, error };
        publishSettings(user, entry, version === entry.settingsVersion ? data : { ...object(data), ...entry.settings });
        entry.settingsLoaded = true;
        return { data: entry.settings, error: null };
      } catch (error) { return { data: null, error }; }
    });
    entry.settingsRequest = request;
    try { return await request; } finally { if (entry.settingsRequest === request) entry.settingsRequest = null; }
  }
  function saveSettings(user, patch) {
    const entry = entryFor(user), values = { ...object(patch) }, version = ++entry.settingsVersion;
    for (const [key, value] of Object.entries(values)) entry.edits.set(key, { value, version, failed: false });
    publishSettings(user, entry, { ...entry.settings, ...values });
    const request = entry.queue.then(async () => {
      if (!current(user, entry)) return cancelled();
      try {
        const { data, error } = await client.rpc('patch_user_settings', {
          expected_user_id: user.id, patch: values, only_missing: false,
        });
        if (!current(user, entry)) return cancelled();
        if (error) throw error;
        for (const key of Object.keys(values)) if (entry.edits.get(key)?.version === version) entry.edits.delete(key);
        publishSettings(user, entry, data);
        return { data: entry.settings, error: null };
      } catch (error) {
        for (const key of Object.keys(values)) {
          const edit = entry.edits.get(key);
          if (edit?.version === version) edit.failed = true;
        }
        return { data: null, error };
      }
    });
    entry.queue = request.then(() => {});
    return request;
  }
  function retrySettings(user) {
    const entry = entryFor(user);
    return saveSettings(user, Object.fromEntries([...entry.edits].filter(([, edit]) => edit.failed).map(([key, edit]) => [key, edit.value])));
  }
  return { loadProfile, refreshSupporter, saveUsername, loadSettings, saveSettings, retrySettings,
    clear: userId => { clearTimeout(accounts.get(userId)?.expiryTimer); accounts.delete(userId); },
    hasUnsavedSettings: user => [...entryFor(user).edits.values()].some(edit => edit.failed),
  };
}

export function getAccountSync(client) {
  if (!services.has(client)) services.set(client, createAccountSync(client));
  return services.get(client);
}
