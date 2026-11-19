import { createClient } from 'npm:@supabase/supabase-js@2';
import { createMapReleaseHandler } from './handler.mjs';
import { createMapDelivery } from './delivery.mjs';
const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
  auth:{persistSession:false,autoRefreshToken:false}
});
// Enable the editor layer only after its separate database migration is approved.
const delivery=createMapDelivery({
  storageUrl:Deno.env.get('CBR_MAP_CDN_STORAGE_URL'),
  storageKey:Deno.env.get('CBR_MAP_CDN_STORAGE_KEY'),
  secret:Deno.env.get('CBR_MAP_CDN_SECRET')
});
Deno.serve(createMapReleaseHandler(client,{detailsEnabled:false,delivery}));
