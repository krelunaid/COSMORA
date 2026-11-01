-- Private viewer state: clients use the guarded server endpoints, not Data API.
create table public.community_post_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create table public.community_post_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index community_post_likes_post_id_idx on public.community_post_likes(post_id);
create index community_post_saves_post_id_idx on public.community_post_saves(post_id);
alter table public.community_post_likes enable row level security;
alter table public.community_post_saves enable row level security;
-- Reset Supabase's default grants before granting only the server operations used
-- here. Likes/saves use INSERT ... ON CONFLICT DO NOTHING, never UPDATE.
revoke all on public.community_post_likes, public.community_post_saves from public, anon, authenticated, service_role;
grant select, insert, delete on public.community_post_likes, public.community_post_saves to service_role;
comment on table public.community_post_likes is 'Private like state. Only guarded server endpoints may read or mutate a verified viewer state.';
comment on table public.community_post_saves is 'Private saved posts. Never exposes one user bookmarks to another user.';
