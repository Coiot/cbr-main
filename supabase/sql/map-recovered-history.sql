-- Private source approval is distinct from the public episode endpoint.
begin;
alter table public.map_releases add column if not exists event_gaps_accepted boolean not null default false;

create or replace function public.publish_map_release(p_actor uuid,p_release text,p_expected text)
returns void language plpgsql security definer set search_path='' as $$
declare current_release text; target public.map_releases;
begin
  if p_actor is distinct from '88c12d80-cdc8-44cf-a174-a75c63bb5936'::uuid then
    raise exception 'Only Coiot can publish.' using errcode='42501';
  end if;
  select active_release into current_release from public.map_release_control where map_id='s5' for update;
  if current_release is distinct from p_expected then raise exception 'Publication changed. Reload and review again.'; end if;
  select * into strict target from public.map_releases where id=p_release;
  if current_release is not null and target.history<>(select history from public.map_releases where id=current_release) then
    raise exception 'Changing game history requires a separate reviewed migration.';
  end if;
  if target.first_turn<>0 or not exists(select 1 from jsonb_array_elements(target.bookmarks) b where (b->>'turn')::integer=target.last_turn) then
    raise exception 'Publish a bounded episode from turn zero, not the full private source.';
  end if;
  update public.map_releases set published_at=coalesce(published_at,now()) where id=p_release;
  update public.map_release_control set active_release=p_release,enabled=true,updated_at=now() where map_id='s5';
  insert into public.map_publication_log(previous_release,release_id,actor) values(current_release,p_release,p_actor);
end $$;
revoke all on function public.publish_map_release(uuid,text,text) from public,anon,authenticated;
grant execute on function public.publish_map_release(uuid,text,text) to service_role;
commit;
