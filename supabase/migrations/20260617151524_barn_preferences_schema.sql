-- 1. Barn-level method columns
ALTER TABLE public.barn
  ADD COLUMN IF NOT EXISTS age_id_method      TEXT NOT NULL DEFAULT 'tag_color',
  ADD COLUMN IF NOT EXISTS preg_id_method     TEXT NOT NULL DEFAULT 'ear_tag',
  ADD COLUMN IF NOT EXISTS preg_timing_format TEXT NOT NULL DEFAULT 'calendar_month',
  ADD COLUMN IF NOT EXISTS preg_active_months TEXT[] NOT NULL DEFAULT '{}';

-- 2. Replace age_color_map with age_designation_option
--    age_color_map assumed color as the only method; this generalizes
--    to tag color, back tag position, paint, ear notch, or anything else.
CREATE TABLE IF NOT EXISTS public.age_designation_option (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barn_id           UUID NOT NULL REFERENCES public.barn(id),
  designation_value TEXT NOT NULL,   -- what the vet observes: 'Red', 'Left hip'
  age_label         TEXT NOT NULL,   -- display in the app: 'Yearling', '2-year-old'
  age_code          TEXT NOT NULL,   -- stored on the animal: '1yr', '2yr'
  sort_order        INTEGER NOT NULL DEFAULT 0,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrate existing age_color_map rows (if any)
INSERT INTO public.age_designation_option
  (barn_id, designation_value, age_label, age_code, sort_order, active)
SELECT barn_id, color, age_value, age_value, 0, true
FROM public.age_color_map
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS public.age_color_map;

-- 3. Preg stage config
--    Stage codes are fixed in the data model (OPEN/EARLY/MID/LATE/AI/NOT_CHECKED).
--    Labels and active status are barn-configurable.
CREATE TABLE IF NOT EXISTS public.preg_stage_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barn_id       UUID NOT NULL REFERENCES public.barn(id),
  stage_code    TEXT NOT NULL,
  display_label TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT preg_stage_config_barn_stage UNIQUE (barn_id, stage_code)
);

-- 4. Capture field config (Work Cows pattern)
--    work_type_id = null means applies to all work types.
--    Per-work-type rows override the general row for that field.
CREATE TABLE IF NOT EXISTS public.barn_field_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barn_id       UUID NOT NULL REFERENCES public.barn(id),
  work_type_id  UUID REFERENCES public.work_type(id),
  field_key     TEXT NOT NULL,
  display_label TEXT,
  is_displayed  BOOLEAN NOT NULL DEFAULT true,
  is_required   BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  default_value TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Fetal sex on animal
ALTER TABLE public.animal
  ADD COLUMN IF NOT EXISTS fetal_sex TEXT;
  -- stored values: 'M' | 'F' | 'Unknown' | null

-- 6. Security + timestamp triggers on the new tables (match every other table:
--    RLS on, per-barn access rule, auto-update of updated_at).
ALTER TABLE public.age_designation_option ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preg_stage_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barn_field_config      ENABLE ROW LEVEL SECURITY;

CREATE POLICY barn_members_all ON public.age_designation_option FOR ALL TO authenticated
  USING (barn_id IN (SELECT private.user_barn_ids()))
  WITH CHECK (barn_id IN (SELECT private.user_barn_ids()));
CREATE POLICY barn_members_all ON public.preg_stage_config FOR ALL TO authenticated
  USING (barn_id IN (SELECT private.user_barn_ids()))
  WITH CHECK (barn_id IN (SELECT private.user_barn_ids()));
CREATE POLICY barn_members_all ON public.barn_field_config FOR ALL TO authenticated
  USING (barn_id IN (SELECT private.user_barn_ids()))
  WITH CHECK (barn_id IN (SELECT private.user_barn_ids()));

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.age_designation_option
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.preg_stage_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.barn_field_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
