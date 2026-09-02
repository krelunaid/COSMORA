create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'creator', 'pro_shop')),
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null,
  category text not null,
  condition text not null,
  sale_mode text not null check (sale_mode in ('buy', 'rent', 'both')),
  sale_price_cents integer check (sale_price_cents >= 0),
  rental_price_cents integer check (rental_price_cents >= 0),
  rental_days integer check (rental_days > 0),
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  is_background_removed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select using (true);
create policy "Users update their profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Active listings are publicly readable"
  on public.listings for select using (status = 'active' or auth.uid() = seller_id);
create policy "Sellers create listings"
  on public.listings for insert with check (auth.uid() = seller_id);
create policy "Sellers update listings"
  on public.listings for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "Listing images follow listing visibility"
  on public.listing_images for select using (
    exists (
      select 1 from public.listings
      where listings.id = listing_images.listing_id
        and (listings.status = 'active' or listings.seller_id = auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public listing images are readable"
  on storage.objects for select using (bucket_id = 'listing-images');
create policy "Users upload listing images to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users manage their listing images"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete their listing images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Data API privileges. Row Level Security policies above still decide which
-- records each browser or authenticated user can access.
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant all privileges on sequences to service_role;
