-- St. Onge records neither age, breed, nor fetal sex at the chute.
-- Turn those three capture fields off for St. Onge. The capture form is
-- built from this per-barn settings list, so this is all it takes -- no
-- screen code.
--
-- "Month bred" stays on. It means the ACTUAL calendar month she was bred
-- (St. Onge's breeding window is Sep-Dec, held in barn.preg_active_months
-- with barn.preg_timing_format = calendar_month) -- not a count of months
-- along.
UPDATE public.barn_field_config c
SET is_displayed = false, updated_at = now()
FROM public.barn b
WHERE c.barn_id = b.id
  AND b.deleted_at IS NULL
  AND c.work_type_id IS NULL
  AND c.field_key IN ('age', 'breed', 'fetal_sex');
