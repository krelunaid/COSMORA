-- Preparation only: does not enable payments or rewrite historical orders.
begin;

alter table public.platform_fee_rules
  add column if not exists policy_version text;

-- Serialize the close-and-insert operation, including repeated manual application.
lock table public.platform_fee_rules in share row exclusive mode;

do $$
declare
  new_policy constant text := '2026-10-09-sale-5pct';
  transition_at timestamptz := transaction_timestamp();
begin
  if exists (
    select 1 from public.platform_fee_rules
    where transaction_kind = 'sale' and policy_version = new_policy
  ) then
    if exists (
      select 1 from public.platform_fee_rules
      where transaction_kind = 'sale' and policy_version = new_policy and rate_bps <> 500
    ) then
      raise exception 'Existing COSMORA sale policy has an unexpected rate';
    end if;
    -- A later policy may already be active. Never reactivate this one on a rerun.
    return;
  end if;

  update public.platform_fee_rules
  set effective_to = transition_at
  where transaction_kind = 'sale' and effective_to is null;

  insert into public.platform_fee_rules (
    transaction_kind, rate_bps, effective_from, policy_version
  ) values ('sale', 500, transition_at, new_policy);
end;
$$;

comment on column public.marketplace_orders.seller_net_cents is
  'Order amount after the COSMORA application fee and before Stripe processing costs. Not the final payout. Historical order amounts are preserved.';

commit;
