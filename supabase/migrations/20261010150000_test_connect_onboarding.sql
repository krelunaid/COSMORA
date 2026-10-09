-- A single durable TEST account-creation plan per seller. No Stripe call is made here.
begin;

create table public.test_connect_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  platform_account_id text not null,
  api_version text not null,
  model_version text not null,
  request_body jsonb not null check (jsonb_typeof(request_body) = 'object'),
  state text not null default 'prepared' check (state in ('prepared', 'creating', 'manual_review', 'bound')),
  first_attempt_at timestamptz,
  stripe_account_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state = 'bound') = (stripe_account_id is not null)),
  check (state = 'prepared' or first_attempt_at is not null)
);
alter table public.test_connect_onboarding_requests enable row level security;
revoke all on public.test_connect_onboarding_requests from public, anon, authenticated;
grant all on public.test_connect_onboarding_requests to service_role;
comment on table public.test_connect_onboarding_requests is
  'Server-only TEST Connect plan. Contains frozen contact email/country; never API keys or hosted onboarding URLs. Do not delete/reset uncertain attempts to create another account.';

create function public.cosmora_guard_test_connect_plan()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.platform_account_id is distinct from old.platform_account_id or new.api_version is distinct from old.api_version
    or new.model_version is distinct from old.model_version or new.request_body is distinct from old.request_body
    or new.created_at is distinct from old.created_at
    or (old.first_attempt_at is not null and new.first_attempt_at is distinct from old.first_attempt_at)
    or (old.stripe_account_id is not null and new.stripe_account_id is distinct from old.stripe_account_id)
    or (old.state = 'prepared' and new.state not in ('prepared','creating'))
    or (old.state = 'creating' and new.state not in ('creating','manual_review','bound'))
    or (old.state = 'manual_review' and new.state not in ('manual_review','bound'))
    or (old.state = 'bound' and new.state <> 'bound') then
    raise exception 'CONNECT_PLAN_IMMUTABLE';
  end if;
  return new;
end;
$$;
create trigger test_connect_plan_immutable before update on public.test_connect_onboarding_requests
  for each row execute function public.cosmora_guard_test_connect_plan();
revoke all on function public.cosmora_guard_test_connect_plan() from public, anon, authenticated;

create function public.cosmora_prepare_test_connect(
  p_user_id uuid, p_platform_account_id text, p_api_version text, p_request_body jsonb
) returns public.test_connect_onboarding_requests
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  plan public.test_connect_onboarding_requests;
  seller public.seller_details;
  plan_id uuid := gen_random_uuid();
  model constant text := '2026-10-10-test-direct-full-v1';
begin
  if p_user_id is null or p_platform_account_id is distinct from 'acct_1U6X5C3kNaGT9OXn'
    or p_api_version is distinct from '2026-08-26.dahlia' then
    raise exception 'CONNECT_PLAN_INVALID';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cosmora-test-connect:' || p_user_id::text, 0));
  select * into plan from public.test_connect_onboarding_requests where user_id = p_user_id for update;
  if found then
    if plan.platform_account_id <> p_platform_account_id or plan.api_version <> p_api_version
      or plan.model_version <> model then raise exception 'CONNECT_PLAN_CONFLICT'; end if;
    -- Profile changes never alter a request that may already have reached Stripe.
    return plan;
  end if;
  if exists (select 1 from public.seller_payment_accounts where user_id = p_user_id and stripe_account_id is not null) then
    raise exception 'CONNECT_ACCOUNT_EXISTS';
  end if;
  select * into seller from public.seller_details where user_id = p_user_id for share;
  if not found then raise exception 'CONNECT_PROFILE_REQUIRED'; end if;
  if jsonb_typeof(p_request_body) is distinct from 'object'
    or p_request_body->>'dashboard' is distinct from 'full'
    or p_request_body#>>'{identity,country}' is distinct from seller.country_code
    or p_request_body#>>'{identity,entity_type}' is distinct from
      (case when seller.seller_type = 'shop' and seller.details->>'businessType' = 'company' then 'company' else 'individual' end)
    or p_request_body#>>'{defaults,responsibilities,fees_collector}' is distinct from 'stripe'
    or p_request_body#>>'{defaults,responsibilities,losses_collector}' is distinct from 'stripe'
    or p_request_body#>'{configuration,merchant,capabilities,card_payments,requested}' is distinct from 'true'::jsonb
    or p_request_body#>>'{metadata,cosmora_user_id}' is distinct from p_user_id::text
    or p_request_body#>>'{metadata,cosmora_connect_model}' is distinct from model
    or p_request_body#>>'{metadata,cosmora_platform_account_id}' is distinct from p_platform_account_id
    or p_request_body#>>'{metadata,cosmora_mode}' is distinct from 'test'
    or coalesce(p_request_body->>'contact_email', '') = '' then
    raise exception 'CONNECT_PLAN_INVALID';
  end if;
  insert into public.test_connect_onboarding_requests(id,user_id,platform_account_id,api_version,model_version,request_body)
    values(plan_id,p_user_id,p_platform_account_id,p_api_version,model,
      jsonb_set(p_request_body, '{metadata,cosmora_connect_request_id}', to_jsonb(plan_id::text)))
    returning * into plan;
  return plan;
