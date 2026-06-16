
-- Pin the function's search_path (security hardening flagged by the advisor)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end; $$;
