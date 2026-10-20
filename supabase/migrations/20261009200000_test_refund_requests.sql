-- Durable, server-only requests for TEST direct-charge refunds. No payment gate changes.
create table public.marketplace_refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  request_id uuid not null,
  actor_id uuid not null,
  mode text not null check (mode in ('partial', 'remaining')),
  requested_amount_cents integer,
  amount_cents integer check (amount_cents > 0),
  stripe_account_id text not null,
  stripe_payment_intent_id text not null,
  stripe_charge_id text,
  stripe_refund_id text,
  refund_application_fee boolean not null,
  status text not null default 'reserved' check (status in (
    'reserved', 'processing', 'pending', 'requires_action', 'unknown',
    'manual_review', 'succeeded', 'failed', 'canceled', 'rejected'
  )),
  first_attempt_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, request_id),
  check ((mode = 'partial' and requested_amount_cents is not null and requested_amount_cents > 0)
    or (mode = 'remaining' and requested_amount_cents is null)),
  check (status not in ('processing', 'pending', 'requires_action', 'unknown', 'succeeded', 'failed', 'canceled')
    or (amount_cents is not null and stripe_charge_id is not null and first_attempt_at is not null))
);

create unique index marketplace_refund_requests_stripe_id
  on public.marketplace_refund_requests (stripe_account_id, stripe_refund_id)
  where stripe_refund_id is not null;
-- A lost response/pending refund keeps this slot until its actual result is known.
create unique index marketplace_refund_requests_one_active
  on public.marketplace_refund_requests (order_id)
  where status in ('reserved', 'processing', 'pending', 'requires_action', 'unknown', 'manual_review');

alter table public.marketplace_refund_requests enable row level security;
revoke all on public.marketplace_refund_requests from public, anon, authenticated;
grant all on public.marketplace_refund_requests to service_role;

create function public.cosmora_reserve_test_refund(
  p_order_id uuid, p_actor_id uuid, p_request_id uuid,
  p_mode text, p_requested_amount_cents integer default null
) returns public.marketplace_refund_requests
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  v_order public.marketplace_orders;
  v_request public.marketplace_refund_requests;
begin
  if p_order_id is null or p_request_id is null or p_actor_id is null or p_mode is null or p_mode not in ('partial', 'remaining')
    or (p_mode = 'partial' and (p_requested_amount_cents is null or p_requested_amount_cents <= 0))
    or (p_mode = 'remaining' and p_requested_amount_cents is not null) then
    raise exception 'REFUND_INVALID_REQUEST';
  end if;
  select * into v_order from public.marketplace_orders where id = p_order_id for update;
  if not found or v_order.seller_id <> p_actor_id then raise exception 'REFUND_FORBIDDEN'; end if;
  if not v_order.is_test then raise exception 'REFUND_TEST_ONLY'; end if;

  select * into v_request from public.marketplace_refund_requests
    where order_id = p_order_id and request_id = p_request_id;
  if found then
    if v_request.actor_id <> p_actor_id or v_request.mode <> p_mode
      or v_request.requested_amount_cents is distinct from p_requested_amount_cents
      or v_request.stripe_account_id is distinct from v_order.stripe_account_id
      or v_request.stripe_payment_intent_id is distinct from v_order.stripe_payment_intent_id then
      raise exception 'REFUND_REQUEST_CONFLICT';
    end if;
    return v_request;
  end if;

  if v_order.status not in ('paid', 'partially_refunded')
    or v_order.stripe_account_id is null or v_order.stripe_payment_intent_id is null then
    raise exception 'REFUND_ORDER_UNAVAILABLE';
  end if;
  if exists (select 1 from public.marketplace_refund_requests where order_id = p_order_id
    and status in ('reserved', 'processing', 'pending', 'requires_action', 'unknown', 'manual_review')) then
    raise exception 'REFUND_IN_PROGRESS';
  end if;
  insert into public.marketplace_refund_requests
    (order_id, request_id, actor_id, mode, requested_amount_cents,
     stripe_account_id, stripe_payment_intent_id, refund_application_fee)
    values (p_order_id, p_request_id, p_actor_id, p_mode, p_requested_amount_cents,
      v_order.stripe_account_id, v_order.stripe_payment_intent_id, v_order.platform_fee_cents > 0)
    returning * into v_request;
  return v_request;
end;
$$;
revoke all on function public.cosmora_reserve_test_refund(uuid, uuid, uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.cosmora_reserve_test_refund(uuid, uuid, uuid, text, integer) to service_role;

comment on table public.marketplace_refund_requests is
  'Test-only refund ledger. Never replace a timed-out request with a new request ID. Unknown attempts older than the Stripe retry window require reconciliation, not another POST.';
