-- =====================================================================
-- MIZAN — Stage 1: customers, campaigns, materials
--
-- Standalone campaign recording (no ECIRS connection yet — that is Stage 4).
-- Builds on Stage 0's stations, breaks and customer_categories.
--
--   customers  — advertisers, each with a category (drives the competition rule
--                later: two customers in the same category can't share a break).
--                ECIRS clients map onto these at Stage 4.
--   materials  — the audio a campaign airs. MIZAN STORES the file (Supabase
--                storage bucket 'materials') so it can push it to playout at
--                Stage 6, plus its details (duration, cart number). A campaign
--                can have several.
--   campaigns  — an order: customer, station, run dates, competition handling.
--                Auto-numbered. One station per campaign for now.
--
-- Nothing schedules yet — that is Stage 2. This is the record-keeping foundation.
-- =====================================================================

-- customers ------------------------------------------------------------
create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category_id  uuid references public.customer_categories(id) on delete set null,
  source       text not null default 'mizan' check (source in ('mizan', 'ecirs')),
  ecirs_client_id uuid,
  contact_name text,
  contact_phone text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create unique index if not exists customers_name_uk on public.customers (lower(name));
create index if not exists customers_category_idx on public.customers (category_id);
comment on table public.customers is
  'Advertisers. Category drives the competition rule (same category = competitors, '
  'kept out of the same break from Stage 2). Mapped from ECIRS clients at Stage 4.';

-- materials ------------------------------------------------------------
create table if not exists public.materials (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  duration_secs integer not null check (duration_secs > 0),
  cart_number   text,
  audio_path    text,          -- path within the 'materials' storage bucket
  created_at    timestamptz not null default now()
);
comment on table public.materials is
  'The audio a campaign airs. MIZAN stores the file (audio_path in the materials '
  'bucket) so it can push it to playout at Stage 6; cart_number is the playout''s '
  'own reference once the file is loaded there.';

-- campaigns ------------------------------------------------------------
create sequence if not exists public.campaign_number_seq start 2000;

create table if not exists public.campaigns (
  id             uuid primary key default gen_random_uuid(),
  number         integer not null default nextval('public.campaign_number_seq'),
  name           text not null,
  customer_id    uuid not null references public.customers(id) on delete restrict,
  station_id     uuid not null references public.stations(id) on delete restrict,
  start_date     date not null,
  end_date       date not null,
  competition_mode text not null default 'auto' check (competition_mode in ('auto', 'manual', 'none')),
  status         text not null default 'draft' check (status in ('draft', 'active', 'completed', 'cancelled')),
  created_at     timestamptz not null default now()
);
create unique index if not exists campaigns_number_uk on public.campaigns (number);
create index if not exists campaigns_station_idx on public.campaigns (station_id);
create index if not exists campaigns_customer_idx on public.campaigns (customer_id);
comment on table public.campaigns is
  'An order to air. Auto-numbered from campaign_number_seq. One station per '
  'campaign for now. Scheduling (segments, plays, placement) comes at Stage 2.';

create table if not exists public.campaign_materials (
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  material_id  uuid not null references public.materials(id) on delete restrict,
  primary key (campaign_id, material_id)
);

create table if not exists public.campaign_competitors (
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  competitor_customer_id uuid not null references public.customers(id) on delete cascade,
  primary key (campaign_id, competitor_customer_id)
);

-- RLS — Stage 1: any authenticated user (as Stage 0). Finer roles later.
alter table public.customers            enable row level security;
alter table public.materials            enable row level security;
alter table public.campaigns            enable row level security;
alter table public.campaign_materials   enable row level security;
alter table public.campaign_competitors enable row level security;

create policy cu_all on public.customers            for all to authenticated using (true) with check (true);
create policy ma_all on public.materials            for all to authenticated using (true) with check (true);
create policy ca_all on public.campaigns            for all to authenticated using (true) with check (true);
create policy cm_all on public.campaign_materials   for all to authenticated using (true) with check (true);
create policy cc_all on public.campaign_competitors for all to authenticated using (true) with check (true);

-- Storage bucket for material audio.
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

create policy "materials read"   on storage.objects for select to authenticated using (bucket_id = 'materials');
create policy "materials write"  on storage.objects for insert to authenticated with check (bucket_id = 'materials');
create policy "materials update" on storage.objects for update to authenticated using (bucket_id = 'materials');
create policy "materials delete" on storage.objects for delete to authenticated using (bucket_id = 'materials');
