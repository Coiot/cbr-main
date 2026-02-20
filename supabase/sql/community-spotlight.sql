create index if not exists album_reactions_page_scene_reaction_idx
  on public.album_reactions (page_path, scene_number, reaction_key);

create or replace view public.album_reaction_spotlight as
select
  ar.page_path,
  ar.scene_number,
  lower(
    regexp_replace(coalesce(ar.reaction_key, ''), '[[:space:]_-]+', '', 'g')
  ) as reaction_key,
  count(*)::bigint as reaction_count
from public.album_reactions ar
where ar.page_path like '/albums/%'
  and ar.scene_number is not null
group by
  ar.page_path,
  ar.scene_number,
  lower(
    regexp_replace(coalesce(ar.reaction_key, ''), '[[:space:]_-]+', '', 'g')
  );

grant select on public.album_reaction_spotlight to anon, authenticated, service_role;
