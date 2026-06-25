-- pen-photos: per-job photos attached from the Pen List. Private bucket; objects
-- are keyed by barn/pen_work in the path (<barn_id>/<pen_work_id>/<file>), and
-- access is scoped to the signed-in user's barn via that first path folder.
insert into storage.buckets (id, name, public)
values ('pen-photos', 'pen-photos', false)
on conflict (id) do nothing;

create policy "pen_photos_select_own_barn"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pen-photos'
    and ((storage.foldername(name))[1])::uuid in (select private.user_barn_ids())
  );

create policy "pen_photos_insert_own_barn"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pen-photos'
    and ((storage.foldername(name))[1])::uuid in (select private.user_barn_ids())
  );
