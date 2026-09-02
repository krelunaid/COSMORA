create table if not exists public.platform_fee_rules (
  id uuid primary key default gen_random_uuid(),
  transaction_kind text not null check (transaction_kind in ('sale', 'rental', 'commission')),
  rate_bps integer not null check (rate_bps between 0 and 10000),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists platform_fee_rules_active_kind_idx
  on public.platform_fee_rules (transaction_kind)
  where effective_to is null;

insert into public.platform_fee_rules (transaction_kind, rate_bps)
values ('sale', 1000), ('rental', 1200), ('commission', 1000)
on conflict do nothing;

create table if not exists public.seller_payment_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id text unique,
  account_type text not null default 'express',
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  country text,
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id),
  seller_id uuid not null references auth.users(id),
  transaction_kind text not null check (transaction_kind in ('sale', 'rental', 'commission')),
  currency text not null default 'EUR',
  amount_cents integer not null check (amount_cents >= 0),
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  fee_rate_bps integer not null,
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  seller_net_cents integer not null check (seller_net_cents >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_transfer_id text,
  status text not null default 'pending',
  fee_policy_version text not null default '2026-09-02',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_fee_rules enable row level security;
alter table public.seller_payment_accounts enable row level security;
alter table public.marketplace_orders enable row level security;

create policy "Public can read active fee rules"
  on public.platform_fee_rules for select
  using (effective_to is null);

create policy "Sellers can read their payment account"
  on public.seller_payment_accounts for select
  using (auth.uid() = user_id);

create policy "Order participants can read orders"
  on public.marketplace_orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

comment on column public.marketplace_orders.deposit_cents is
  'Refundable rental security amount. Excluded from COSMORA revenue and platform fee calculations.';
