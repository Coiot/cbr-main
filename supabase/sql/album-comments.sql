create table if not exists public.album_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_path text not null,
  message text not null,
  username text,
  civ_label text,
  civ_primary text,
  civ_secondary text,
  flair text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists album_comments_user_page_idx
  on public.album_comments (user_id, page_path);

alter table public.album_comments enable row level security;

do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'album_comments'
      and policyname = 'Album comments are readable by everyone'
  ) then
    create policy "Album comments are readable by everyone"
      on public.album_comments
      for select
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'album_comments'
      and policyname = 'Album comments are insertable by owner'
  ) then
    create policy "Album comments are insertable by owner"
      on public.album_comments
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'album_comments'
      and policyname = 'Album comments are updatable by owner'
  ) then
    create policy "Album comments are updatable by owner"
      on public.album_comments
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
