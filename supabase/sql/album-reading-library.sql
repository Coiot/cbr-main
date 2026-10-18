-- Account-owned reading status. Existing bookmarks remain independent.
begin;
create table if not exists public.album_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  page_path text not null,
  bookmark_scene integer,
  resume_scene integer,
  updated_at timestamptz default now(),
  primary key (user_id, page_path)
);
alter table public.album_progress add column if not exists reading_status text;
update public.album_progress
set reading_status = case when greatest(coalesce(resume_scene, 0), coalesce(bookmark_scene, 0)) > 0 then 'in_progress' else 'not_started' end
where reading_status is null;
alter table public.album_progress alter column reading_status set default 'not_started';
alter table public.album_progress alter column reading_status set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.album_progress'::regclass and conname = 'album_progress_reading_status_check') then
    alter table public.album_progress add constraint album_progress_reading_status_check
      check (reading_status in ('not_started', 'in_progress', 'finished'));
  end if;
end $$;

create or replace function public.track_album_reading_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.reading_status = 'not_started'
      and greatest(coalesce(new.resume_scene, 0), coalesce(new.bookmark_scene, 0)) > 0 then
      new.reading_status := 'in_progress';
    end if;
  elsif new.reading_status is not distinct from old.reading_status
    and ((new.resume_scene is distinct from old.resume_scene and coalesce(new.resume_scene, 0) > 0)
      or (new.bookmark_scene is distinct from old.bookmark_scene and coalesce(new.bookmark_scene, 0) > 0))
    and new.reading_status <> 'finished' then
    new.reading_status := 'in_progress';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists track_album_reading_status on public.album_progress;
create trigger track_album_reading_status before insert or update on public.album_progress
for each row execute function public.track_album_reading_status();

alter table public.album_progress enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='album_progress' and policyname='album_progress_select_own') then
    create policy album_progress_select_own on public.album_progress for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='album_progress' and policyname='album_progress_insert_own') then
    create policy album_progress_insert_own on public.album_progress for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='album_progress' and policyname='album_progress_update_own') then
    create policy album_progress_update_own on public.album_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
grant select, insert, update on public.album_progress to authenticated;
notify pgrst, 'reload schema';
commit;
