create table public.buyer_load (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  sale_day_id uuid not null references public.sale_day(id) on delete cascade,
  buyer_party_id uuid references public.party(id) on delete set null,
  buyer_number_id uuid references public.buyer_number(id) on delete set null,
  buyer_number_text text,
  destination_name text,
  destination_state text,
  destination_address text,
  expected_head integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

alter table public.animal add column buyer_load_id uuid references public.buyer_load(id) on delete set null;

create index idx_animal_buyer_load on public.animal (buyer_load_id);
create index idx_buyer_load_sale_day on public.buyer_load (sale_day_id, buyer_number_id);

create trigger trg_set_updated_at before update on public.buyer_load for each row execute function public.set_updated_at();
create trigger trg_barn before insert on public.buyer_load for each row execute function public.set_barn_id_from_parent('sale_day','sale_day_id');

alter table public.buyer_load enable row level security;
create policy barn_members_all on public.buyer_load for all to authenticated
  using (barn_id in (select private.user_barn_ids()))
  with check (barn_id in (select private.user_barn_ids()));

alter table public.buyer_load alter column created_by set default auth.uid();
