-- ============================================================
-- Foma Velo — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ------------------------------------------------------------
-- 1. Activities
-- One row per workout / ride. `id` is client-generated
-- (matches the existing app contract; CSV imports and manual
-- entries already generate unique numeric ids).
-- ------------------------------------------------------------
create table if not exists public.activities (
  id                    bigint primary key,
  user_id               uuid not null references auth.users (id) on delete cascade,
  strava_activity_id    text,
  date_millis           bigint not null,
  name                  text not null default 'Workout',
  type                  text not null default 'Ride',
  moving_time_sec       integer not null default 0,
  elapsed_time_sec      integer not null default 0,
  distance_meters       double precision not null default 0,
  elevation_gain_meters double precision not null default 0,
  avg_watts             double precision,
  max_watts             double precision,
  weighted_watts        double precision,
  avg_hr                double precision,
  max_hr                double precision,
  kilojoules            double precision,
  strava_tss            double precision,
  is_planned            boolean not null default false,
  is_manual             boolean not null default false,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.activities is 'Cycling activities & planned workouts. Scoped per auth.users row.';

create index if not exists activities_user_date_idx
  on public.activities (user_id, date_millis desc);

create index if not exists activities_user_strava_idx
  on public.activities (user_id, strava_activity_id)
  where strava_activity_id is not null;

-- ------------------------------------------------------------
-- 2. User settings (one row per athlete)
-- ------------------------------------------------------------
create table if not exists public.user_settings (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  ftp               integer not null default 250,
  lthr              integer not null default 168,
  max_hr            integer not null default 190,
  weight_kg         double precision not null default 72.0,
  calculation_mode  text not null default 'AUTO',
  ctl_days          integer not null default 42,
  atl_days          integer not null default 7,
  setup_done        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. updated_at maintenance trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists activities_set_updated_at on public.activities;
create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. Auto-create a settings row on signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 5. Row Level Security
-- ------------------------------------------------------------
alter table public.activities    enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "activities_select_own" on public.activities;
create policy "activities_select_own"
  on public.activities for select
  using (auth.uid() = user_id);

drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own"
  on public.activities for insert
  with check (auth.uid() = user_id);

drop policy if exists "activities_update_own" on public.activities;
create policy "activities_update_own"
  on public.activities for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "activities_delete_own" on public.activities;
create policy "activities_delete_own"
  on public.activities for delete
  using (auth.uid() = user_id);

drop policy if exists "settings_select_own" on public.user_settings;
create policy "settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.user_settings;
create policy "settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.user_settings;
create policy "settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "settings_delete_own" on public.user_settings;
create policy "settings_delete_own"
  on public.user_settings for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. Realtime (live sync across tabs/devices)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'activities'
  ) then
    alter publication supabase_realtime add table public.activities;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'user_settings'
  ) then
    alter publication supabase_realtime add table public.user_settings;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 6b. Strava Daily Scraper Connections (one row per athlete)
-- ------------------------------------------------------------
create table if not exists public.strava_connections (
  user_id                         uuid primary key references auth.users (id) on delete cascade,
  strava_email                    text,
  strava_password_encrypted       text,
  strava_session_cookies          jsonb,
  supabase_access_token_encrypted text,
  athlete_id                      text,
  sync_enabled                    boolean not null default true,
  last_sync_at                    timestamptz,
  last_sync_status                text not null default 'idle',
  last_sync_error                 text,
  last_synced_count               integer not null default 0,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

drop trigger if exists strava_connections_set_updated_at on public.strava_connections;
create trigger strava_connections_set_updated_at
  before update on public.strava_connections
  for each row execute function public.set_updated_at();

alter table public.strava_connections enable row level security;

drop policy if exists "strava_connections_select_own" on public.strava_connections;
create policy "strava_connections_select_own"
  on public.strava_connections for select
  using (auth.uid() = user_id);

drop policy if exists "strava_connections_insert_own" on public.strava_connections;
create policy "strava_connections_insert_own"
  on public.strava_connections for insert
  with check (auth.uid() = user_id);

drop policy if exists "strava_connections_update_own" on public.strava_connections;
create policy "strava_connections_update_own"
  on public.strava_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "strava_connections_delete_own" on public.strava_connections;
create policy "strava_connections_delete_own"
  on public.strava_connections for delete
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'strava_connections'
  ) then
    alter publication supabase_realtime add table public.strava_connections;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 7. Helper: delete all of the caller's data (GDPR / "wipe")
--    Call from Supabase: select public.delete_my_data();
-- ------------------------------------------------------------
create or replace function public.delete_my_data()
returns void
language sql
security definer set search_path = public
as $$
  delete from public.activities where user_id = auth.uid();
  delete from public.user_settings where user_id = auth.uid();
  delete from public.strava_connections where user_id = auth.uid();
$$;
