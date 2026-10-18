import { fetchSupporterEmails, normalizeEmail } from './supporterList.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export function createSupporterHandler({ createClient, env, fetcher = fetch }) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method === 'GET') return response({ ok: true });
    if (req.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
    try {
      const url = env('SUPABASE_URL'), anon = env('SUPABASE_ANON_KEY');
      const service = env('SUPABASE_SERVICE_ROLE_KEY') || env('SERVICE_ROLE_KEY');
      if (!url || !anon || !service) return response({ error: 'Supporter verification is unavailable.', code: 'configuration' }, 503);
      const token = (req.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i)?.[1];
      if (!token) return response({ error: 'Sign in to verify donation access.', code: 'unauthorized' }, 401);
      const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.auth.getUser(token);
      if (error || !data?.user) return response({ error: 'Sign in again to verify donation access.', code: 'unauthorized' }, 401);
      const user = data.user;
      const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: access, error: accessError } = await admin.rpc('supporter_status_for', { target_user: user.id });
      if (accessError || !access) return response({ error: 'Donation access is temporarily unavailable. Please retry.' }, 503);
      if (access.enabled) {
        const { error: saveError } = await admin.from('profiles').upsert({
          id: user.id, email: user.email, can_edit: access.allowed, updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        if (saveError) return response({ error: 'Donation access could not be refreshed. Please retry.' }, 503);
        return response(access);
      }
      // Transitional fallback only, until the payment receiver is connected.
      let emails;
      try { emails = await fetchSupporterEmails(env, fetcher); }
      catch { return response({ error: 'The supporter list is temporarily unavailable. Please try again.', code: 'supporter_list_unavailable' }, 503); }
      // Identity comes exclusively from the verified session, never a submitted email.
      const matched = emails.has(normalizeEmail(user.email));
      const { data: profile, error: saveError } = await admin.from('profiles').upsert({
        id: user.id, email: user.email, ...(matched ? { can_edit: true } : {}), updated_at: new Date().toISOString(),
      }, { onConflict: 'id' }).select('can_edit').single();
      if (saveError || !profile) return response({ error: 'Donation access could not be saved. Please try again.', code: 'save_failed' }, 503);
      // A failed list match must not erase access already granted manually.
      const allowed = profile.can_edit === true;
      return response({ allowed, status: allowed ? 'active' : 'none', reason: matched ? 'matched' : allowed ? 'existing_access' : 'not_found' });
    } catch {
      return response({ error: 'Donation access could not be verified. Please try again.', code: 'verification_failed' }, 503);
    }
  };
}
