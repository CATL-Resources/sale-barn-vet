-- ============ barn stamp on the child tables that lack one ============
alter table public.consignment_lot add column barn_id uuid references public.barn(id) on delete cascade;
alter table public.buyer_load      add column barn_id uuid references public.barn(id) on delete cascade;
alter table public.special_charge  add column barn_id uuid references public.barn(id) on delete cascade;
alter table public.animal          add column barn_id uuid references public.barn(id) on delete cascade;
alter table public.identifier      add column barn_id uuid references public.barn(id) on delete cascade;
alter table public.document         add column barn_id uuid references public.barn(id) on delete cascade;

-- Auto-fill barn_id from the parent row (safety net so an insert can't forget it)
create or replace function public.set_barn_id_from_parent()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  parent_table text := TG_ARGV[0];
  fk_column   text := TG_ARGV[1];
  fk_value    uuid;
  v_barn      uuid;
begin
  if NEW.barn_id is not null then return NEW; end if;
  execute format('select ($1).%I', fk_column) into fk_value using NEW;
  if fk_value is null then return NEW; end if;
  execute format('select barn_id from public.%I where id = $1', parent_table) into v_barn using fk_value;
  NEW.barn_id := v_barn;
  return NEW;
end; $$;

create trigger trg_barn before insert on public.consignment_lot for each row execute function public.set_barn_id_from_parent('sale_day','sale_day_id');
create trigger trg_barn before insert on public.buyer_load     for each row execute function public.set_barn_id_from_parent('sale_day','sale_day_id');
create trigger trg_barn before insert on public.special_charge for each row execute function public.set_barn_id_from_parent('sale_day','sale_day_id');
create trigger trg_barn before insert on public.animal         for each row execute function public.set_barn_id_from_parent('sale_day','sale_day_id');
create trigger trg_barn before insert on public.identifier     for each row execute function public.set_barn_id_from_parent('animal','animal_id');
create trigger trg_barn before insert on public.document       for each row execute function public.set_barn_id_from_parent('buyer_load','buyer_load_id');

-- tables are empty, so we can require barn_id now
alter table public.consignment_lot alter column barn_id set not null;
alter table public.buyer_load      alter column barn_id set not null;
alter table public.special_charge  alter column barn_id set not null;
alter table public.animal          alter column barn_id set not null;
alter table public.identifier      alter column barn_id set not null;
alter table public.document         alter column barn_id set not null;

-- ============ membership ============
create table public.barn_member (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'office',   -- admin | office | vet
  created_at timestamptz not null default now(),
  unique (barn_id, user_id)
);
alter table public.barn_member enable row level security;

-- ============ loop-proof helpers (SECURITY DEFINER bypasses RLS on barn_member, so policies can't recurse) ============
create or replace function public.user_barn_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select barn_id from public.barn_member where user_id = auth.uid();
$$;

create or replace function public.user_is_barn_admin(b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.barn_member
                where user_id = auth.uid() and barn_id = b and role = 'admin');
$$;

-- ============ policies: one trivial line per table ============
-- barn itself
create policy barn_member_read on public.barn for select to authenticated
  using (id in (select public.user_barn_ids()));
create policy barn_admin_write on public.barn for update to authenticated
  using (public.user_is_barn_admin(id)) with check (public.user_is_barn_admin(id));

-- barn_member: members can see their barn's roster; only admins manage it
create policy member_read on public.barn_member for select to authenticated
  using (barn_id in (select public.user_barn_ids()));
create policy member_admin_manage on public.barn_member for all to authenticated
  using (public.user_is_barn_admin(barn_id)) with check (public.user_is_barn_admin(barn_id));

-- every barn_id table: full access for members of that barn
do $$
declare t text;
begin
  foreach t in array array[
    'work_type','animal_type','age_color_map','party','buyer_number','sale_day',
    'consignment_lot','buyer_load','special_charge','animal','identifier','document'
  ]
  loop
    execute format($f$
      create policy barn_members_all on public.%I for all to authenticated
      using (barn_id in (select public.user_barn_ids()))
      with check (barn_id in (select public.user_barn_ids()));
    $f$, t);
  end loop;
end $$;

-- ============ audit: stamp created_by automatically ============
do $$
declare t text;
begin
  foreach t in array array[
    'barn','work_type','animal_type','age_color_map','party','buyer_number','sale_day',
    'consignment_lot','buyer_load','special_charge','animal','identifier','document'
  ]
  loop
    execute format('alter table public.%I alter column created_by set default auth.uid()', t);
  end loop;
end $$;
