-- Customer import schema (additive). Adds a customer number + email to party and
-- a one-customer -> many-locations table. Mirrors the existing barn-scoped RLS
-- and audit conventions (created_at / updated_at / created_by default auth.uid()
-- / version / deleted_at), the barn_members_all policy, and the shared triggers.

-- party: customer number + email, with a re-import-safe unique key so a second
-- import updates the same customer instead of making a duplicate.
alter table public.party add column if not exists customer_number text;
alter table public.party add column if not exists email text;

create unique index if not exists uq_party_barn_customer_number
  on public.party (barn_id, customer_number)
  where deleted_at is null;

-- party_location: a customer's addresses (physical yard, PO box, etc.).
create table if not exists public.party_location (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  party_id uuid not null references public.party(id) on delete cascade,
  label text,
  address text,
  city text,
  state text,
  zip text,
  country text,
  premise_id text,
  is_po_box boolean not null default false,
  is_physical boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  version integer not null default 1,
  deleted_at timestamptz
);

alter table public.party_location enable row level security;

-- same barn-scoped policy as party / identifier: full access for barn members.
drop policy if exists barn_members_all on public.party_location;
create policy barn_members_all on public.party_location for all to authenticated
  using (barn_id in (select private.user_barn_ids()))
  with check (barn_id in (select private.user_barn_ids()));

-- audit + barn-stamp triggers, mirroring the other child tables.
drop trigger if exists trg_set_updated_at on public.party_location;
create trigger trg_set_updated_at before update on public.party_location
  for each row execute function public.set_updated_at();

drop trigger if exists trg_barn on public.party_location;
create trigger trg_barn before insert on public.party_location
  for each row execute function public.set_barn_id_from_parent('party', 'party_id');

create index if not exists idx_party_location_party on public.party_location (party_id);

-- re-import doesn't duplicate a customer's address (normalized: trim + lowercase).
create unique index if not exists uq_party_location_party_address
  on public.party_location (party_id, lower(btrim(address)))
  where deleted_at is null;
