-- Database backstop for duplicate EIDs within a work order.
--
-- The app guard can lose a double-submit race and insert a second animal with the
-- same EID in the same work order. There is no database rule preventing that, so
-- the duplicate lands for good. This adds one: a partial unique index that makes a
-- second ACTIVE EID of the same value within one work order impossible. The
-- legitimate cross-work-order repeat (the same tag sold seller -> buyer) is left
-- untouched, because those identifier rows belong to a different pen_work.
--
-- The identifier table has no pen_work_id (the animal carries it), so we
-- denormalize it onto the identifier and keep it in sync with a trigger.
--
-- Idempotent: safe to re-run (IF NOT EXISTS / OR REPLACE / DROP ... CREATE, and
-- the backfills only touch rows that are out of sync).

-- 1. Denormalize the work order onto the identifier (nullable uuid).
alter table public.identifier
  add column if not exists pen_work_id uuid;

-- 2. Backfill from each identifier's animal.
update public.identifier i
set pen_work_id = a.pen_work_id
from public.animal a
where i.animal_id = a.id
  and i.pen_work_id is distinct from a.pen_work_id;

-- 3. Align existing data with the delete invariant the index depends on: an
--    identifier whose animal is already soft-deleted must itself be soft-deleted,
--    or it would keep occupying a unique slot and block a re-add.
update public.identifier i
set deleted_at = now()
from public.animal a
where i.animal_id = a.id
  and a.deleted_at is not null
  and i.deleted_at is null;

-- 4. Keep pen_work_id correct on insert, populated from the parent animal — in the
--    database so it holds no matter which code path writes the identifier.
create or replace function public.identifier_set_pen_work_id()
returns trigger
language plpgsql
as $$
begin
  if new.pen_work_id is null then
    select a.pen_work_id into new.pen_work_id
    from public.animal a
    where a.id = new.animal_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_identifier_set_pen_work_id on public.identifier;
create trigger trg_identifier_set_pen_work_id
  before insert on public.identifier
  for each row execute function public.identifier_set_pen_work_id();

-- 5. The delete invariant going forward: soft-deleting an animal soft-deletes its
--    still-active identifiers, so a deleted animal's EID never blocks a re-add.
--    Identifiers stay with their animal; an animal's pen_work_id is not expected to
--    change after creation, so this does not chase pen_work_id updates.
create or replace function public.identifier_cascade_animal_delete()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.identifier
    set deleted_at = new.deleted_at
    where animal_id = new.id
      and deleted_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_identifier_cascade_animal_delete on public.animal;
create trigger trg_identifier_cascade_animal_delete
  after update of deleted_at on public.animal
  for each row execute function public.identifier_cascade_animal_delete();

-- 6. The backstop. One active EID value per work order. The WHERE clause keeps the
--    cross-work-order repeat and soft-deleted rows out of the constraint, so only a
--    true in-order active duplicate is rejected. This index FAILS to build if such
--    duplicates already exist — clean them first, do not force it.
create unique index if not exists identifier_one_active_eid_per_pen_work
  on public.identifier (pen_work_id, value)
  where type = 'eid' and deleted_at is null;
