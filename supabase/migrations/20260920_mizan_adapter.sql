-- =====================================================================
-- MIZAN side of the ECIRS adapter (Stage 4b)
--
-- customers.ecirs_client_id and .source already exist (Stage 1). This adds the
-- contract link + per-spot rate on campaigns, so:
--   * a campaign brought in from ECIRS remembers which contract it came from
--     (airing proof is pushed back against that contract), and
--   * a campaign can carry a per-spot rate (from the ECIRS line, or a customer's
--     standing rate later) for the Certificate's value figure.
-- =====================================================================

alter table public.campaigns
  add column if not exists ecirs_contract_id uuid;

-- Per-spot rate for the certificate's money figure. Nullable — set when brought
-- in from an ECIRS contract, or (Stage 5) from a customer standing rate.
alter table public.campaigns
  add column if not exists spot_rate numeric(14,2);

comment on column public.campaigns.ecirs_contract_id is
  'The ECIRS contract this campaign was brought in from, if any. Airing proof is '
  'pushed back to ECIRS against this contract.';
comment on column public.campaigns.spot_rate is
  'Per-spot rate for the Certificate value. From the ECIRS contract line when '
  'brought in; or a standing rate for agency bill-after campaigns (Stage 5).';

-- A standing per-spot rate on a customer (for agency bill-after campaigns).
-- Added now so the column exists; used at Stage 5.
alter table public.customers
  add column if not exists standing_spot_rate numeric(14,2);