end;
$$;

-- Freeze the first POST clock before the network request. Repeated calls cannot extend it.
create function public.cosmora_start_test_connect(p_user_id uuid, p_request_id uuid)
returns public.test_connect_onboarding_requests
language plpgsql security invoker set search_path = public, pg_temp as $$
declare plan public.test_connect_onboarding_requests;
begin
  perform pg_advisory_xact_lock(hashtextextended('cosmora-test-connect:' || p_user_id::text, 0));
  select * into plan from public.test_connect_onboarding_requests where user_id = p_user_id and id = p_request_id for update;
  if not found then raise exception 'CONNECT_PLAN_INVALID'; end if;
  if plan.state = 'bound' then return plan; end if;
  if plan.first_attempt_at is not null and plan.first_attempt_at <= now() - interval '23 hours' then
    update public.test_connect_onboarding_requests set state = 'manual_review', updated_at = now()
      where id = plan.id returning * into plan;
    return plan;
  end if;
  if plan.state = 'prepared' then
    update public.test_connect_onboarding_requests set state = 'creating', first_attempt_at = now(), updated_at = now()
      where id = plan.id returning * into plan;
  end if;
  return plan;
end;
$$;

-- Call only after a fresh test account was validated against the frozen plan.
-- The seller mapping and request binding are one transaction, including lost DB responses.
create function public.cosmora_bind_test_connect(p_user_id uuid, p_request_id uuid, p_account_id text)
returns public.test_connect_onboarding_requests
language plpgsql security invoker set search_path = public, pg_temp as $$
declare plan public.test_connect_onboarding_requests; existing public.seller_payment_accounts; changed integer;
begin
  if p_account_id is null or p_account_id not like 'acct\_%' escape '\' then raise exception 'CONNECT_ACCOUNT_MISMATCH'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cosmora-test-connect:' || p_user_id::text, 0));
  select * into plan from public.test_connect_onboarding_requests where user_id = p_user_id and id = p_request_id for update;
  if not found or plan.first_attempt_at is null then raise exception 'CONNECT_PLAN_INVALID'; end if;
  if plan.stripe_account_id is not null and plan.stripe_account_id <> p_account_id then raise exception 'CONNECT_ACCOUNT_MISMATCH'; end if;
  select * into existing from public.seller_payment_accounts where user_id = p_user_id for update;
  if found and existing.stripe_account_id is not null and
    (existing.stripe_account_id <> p_account_id or existing.account_type <> 'v2_direct_full') then
    raise exception 'CONNECT_ACCOUNT_EXISTS';
  end if;
  insert into public.seller_payment_accounts(user_id,stripe_account_id,account_type,country)
    values(p_user_id,p_account_id,'v2_direct_full',plan.request_body#>>'{identity,country}')
    on conflict(user_id) do update set stripe_account_id = excluded.stripe_account_id,
      account_type = excluded.account_type, country = excluded.country, updated_at = now()
      where public.seller_payment_accounts.stripe_account_id is null or
        (public.seller_payment_accounts.stripe_account_id = excluded.stripe_account_id
          and public.seller_payment_accounts.account_type = 'v2_direct_full');
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'CONNECT_ACCOUNT_EXISTS'; end if;
  update public.test_connect_onboarding_requests set stripe_account_id = p_account_id, state = 'bound', updated_at = now()
    where id = plan.id returning * into plan;
  return plan;
end;
$$;

revoke all on function public.cosmora_prepare_test_connect(uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.cosmora_start_test_connect(uuid,uuid) from public, anon, authenticated;
revoke all on function public.cosmora_bind_test_connect(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.cosmora_prepare_test_connect(uuid,text,text,jsonb) to service_role;
grant execute on function public.cosmora_start_test_connect(uuid,uuid) to service_role;
grant execute on function public.cosmora_bind_test_connect(uuid,uuid,text) to service_role;

commit;
