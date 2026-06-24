-- Office Hold bucket (slice 3): un-placeable head parks on a pen_work row with
-- NO owner (is_hold = true, seller_party_id and buyer_party_id both null). The
-- existing pen_work_one_owner check required exactly one owner, which blocked
-- that row. Relax it so a Hold line may have no owner, while every normal
-- (non-hold) line still must have exactly one. Lenient and additive: all
-- existing rows (non-hold, one owner) continue to pass unchanged.
alter table public.pen_work drop constraint if exists pen_work_one_owner;
alter table public.pen_work add constraint pen_work_one_owner check (
  is_hold
  or (seller_party_id is not null and buyer_party_id is null)
  or (seller_party_id is null and buyer_party_id is not null)
);
