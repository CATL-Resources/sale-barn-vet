-- Specials-as-a-flexible-work-type (migration only): mirror pen_work's frozen_*
-- rate snapshot columns onto special_charge so a special can freeze its rate the
-- same way a pen_work line does. Additive only — no backfill, no feature code,
-- and the freeze trigger and pen_work are untouched.
--
-- Existing specials keep their stored customer_charge as their bill. The feature
-- step that follows will set these frozen_* snapshots at creation and compute
-- vet_total / admin_total / sol_total / customer_charge from them × head, then
-- store the results (stored = naturally frozen).
alter table public.special_charge add column if not exists frozen_vet_charge numeric;
alter table public.special_charge add column if not exists frozen_sol_charge numeric;
alter table public.special_charge add column if not exists frozen_admin_rate numeric;
alter table public.special_charge add column if not exists frozen_tax_rate numeric;
