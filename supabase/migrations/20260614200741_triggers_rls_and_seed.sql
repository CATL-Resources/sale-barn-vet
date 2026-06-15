
-- Auto-maintain updated_at on every table
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I', t);
    execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Enable Row Level Security on every table (secure-by-default; access policies are added with the auth build)
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Seed the barn
insert into public.barn (name) values ('St. Onge Livestock');

-- Seed the rate card (vet_charge / sol_charge per head)
insert into public.work_type (barn_id, name, vet_charge, sol_charge)
select (select id from public.barn where name = 'St. Onge Livestock' limit 1), x.name, x.vet, x.sol
from (values
  ('Drug Free Bull',      13,   1.25),
  ('Preg and Mouth Cows', 11,   1.25),
  ('Cow ID - Chute',      7.5,  0.5),
  ('Preg Heifers',        9,    0.5),
  ('Bull ID - Chute',     10,   0.5),
  ('Canada Export',       16,   1.25),
  ('ID Only',             5,    0),
  ('Bangs Vaccination',   13,   0.5),
  ('Band',                35,   1),
  ('Pairs',               12,   1.25),
  ('Test Bull',           75,   1)
) as x(name, vet, sol);

-- Seed the animal types
insert into public.animal_type (barn_id, name)
select (select id from public.barn where name = 'St. Onge Livestock' limit 1), x.name
from (values
  ('Bred Heifers'),('Feeder Calves'),('Pairs'),('Bull'),('Bred Cows'),
  ('Weigh Up Cows'),('Baby Calf'),('Heifers'),('Yearling Bull')
) as x(name);
