-- Groundwork for the custom-price "Special" work type (schema + seed only; no
-- feature code). Merges before the specials feature that uses it.

-- 1. A work type can be flagged "type the price each time".
alter table public.work_type add column if not exists is_custom_price boolean not null default false;

-- 2. A job can carry the special's label. Nullable at the DB level — it's only
--    required in the UI when the chosen work type is custom-price.
alter table public.pen_work add column if not exists special_label text;

-- 3. Seed the 'Special' work type for the (single) barn, only if it doesn't
--    already have one. The price is typed per job, so vet_charge is a 0
--    placeholder; SOL is the barn's standard special SOL.
insert into public.work_type (barn_id, name, is_custom_price, vet_charge, sol_charge, active)
select b.id, 'Special', true, 0, coalesce(b.special_sol_charge, 0), true
from public.barn b
where not exists (
  select 1 from public.work_type wt where wt.barn_id = b.id and wt.name = 'Special'
);
