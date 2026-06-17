-- Barn method settings
UPDATE public.barn SET
  age_id_method      = 'tag_color',
  preg_id_method     = 'ear_tag',
  preg_timing_format = 'calendar_month',
  preg_active_months = ARRAY['September','October','November','December']
WHERE deleted_at IS NULL;

-- Preg stage config — St. Onge labels
-- Chandy can change these through the settings screen once built.
INSERT INTO public.preg_stage_config
  (barn_id, stage_code, display_label, sort_order, active)
SELECT
  b.id, v.code, v.label, v.ord, true
FROM public.barn b
CROSS JOIN (VALUES
  ('OPEN',        'Open',        1),
  ('EARLY',       'Short',       2),
  ('MID',         'Mid',         3),
  ('LATE',        'Long',        4),
  ('AI',          'AI',          5),
  ('NOT_CHECKED', 'Not checked', 6)
) AS v(code, label, ord)
WHERE b.deleted_at IS NULL
ON CONFLICT (barn_id, stage_code) DO NOTHING;

-- Default field config (all work types)
-- Per-work-type overrides added through settings screen later.
INSERT INTO public.barn_field_config
  (barn_id, work_type_id, field_key, display_label, is_displayed, is_required, sort_order)
SELECT
  b.id, NULL, v.key, v.label, v.shown, false, v.ord
FROM public.barn b
CROSS JOIN (VALUES
  ('eid',         'EID',         true,  1),
  ('visual_tag',  'Tag #',       true,  2),
  ('hide_color',  'Color',       true,  3),
  ('age',         'Age',         true,  4),
  ('breed',       'Breed',       true,  5),
  ('preg_stage',  'Stage',       true,  6),
  ('preg_timing', 'Month bred',  true,  7),
  ('fetal_sex',   'Fetal sex',   true,  8),
  ('quick_notes', 'Quick notes', true,  9),
  ('notes',       'Notes',       true,  10)
) AS v(key, label, shown, ord)
WHERE b.deleted_at IS NULL;

-- Note: age_designation_option left empty for now.
-- Chandy populates it through the settings screen with St. Onge's
-- specific tag colors and age mappings.
