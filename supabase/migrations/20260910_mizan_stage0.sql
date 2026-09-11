-- =====================================================================
-- MIZAN — Stage 0 foundation schema
--
-- MIZAN is a standalone broadcast traffic/scheduling system. It runs on its own
-- Supabase project, its own deployment, its own domain, and connects to ECIRS
-- (and to playout systems) through adapters — never by sharing a database.
--
-- Stage 0 establishes the ground everything else stands on:
--   * platform_settings  — MIZAN's own identity + brand colours (operator-set),
--                          same pattern as ECIRS, plus the ECIRS-connection slot
--   * stations           — station identity + a playout connection (MIZAN's
--                          unique job). Identity is typed in when standalone, or
--                          filled from ECIRS via the adapter later.
--   * commercial_breaks  — the day's breaks, built manually by the operator
--   * customer_categories— business categories (Telecoms, Banks…) used later to
--                          keep competing advertisers out of the same break
--
-- Nothing here schedules or airs anything yet — that is Stage 1+. This is
-- deliberately just the durable foundation.
-- =====================================================================

-- Everyone who touches MIZAN is authenticated; RLS below keeps it simple for
-- Stage 0 (any signed-in user can read/write). Finer roles come with the
-- campaign/scheduling stages, mirroring how ECIRS layered its roles in.

create schema if not exists app;

-- ---------------------------------------------------------------------
-- platform_settings — one row, MIZAN's own identity and look.
-- ---------------------------------------------------------------------
create table if not exists public.platform_settings (
  id            boolean primary key default true,
  constraint platform_settings_singleton check (id),

  org_name      text not null default 'MIZAN',

  -- Brand colours, operator-configurable, applied at runtime (see the root
  -- layout). Distinct defaults from ECIRS so the two are visually different.
  primary_color text not null default '#1E3A5F'
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color  text not null default '#C77D1A'
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),

  -- ECIRS connection (the adapter, wired at Stage 4). Stored here so the
  -- settings page can hold it from the start; unused until then.
  ecirs_url         text,
  ecirs_api_key     text,
  ecirs_connected   boolean not null default false,
  -- When true and connected, MIZAN inherits ECIRS's brand colours instead of
  -- its own (the "adapt when connected" behaviour requested).
  inherit_ecirs_theme boolean not null default false
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

comment on table public.platform_settings is
  'Single-row MIZAN configuration: organisation name, brand colours (applied at '
  'runtime), and the ECIRS connection slot used by the Stage 4 adapter.';

-- ---------------------------------------------------------------------
-- stations — identity + playout connection.
--
-- A MIZAN station is "station identity + a way to reach its playout system".
-- Identity may be typed here (standalone) or imported from ECIRS later; the
-- playout connection is always MIZAN's own responsibility.
-- ---------------------------------------------------------------------
create table if not exists public.stations (
  id              uuid primary key default gen_random_uuid(),

  -- Identity
  code            text not null check (code ~ '^[A-Z]{2,4}$'),
  name            text not null,
  frequency       text,

  -- Where the identity came from: 'mizan' (typed here) or 'ecirs' (imported).
  -- Import mapping is Stage 4; for now everything is 'mizan'.
  identity_source text not null default 'mizan'
    check (identity_source in ('mizan', 'ecirs')),
  ecirs_station_id uuid,   -- set when imported, links back to the ECIRS station

  -- Playout connection — MIZAN's unique job. The TYPE decides what the other
  -- fields mean. RadioBOSS first; the structure is open for more systems.
  playout_type    text not null default 'none'
    check (playout_type in ('none', 'radioboss', 'other')),
  -- Free-form connection details for the chosen type (a folder path, an API
  -- endpoint, credentials…). Kept as JSON so each playout type can carry what
  -- it needs without a schema change. Populated now, ACTIVATED at Stage 6.
  playout_config  jsonb not null default '{}'::jsonb,
  playout_status  text not null default 'not_configured'
    check (playout_status in ('not_configured', 'configured', 'live', 'error')),

  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create unique index if not exists stations_code_uk on public.stations (upper(code));

comment on table public.stations is
  'Broadcast stations. Identity typed here or imported from ECIRS; the playout '
  'connection is MIZAN''s own and drives airing confirmation from Stage 6.';
comment on column public.stations.playout_config is
  'Connection details for playout_type. Shape depends on the type; stored now, '
  'used to read the as-run log at Stage 6.';

-- ---------------------------------------------------------------------
-- commercial_breaks — the day's breaks, built manually.
--
-- The operator defines the breaks (their time, their length). Campaigns are
-- placed into these from Stage 2. A break belongs to a station and recurs at a
-- clock time; duration bounds how much ad content it can hold.
-- ---------------------------------------------------------------------
create table if not exists public.commercial_breaks (
  id            uuid primary key default gen_random_uuid(),
  station_id    uuid not null references public.stations(id) on delete cascade,

  name          text not null,                 -- e.g. "Morning drive break"
  start_time    time not null,                 -- clock time, e.g. 05:55
  duration_secs integer not null check (duration_secs > 0),  -- capacity

  -- Which days this break runs. Stored as a 7-bool set (Mon..Sun) so a break
  -- can be weekday-only, daily, etc.
  runs_mon boolean not null default true,
  runs_tue boolean not null default true,
  runs_wed boolean not null default true,
  runs_thu boolean not null default true,
  runs_fri boolean not null default true,
  runs_sat boolean not null default true,
  runs_sun boolean not null default true,

  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists breaks_station_idx on public.commercial_breaks (station_id, start_time);

comment on table public.commercial_breaks is
  'Operator-defined commercial breaks per station. Capacity is duration_secs; '
  'campaign spots are auto-placed into these from Stage 2.';

-- ---------------------------------------------------------------------
-- customer_categories — business categories for competition separation.
-- ---------------------------------------------------------------------
create table if not exists public.customer_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                    -- Telecoms, Banks, Detergent…
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index if not exists categories_name_uk on public.customer_categories (lower(name));

comment on table public.customer_categories is
  'Business categories. Two customers in the same category are competitors and '
  '(from Stage 2) will not be placed in the same break.';

-- ---------------------------------------------------------------------
-- Row-level security — Stage 0: any authenticated user may read/write.
-- Finer roles arrive with later stages.
-- ---------------------------------------------------------------------
alter table public.platform_settings   enable row level security;
alter table public.stations            enable row level security;
alter table public.commercial_breaks   enable row level security;
alter table public.customer_categories enable row level security;

create policy ps_all on public.platform_settings   for all to authenticated using (true) with check (true);
create policy st_all on public.stations            for all to authenticated using (true) with check (true);
create policy br_all on public.commercial_breaks   for all to authenticated using (true) with check (true);
create policy ct_all on public.customer_categories for all to authenticated using (true) with check (true);
