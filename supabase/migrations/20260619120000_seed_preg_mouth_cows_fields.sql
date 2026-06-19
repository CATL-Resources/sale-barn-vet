-- Per-work-type capture fields for "Preg and Mouth Cows": turn Age and Preg
-- stage on and make them required, so the cow can't be advanced with them blank.
--
-- Additive and idempotent: looks the work type up by name for the one barn,
-- never touches the barn-wide rows or other work types, and skips any row that
-- already exists for this barn + work type + field.
insert into public.barn_field_config (barn_id, work_type_id, field_key, is_displayed, is_required, sort_order)
select wt.barn_id, wt.id, v.field_key, true, true, v.sort_order
from public.work_type wt
cross join (values ('age', 5), ('preg_stage', 7)) as v(field_key, sort_order)
where wt.name = 'Preg and Mouth Cows'
  and wt.deleted_at is null
  and not exists (
    select 1
    from public.barn_field_config x
    where x.barn_id = wt.barn_id
      and x.work_type_id = wt.id
      and x.field_key = v.field_key
  );
