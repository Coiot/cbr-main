import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function uniq(values: string[]) {
  return Array.from(new Set(values));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
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
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

    const body = await req.json().catch(() => ({}));
    const mapId = body && body.map_id ? String(body.map_id) : null;
    if (!mapId) {
      return new Response(JSON.stringify({ error: "Missing map_id." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const windowSeconds =
      body && Number.isFinite(body.window_seconds)
        ? Math.max(5, Math.min(3600, Number(body.window_seconds)))
        : 60;
    const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: recentEdits, error: recentError } = await adminClient
      .from("tile_edits")
      .select("tile_key, edited_at")
      .eq("map_id", mapId)
      .eq("edited_by", user.id)
      .gte("edited_at", cutoff)
      .order("edited_at", { ascending: false });

    if (recentError) {
      return new Response(JSON.stringify({ error: recentError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recentEdits || !recentEdits.length) {
      return new Response(JSON.stringify({ reverted: 0, skipped: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tileKeys = uniq(
      recentEdits.map((row: { tile_key: string }) => row.tile_key).filter(Boolean)
    );

    const { data: latestEdits, error: latestError } = await adminClient
      .from("tile_edits")
      .select("tile_key, edited_at, edited_by, payload")
      .eq("map_id", mapId)
      .in("tile_key", tileKeys)
      .order("edited_at", { ascending: false });

    if (latestError) {
      return new Response(JSON.stringify({ error: latestError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: previousEdits, error: previousError } = await adminClient
      .from("tile_edits")
      .select("tile_key, edited_at, payload")
      .eq("map_id", mapId)
      .in("tile_key", tileKeys)
      .lt("edited_at", cutoff)
      .order("edited_at", { ascending: false });

    if (previousError) {
      return new Response(JSON.stringify({ error: previousError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latestByTile = new Map<string, any>();
    (latestEdits || []).forEach((row: any) => {
      if (!latestByTile.has(row.tile_key)) {
        latestByTile.set(row.tile_key, row);
      }
    });

    const previousByTile = new Map<string, any>();
    (previousEdits || []).forEach((row: any) => {
      if (!previousByTile.has(row.tile_key)) {
        previousByTile.set(row.tile_key, row);
      }
    });

    const now = new Date().toISOString();
    const updates: any[] = [];
    let skipped = 0;

    tileKeys.forEach((tileKey) => {
      const latest = latestByTile.get(tileKey);
      if (
        !latest ||
        latest.edited_by !== user.id ||
        String(latest.edited_at) < cutoff
      ) {
        skipped += 1;
        return;
      }
      const previous = previousByTile.get(tileKey);
      const payload = previous ? previous.payload : { __clear: true };
      updates.push({
        map_id: mapId,
        tile_key: tileKey,
        payload,
        updated_at: now,
        updated_by: user.id,
      });
    });

    if (!updates.length) {
      return new Response(JSON.stringify({ reverted: 0, skipped }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upsertError } = await adminClient
      .from("tile_overrides")
      .upsert(updates, { onConflict: "map_id,tile_key" });

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("tile_edits").insert(
      updates.map((row) => ({
        map_id: row.map_id,
        tile_key: row.tile_key,
        payload: row.payload,
        edited_by: row.updated_by,
        edited_at: now,
      }))
    );

    return new Response(
      JSON.stringify({ reverted: updates.length, skipped }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
