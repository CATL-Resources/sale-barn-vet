-- pen.closed_at / pen.closed_by: the closed-out marker for a pen. Inert on its
-- own — a later build sets these when someone closes a pen out and shows a
-- "closed" marker in the UI, so a pen WITHOUT closed_at is still open.
--
-- Both nullable, no default, no backfill: every existing pen stays open (null)
-- until it is actually closed.
--
-- closed_by follows the created_by audit convention — a reference to the auth
-- user that is cleared if that user is ever removed. Unlike created_by it does
-- NOT default to auth.uid(): a pen is closed by whoever closes it, stamped at
-- that moment, so a brand-new pen must stay null (not closed) rather than be
-- marked closed on insert.
alter table public.pen add column if not exists closed_at timestamptz;
alter table public.pen add column if not exists closed_by uuid references auth.users(id) on delete set null;
