create table if not exists public.seller_details (
 user_id uuid primary key references auth.users(id) on delete cascade,
 seller_type text not null check(seller_type in ('private','shop')),
 country_code text not null check(country_code ~ '^[A-Z]{2}$'),
 details jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.seller_details enable row level security;
revoke all on public.seller_details from anon, authenticated;
grant select on public.seller_details to authenticated;
grant all on public.seller_details to service_role;
create policy "seller reads own details" on public.seller_details for select to authenticated using (auth.uid()=user_id);
-- Mutations must pass the authenticated API's moderation, capacity and rate checks.
revoke insert, update, delete on public.squads, public.squad_members, public.community_posts, public.post_media, public.reports from anon, authenticated;
