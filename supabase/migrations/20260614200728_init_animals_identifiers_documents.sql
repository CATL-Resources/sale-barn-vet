
-- ANIMAL: the spine. Belongs to a sale_day always; optionally to a lot and/or a load.
create table public.animal (
  id uuid primary key default gen_random_uuid(),
  sale_day_id uuid not null references public.sale_day(id) on delete cascade,
  consignment_lot_id uuid references public.consignment_lot(id) on delete set null,
  buyer_load_id uuid references public.buyer_load(id) on delete set null,
  animal_type_id uuid references public.animal_type(id) on delete set null, -- override of lot default
  color text,
  breed text,
  age_value text,
  age_designation text,         -- the encoding actually used (color/mark)
  preg_status text,             -- bred | open | null (null = not applicable, e.g. bulls)
  preg_timing text,             -- months or season
  quick_notes text[] not null default '{}',  -- horns, lame, lump jaw, colors (filterable)
  pen text,                     -- transient location at capture
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

-- IDENTIFIER: tags as a list. value is TEXT (protects 15-digit 840 EID strings).
create table public.identifier (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animal(id) on delete cascade,
  type text not null,           -- official_eid | metal | secondary_eid | back_tag
  value text not null,          -- exact stored string, never numeric
  is_official boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

-- DOCUMENT: generated CVI / change-of-ownership (output of a buyer load)
create table public.document (
  id uuid primary key default gen_random_uuid(),
  buyer_load_id uuid references public.buyer_load(id) on delete cascade,
  type text not null,           -- cvi | change_of_ownership
  destination text,
  destination_state text,
  status text not null default 'draft',  -- draft | generated | signed
  gvl_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

-- Indexes for the common lookups (tag search, day rollups, load assembly)
create index idx_identifier_value on public.identifier (value);
create index idx_identifier_animal on public.identifier (animal_id);
create index idx_animal_sale_day on public.animal (sale_day_id);
create index idx_animal_lot on public.animal (consignment_lot_id);
create index idx_animal_load on public.animal (buyer_load_id);
create index idx_animal_quick_notes on public.animal using gin (quick_notes);
create index idx_lot_sale_day on public.consignment_lot (sale_day_id);
create index idx_load_sale_day on public.buyer_load (sale_day_id);
create index idx_buyer_number_party on public.buyer_number (party_id);
create index idx_document_load on public.document (buyer_load_id);
