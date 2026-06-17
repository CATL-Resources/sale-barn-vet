-- St. Onge default seed. Scoped to the single live barn (deleted_at IS NULL)
-- and idempotent (guarded inserts / ON CONFLICT DO NOTHING).

-- Field roster toggles: fetal_sex OFF (rarely used), hide_color OFF
-- (body color is incidental at St. Onge; Red/Baldy already live as quick
-- notes). The fields still EXIST for other barns -- only display is off here.
UPDATE public.barn_field_config bfc
  SET is_displayed = false, updated_at = now()
  FROM public.barn b
  WHERE bfc.barn_id = b.id AND b.deleted_at IS NULL
    AND bfc.field_key IN ('fetal_sex','hide_color');

-- Metal tag (official tag), separate from EID, default OFF. Appended; its
-- natural home is next to EID -- barn can drag it there in the UI.
INSERT INTO public.barn_field_config
  (barn_id, field_key, display_label, is_displayed, is_required, sort_order)
SELECT b.id, 'metal_tag', 'Metal tag', false, false,
       COALESCE((SELECT max(sort_order) FROM public.barn_field_config WHERE barn_id = b.id), 0) + 1
FROM public.barn b
WHERE b.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.barn_field_config x
                  WHERE x.barn_id = b.id AND x.field_key = 'metal_tag');

-- Breed options: St. Onge pinned set + Dairy collapsed.
INSERT INTO public.field_value_option
  (barn_id, field_key, value, label, sort_order, is_pinned, active)
SELECT b.id, 'breed', v.value, v.label, v.sort_order, v.is_pinned, true
FROM public.barn b
CROSS JOIN (VALUES
  ('Hereford',    'Hereford',    1, true),
  ('Red Angus',   'Red Angus',   2, true),
  ('Red Baldy',   'Red Baldy',   3, true),
  ('Black Baldy', 'Black Baldy', 4, true),
  ('Charolais',   'Charolais',   5, true),
  ('Dairy',       'Dairy',       6, false)
) AS v(value, label, sort_order, is_pinned)
WHERE b.deleted_at IS NULL
ON CONFLICT (barn_id, field_key, value) DO NOTHING;

-- Body color options: list exists even though hide_color ships OFF at
-- St. Onge, so any barn turning it on has a starter set.
INSERT INTO public.field_value_option
  (barn_id, field_key, value, label, sort_order, is_pinned, active)
SELECT b.id, 'hide_color', v.value, v.label, v.sort_order, v.is_pinned, true
FROM public.barn b
CROSS JOIN (VALUES
  ('Black',       'Black',       1, true),
  ('Red',         'Red',         2, true),
  ('Baldy',       'Baldy',       3, true),
  ('Black Baldy', 'Black Baldy', 4, true),
  ('Red Baldy',   'Red Baldy',   5, true),
  ('Charolais',   'Charolais',   6, false),
  ('Smoke',       'Smoke',       7, false)
) AS v(value, label, sort_order, is_pinned)
WHERE b.deleted_at IS NULL
ON CONFLICT (barn_id, field_key, value) DO NOTHING;

-- Age designators: St. Onge tag-color -> age, youngest to oldest.
-- Ranges kept exactly as given (overlaps intact). age_label is NOT NULL,
-- so colors with no word label use the range as the label.
INSERT INTO public.age_designation_option
  (barn_id, designation_value, age_label, age_code, sort_order, active, age_min_years, age_max_years)
SELECT b.id, v.designation_value, v.age_label, v.age_code, v.sort_order, true, v.age_min_years, v.age_max_years
FROM public.barn b
CROSS JOIN (VALUES
  ('White',  'Heifer',      'HFR', 1, 2, 2),
  ('Yellow', '3-4 yr',      '3-4', 2, 3, 4),
  ('Green',  '5-6 yr',      '5-6', 3, 5, 6),
  ('Purple', 'Solid',       'SOL', 4, 6, 7),
  ('Blue',   'Short solid', 'SS',  5, 7, 10),
  ('Red',    'Broken',      'BRK', 6, 8, NULL)
) AS v(designation_value, age_label, age_code, sort_order, age_min_years, age_max_years)
WHERE b.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.age_designation_option x
                  WHERE x.barn_id = b.id AND x.designation_value = v.designation_value);
