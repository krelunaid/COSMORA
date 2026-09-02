create extension if not exists pgcrypto;

create type public.community_status as enum ('DRAFT','PENDING_REVIEW','ACTIVE','FULL','ARCHIVED','SUSPENDED','REMOVED');
create type public.squad_role as enum ('OWNER','MODERATOR','MEMBER');
create type public.report_status as enum ('OPEN','REVIEWING','RESOLVED','DISMISSED');

create table public.post_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.post_categories(id),
  caption text not null check (char_length(caption) between 1 and 2000),
  country_code text,
  language_code text,
  status public.community_status not null default 'PENDING_REVIEW',
  risk_score numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('IMAGE','VIDEO')),
  sort_order integer not null default 0
);

create table public.post_links (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  link_type text not null check (link_type in ('PRODUCT','CREATOR','SELLER','EVENT','SQUAD','MEETUP','COMMISSION','COLLECTION')),
  target_id uuid not null,
  unique(post_id, link_type, target_id)
);

create table public.squads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 4 and 100),
  squad_type text not null check (squad_type in ('COSPLAY_SQUAD','EVENT_MEETUP','PHOTO_MEETUP','COSPLAY_CONTEST_TEAM','TRAVEL_GROUP_FOR_EVENT')),
  description text not null,
  cover_path text,
  fandom text,
  city text not null,
  starts_at timestamptz not null,
  approximate_location text not null,
  max_members integer check (max_members is null or max_members between 2 and 500),
  is_private boolean not null default false,
  approval_required boolean not null default false,
  rules text not null,
  status public.community_status not null default 'PENDING_REVIEW',
  archive_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.squad_members (
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.squad_role not null default 'MEMBER',
  membership_status text not null default 'PENDING' check (membership_status in ('PENDING','ACTIVE','DECLINED','REMOVED')),
  applied_character text,
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create table public.squad_roles (
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.squad_role not null,
  primary key (squad_id, user_id)
);

create table public.squad_character_slots (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  character_name text not null,
  assigned_user_id uuid references auth.users(id),
  unique(squad_id, character_name)
);

create table public.meetups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  meetup_type text not null,
  city text,
  starts_at timestamptz not null,
  approximate_location text not null,
  description text not null,
  max_participants integer,
  rules text not null,
  status public.community_status not null default 'PENDING_REVIEW',
  created_at timestamptz not null default now()
);

create table public.meetup_attendees (
  meetup_id uuid not null references public.meetups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'PENDING',
  primary key (meetup_id, user_id)
);

create table public.event_squads (event_id uuid not null, squad_id uuid not null references public.squads(id) on delete cascade, primary key(event_id, squad_id));
create table public.event_meetups (event_id uuid not null, meetup_id uuid not null references public.meetups(id) on delete cascade, primary key(event_id, meetup_id));

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('POST','SQUAD','MEETUP','USER')),
  target_id uuid not null,
  reason text not null check (reason in ('SPAM','SCAM','HARASSMENT','SEXUAL_CONTENT','VIOLENCE','HATE','COPYRIGHT','COUNTERFEIT','OFF_TOPIC','OTHER')),
  details text,
  status public.report_status not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references auth.users(id),
  target_type text not null,
  target_id uuid not null,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.user_blocks (blocker_id uuid references auth.users(id) on delete cascade, blocked_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now(), primary key(blocker_id, blocked_id));
create table public.user_mutes (muter_id uuid references auth.users(id) on delete cascade, muted_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now(), primary key(muter_id, muted_id));

alter table public.community_posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_links enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.squad_roles enable row level security;
alter table public.squad_character_slots enable row level security;
alter table public.meetups enable row level security;
alter table public.meetup_attendees enable row level security;
alter table public.reports enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;

create policy "active posts are readable" on public.community_posts for select using (status = 'ACTIVE' or author_id = auth.uid());
create policy "authors create posts" on public.community_posts for insert with check (author_id = auth.uid());
create policy "authors edit own posts" on public.community_posts for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors delete own posts" on public.community_posts for delete using (author_id = auth.uid());
create policy "post media follows ownership" on public.post_media for all using (exists(select 1 from public.community_posts p where p.id = post_id and p.author_id = auth.uid())) with check (exists(select 1 from public.community_posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "post links follow ownership" on public.post_links for all using (exists(select 1 from public.community_posts p where p.id = post_id and p.author_id = auth.uid())) with check (exists(select 1 from public.community_posts p where p.id = post_id and p.author_id = auth.uid()));

create policy "active squads are readable" on public.squads for select using (status in ('ACTIVE','FULL','ARCHIVED') or owner_id = auth.uid());
create policy "owners create squads" on public.squads for insert with check (owner_id = auth.uid());
create policy "owners edit squads" on public.squads for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete draft squads" on public.squads for delete using (owner_id = auth.uid() and status = 'DRAFT');
create policy "members view squad membership" on public.squad_members for select using (user_id = auth.uid() or exists(select 1 from public.squads s where s.id = squad_id and s.owner_id = auth.uid()));
create policy "users request membership" on public.squad_members for insert with check (user_id = auth.uid() and role = 'MEMBER');
create policy "owners manage membership" on public.squad_members for update using (exists(select 1 from public.squads s where s.id = squad_id and s.owner_id = auth.uid()));
create policy "owners manage roles" on public.squad_roles for all using (exists(select 1 from public.squads s where s.id = squad_id and s.owner_id = auth.uid())) with check (exists(select 1 from public.squads s where s.id = squad_id and s.owner_id = auth.uid()));
create policy "owners manage character slots" on public.squad_character_slots for all using (exists(select 1 from public.squads s where s.id = squad_id and s.owner_id = auth.uid())) with check (exists(select 1 from public.squads s where s.id = squad_id and s.owner_id = auth.uid()));

create policy "active meetups are readable" on public.meetups for select using (status in ('ACTIVE','FULL','ARCHIVED') or owner_id = auth.uid());
create policy "owners create meetups" on public.meetups for insert with check (owner_id = auth.uid());
create policy "owners edit meetups" on public.meetups for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "users manage attendance" on public.meetup_attendees for insert with check (user_id = auth.uid());
create policy "users and owners view attendance" on public.meetup_attendees for select using (user_id = auth.uid() or exists(select 1 from public.meetups m where m.id = meetup_id and m.owner_id = auth.uid()));

create policy "authenticated users report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "users view own reports" on public.reports for select using (reporter_id = auth.uid());
create policy "users manage own blocks" on public.user_blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "users manage own mutes" on public.user_mutes for all using (muter_id = auth.uid()) with check (muter_id = auth.uid());

create index community_posts_feed_idx on public.community_posts(status, created_at desc);
create index squads_event_search_idx on public.squads(city, starts_at, status);
create index reports_queue_idx on public.reports(status, created_at);
