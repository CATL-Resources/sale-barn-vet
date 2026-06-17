-- PEN: a physical location. Lightweight, reused, contents change through the day.
create table public.pen (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  sale_day_id uuid references public.sale_day(id) on delete cascade,
  pen_number text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

-- PEN_WORK: the real unit. One pen + one work type + one owner + counts + status, billed and frozen here.
create table public.pen_work (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  sale_day_id uuid not null references public.sale_day(id) on delete cascade,
  pen_id uuid references public.pen(id) on delete set null,

  -- owner: exactly one side is set (seller pre-sale, buyer post-sale)
  seller_party_id uuid references public.party(id) on delete set null,
  buyer_party_id uuid references public.party(id) on delete set null,
  buyer_number_text text,
  buyer_number_id uuid references public.buyer_number(id) on delete set null,
  destination text,
  destination_state text,

  -- what work, and the rate frozen at work time
  work_type_id uuid references public.work_type(id) on delete set null,
  animal_type_id uuid references public.animal_type(id) on delete set null,

  -- the three point-in-time counts; office bills on head_worked
  head_started integer,    -- came into the pen
  head_expected integer,   -- supposed to be in the pen
  head_returned integer,   -- put back after working (may differ after sorting)
  head_worked integer,     -- THE BILLABLE NUMBER (work done to this many)

  -- frozen price snapshot (copied at work time; re-sorting never alters it)
  frozen_vet_charge numeric,
  frozen_sol_charge numeric,
  frozen_admin_rate numeric,
  frozen_tax_rate numeric,
  vet_total numeric generated always as
    (frozen_vet_charge * head_worked * (1 + frozen_tax_rate)) stored,
  admin_total numeric generated always as
    (frozen_vet_charge * head_worked * (1 + frozen_tax_rate) * frozen_admin_rate) stored,
  sol_total numeric generated always as
    (frozen_sol_charge * head_worked) stored,
  total_customer_charge numeric generated always as
    (frozen_vet_charge * head_worked * (1 + frozen_tax_rate)
     + frozen_vet_charge * head_worked * (1 + frozen_tax_rate) * frozen_admin_rate
     + frozen_sol_charge * head_worked) stored,

  work_complete boolean not null default false,
  health_complete boolean not null default false,

  origin text not null default 'office',  -- office | chute | received_phone (future)
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz,

  constraint pen_work_one_owner check (
    (seller_party_id is not null and buyer_party_id is null) or
    (seller_party_id is null and buyer_party_id is not null)
  )
);

-- Point animals at the pen_work they were worked under (replaces lot/load attachment).
alter table public.animal add column pen_work_id uuid references public.pen_work(id) on delete set null;
alter table public.animal add column current_pen_id uuid references public.pen(id) on delete set null; -- where the animal physically is now (changes on re-sort)

-- RETIRE the old one-pen-per-lot assumption.
-- consignment_lot and buyer_load were the billing+work unit; pen_work now is. Keep them ONLY if used as rollups; otherwise drop.
-- DECISION FOR THIS BUILD: drop them. Consignor/buyer "rollups" are derived by querying pen_work grouped by seller_party_id / buyer_party_id for a sale_day (a view below). Tables are empty, so dropping is clean.
drop table if exists public.consignment_lot cascade;
drop table if exists public.buyer_load cascade;

-- special_charge stays, but repoint its parent away from the dropped tables if it referenced them (it referenced sale_day + party only — verify and leave intact).

-- ROLLUP VIEWS (the per-person totals the UI shows; itemization lives in pen_work)
create view public.seller_rollup as
  select sale_day_id, barn_id, seller_party_id,
         count(*) as pen_work_count,
         sum(head_worked) as head_worked,
         sum(total_customer_charge) as total_customer_charge,
         sum(vet_total) as vet_total, sum(admin_total) as admin_total, sum(sol_total) as sol_total
  from public.pen_work
  where seller_party_id is not null and deleted_at is null
  group by sale_day_id, barn_id, seller_party_id;

create view public.buyer_rollup as
  select sale_day_id, barn_id, buyer_party_id,
         count(*) as pen_work_count,
         sum(head_worked) as head_worked,
         sum(total_customer_charge) as total_customer_charge,
         sum(vet_total) as vet_total, sum(admin_total) as admin_total, sum(sol_total) as sol_total
  from public.pen_work
  where buyer_party_id is not null and deleted_at is null
  group by sale_day_id, barn_id, buyer_party_id;

-- Standard treatment for the new tables: updated_at triggers, barn_id auto-fill from sale_day, RLS + member policy, created_by default.
create trigger trg_set_updated_at before update on public.pen for each row execute function public.set_updated_at();
create trigger trg_set_updated_at before update on public.pen_work for each row execute function public.set_updated_at();
create trigger trg_barn before insert on public.pen for each row execute function public.set_barn_id_from_parent('sale_day','sale_day_id');
create trigger trg_barn before insert on public.pen_work for each row execute function public.set_barn_id_from_parent('sale_day','sale_day_id');

alter table public.pen enable row level security;
alter table public.pen_work enable row level security;
create policy barn_members_all on public.pen for all to authenticated
  using (barn_id in (select private.user_barn_ids())) with check (barn_id in (select private.user_barn_ids()));
create policy barn_members_all on public.pen_work for all to authenticated
  using (barn_id in (select private.user_barn_ids())) with check (barn_id in (select private.user_barn_ids()));

alter table public.pen alter column created_by set default auth.uid();
alter table public.pen_work alter column created_by set default auth.uid();

-- Views run with the querying user's RLS via the underlying table; if needed, set security_invoker on the views (PG15+):
alter view public.seller_rollup set (security_invoker = true);
alter view public.buyer_rollup set (security_invoker = true);
