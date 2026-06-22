-- Lock the per-work-order frozen price once an order is finished.
--
-- Background: each pen_work copies its rate at finish time into
-- frozen_vet_charge / frozen_sol_charge / frozen_admin_rate / frozen_tax_rate.
-- The *_total columns are generated from those. The bill for a finished order
-- must never move when the rate card is edited later, and nothing should be able
-- to rewrite a finished order's copied price.
--
-- This migration does two things, IN THIS ORDER:
--   1. Backfill: fill in a copied price for any finished-but-unpriced order, so
--      no finished order is left with null totals. (Must run before the lock,
--      since the lock would otherwise reject these writes.)
--   2. Lock: a trigger that, once an order is finished, blocks any change to the
--      four frozen_* columns.

-- 1. BACKFILL ----------------------------------------------------------------
-- For every live (not deleted) order that is finished but has no copied price,
-- and that has a work type to price from, copy today's rate onto it:
--   vet/sol from the work type, admin/tax from the barn.
update public.pen_work pw
set frozen_vet_charge = wt.vet_charge,
    frozen_sol_charge = wt.sol_charge,
    frozen_admin_rate = b.admin_fee_rate,
    frozen_tax_rate   = b.sales_tax_rate
from public.work_type wt, public.barn b
where pw.work_type_id = wt.id
  and pw.barn_id = b.id
  and pw.work_complete = true
  and pw.frozen_vet_charge is null
  and pw.deleted_at is null;

-- 2. LOCK --------------------------------------------------------------------
-- Once a work order is finished, its copied (frozen) price is immutable.
-- The copy itself is still allowed at finish time: on that update the row is
-- transitioning from not-finished to finished, so OLD.work_complete is still
-- false and this guard does not fire. Every later change is blocked.
--
-- Note: this guard blocks frozen_* changes only when the row was ALREADY
-- finished. It deliberately leaves frozen_* writable on open orders so the
-- current app (which still previews into frozen_* before the code change ships)
-- keeps working until that code change lands. The dangerous case -- rewriting a
-- finished order's price -- is blocked from the moment this migration applies.
create or replace function public.lock_frozen_pen_work()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.work_complete then
    if new.frozen_vet_charge is distinct from old.frozen_vet_charge
       or new.frozen_sol_charge is distinct from old.frozen_sol_charge
       or new.frozen_admin_rate is distinct from old.frozen_admin_rate
       or new.frozen_tax_rate  is distinct from old.frozen_tax_rate then
      raise exception
        'Frozen price is locked once a work order is complete (pen_work %).', old.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_frozen on public.pen_work;
create trigger trg_lock_frozen
  before update on public.pen_work
  for each row execute function public.lock_frozen_pen_work();
