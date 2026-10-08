-- =====================================================================
-- MIZAN — Stage 6 Phase 1: playout reconciliation + agent connection
--
-- The station agent (built in Phase 2) authenticates with a per-platform key
-- and calls two endpoints: one to fetch a station's schedule (M3U + mp3 list),
-- one to post RadioBOSS's as-run CSV back for reconciliation. Phase 1 builds the
-- endpoints + the reconciliation brain, testable now via a manual CSV upload.
-- =====================================================================

-- Agent connection key (the station agent presents X-MIZAN-AGENT-KEY).
alter table public.platform_settings
  add column if not exists agent_key text;
alter table public.platform_settings
  add column if not exists agent_enabled boolean not null default false;

comment on column public.platform_settings.agent_key is
  'Shared key the station desktop agent presents (X-MIZAN-AGENT-KEY) to fetch '
  'schedules and post RadioBOSS as-run logs. Generated in Settings.';

-- A record of each reconciliation run, for an audit trail.
create table if not exists public.reconciliation_runs (
  id            uuid primary key default gen_random_uuid(),
  station_id    uuid references public.stations(id) on delete set null,
  log_date      date,
  entries_count integer not null default 0,
  matched_count integer not null default 0,
  missed_count  integer not null default 0,
  unmatched_count integer not null default 0,
  source        text not null default 'upload' check (source in ('upload', 'agent')),
  created_at    timestamptz not null default now()
);
create index if not exists recon_runs_station_idx on public.reconciliation_runs (station_id, log_date);

alter table public.reconciliation_runs enable row level security;
create policy rr_all on public.reconciliation_runs for all to authenticated using (true) with check (true);
