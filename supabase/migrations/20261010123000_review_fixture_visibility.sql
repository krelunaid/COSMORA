-- Hide the three verified demo/review identities and their content from
-- ordinary visitors, including native clients reading Supabase directly.
-- Restrictive SELECT policies preserve all existing ownership/moderation rules.
-- No users, credentials, posts or media are deleted or suspended.
begin;

create policy "Review fixtures are not public profiles"
  on public.profiles as restrictive for select to anon, authenticated
  using (
    id not in ('66b0c100-e397-4971-946a-a8e3416b5f5b'::uuid, '89d20859-246f-4619-a363-285655bb8e0f'::uuid, 'a082786e-8ef2-42c6-80c5-95b7ca3e997b'::uuid)
    or (select auth.uid()) in ('66b0c100-e397-4971-946a-a8e3416b5f5b'::uuid, '89d20859-246f-4619-a363-285655bb8e0f'::uuid, 'a082786e-8ef2-42c6-80c5-95b7ca3e997b'::uuid)
  );

create policy "Review fixtures are not public posts"
  on public.community_posts as restrictive for select to anon, authenticated
  using (
    author_id not in ('66b0c100-e397-4971-946a-a8e3416b5f5b'::uuid, '89d20859-246f-4619-a363-285655bb8e0f'::uuid, 'a082786e-8ef2-42c6-80c5-95b7ca3e997b'::uuid)
    or (select auth.uid()) in ('66b0c100-e397-4971-946a-a8e3416b5f5b'::uuid, '89d20859-246f-4619-a363-285655bb8e0f'::uuid, 'a082786e-8ef2-42c6-80c5-95b7ca3e997b'::uuid)
  );

create policy "Review fixtures are not public listings"
  on public.listings as restrictive for select to anon, authenticated
  using (
    seller_id not in ('66b0c100-e397-4971-946a-a8e3416b5f5b'::uuid, '89d20859-246f-4619-a363-285655bb8e0f'::uuid, 'a082786e-8ef2-42c6-80c5-95b7ca3e997b'::uuid)
    or (select auth.uid()) in ('66b0c100-e397-4971-946a-a8e3416b5f5b'::uuid, '89d20859-246f-4619-a363-285655bb8e0f'::uuid, 'a082786e-8ef2-42c6-80c5-95b7ca3e997b'::uuid)
  );

create policy "Review fixtures are not public squads"
  on public.squads as restrictive for select to anon, authenticated
  using (
    owner_id not in ('66b0c100-e397-4971-946a-a8e3416b5f5b'::uuid, '89d20859-246f-4619-a363-285655bb8e0f'::uuid, 'a082786e-8ef2-42c6-80c5-95b7ca3e997b'::uuid)
    or (select auth.uid()) in ('66b0c100-e397-4971-946a-a8e3416b5f5b'::uuid, '89d20859-246f-4619-a363-285655bb8e0f'::uuid, 'a082786e-8ef2-42c6-80c5-95b7ca3e997b'::uuid)
  );

create policy "Review fixtures are not public meetups"
  on public.meetups as restrictive for select to anon, authenticated
  using (
    owner_id not in ('66b0c100-e397-4971-946a-a8e3416b5f5b'::uuid, '89d20859-246f-4619-a363-285655bb8e0f'::uuid, 'a082786e-8ef2-42c6-80c5-95b7ca3e997b'::uuid)
    or (select auth.uid()) in ('66b0c100-e397-4971-946a-a8e3416b5f5b'::uuid, '89d20859-246f-4619-a363-285655bb8e0f'::uuid, 'a082786e-8ef2-42c6-80c5-95b7ca3e997b'::uuid)
  );

commit;
