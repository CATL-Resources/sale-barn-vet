-- private schema is NOT exposed by PostgREST, so functions here are off the API
create schema if not exists private;
grant usage on schema private to anon, authenticated;  -- needed so policies can call them; still NOT API-exposed

create or replace function private.user_barn_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select barn_id from public.barn_member where user_id = auth.uid();
$$;

create or replace function private.user_is_barn_admin(b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.barn_member
                where user_id = auth.uid() and barn_id = b and role = 'admin');
$$;

-- repoint the policies to the private-schema helpers
drop policy barn_member_read on public.barn;
create policy barn_member_read on public.barn for select to authenticated
  using (id in (select private.user_barn_ids()));
drop policy barn_admin_write on public.barn;
create policy barn_admin_write on public.barn for update to authenticated
  using (private.user_is_barn_admin(id)) with check (private.user_is_barn_admin(id));

drop policy member_read on public.barn_member;
create policy member_read on public.barn_member for select to authenticated
  using (barn_id in (select private.user_barn_ids()));
drop policy member_admin_manage on public.barn_member;
create policy member_admin_manage on public.barn_member for all to authenticated
  using (private.user_is_barn_admin(barn_id)) with check (private.user_is_barn_admin(barn_id));

do $$ declare t text; begin
  foreach t in array array[
    'work_type','animal_type','age_color_map','party','buyer_number','sale_day',
    'consignment_lot','buyer_load','special_charge','animal','identifier','document']
  loop
    execute format('drop policy barn_members_all on public.%I', t);
    execute format($f$create policy barn_members_all on public.%I for all to authenticated
      using (barn_id in (select private.user_barn_ids()))
      with check (barn_id in (select private.user_barn_ids()));$f$, t);
  end loop;
end $$;

-- drop the now-unused public versions
drop function public.user_barn_ids();
drop function public.user_is_barn_admin(uuid);

-- trigger function: callers never need to execute it directly; triggers still fire
revoke execute on function public.set_barn_id_from_parent() from public, anon, authenticated;
