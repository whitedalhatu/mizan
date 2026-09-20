-- =====================================================================
-- MIZAN — Stage 2a: segments + the scheduled-plays shape
--
-- A campaign has one or more SEGMENTS (AdMaster-style). Each segment is a
-- scheduling pattern: a date sub-range, weekdays, an hour window, which
-- material(s) rotate, and how many plays. Generating the schedule (Stage 2b)
-- walks the segments and writes scheduled_plays.
--
-- This migration creates the tables and the scheduled_plays shape (with the
-- intended/actual/shift fields for the cascade rule). The placement ENGINE that
-- fills scheduled_plays comes in Stage 2b.
-- =====================================================================

-- ---------------------------------------------------------------------
-- segments — a campaign's scheduling patterns
-- ---------------------------------------------------------------------
create table if not exists public.segments (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  name          text not null default 'Segment',

  -- Date sub-range (must sit within the campaign's own dates; enforced in the app).
  start_date    date not null,
  end_date      date not null,

  -- Weekdays this segment runs (Mon..Sun).
  runs_mon boolean not null default true,
  runs_tue boolean not null default true,
  runs_wed boolean not null default true,
  runs_thu boolean not null default true,
  runs_fri boolean not null default true,
  runs_sat boolean not null default false,
  runs_sun boolean not null default false,

  -- Hour window (the manual time range — no dayparts). e.g. 05:00–11:59.
  hour_from     time not null default '00:00',
  hour_to       time not null default '23:59',

  -- How many plays. Either per active day, or spread across the whole segment.
  plays_count   integer not null check (plays_count > 0),
  plays_basis   text not null default 'per_day' check (plays_basis in ('per_day', 'per_segment')),

  created_at    timestamptz not null default now()
);
create index if not exists segments_campaign_idx on public.segments (campaign_id);

comment on table public.segments is
  'A campaign scheduling pattern: date sub-range, weekdays, hour window, material '
  'rotation and play count. Generating the schedule walks these to write '
  'scheduled_plays.';

-- Which materials rotate in a segment (a segment can rotate several).
create table if not exists public.segment_materials (
  segment_id   uuid not null references public.segments(id) on delete cascade,
  material_id  uuid not null references public.materials(id) on delete restrict,
  position     integer not null default 0,    -- rotation order
  primary key (segment_id, material_id)
);

-- Optional: specific eligible breaks for a segment. If none listed, all breaks
-- on the station within the hour window are eligible (the default).
create table if not exists public.segment_breaks (
  segment_id   uuid not null references public.segments(id) on delete cascade,
  break_id     uuid not null references public.commercial_breaks(id) on delete cascade,
  primary key (segment_id, break_id)
);

-- ---------------------------------------------------------------------
-- scheduled_plays — one row per intended airing (filled by the Stage 2b engine)
--
-- Carries INTENDED vs ACTUAL placement so a spot moved out of its ideal window
-- (Decision 3 cascade) is recorded as played-but-shifted, not a miss.
-- ---------------------------------------------------------------------
create table if not exists public.scheduled_plays (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references public.campaigns(id) on delete cascade,
  segment_id     uuid not null references public.segments(id) on delete cascade,
  material_id    uuid not null references public.materials(id) on delete restrict,

  play_date      date not null,

  -- Intended: the hour window the segment asked for.
  intended_from  time not null,
  intended_to    time not null,

  -- Actual placement: the break it was put in, and that break's clock time.
  break_id       uuid references public.commercial_breaks(id) on delete set null,
  actual_time    time,

  -- Shift bookkeeping (Decision 3): true when the actual break falls outside the
  -- intended window; reason explains why (e.g. "no capacity in window").
  shifted        boolean not null default false,
  shift_reason   text,

  -- Airing state (confirmed manually until Stage 6, then from playout).
  -- 'scheduled' → not yet aired; 'aired' → confirmed; 'missed' → did not air.
  air_state      text not null default 'scheduled' check (air_state in ('scheduled', 'aired', 'missed')),
  aired_at       timestamptz,

  created_at     timestamptz not null default now()
);
create index if not exists scheduled_plays_campaign_idx on public.scheduled_plays (campaign_id);
create index if not exists scheduled_plays_segment_idx on public.scheduled_plays (segment_id);
create index if not exists scheduled_plays_date_idx on public.scheduled_plays (play_date);
create index if not exists scheduled_plays_break_idx on public.scheduled_plays (break_id, play_date);

comment on table public.scheduled_plays is
  'One row per intended airing. intended_* is the segment''s asked-for window; '
  'break_id/actual_time is where it landed; shifted/shift_reason record a move '
  'outside the window (Decision 3) so it reads as played-but-shifted, not a miss.';

-- ---------------------------------------------------------------------
-- RLS — any authenticated user (as prior stages).
-- ---------------------------------------------------------------------
alter table public.segments          enable row level security;
alter table public.segment_materials enable row level security;
alter table public.segment_breaks    enable row level security;
alter table public.scheduled_plays   enable row level security;

create policy sg_all on public.segments          for all to authenticated using (true) with check (true);
create policy sm_all on public.segment_materials for all to authenticated using (true) with check (true);
create policy sb_all on public.segment_breaks    for all to authenticated using (true) with check (true);
create policy sp_all on public.scheduled_plays   for all to authenticated using (true) with check (true);
