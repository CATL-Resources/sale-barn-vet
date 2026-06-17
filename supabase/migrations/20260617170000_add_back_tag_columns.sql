-- Back-tag columns missed by the earlier preferences migration.
-- State+barn code identifies the ORIGINATING sale barn on a scanned
-- tag, not the animal's home state. St. Onge applies 46 + AM/MA;
-- 45/83/81 appear on tags from other barns (ND/WY/MT) it may scan.
-- auto_increment off for St. Onge (scans existing tags, does not
-- generate them -- mostly on weigh-up cows).
ALTER TABLE public.barn
  ADD COLUMN IF NOT EXISTS back_tag_barn_codes     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS back_tag_state_codes    JSONB  NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS back_tag_auto_increment BOOLEAN NOT NULL DEFAULT false;

-- Seed St. Onge values. auto_increment stays false (column default).
UPDATE public.barn SET
  back_tag_barn_codes  = ARRAY['AM','MA'],
  back_tag_state_codes = '{"46":"SD","45":"ND","83":"WY","81":"MT"}'::jsonb
WHERE deleted_at IS NULL;
