-- Settings / Barn Preferences — schema groundwork (ADDITIVE ONLY).
-- Nothing is dropped. age_encoding_method is KEPT even though it overlaps
-- age_id_method at St. Onge. All DDL uses IF NOT EXISTS.

-- General per-field options store. Serves breed, hide_color (body color),
-- and any future pick-list field. is_pinned = shows on the main face;
-- unpinned = lives behind the collapsed "+ more" expander (no-scroll rule).
CREATE TABLE IF NOT EXISTS public.field_value_option (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barn_id     uuid        NOT NULL REFERENCES public.barn(id),
  field_key   text        NOT NULL,
  value       text        NOT NULL,
  label       text        NOT NULL,
  code        text,
  sort_order  integer     NOT NULL DEFAULT 0,
  is_pinned   boolean     NOT NULL DEFAULT false,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_value_option_unique UNIQUE (barn_id, field_key, value)
);

-- Age: allow a numeric age alongside the designator (both can be on).
-- St. Onge stays designator-only, so this ships false.
ALTER TABLE public.barn
  ADD COLUMN IF NOT EXISTS age_numeric_enabled boolean NOT NULL DEFAULT false;

-- Age designators: keep the year range behind each designator without
-- discarding it. Nullable — barns that don't use ranges leave them blank.
ALTER TABLE public.age_designation_option
  ADD COLUMN IF NOT EXISTS age_min_years integer,
  ADD COLUMN IF NOT EXISTS age_max_years integer;

-- Give the new table the same protection age_designation_option has:
-- row-level security on, access limited to members of that barn, and the
-- auto-update of updated_at. Mirrors the existing per-barn access pattern.
ALTER TABLE public.field_value_option ENABLE ROW LEVEL SECURITY;

CREATE POLICY barn_members_all ON public.field_value_option
  FOR ALL TO authenticated
  USING (barn_id IN (SELECT private.user_barn_ids()))
  WITH CHECK (barn_id IN (SELECT private.user_barn_ids()));

CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.field_value_option
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
