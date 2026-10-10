-- Hide only the three additional existing profiles from public reads.
-- Their own authenticated account can still read its profile; authentication,
-- review access and content owned by these users are not changed.
begin;

drop policy if exists "Retired profiles are not public" on public.profiles;
create policy "Retired profiles are not public"
  on public.profiles as restrictive for select to anon, authenticated
  using (
    id not in (
      '39ed3f97-f290-41f2-9cb0-c0fb0ad6ac53'::uuid,
      '5127b626-1077-48ee-a266-de2948e49b66'::uuid,
      '1606e1bd-1635-4760-a1ac-51561b43accc'::uuid
    )
    or id = (select auth.uid())
  );

commit;
