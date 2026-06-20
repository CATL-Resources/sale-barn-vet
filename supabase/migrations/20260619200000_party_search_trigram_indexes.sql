-- Fast case-insensitive partial search over the ~19.5k customers: trigram
-- (pg_trgm) indexes so ILIKE '%...%' on name and customer number stays quick.
create extension if not exists pg_trgm;

create index if not exists idx_party_name_trgm
  on public.party using gin (name gin_trgm_ops)
  where deleted_at is null;

create index if not exists idx_party_customer_number_trgm
  on public.party using gin (customer_number gin_trgm_ops)
  where deleted_at is null;
