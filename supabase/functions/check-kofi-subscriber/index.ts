import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createSupporterHandler } from "./handler.mjs";

serve(createSupporterHandler({ createClient, env: (name: string) => Deno.env.get(name) }));
