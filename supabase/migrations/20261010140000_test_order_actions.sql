begin;

-- The same parent-order lock is held by cosmora_reconcile_test_dispute.
-- This serializes fulfillment decisions with dispute creation/status updates.
create function public.cosmora_apply_test_order_action(
  p_order_id uuid,
  p_actor_id uuid,
  p_version integer,
  p_action text,
  p_carrier text default null,
  p_tracking_number text default null,
  p_reason text default null
) returns integer
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  target_order public.marketplace_orders;
  normalized_carrier text := btrim(p_carrier);
  normalized_tracking text := btrim(p_tracking_number);
  normalized_reason text := btrim(p_reason);
begin
  if p_order_id is null or p_actor_id is null or p_version is null
    or p_version < 0 or p_version >= 2147483647 or p_action is null
    or p_action not in ('ship', 'received', 'report') then
    raise exception 'ORDER_ACTION_INVALID';
  end if;
  if (p_action = 'ship' and (
      normalized_carrier is null or char_length(normalized_carrier) not between 2 and 80
      or normalized_tracking is null or char_length(normalized_tracking) not between 3 and 120
      or p_reason is not null))
    or (p_action = 'received' and (p_carrier is not null or p_tracking_number is not null or p_reason is not null))
    or (p_action = 'report' and (
      normalized_reason is null or char_length(normalized_reason) not between 10 and 2000
      or p_carrier is not null or p_tracking_number is not null)) then
    raise exception 'ORDER_ACTION_INVALID';
  end if;

  select * into target_order from public.marketplace_orders
    where id = p_order_id for update;
  if not found then raise exception 'ORDER_ACTION_NOT_FOUND'; end if;
  -- Preserve participant-only visibility even when the caller guesses an ID.
  if p_actor_id <> target_order.buyer_id and p_actor_id <> target_order.seller_id then
    raise exception 'ORDER_ACTION_NOT_FOUND';
  end if;
  if target_order.is_test is distinct from true then raise exception 'ORDER_ACTION_TEST_ONLY'; end if;
  if (p_action = 'ship' and p_actor_id <> target_order.seller_id)
    or (p_action in ('received', 'report') and p_actor_id <> target_order.buyer_id) then
    raise exception 'ORDER_ACTION_FORBIDDEN';
  end if;
  if target_order.status is distinct from 'paid' then raise exception 'ORDER_ACTION_UNPAID'; end if;
  if target_order.fulfillment_version is distinct from p_version then
    raise exception 'ORDER_ACTION_VERSION_CONFLICT';
  end if;
  -- Lost disputes stay blocked even though they are terminal: the funds were lost.
  -- Unknown future dispute statuses stay blocked until explicitly classified.
  if exists (select 1 from public.marketplace_payment_disputes
    where order_id = p_order_id and status not in ('won', 'warning_closed', 'prevented')) then
    raise exception 'ORDER_ACTION_DISPUTED';
  end if;
  -- Refund reservation uses this same order lock. A processing/uncertain refund
  -- blocks fulfillment even before the order's settled payment status changes.
  -- A succeeded ledger entry also blocks while this order is still paid: ledger
  -- persistence may finish before the order amount/status reconciliation, or the
  -- latter may fail. Never interpret that intermediate state as no refund.
  if exists (select 1 from public.marketplace_refund_requests where order_id = p_order_id
    and status in ('reserved', 'processing', 'pending', 'requires_action', 'unknown', 'manual_review', 'succeeded')) then
    raise exception 'ORDER_ACTION_REFUND_PENDING';
  end if;

  if p_action = 'ship' then
    if target_order.fulfillment_status is distinct from 'awaiting_shipment' or target_order.issue_opened_at is not null then
      raise exception 'ORDER_ACTION_SHIP_UNAVAILABLE';
    end if;
    update public.marketplace_orders set fulfillment_status = 'shipped',
      carrier = normalized_carrier, tracking_number = normalized_tracking,
      fulfillment_version = p_version + 1, updated_at = now()
      where id = p_order_id;
  elsif p_action = 'received' then
    if target_order.fulfillment_status is distinct from 'shipped' then
      raise exception 'ORDER_ACTION_NOT_SHIPPED';
    end if;
    update public.marketplace_orders set fulfillment_status = 'delivered',
      fulfillment_version = p_version + 1, updated_at = now()
      where id = p_order_id;
  else
    if target_order.issue_opened_at is not null then raise exception 'ORDER_ACTION_ALREADY_REPORTED'; end if;
    update public.marketplace_orders set issue_reason = normalized_reason, issue_opened_at = now(),
      fulfillment_version = p_version + 1, updated_at = now()
      where id = p_order_id;
  end if;
  return p_version + 1;
end;
$$;

revoke all on function public.cosmora_apply_test_order_action(uuid,uuid,integer,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.cosmora_apply_test_order_action(uuid,uuid,integer,text,text,text,text)
  to service_role;

comment on function public.cosmora_apply_test_order_action(uuid,uuid,integer,text,text,text,text) is
  'Server-only test fulfillment transitions. Requires an authenticated participant, current order version, paid state and no active mirrored payment dispute.';

commit;
