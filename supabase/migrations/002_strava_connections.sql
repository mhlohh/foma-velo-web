-- ============================================================
-- Migration 002: Strava Daily Scraper Connections
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table if not exists public.strava_connections (
  user_id                   uuid primary key references auth.users (id) on delete cascade,
  strava_email              text,
  strava_password_encrypted text,
  strava_session_cookies    jsonb,
  athlete_id                text,
  sync_enabled              boolean not null default true,
  last_sync_at              timestamptz,
  last_sync_status          text not null default 'idle',
  last_sync_error           text,
  last_synced_count         integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.strava_connections is
  'Per-user Strava scraper credentials (AES-256-GCM encrypted), cached Playwright session cookies, and daily sync status.';

drop trigger if exists strava_connections_set_updated_at on public.strava_connections;
create trigger strava_connections_set_updated_at
  before update on public.strava_connections
  for each row execute function public.set_updated_at();

alter table public.strava_connections enable row level security;

drop policy if exists "strava_connections_select_own" on public.strava_connections;
create policy "strava_connections_select_own"
  on public.strava_connections for select
  using (auth.uid() = user_id);

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
