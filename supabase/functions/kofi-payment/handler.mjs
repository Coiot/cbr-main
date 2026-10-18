const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
export function normalizePayment(data, now = Date.now()) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid payment.');
  // Ko-fi's dashboard samples use this address. Also support explicit test flags.
  const email = String(data.email || '').trim().toLowerCase();
  if (data.is_test === true || data.test === true || /@example\.(com|org|net)$/.test(email)) return null;
  if (!['Donation', 'Tip', 'Subscription'].includes(data.type)) return null;
  if (!id(data.message_id) || !id(data.kofi_transaction_id)) throw new Error('Invalid payment identifiers.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Invalid payment email.');
  if (typeof data.is_subscription_payment !== 'boolean') throw new Error('Invalid subscription flag.');
  if (data.type === 'Subscription' && !data.is_subscription_payment) throw new Error('Inconsistent payment type.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(String(data.amount)) || Number(data.amount) <= 0 || Number(data.amount) > 1000000) throw new Error('Invalid amount.');
  if (!/^[A-Z]{3}$/.test(data.currency)) throw new Error('Invalid currency.');
  // Ko-fi may omit the UTC suffix. Never interpret its timestamp in local time.
  const raw = String(data.timestamp || '');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(raw)) throw new Error('Invalid timestamp.');
  const paid = Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(raw) ? raw : raw + 'Z');
  if (!Number.isFinite(paid) || paid > now + 300000) throw new Error('Invalid timestamp.');
  return { message_id: data.message_id, transaction_id: data.kofi_transaction_id, email,
    kind: data.is_subscription_payment ? 'recurring' : 'one_time', paid_at: new Date(paid).toISOString(),
    amount: String(data.amount), currency: data.currency };
}
async function sameSecret(a, b) {
  if (typeof a !== 'string' || a.length > 1024) return false;
  const digest = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [left,right] = await Promise.all([digest(a),digest(b)]);
  let difference = 0; const x = new Uint8Array(left), y = new Uint8Array(right);
  for (let i=0;i<x.length;i++) difference |= x[i] ^ y[i];
  return difference === 0;
}
export function createPaymentHandler({ createClient, env, now = Date.now }) {
  return async request => {
    if (request.method === 'GET') return reply({ ok: true });
    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
    const token = env('KOFI_VERIFICATION_TOKEN'), url = env('SUPABASE_URL');
    const service = env('SUPABASE_SERVICE_ROLE_KEY') || env('SERVICE_ROLE_KEY');
    if (!token || !url || !service) return reply({ error: 'Payment receiver is not configured.' }, 503);
    if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return reply({ error: 'Expected form data.' }, 415);
    let data;
    try {
      if (Number(request.headers.get('content-length')) > 65536) return reply({ error: 'Payload too large.' }, 413);
      // Bound streamed input too; Content-Length is not authoritative.
      const reader = request.body?.getReader(); if (!reader) throw new Error('Missing body');
      let length = 0, chunks = [];
      while (true) { const { value,done } = await reader.read(); if (done) break;
        length += value.byteLength; if (length > 65536) { await reader.cancel(); return reply({ error: 'Payload too large.' },413); } chunks.push(value); }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
      data = JSON.parse(new URLSearchParams(new TextDecoder().decode(bytes)).get('data'));
    } catch { return reply({ error: 'Invalid payment payload.' },400); }
    if (!await sameSecret(data?.verification_token,token)) return reply({ error: 'Unauthorized.' },401);
    let payment;
    try { payment = normalizePayment(data,now()); } catch { return reply({ error: 'Invalid payment fields.' },400); }
    if (!payment && !['Donation','Tip','Subscription','Commission','Shop Order'].includes(data.type)) return reply({ ok:true, ignored:true });
    try {
      const admin = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
      if (!payment) {
        const isTest = data.is_test === true || data.test === true || /@example\.(com|org|net)$/.test(String(data.email || '').trim().toLowerCase());
        if (isTest) {
          const { error } = await admin.rpc('record_kofi_test',{event_type:data.type});
          if (error) throw error;
        }
        return reply({ok:true,ignored:true});
      }
      const { data: saved,error } = await admin.rpc('record_kofi_payment',{payment});
      if (error) throw error;
      return reply({ ok:true, duplicate:saved?.duplicate === true });
    } catch {
      // No payloads, emails, or token values in logs. Non-200 causes Ko-fi retries.
      console.error('Ko-fi payment persistence failed; delivery should be retried.');
      return reply({ error:'Payment could not be recorded. Please retry.' },503);
    }
  };
}
