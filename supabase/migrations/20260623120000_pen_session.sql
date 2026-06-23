-- PEN_SESSION: a pen's transient working state for one sale day. Additive only —
-- nothing existing is altered or dropped. Holds a yard-crew "brought up" marker and
-- per-pen field-default overrides. Created on demand, one row per pen per sale day.
create table public.pen_session (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barn(id) on delete cascade,
  pen_id uuid not null references public.pen(id) on delete cascade,
  sale_day_id uuid not null references public.sale_day(id) on delete cascade,
  is_up boolean not null default false,                 -- yard-crew "brought up" marker
  up_at timestamptz,                                    -- when it was marked up
  field_defaults jsonb not null default '{}'::jsonb,    -- per-pen starting values, e.g. {"hide_color":"red"}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pen_id, sale_day_id)
);

comment on table public.pen_session is 'transient per-pen working state for one sale day — a yard-crew Up/to-grab marker and per-pen field default overrides. Scratch state, not history; rows are created on demand and only matter while the pen has work remaining.';

-- Same treatment as the pen / pen_work tables: keep updated_at fresh, auto-fill
-- barn_id from the sale_day parent, and scope every row to the user's barn via RLS.
create trigger trg_set_updated_at before update on public.pen_session for each row execute function public.set_updated_at();
create trigger trg_barn before insert on public.pen_session for each row execute function public.set_barn_id_from_parent('sale_day','sale_day_id');

alter table public.pen_session enable row level security;
create policy barn_members_all on public.pen_session for all to authenticated
  using (barn_id in (select private.user_barn_ids())) with check (barn_id in (select private.user_barn_ids()));

-- Indexes for the grab-list query (the day's pens for a barn / sale day).
create index pen_session_sale_day_id_idx on public.pen_session (sale_day_id);
create index pen_session_barn_id_sale_day_id_idx on public.pen_session (barn_id, sale_day_id);
