begin;

alter table public.marketplace_orders add column if not exists refunded_cents integer not null default 0
  check (refunded_cents >= 0 and refunded_cents <= amount_cents);

create table public.marketplace_payment_disputes (
  id text primary key check (id like 'dp\_%' escape '\'),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  stripe_account_id text not null,
  stripe_charge_id text not null,
  status text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null,
  is_test boolean not null check (is_test),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marketplace_disputes_order_idx on public.marketplace_payment_disputes(order_id, updated_at desc);
alter table public.marketplace_payment_disputes enable row level security;
revoke all on public.marketplace_payment_disputes from public, anon, authenticated;
grant all on public.marketplace_payment_disputes to service_role;

-- Contains only event identifiers, never the raw payment/customer payload.
create table public.marketplace_processed_stripe_events (
  id text primary key,
  stripe_account_id text,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.marketplace_processed_stripe_events enable row level security;
revoke all on public.marketplace_processed_stripe_events from public, anon, authenticated;
grant all on public.marketplace_processed_stripe_events to service_role;

-- Successful refunds cannot regress when older snapshots arrive concurrently.
create function public.cosmora_reconcile_test_refund(
  p_order_id uuid, p_account_id text, p_payment_intent_id text,
  p_amount_cents integer, p_currency text, p_refunded_cents integer
) returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare target_order public.marketplace_orders;
begin
  select * into target_order from public.marketplace_orders where id = p_order_id for update;
  if not found or not target_order.is_test or target_order.stripe_account_id is distinct from p_account_id
    or target_order.stripe_payment_intent_id is distinct from p_payment_intent_id
    or target_order.amount_cents is distinct from p_amount_cents
    or lower(target_order.currency) is distinct from lower(p_currency)
    or p_refunded_cents is null or p_refunded_cents < 0 or p_refunded_cents > p_amount_cents then
    raise exception 'REFUND_PAYMENT_MISMATCH';
  end if;
  if target_order.status not in ('paid', 'partially_refunded', 'refunded') then
    raise exception 'REFUND_ORDER_NOT_RECONCILED';
  end if;
  if p_refunded_cents > target_order.refunded_cents then
    update public.marketplace_orders set refunded_cents = p_refunded_cents,
      status = case when p_refunded_cents = amount_cents then 'refunded' else 'partially_refunded' end,
      updated_at = now() where id = p_order_id;
  end if;
end;
$$;
revoke all on function public.cosmora_reconcile_test_refund(uuid,text,text,integer,text,integer)
  from public, anon, authenticated;
grant execute on function public.cosmora_reconcile_test_refund(uuid,text,text,integer,text,integer) to service_role;

create function public.cosmora_reconcile_test_dispute(
  p_order_id uuid, p_dispute_id text, p_account_id text, p_charge_id text,
  p_status text, p_amount_cents integer, p_currency text
) returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare target_order public.marketplace_orders; previous public.marketplace_payment_disputes;
begin
  select * into target_order from public.marketplace_orders where id = p_order_id for update;
  if not found or not target_order.is_test or target_order.stripe_account_id is distinct from p_account_id
    or target_order.stripe_payment_intent_id is null or p_dispute_id is null or p_charge_id is null
    or p_status is null or p_amount_cents is null or p_amount_cents <= 0
    or lower(target_order.currency) is distinct from lower(p_currency) then
    raise exception 'DISPUTE_PAYMENT_MISMATCH';
  end if;
  select * into previous from public.marketplace_payment_disputes where id = p_dispute_id for update;
  if found then
    if previous.order_id <> p_order_id or previous.stripe_account_id <> p_account_id
      or previous.stripe_charge_id <> p_charge_id or previous.amount_cents <> p_amount_cents
      or lower(previous.currency) <> lower(p_currency) then raise exception 'DISPUTE_PAYMENT_MISMATCH'; end if;
    if previous.status in ('won','lost','warning_closed','prevented') and previous.status <> p_status then
      if p_status in ('won','lost','warning_closed','prevented') then raise exception 'DISPUTE_TERMINAL_CONFLICT'; end if;
      return;
    end if;
    update public.marketplace_payment_disputes set status = p_status, updated_at = now() where id = p_dispute_id;
  else
    insert into public.marketplace_payment_disputes(id,order_id,stripe_account_id,stripe_charge_id,status,amount_cents,currency,is_test)
      values(p_dispute_id,p_order_id,p_account_id,p_charge_id,p_status,p_amount_cents,lower(p_currency),true);
  end if;
end;
$$;
revoke all on function public.cosmora_reconcile_test_dispute(uuid,text,text,text,text,integer,text)
  from public, anon, authenticated;
grant execute on function public.cosmora_reconcile_test_dispute(uuid,text,text,text,text,integer,text) to service_role;

comment on column public.marketplace_orders.refunded_cents is 'Confirmed succeeded refunds only; pending requests consume the separate refund budget.';
comment on table public.marketplace_payment_disputes is 'Test dispute status mirror; no acceptance, evidence submission or promise of reimbursement.';
commit;
