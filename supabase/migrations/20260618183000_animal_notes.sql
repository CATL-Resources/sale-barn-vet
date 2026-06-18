-- Freeform per-animal note for the chute capture screen.
-- quick_notes is a text[] of toggled labels; this is the typed, one-off note
-- ("Add a note") that has no home in the structured fields.
ALTER TABLE public.animal ADD COLUMN IF NOT EXISTS notes text;
