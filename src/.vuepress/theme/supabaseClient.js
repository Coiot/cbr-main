import publicConfig from "../../shared/publicConfig.json";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = publicConfig.SUPABASE_URL;
const SUPABASE_ANON_KEY = publicConfig.SUPABASE_ANON_KEY;

const SUPABASE_ALBUM_PROGRESS_TABLE = "album_progress";
const SUPABASE_ALBUM_REACTIONS_TABLE = "album_reactions";
const SUPABASE_ALBUM_COMMENTS_TABLE = "album_comments";
const SUPABASE_USER_SETTINGS_TABLE = "user_settings";
const SUPABASE_SUPPORTER_CHECK_FUNCTION = "check-kofi-subscriber";

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
  authUser
) {
  if (!supabase || !authUser) {
    return { allowed: false, error: null };
  }
  try {
    const { data, error } = await supabase.functions.invoke(
      SUPABASE_SUPPORTER_CHECK_FUNCTION,
      {
        body: {},
        timeout: 25000,
      }
    );
    if (error) {
      let message = "Donation access could not be verified. Please try again.";
      try {
        const body = await error.context?.json();
        if (typeof body?.error === "string") message = body.error;
      } catch { /* Keep the retry message for network and gateway errors. */ }
      return { allowed: false, error: new Error(message), data: null };
    }
    const value = data?.allowed ?? data?.can_edit;
    if (![true, false, "true", "false"].includes(value)) {
      return { allowed: false, error: new Error("Donation verification returned an invalid response. Please retry."), data: null };
    }
    return { allowed: value === true || value === "true", error: null, data };

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
