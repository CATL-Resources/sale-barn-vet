-- Drop orphan columns left over from the old consignment_lot / buyer_load model.
-- Those tables were dropped in PR #8 (pen + pen_work); these FK columns on animal
-- and document are nullable and unused. pen_work_id / current_pen_id replace them.
ALTER TABLE public.animal
  DROP COLUMN IF EXISTS consignment_lot_id,
  DROP COLUMN IF EXISTS buyer_load_id;

ALTER TABLE public.document
  DROP COLUMN IF EXISTS buyer_load_id;
