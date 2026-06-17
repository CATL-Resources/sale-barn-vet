-- Quick notes + preg-check work-type flag
--
-- Two additions to the config layer:
--   1. A switch on each work type that says "show the preg fields on the
--      capture screen for this kind of work."
--   2. A table of sale-barn "quick notes" -- the catch-all pills (traits,
--      defects, temperament) a vet taps on an animal.

-- 1. work_type.includes_preg_check
--    Controls whether the capture screen shows the preg fields (stage,
--    month bred, fetal sex) for this work type. Option A field-visibility.
ALTER TABLE public.work_type
  ADD COLUMN IF NOT EXISTS includes_preg_check BOOLEAN NOT NULL DEFAULT false;

-- 2. quick_note_definition
--    Sale-barn quick notes are descriptive catch-all pills (traits,
--    defects, temperament) that prevent field proliferation. Multi-select
--    per animal. Usage-driven ordering with optional manual pins. Notes
--    can be created on the fly at the capture screen; those are
--    session-scoped unless promoted to permanent.
--    is_flag is retained for model parity with Work Cows / calving but
--    defaults false and is unused at the sale barn (every animal is
--    already a cull, so the flag concept does not apply here).
CREATE TABLE IF NOT EXISTS public.quick_note_definition (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barn_id       UUID NOT NULL REFERENCES public.barn(id),
  label         TEXT NOT NULL,
  is_flag       BOOLEAN NOT NULL DEFAULT false,
  sort_priority INTEGER NOT NULL DEFAULT 0,   -- manual pin; higher = pinned higher
  use_count     INTEGER NOT NULL DEFAULT 0,   -- usage-driven ordering
  scope         TEXT NOT NULL DEFAULT 'permanent',  -- 'permanent' | 'session'
  sale_day_id   UUID REFERENCES public.sale_day(id), -- set only for session-scoped notes
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quick_note_definition_barn
  ON public.quick_note_definition (barn_id, active);

-- Give the new table the same protection every other table here has:
-- row-level security on, access limited to people who belong to that barn,
-- and an auto-update of updated_at on every change. Without this the
-- security check flags the table as readable across barns.
ALTER TABLE public.quick_note_definition ENABLE ROW LEVEL SECURITY;

CREATE POLICY barn_members_all ON public.quick_note_definition
  FOR ALL TO authenticated
  USING (barn_id IN (SELECT private.user_barn_ids()))
  WITH CHECK (barn_id IN (SELECT private.user_barn_ids()));

CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.quick_note_definition
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
