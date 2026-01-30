alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists can_edit boolean default false;

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "User settings are readable by owner" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "User settings are insertable by owner" on public.user_settings
  for insert with check (auth.uid() = user_id);

create policy "User settings are updatable by owner" on public.user_settings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
