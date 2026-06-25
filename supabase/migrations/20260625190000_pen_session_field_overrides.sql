-- Per-pen field overrides the pen gear (field-config editor) will write to.
-- Holds, per field_key, that pen's overrides, e.g.
--   { "breed": { "is_displayed": true, "default_value": "Red Angus" },
--     "preg_stage": { "is_displayed": true, "is_required": false, "default_value": "recheck" } }
-- Only keys a pen actually overrides are present; anything absent falls through
-- to the work-type baseline. Additive; the NOT NULL default backfills existing
-- rows with an empty object. field_defaults is left in place for now (a later
-- cleanup drops it once the editor has moved reads/writes onto field_overrides).
alter table public.pen_session
  add column if not exists field_overrides jsonb not null default '{}'::jsonb;
