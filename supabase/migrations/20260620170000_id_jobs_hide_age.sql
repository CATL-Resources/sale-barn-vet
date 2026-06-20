-- "ID" jobs at the chute only read tags -- they don't record age. Hide the Age
-- field for the three identification work types so it never shows in capture.
--
-- Additive and idempotent: matches the work types by name for each barn, adds a
-- per-work-type override row that turns Age off (is_displayed = false), and skips
-- any work type that already has an Age row. Barn-wide rows and other work types
-- are left alone.
insert into public.barn_field_config (barn_id, work_type_id, field_key, is_displayed, is_required, sort_order)
select wt.barn_id, wt.id, 'age', false, false, 5
from public.work_type wt
where wt.name in ('Bull ID - Chute', 'Cow ID - Chute', 'ID Only')
  and wt.deleted_at is null
  and not exists (
    select 1
    from public.barn_field_config x
    where x.barn_id = wt.barn_id
      and x.work_type_id = wt.id
      and x.field_key = 'age'
  );
