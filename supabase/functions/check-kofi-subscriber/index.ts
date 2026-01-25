import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function fetchSheetEmails() {
  const sheetId = Deno.env.get("GOOGLE_SHEET_ID");
  const sheetGid = Deno.env.get("GOOGLE_SHEET_GID") || "0";
  if (!sheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID.");
  }
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`
  );
  const csv = await response.text();
  if (!response.ok) {
    throw new Error("Unable to read Google Sheet.");
  }
  const rows = csv
    .split(/\r?\n/)
    .map((row) => row.split(","))
    .filter((row) => row.length);
  if (rows.length <= 1) {
    return [];
  }
  return rows
    .slice(1)
    .map((row) =>
      String(row?.[1] || "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emails = await fetchSheetEmails();
    const allowed = user.email
      ? emails.includes(user.email.trim().toLowerCase())
      : false;

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    await adminClient.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        can_edit: allowed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    return new Response(JSON.stringify({ allowed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
