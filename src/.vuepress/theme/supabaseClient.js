import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ndgkvyldchkgyyoaeukt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EHgYIUVagLDrS166HDpv3g_seLG2CN_";

const SUPABASE_ALBUM_PROGRESS_TABLE = "album_progress";
const SUPABASE_ALBUM_REACTIONS_TABLE = "album_reactions";
const SUPABASE_ALBUM_COMMENTS_TABLE = "album_comments";
const SUPABASE_USER_SETTINGS_TABLE = "user_settings";
const SUPABASE_SUPPORTER_CHECK_FUNCTION = "check-kofi-subscriber";
const SUPABASE_SUPPORTER_MAP_ID = "s5";

let supabaseClient = null;

export function getSupabaseClient() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

export async function ensureProfileRow(supabase, authUser) {
  if (!supabase || !authUser || !authUser.id) {
    return { ok: false, error: null };
  }
  try {
    const email = String(authUser.email || "").trim();
    const row = {
      id: authUser.id,
      updated_at: new Date().toISOString(),
    };
    if (email) {
      row.email = email;
    }
    const { error } = await supabase.from("profiles").upsert(row, {
      onConflict: "id",
    });
    return { ok: !error, error: error || null };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function checkSupporterAccess(
  supabase,
  authUser,
  accessToken = ""
) {
  if (!supabase || !authUser) {
    return { allowed: false, error: null };
  }
  try {
    let token = typeof accessToken === "string" ? accessToken.trim() : "";
    if (!token) {
      const { data: sessionData } = await supabase.auth.getSession();
      token =
        sessionData && sessionData.session
          ? String(sessionData.session.access_token || "").trim()
          : "";
    }
    const { data, error } = await supabase.functions.invoke(
      SUPABASE_SUPPORTER_CHECK_FUNCTION,
      {
        body: {
          map_id: SUPABASE_SUPPORTER_MAP_ID,
          email: authUser.email || "",
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );
    return {
      allowed: !!(data && data.allowed),
      error: error || null,
      data: data || null,
    };
  } catch (error) {
    return {
      allowed: false,
      error,
      data: null,
    };
  }
}

export {
  SUPABASE_ALBUM_PROGRESS_TABLE,
  SUPABASE_ALBUM_REACTIONS_TABLE,
  SUPABASE_ALBUM_COMMENTS_TABLE,
  SUPABASE_USER_SETTINGS_TABLE,
  SUPABASE_SUPPORTER_CHECK_FUNCTION,
};
