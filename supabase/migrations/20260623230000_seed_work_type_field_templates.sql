-- Lock each ACTIVE work type's capture field set to a starting template.
--
-- Capture now renders strictly from barn_field_config (per-work-type rows
-- overlaid on the barn-wide rows), and the preg fields no longer fall back to
-- work_type.includes_preg_check. So every field a work type should show -- and
-- every field it should NOT -- is written here as an explicit per-work-type row.
-- That keeps each work type's field set fully locked to the work type, no matter
-- what the barn-wide defaults are now or later.
--
-- is_required is false on every row for now (EID still hard-blocks the save on
-- its own, because it is the barn's official ID). sort_order follows each
-- template's listed order for the fields it shows; hidden fields are parked out
-- of the way (their order never matters because they don't render).
--
-- Idempotent: existing per-work-type rows are UPDATED toward the template and
-- missing ones are INSERTED -- never duplicated. Re-running changes nothing.
-- Barn-wide rows (work_type_id IS NULL) are left alone, except for clearing one
-- malformed default (see the bottom of the file).
--
-- Templates:
--   ID Only / Bull ID - Chute / Cow ID - Chute / Drug Free Bull / Band /
--   Canada Export / Test Bull  -> eid, back_tag, quick_notes, notes
--   Bangs Vaccination          -> eid, back_tag, metal_tag, quick_notes, notes
--   Preg and Mouth Cows        -> eid, back_tag, age, preg_stage, preg_timing,
--                                 fetal_sex, quick_notes, notes
--   Preg Heifers               -> eid, back_tag, preg_stage, preg_timing,
--                                 fetal_sex, quick_notes, notes
--   Pairs                      -> eid, back_tag, preg_stage, quick_notes, notes

drop table if exists _tmpl;
drop table if exists _target;

-- The fields each work type DISPLAYS, in order.
create temporary table _tmpl (work_type_name text, field_key text, sort_order int);
insert into _tmpl (work_type_name, field_key, sort_order) values
  ('ID Only',            'eid', 1), ('ID Only',            'back_tag', 2), ('ID Only',            'quick_notes', 3), ('ID Only',            'notes', 4),
  ('Bull ID - Chute',    'eid', 1), ('Bull ID - Chute',    'back_tag', 2), ('Bull ID - Chute',    'quick_notes', 3), ('Bull ID - Chute',    'notes', 4),
  ('Cow ID - Chute',     'eid', 1), ('Cow ID - Chute',     'back_tag', 2), ('Cow ID - Chute',     'quick_notes', 3), ('Cow ID - Chute',     'notes', 4),
  ('Drug Free Bull',     'eid', 1), ('Drug Free Bull',     'back_tag', 2), ('Drug Free Bull',     'quick_notes', 3), ('Drug Free Bull',     'notes', 4),
  ('Band',               'eid', 1), ('Band',               'back_tag', 2), ('Band',               'quick_notes', 3), ('Band',               'notes', 4),
  ('Canada Export',      'eid', 1), ('Canada Export',      'back_tag', 2), ('Canada Export',      'quick_notes', 3), ('Canada Export',      'notes', 4),
  ('Test Bull',          'eid', 1), ('Test Bull',          'back_tag', 2), ('Test Bull',          'quick_notes', 3), ('Test Bull',          'notes', 4),
  ('Bangs Vaccination',  'eid', 1), ('Bangs Vaccination',  'back_tag', 2), ('Bangs Vaccination',  'metal_tag', 3), ('Bangs Vaccination',  'quick_notes', 4), ('Bangs Vaccination',  'notes', 5),
  ('Preg and Mouth Cows','eid', 1), ('Preg and Mouth Cows','back_tag', 2), ('Preg and Mouth Cows','age', 3), ('Preg and Mouth Cows','preg_stage', 4), ('Preg and Mouth Cows','preg_timing', 5), ('Preg and Mouth Cows','fetal_sex', 6), ('Preg and Mouth Cows','quick_notes', 7), ('Preg and Mouth Cows','notes', 8),
  ('Preg Heifers',       'eid', 1), ('Preg Heifers',       'back_tag', 2), ('Preg Heifers',       'preg_stage', 3), ('Preg Heifers',       'preg_timing', 4), ('Preg Heifers',       'fetal_sex', 5), ('Preg Heifers',       'quick_notes', 6), ('Preg Heifers',       'notes', 7),
  ('Pairs',              'eid', 1), ('Pairs',              'back_tag', 2), ('Pairs',              'preg_stage', 3), ('Pairs',              'quick_notes', 4), ('Pairs',              'notes', 5);

-- The full per-work-type row set we want: every capture field_key, displayed
-- only when it appears in the template for that work type. Scoped to ACTIVE,
-- live work types we have a template for.
create temporary table _target as
select
  wt.barn_id,
  wt.id as work_type_id,
  k.field_key,
  (t.field_key is not null) as is_displayed,
  false as is_required,
  coalesce(t.sort_order, 100 + k.canon) as sort_order
from public.work_type wt
cross join (values
  ('eid', 1), ('back_tag', 2), ('visual_tag', 3), ('metal_tag', 4), ('age', 5),
  ('breed', 6), ('hide_color', 7), ('preg_stage', 8), ('preg_timing', 9),
  ('fetal_sex', 10), ('quick_notes', 11), ('notes', 12)
) as k(field_key, canon)
left join _tmpl t on t.work_type_name = wt.name and t.field_key = k.field_key
where wt.active = true
  and wt.deleted_at is null
  and wt.name in (select distinct work_type_name from _tmpl);

-- Update existing per-work-type rows toward the target set.
update public.barn_field_config c
set is_displayed = tg.is_displayed,
    is_required  = tg.is_required,
    sort_order   = tg.sort_order,
    updated_at   = now()
from _target tg
where c.work_type_id = tg.work_type_id
  and c.field_key    = tg.field_key;

-- Insert the rows that did not exist yet.
insert into public.barn_field_config (barn_id, work_type_id, field_key, is_displayed, is_required, sort_order)
select tg.barn_id, tg.work_type_id, tg.field_key, tg.is_displayed, tg.is_required, tg.sort_order
from _target tg
where not exists (
  select 1 from public.barn_field_config c
  where c.work_type_id = tg.work_type_id
    and c.field_key    = tg.field_key
);

-- Clear a malformed barn-wide default: preg_stage.default_value held the LABEL
-- "Bred" rather than a stage code, so prefilling it would store an invalid
-- preg_status. Null it out; the preg stage starts unpicked (unchanged save
-- behavior). To default a stage later, set this to a real code (e.g. 'AI').
update public.barn_field_config
set default_value = null, updated_at = now()
where work_type_id is null
  and field_key = 'preg_stage'
  and default_value = 'Bred';

drop table _tmpl;
drop table _target;
