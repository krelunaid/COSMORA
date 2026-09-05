create table public.saved_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  kind text not null check (kind in ('cart', 'favorite')),
  created_at timestamptz not null default now(),
  primary key(user_id, listing_id, kind)
);
alter table public.saved_items enable row level security;
revoke all on public.saved_items from anon, authenticated;
grant select on public.saved_items to authenticated;
grant all on public.saved_items to service_role;
create policy saved_items_owner_read on public.saved_items for select to authenticated using ((select auth.uid()) = user_id);
create index saved_items_listing_idx on public.saved_items(listing_id);

alter table public.marketplace_orders
  add column listing_id uuid references public.listings(id) on delete set null,
  add column item_title text,
  add column is_test boolean not null default true,
  add column checkout_key uuid,
  add column stripe_account_id text;
create unique index marketplace_order_checkout_key on public.marketplace_orders(buyer_id, checkout_key);
create index marketplace_orders_listing_idx on public.marketplace_orders(listing_id);
revoke insert, update, delete on public.marketplace_orders from anon, authenticated;
comment on column public.marketplace_orders.is_test is 'Test orders never reserve stock, trigger shipping, or represent a commercial purchase.';
