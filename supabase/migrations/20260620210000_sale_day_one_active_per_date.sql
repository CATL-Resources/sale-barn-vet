-- One active sale day per date, per barn. Stops a second sale day being made
-- for a date that already has one. Soft-deleted days don't count toward the
-- limit, so a date can be used again after its day is removed.
create unique index if not exists sale_day_one_active_per_date
  on public.sale_day (barn_id, sale_date)
  where deleted_at is null;
