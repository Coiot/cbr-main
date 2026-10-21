-- Pending local/staging migration only. No publication occurs on installation.
-- Apply after map-official-timeline.sql. The full source stays in the private bucket.
begin;
alter table public.map_release_control add column if not exists source_release text references public.map_releases(id);
create or replace function public.set_map_timeline_source(p_actor uuid,p_source text)
returns void language plpgsql security definer set search_path='' as $$
declare control public.map_release_control; source public.map_releases; current public.map_releases;
begin
  if p_actor is distinct from '88c12d80-cdc8-44cf-a174-a75c63bb5936'::uuid then raise exception 'Only Coiot can manage timeline sources.' using errcode='42501'; end if;
  select * into strict control from public.map_release_control where map_id='s5' for update;
  select * into strict source from public.map_releases where id=p_source;
  if control.active_release is not null then
    select * into strict current from public.map_releases where id=control.active_release;
    if source.history<>current.history or source.last_turn<current.last_turn then raise exception 'The source must match the published game and cover its endpoint.'; end if;
  end if;
  update public.map_release_control set source_release=p_source where map_id='s5';
end $$;
revoke all on function public.set_map_timeline_source(uuid,text) from public,anon,authenticated;
grant execute on function public.set_map_timeline_source(uuid,text) to service_role;
create or replace function public.publish_map_episode(p_actor uuid,p_source text,p_release text,p_expected text)
returns void language plpgsql security definer set search_path='' as $$
declare control public.map_release_control; source public.map_releases; target public.map_releases;
begin
  if p_actor is distinct from '88c12d80-cdc8-44cf-a174-a75c63bb5936'::uuid then raise exception 'Only Coiot can publish endpoints.' using errcode='42501'; end if;
  select * into strict control from public.map_release_control where map_id='s5' for update;
  if control.source_release is distinct from p_source or control.active_release is distinct from p_expected then raise exception 'The timeline changed. Reload before publishing.'; end if;
  select * into strict source from public.map_releases where id=p_source;
  select * into strict target from public.map_releases where id=p_release;
  if target.history<>source.history or target.first_turn<>source.first_turn or target.last_turn>source.last_turn then raise exception 'The episode exceeds its checked source history.'; end if;
  perform public.publish_map_release(p_actor,p_release,p_expected);
end $$;
revoke all on function public.publish_map_episode(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.publish_map_episode(uuid,text,text,text) to service_role;
commit;
