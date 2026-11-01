-- Derivative references are server-owned; never accept an author-supplied
-- preview as it could show content different from the moderated original.
create table if not exists public.community_media_thumbnails (
  media_id uuid primary key references public.post_media(id) on delete cascade,
  original_path text not null,
  thumbnail_path text not null,
  created_at timestamptz not null default now()
);
alter table public.community_media_thumbnails enable row level security;
revoke all on public.community_media_thumbnails from public, anon, authenticated;
grant all on public.community_media_thumbnails to service_role;
