-- pen-photos delete policy. The bucket (20260625170000_pen_photos_bucket.sql)
-- has select + insert policies scoped to the user's barn, but no delete policy —
-- so storage.from('pen-photos').remove(...) was denied and deleting a photo
-- silently failed. Add the matching delete policy, scoped the same way (the first
-- path folder is the barn id, which must be one of the signed-in user's barns).
create policy "pen_photos_delete_own_barn"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'pen-photos'
    and ((storage.foldername(name))[1])::uuid in (select private.user_barn_ids())
  );
