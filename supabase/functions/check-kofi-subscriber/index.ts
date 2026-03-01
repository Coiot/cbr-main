import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }
  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

async function fetchSheetEmails() {
  const sheetId = Deno.env.get("GOOGLE_SHEET_ID");
  const sheetGid = Deno.env.get("GOOGLE_SHEET_GID") || "0";
  const publishedId =
    Deno.env.get("GOOGLE_SHEET_PUB_ID") ||
    "2PACX-1vQ-tkKRpaaetTuSekXz43IKKlEU4lrvYAgRQz6qeP1r760_a7sHm2AzAeG9lU9iuPn0grd2TiuS7Cdz";
  const emailColumn = Number.parseInt(
    Deno.env.get("SUPPORTERS_EMAIL_COLUMN") || "1",
    10
  );
  if (!sheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID.");
  }
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`;
  const pubUrl = publishedId
    ? `https://docs.google.com/spreadsheets/d/e/${publishedId}/pub?output=csv`
    : "";

  const fetchCsv = async (url: string) => {
    const response = await fetch(url);
    const csv = await response.text();
    const looksHtml = /<html/i.test(csv);
    return {
      ok: response.ok && !looksHtml,
      csv,
      source: url,
      status: response.status,
      looksHtml,
    };
  };

  let response = null;
  if (pubUrl) {
    response = await fetchCsv(pubUrl);
  }
  if (!response || !response.ok) {
    response = await fetchCsv(exportUrl);
  }
  if (!response.ok) {
    console.warn("Supporter list fetch failed.", {
      source: response.source,
      status: response.status,
      looksHtml: response.looksHtml,
    });
    return { emails: [], ok: false, source: response.source };
  }
  const csv = response.csv;
  const rows = parseCsv(csv).filter((row) => row.length);
  if (rows.length <= 1) {
    console.warn("Supporter list fetch returned no data.", {
      source: response.source,
      rows: rows.length,
    });
    return { emails: [], ok: false, source: response.source };
  }
  const emails = rows
    .slice(1)
    .map((row) =>
      String(row?.[emailColumn] || "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
  return { emails, ok: true, source: response.source };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Missing access token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(accessToken);
    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: userError ? userError.message : "Unauthorized.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { emails, ok: emailFetchOk, source } = await fetchSheetEmails();
    if (!emailFetchOk) {
      return new Response(
        JSON.stringify({
          error: "Unable to load supporter list.",
          source,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const allowed = user.email
      ? emails.includes(user.email.trim().toLowerCase())
      : false;

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const { error: upsertError } = await adminClient.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        can_edit: allowed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (upsertError) {
      return new Response(
        JSON.stringify({
          error: "Failed to persist profile state.",
          details: upsertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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
