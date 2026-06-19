-- Work-order origin + special-charge link (additive; mirrors existing conventions).

-- Tie a one-off charge to a specific work order. It still rolls up to its party;
-- this just also points it at the pen_work it belongs to.
alter table public.special_charge
  add column if not exists pen_work_id uuid references public.pen_work(id) on delete set null;
create index if not exists special_charge_pen_work_id_idx on public.special_charge (pen_work_id);

-- The consignor location the cattle came from, for a work order.
alter table public.pen_work
  add column if not exists origin_location_id uuid references public.party_location(id) on delete set null;
create index if not exists pen_work_origin_location_id_idx on public.pen_work (origin_location_id);
