-- Extend existing scene collections to power-ranking albums. No ownership or access changes.
begin;
create or replace function public.valid_collection_scenes(scenes jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb;
begin
  if jsonb_typeof(scenes) is distinct from 'array' or jsonb_array_length(scenes)>100 then return false; end if;
  for s in select value from jsonb_array_elements(scenes) loop
    if jsonb_typeof(s) is distinct from 'object'
      or coalesce(s->>'path','') !~ '^/albums/(s[0-9]+/[A-Za-z0-9._-]+|pr/s[0-9]+pr[0-9]+)/$'
      or jsonb_typeof(s->'number') is distinct from 'number'
      or coalesce(s->>'number','') !~ '^[1-9][0-9]{0,4}$'
      or (s ? 'note' and (jsonb_typeof(s->'note') is distinct from 'string' or length(s->>'note')>400))
      or exists(select 1 from jsonb_object_keys(s) k where k not in ('path','number','note')) then return false; end if;
  end loop;
  return jsonb_array_length(scenes)=(select count(distinct (entry.value->>'path',entry.value->>'number')) from jsonb_array_elements(scenes) entry);
end $$;
notify pgrst,'reload schema';
commit;
