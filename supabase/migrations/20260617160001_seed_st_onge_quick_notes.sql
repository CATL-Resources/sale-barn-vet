-- Seed St. Onge defaults for quick notes + the preg-check flag.

-- Flag the two preg/mouth work types.
UPDATE public.work_type
SET includes_preg_check = true, updated_at = now()
WHERE deleted_at IS NULL
  AND name IN ('Preg and Mouth Cows', 'Preg Heifers');

-- Seed the seven permanent St. Onge quick notes. None flagged.
-- All start at use_count 0; usage-driven order emerges with use.
INSERT INTO public.quick_note_definition
  (barn_id, label, is_flag, sort_priority, use_count, scope, active)
SELECT b.id, v.label, false, 0, 0, 'permanent', true
FROM public.barn b
CROSS JOIN (VALUES
  ('Red'),
  ('Baldy'),
  ('Horns'),
  ('Lame'),
  ('Lumpjaw'),
  ('Bad eye'),
  ('Wild')
) AS v(label)
WHERE b.deleted_at IS NULL;
