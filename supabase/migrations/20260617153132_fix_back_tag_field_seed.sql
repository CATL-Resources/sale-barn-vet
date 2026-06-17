-- Reconcile barn_field_config general rows to the locked 11-field order.
-- Insert back_tag if absent, then set every field's sort_order to the
-- canonical sequence. Idempotent.
INSERT INTO public.barn_field_config
  (barn_id, work_type_id, field_key, display_label, is_displayed, is_required, sort_order)
SELECT DISTINCT barn_id, NULL::uuid, 'back_tag', 'Back tag', true, false, 2
FROM public.barn_field_config
WHERE work_type_id IS NULL
  AND barn_id NOT IN (
    SELECT barn_id FROM public.barn_field_config
    WHERE work_type_id IS NULL AND field_key = 'back_tag'
  );

UPDATE public.barn_field_config AS c
SET sort_order = v.ord, updated_at = now()
FROM (VALUES
  ('eid',1),('back_tag',2),('visual_tag',3),('hide_color',4),('age',5),
  ('breed',6),('preg_stage',7),('preg_timing',8),('fetal_sex',9),
  ('quick_notes',10),('notes',11)
) AS v(field_key, ord)
WHERE c.work_type_id IS NULL AND c.field_key = v.field_key;
