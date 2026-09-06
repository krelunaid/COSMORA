alter table public.listings
  add column shipping_mode text check (shipping_mode in ('courier', 'pickup')),
  add column shipping_method text,
  add column shipping_cost_cents integer check (shipping_cost_cents between 0 and 1000000),
  add column shipping_time text;
alter table public.marketplace_orders
  add column shipping_cost_cents integer not null default 0 check (shipping_cost_cents >= 0),
  add column shipping_mode text,
  add column shipping_method text,
  add column shipping_time text;
