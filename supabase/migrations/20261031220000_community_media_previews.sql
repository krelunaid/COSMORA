-- Server-owned JPEG copies: cascade deletion follows media -> post -> account.
create table if not exists public.community_media_previews (
 media_id uuid primary key references public.post_media(id) on delete cascade,
 original_path text not null,
 jpeg_base64 text not null check (length(jpeg_base64) between 4 and 131072 and jpeg_base64 ~ '^[A-Za-z0-9+/]+={0,2}$'),
 source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now()
);
alter table public.community_media_previews enable row level security;
revoke all on public.community_media_previews from public,anon,authenticated;
grant all on public.community_media_previews to service_role;
