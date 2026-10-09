-- Isolated test inventory. These functions never update public.listings or live orders.
begin;

create table if not exists public.test_inventory_reservations (
  order_id uuid primary key references public.marketplace_orders(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  state text not null default 'reserved' check (state in ('reserved', 'consumed', 'released')),
  stripe_checkout_session_id text unique,
  stripe_session_expires_at timestamptz,
  release_reason text check (release_reason in ('expired', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz,
  check (stripe_checkout_session_id is null or left(stripe_checkout_session_id, 8) = 'cs_test_'),
  check ((state = 'released') = (release_reason is not null)),
  check ((state = 'released') = (released_at is not null)),
  check ((state = 'consumed') = (consumed_at is not null))
);

-- One unique item in the TEST inventory may be held or consumed by only one order.
create unique index if not exists test_inventory_one_claim_per_listing
  on public.test_inventory_reservations(listing_id)
  where state in ('reserved', 'consumed');

alter table public.test_inventory_reservations enable row level security;
revoke all on public.test_inventory_reservations from public, anon, authenticated;
grant all on public.test_inventory_reservations to service_role;

comment on table public.test_inventory_reservations is
  'Sandbox-only inventory ledger. Does not reserve, sell, hide, or otherwise change real listings. No automatic TTL release: a Stripe terminal state must be verified by the server.';

create or replace function public.cosmora_test_inventory_reserve(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_order public.marketplace_orders%rowtype;
  target_listing public.listings%rowtype;
  reservation public.test_inventory_reservations%rowtype;
begin
  select * into target_order from public.marketplace_orders where id = p_order_id for update;
  if not found or not target_order.is_test or target_order.transaction_kind <> 'sale'
     or target_order.listing_id is null then
    raise exception 'COSMORA_TEST_INVENTORY_INVALID_ORDER';
  end if;
  if target_order.stripe_checkout_session_id is null
     and target_order.created_at < now() - interval '23 hours' then
    -- Do not create again after Stripe may have pruned the original idempotency key.
    raise exception 'COSMORA_TEST_INVENTORY_RECOVERY_REQUIRED';
  end if;

  -- All operations lock the order first, then this listing-specific advisory lock.
  perform pg_advisory_xact_lock(hashtextextended('cosmora-test-inventory:' || target_order.listing_id::text, 0));
  select * into reservation from public.test_inventory_reservations where order_id = p_order_id for update;
  if not found then
    if target_order.status <> 'pending' then
      raise exception 'COSMORA_TEST_INVENTORY_INVALID_TRANSITION';
    end if;
    select * into target_listing from public.listings where id = target_order.listing_id for share;
    if not found or target_listing.status <> 'active' or target_listing.sale_mode = 'rent'
       or target_listing.seller_id <> target_order.seller_id
       or target_order.buyer_id = target_order.seller_id
       or target_listing.sale_price_cents is null or target_listing.sale_price_cents <= 0 then
      raise exception 'COSMORA_TEST_INVENTORY_INVALID_LISTING';
    end if;
    -- The first claim must match the current listing. Once reserved, retries keep
    -- the immutable order snapshot rather than recalculate a changed price.
    if target_listing.shipping_cost_cents is null
       or target_order.amount_cents is distinct from target_listing.sale_price_cents + target_listing.shipping_cost_cents
       or target_order.shipping_cost_cents is distinct from target_listing.shipping_cost_cents
       or target_order.shipping_mode is distinct from target_listing.shipping_mode
       or target_order.shipping_method is distinct from target_listing.shipping_method
       or target_order.shipping_time is distinct from target_listing.shipping_time then
      raise exception 'COSMORA_TEST_INVENTORY_INVALID_LISTING';
    end if;
    if exists (
      select 1 from public.test_inventory_reservations
      where listing_id = target_order.listing_id and state in ('reserved', 'consumed')
    ) then
      raise exception 'COSMORA_TEST_INVENTORY_UNAVAILABLE';
    end if;
    insert into public.test_inventory_reservations(order_id, listing_id)
      values (p_order_id, target_order.listing_id) returning * into reservation;
  elsif reservation.listing_id <> target_order.listing_id then
    raise exception 'COSMORA_TEST_INVENTORY_INVALID_ORDER';
  end if;

  return jsonb_build_object(
    'managed', true, 'orderId', p_order_id, 'listingId', reservation.listing_id,
    'state', reservation.state, 'sessionId', reservation.stripe_checkout_session_id,
    'expiresAt', reservation.stripe_session_expires_at, 'orderStatus', target_order.status,
    'releaseReason', reservation.release_reason
  );
end;
$$;

create or replace function public.cosmora_test_inventory_bind_session(
  p_order_id uuid, p_session_id text, p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_order public.marketplace_orders%rowtype;
  reservation public.test_inventory_reservations%rowtype;
begin
  if p_session_id is null or left(p_session_id, 8) <> 'cs_test_' or p_expires_at is null then
    raise exception 'COSMORA_TEST_INVENTORY_SESSION_MISMATCH';
  end if;
  select * into target_order from public.marketplace_orders where id = p_order_id for update;
  if not found or not target_order.is_test or target_order.transaction_kind <> 'sale'
     or target_order.listing_id is null then
    raise exception 'COSMORA_TEST_INVENTORY_INVALID_ORDER';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cosmora-test-inventory:' || target_order.listing_id::text, 0));
  select * into reservation from public.test_inventory_reservations where order_id = p_order_id for update;
  if not found then raise exception 'COSMORA_TEST_INVENTORY_RESERVATION_REQUIRED'; end if;
  if reservation.listing_id <> target_order.listing_id
     or (reservation.stripe_checkout_session_id is not null and reservation.stripe_checkout_session_id <> p_session_id)
     or (target_order.stripe_checkout_session_id is not null and target_order.stripe_checkout_session_id <> p_session_id)
     or (reservation.stripe_session_expires_at is not null and reservation.stripe_session_expires_at <> p_expires_at) then
    raise exception 'COSMORA_TEST_INVENTORY_SESSION_MISMATCH';
  end if;
  -- An identical bind is safe even if a webhook has already completed the order.
  if reservation.stripe_checkout_session_id is null then
    if reservation.state <> 'reserved' or target_order.status <> 'pending' then
      raise exception 'COSMORA_TEST_INVENTORY_INVALID_TRANSITION';
    end if;
    update public.test_inventory_reservations set
      stripe_checkout_session_id = p_session_id,
      stripe_session_expires_at = p_expires_at, updated_at = now()
      where order_id = p_order_id returning * into reservation;
    update public.marketplace_orders set stripe_checkout_session_id = p_session_id, updated_at = now()
      where id = p_order_id;
  end if;
  return jsonb_build_object(
    'managed', true, 'orderId', p_order_id, 'listingId', reservation.listing_id,
    'state', reservation.state, 'sessionId', reservation.stripe_checkout_session_id,
    'expiresAt', reservation.stripe_session_expires_at, 'orderStatus', target_order.status,
    'releaseReason', reservation.release_reason
  );
end;
$$;

create or replace function public.cosmora_test_inventory_finalize(
  p_order_id uuid, p_outcome text, p_session_id text, p_payment_intent_id text,
  p_account_id text, p_amount_cents integer, p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_order public.marketplace_orders%rowtype;
  reservation public.test_inventory_reservations%rowtype;
begin
  if p_outcome is null or p_outcome not in ('paid', 'expired', 'failed', 'cancelled') then
    raise exception 'COSMORA_TEST_INVENTORY_INVALID_TRANSITION';
  end if;
  select * into target_order from public.marketplace_orders where id = p_order_id for update;
  if not found or not target_order.is_test or target_order.transaction_kind <> 'sale' then
    raise exception 'COSMORA_TEST_INVENTORY_INVALID_ORDER';
  end if;
  if p_session_id is null or left(p_session_id, 8) <> 'cs_test_'
     or p_account_id is null or left(p_account_id, 5) <> 'acct_'
     or target_order.stripe_checkout_session_id is distinct from p_session_id
     or target_order.stripe_account_id is distinct from p_account_id
     or target_order.amount_cents is distinct from p_amount_cents
     or lower(target_order.currency) is distinct from lower(p_currency)
     or (p_outcome = 'paid' and (p_payment_intent_id is null or p_payment_intent_id not like 'pi\_%' escape '\')) then
    raise exception 'COSMORA_TEST_INVENTORY_SESSION_MISMATCH';
  end if;

  if target_order.listing_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('cosmora-test-inventory:' || target_order.listing_id::text, 0));
  end if;
  select * into reservation from public.test_inventory_reservations where order_id = p_order_id for update;
  if not found then
    -- Historical test orders remain reconcilable by the existing test-only code.
    return jsonb_build_object('managed', false, 'orderId', p_order_id, 'state', null, 'orderStatus', target_order.status);
  end if;
  if reservation.listing_id is distinct from target_order.listing_id
     or reservation.stripe_checkout_session_id is distinct from p_session_id then
    raise exception 'COSMORA_TEST_INVENTORY_SESSION_MISMATCH';
  end if;

  if reservation.state = 'consumed' then
    if p_outcome = 'paid' and target_order.stripe_payment_intent_id is distinct from p_payment_intent_id then
      raise exception 'COSMORA_TEST_INVENTORY_SESSION_MISMATCH';
    end if;
    -- Duplicate paid, delayed expired/failed, and post-refund events never release a consumed unit.
  elsif reservation.state = 'released' then
    if p_outcome = 'paid' then
      -- Never steal a unit already reserved for another order. Requires operator reconciliation.
      raise exception 'COSMORA_TEST_INVENTORY_RELEASED_PAYMENT_CONFLICT';
    end if;
    -- Repeated terminal events preserve the first terminal outcome.
  else
    if target_order.status <> 'pending' then
      raise exception 'COSMORA_TEST_INVENTORY_INVALID_TRANSITION';
    end if;
    if p_outcome = 'paid' then
      update public.test_inventory_reservations set state = 'consumed', consumed_at = now(), updated_at = now()
        where order_id = p_order_id returning * into reservation;
    else
      update public.test_inventory_reservations set state = 'released', release_reason = p_outcome,
        released_at = now(), updated_at = now()
        where order_id = p_order_id returning * into reservation;
    end if;
    update public.marketplace_orders set status = p_outcome,
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id), updated_at = now()
      where id = p_order_id returning * into target_order;
  end if;
  return jsonb_build_object(
    'managed', true, 'orderId', p_order_id, 'listingId', reservation.listing_id,
    'state', reservation.state, 'sessionId', reservation.stripe_checkout_session_id,
    'expiresAt', reservation.stripe_session_expires_at, 'orderStatus', target_order.status,
    'releaseReason', reservation.release_reason
  );
end;
$$;

revoke all on function public.cosmora_test_inventory_reserve(uuid) from public, anon, authenticated;
revoke all on function public.cosmora_test_inventory_bind_session(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.cosmora_test_inventory_finalize(uuid, text, text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.cosmora_test_inventory_reserve(uuid) to service_role;
grant execute on function public.cosmora_test_inventory_bind_session(uuid, text, timestamptz) to service_role;
grant execute on function public.cosmora_test_inventory_finalize(uuid, text, text, text, text, integer, text) to service_role;

commit;
