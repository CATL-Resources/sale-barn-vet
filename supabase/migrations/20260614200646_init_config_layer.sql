
-- Shared updated_at trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- BARN: operation-level settings + barn-config switches + billing rates
create table public.barn (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  official_id_type text not null default 'EID',      -- which tag counts as official here
  age_encoding_method text not null default 'color', -- color | placement | mark | value
  admin_fee_rate numeric not null default 0.05,
  sales_tax_rate numeric not null default 0.042,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

-- WORK_TYPE: the live rate card (two per-head charges)
create table public.work_type (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  name text not null,
  vet_charge numeric not null,
  sol_charge numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz,
  unique (barn_id, name)
);

-- ANIMAL_TYPE: cattle-type list (separate from work type)
create table public.animal_type (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz,
  unique (barn_id, name)
);

-- AGE_COLOR_MAP: local age encoding (St. Onge color -> age)
create table public.age_color_map (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  color text not null,
  age_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz,
  unique (barn_id, color)
);

-- PARTY: people (buyers and sellers in one table)
create table public.party (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

-- BUYER_NUMBER: reference list of a buyer's regular numbers + typical destination (pre-fill only)
create table public.buyer_number (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  party_id uuid not null references public.party(id) on delete cascade,
  number text not null,                 -- text: covers 'CAM', '418-x', '800x'
  typical_destination text,
  typical_state text,
  needs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz,
  unique (barn_id, number)
);
