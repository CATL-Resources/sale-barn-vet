-- Office-layer schema for pen_work (item 5): a billable head count separate from
-- the crew's worked count, a line-status lifecycle, a Hold flag, and an audit /
-- move log. Additive only — no existing column, value, or trigger is changed.
--
-- The freeze trigger (lock_frozen_pen_work) still guards only the frozen_* price
-- columns; head_billed / line_status / is_hold stay editable on a completed line,
-- by design. Feature logic (role enforcement, the move engine, billing recompute,
-- and any UI) is NOT here — this migration is schema + RLS + backfill only.

-- 1) head_billed: the office's billable count, independent of the crew's
--    head_worked. Billing computes as COALESCE(head_billed, head_worked) * rate.
alter table public.pen_work add column if not exists head_billed integer;
update public.pen_work set head_billed = head_worked
  where head_billed is null and head_worked is not null;

-- 2) line_status lifecycle — complements work_complete, does NOT replace it.
alter table public.pen_work add column if not exists line_status text not null default 'open';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pen_work_line_status_check') then
    alter table public.pen_work add constraint pen_work_line_status_check
      check (line_status in ('open','worked','clean','needs_resolution','resolved','billed'));
  end if;
end $$;
update public.pen_work set line_status = 'worked' where work_complete = true;

-- 3) is_hold: marks an un-placeable Hold line (owner unknown). Never billed.
alter table public.pen_work add column if not exists is_hold boolean not null default false;

-- 4) audit / move log — one row per office adjustment or move (who / when / why).
create table if not exists public.pen_work_adjustment (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null,
  sale_day_id uuid,
  pen_work_id uuid not null references public.pen_work(id) on delete cascade,
  source_pen_work_id uuid references public.pen_work(id) on delete set null,
  kind text not null check (kind in
    ('set_billed','move','reassign','split','hold_park','hold_resolve','status_change')),
  head_delta integer,
  from_value text,
  to_value text,
  reason text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists pen_work_adjustment_pen_work_idx
  on public.pen_work_adjustment(pen_work_id);
create index if not exists pen_work_adjustment_barn_saleday_idx
  on public.pen_work_adjustment(barn_id, sale_day_id);
alter table public.pen_work_adjustment enable row level security;

-- 5) RLS — mirror the barn-membership check pen_work already uses
--    (barn_members_all FOR ALL: barn_id IN private.user_barn_ids()). The audit log
--    is append-only, so we expose just select + insert with that same check, so a
--    user only sees and writes adjustment rows within their own barn.
drop policy if exists pen_work_adjustment_select on public.pen_work_adjustment;
create policy pen_work_adjustment_select on public.pen_work_adjustment
  for select to authenticated
  using (barn_id in (select private.user_barn_ids()));

drop policy if exists pen_work_adjustment_insert on public.pen_work_adjustment;
create policy pen_work_adjustment_insert on public.pen_work_adjustment
  for insert to authenticated
  with check (barn_id in (select private.user_barn_ids()));
