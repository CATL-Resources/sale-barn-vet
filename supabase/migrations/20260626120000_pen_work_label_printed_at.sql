-- pen_work.label_printed_at: records when a pen card label was printed. Inert on
-- its own — a later build sets it on print and shows a small "printed" icon on
-- the pen card, so the cards WITHOUT the icon are the new, unprinted ones.
-- Nullable, no default, no backfill: every existing row stays null until a label
-- is actually printed.
alter table public.pen_work add column if not exists label_printed_at timestamptz;
