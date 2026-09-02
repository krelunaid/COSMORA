alter table public.community_posts
  add column if not exists link_type text,
  add column if not exists link_label text,
  add column if not exists link_url text;

insert into public.post_categories (slug, label)
values
  ('cosplay', 'Cosplay'),
  ('collection', 'Collection'),
  ('creator-work', 'Creator Work'),
  ('gaming', 'Gaming'),
  ('cards', 'Cards'),
  ('comics', 'Comics'),
  ('figures', 'Figures'),
  ('event', 'Event'),
  ('making-of', 'Making Of')
on conflict (slug) do update set label = excluded.label;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media',
  'community-media',
  true,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public community media are readable"
  on storage.objects for select using (bucket_id = 'community-media');
create policy "Users upload community media to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users manage their community media"
  on storage.objects for update to authenticated
  using (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete their community media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Active post media are readable"
  on public.post_media for select using (
    exists (
      select 1 from public.community_posts post
      where post.id = post_media.post_id and post.status = 'ACTIVE'
    )
  );
