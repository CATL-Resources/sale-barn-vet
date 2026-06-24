-- Specials-as-a-flexible-work-type groundwork (migration only).
--
-- The four special_charge.frozen_* columns were already added (idempotent here),
-- so a special can freeze its rates like a pen_work line. This migration's
-- net-new piece is barn.special_sol_charge: St. Onge's standard flat per-head cut
-- applied to every special, set in Barn Settings. Additive only, no backfill;
-- existing specials keep their stored customer_charge. The freeze trigger and
-- pen_work are untouched.
alter table public.special_charge add column if not exists frozen_vet_charge numeric;
alter table public.special_charge add column if not exists frozen_sol_charge numeric;
alter table public.special_charge add column if not exists frozen_admin_rate numeric;
alter table public.special_charge add column if not exists frozen_tax_rate numeric;

alter table public.barn add column if not exists special_sol_charge numeric;
