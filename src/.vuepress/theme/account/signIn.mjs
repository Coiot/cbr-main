export const SIGN_IN_SCENE_QUERY = 'signin_scene';

const sceneNumber = value => /^[1-9]\d*$/.test(String(value ?? '')) && Number.isSafeInteger(Number(value))
  ? Number(value) : null;

// Supabase uses the URL fragment for authentication. Keep the reading destination
// in a query parameter so it also survives email links opened in another tab.
export function signInReturnScene(location) {
  const hashScene = /^#scene-([1-9]\d*)$/.exec(location.hash || '');
  return sceneNumber(hashScene?.[1]) ?? sceneNumber(new URLSearchParams(location.search || '').get(SIGN_IN_SCENE_QUERY));
}

export function signInRedirect(location, scene) {
  const url = new URL(location.pathname + (location.search || ''), location.origin);
  const target = sceneNumber(scene) ?? signInReturnScene(location);
  url.searchParams.delete(SIGN_IN_SCENE_QUERY);
  if (target) url.searchParams.set(SIGN_IN_SCENE_QUERY, String(target));
  return url.href;
}

export async function sendSignInLink(client, email, { location, history, scene } = {}) {
  email = String(email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Enter your email address to receive a sign-in link.' };
  }
  if (!client) return { ok: false, message: 'Sign-in is unavailable. Please try again.' };
  try {
    const redirect = signInRedirect(location, scene);
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    if (error) return { ok: false, message: error.message || 'Unable to send the sign-in link. Please try again.' };
    if (new URL(redirect).searchParams.has(SIGN_IN_SCENE_QUERY)) {
      // Also guard against cloud bookmark loading moving the original tab when
      // authentication arrives there through Supabase's cross-tab notification.
      try { history?.replaceState(history.state, '', redirect + (location.hash || '')); } catch { /* The email link still carries the destination. */ }
    }
    return { ok: true, message: 'Check your email for the sign-in link. You can keep reading while you wait.' };
  } catch {
    return { ok: false, message: 'Unable to send the sign-in link. Check your connection and try again.' };
  }
}
