import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ndgkvyldchkgyyoaeukt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EHgYIUVagLDrS166HDpv3g_seLG2CN_";

const SUPABASE_ALBUM_PROGRESS_TABLE = "album_progress";
const SUPABASE_ALBUM_REACTIONS_TABLE = "album_reactions";
const SUPABASE_ALBUM_COMMENTS_TABLE = "album_comments";
const SUPABASE_USER_SETTINGS_TABLE = "user_settings";

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

export {
  SUPABASE_ALBUM_PROGRESS_TABLE,
  SUPABASE_ALBUM_REACTIONS_TABLE,
  SUPABASE_ALBUM_COMMENTS_TABLE,
  SUPABASE_USER_SETTINGS_TABLE,
};
