
-- SALE_DAY: top container / billing unit (reconciliation totals are derived, not stored)
create table public.sale_day (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  sale_date date not null,
  status text not null default 'open',  -- open | closed
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

-- CONSIGNMENT_LOT: pre-sale SELLER work order. Office creates; chute fills.
create table public.consignment_lot (
  id uuid primary key default gen_random_uuid(),
  sale_day_id uuid not null references public.sale_day(id) on delete cascade,
  seller_party_id uuid references public.party(id) on delete set null,
  people_names text,
  animal_type_id uuid references public.animal_type(id) on delete set null,
  work_type_id uuid references public.work_type(id) on delete set null,
  pen text,
  expected_head integer,
  head_billed integer,                  -- the head used for billing (sheet "Head")
  notes text,
  work_complete boolean not null default false,    -- derived from animals recorded
  health_complete boolean not null default false,  -- derived from document generated
  -- frozen price snapshot (copied at work time so future rate changes never alter past bills)
  frozen_vet_charge numeric,
  frozen_sol_charge numeric,
  frozen_admin_rate numeric,
  frozen_tax_rate numeric,
  -- computed line totals (cannot drift from the snapshot)
  vet_total numeric generated always as
    (frozen_vet_charge * head_billed * (1 + frozen_tax_rate)) stored,
  admin_total numeric generated always as
    (frozen_vet_charge * head_billed * (1 + frozen_tax_rate) * frozen_admin_rate) stored,
  sol_total numeric generated always as
    (frozen_sol_charge * head_billed) stored,
  total_customer_charge numeric generated always as
    (frozen_vet_charge * head_billed * (1 + frozen_tax_rate)
     + frozen_vet_charge * head_billed * (1 + frozen_tax_rate) * frozen_admin_rate
     + frozen_sol_charge * head_billed) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

-- BUYER_LOAD: post-sale BUYER grouping/work order. Built by filter-to-build.
create table public.buyer_load (
  id uuid primary key default gen_random_uuid(),
  sale_day_id uuid not null references public.sale_day(id) on delete cascade,
  buyer_party_id uuid references public.party(id) on delete set null,
  buyer_number_text text,                                   -- the day's number (text)
  buyer_number_id uuid references public.buyer_number(id) on delete set null, -- regular ref (pre-fill)
  destination text,           -- ACTUAL destination that day (pre-filled but editable; CVI uses this)
  destination_state text,
  animal_type_id uuid references public.animal_type(id) on delete set null,
  work_type_id uuid references public.work_type(id) on delete set null,
  pen text,
  expected_head integer,
  head_billed integer,
  notes text,
  work_complete boolean not null default false,
  health_complete boolean not null default false,
  frozen_vet_charge numeric,
  frozen_sol_charge numeric,
  frozen_admin_rate numeric,
  frozen_tax_rate numeric,
  vet_total numeric generated always as
    (frozen_vet_charge * head_billed * (1 + frozen_tax_rate)) stored,
  admin_total numeric generated always as
    (frozen_vet_charge * head_billed * (1 + frozen_tax_rate) * frozen_admin_rate) stored,
  sol_total numeric generated always as
    (frozen_sol_charge * head_billed) stored,
  total_customer_charge numeric generated always as
    (frozen_vet_charge * head_billed * (1 + frozen_tax_rate)
     + frozen_vet_charge * head_billed * (1 + frozen_tax_rate) * frozen_admin_rate
     + frozen_sol_charge * head_billed) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

-- SPECIAL_CHARGE: ad-hoc one-off charges folded into the day's reconciliation
create table public.special_charge (
  id uuid primary key default gen_random_uuid(),
  sale_day_id uuid not null references public.sale_day(id) on delete cascade,
  party_id uuid references public.party(id) on delete set null,
  role text not null default 'buyer',   -- buyer | seller (for the reconciliation split)
  description text,
  customer_charge numeric not null default 0,
  vet_total numeric not null default 0,
  admin_total numeric not null default 0,
  sol_total numeric not null default 0,
  head integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);
