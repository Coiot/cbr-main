import { createClient } from 'npm:@supabase/supabase-js@2';
import { createMapReleaseHandler } from './handler.mjs';
const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
  auth:{persistSession:false,autoRefreshToken:false}
});
// Enable the editor layer only after its separate database migration is approved.
Deno.serve(createMapReleaseHandler(client,{detailsEnabled:false}));
