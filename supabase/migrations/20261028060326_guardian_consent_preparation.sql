-- PREPARATION ONLY. Not applied or enabled by this change.
-- Existing community/API/RLS access is intentionally unchanged: see the rollout
-- checklist before enabling any client gate or backend workflow.
begin;
create schema if not exists cosmora_private;
revoke all on schema cosmora_private from public, anon, authenticated;
grant usage on schema cosmora_private to service_role;

create table cosmora_private.guardian_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  guardian_email text not null check (char_length(guardian_email) between 5 and 254),
  declared_age smallint not null check (declared_age between 13 and 17),
  locale text not null check (locale in ('it','en','fr','de','es')),
  state text not null check (state in ('pending_request','email_verified','pending_review','approved','denied','revoked')),
  notice_version text not null,
  email_token_hash text unique check (email_token_hash is null or email_token_hash ~ '^[0-9a-f]{64}$'),
  email_expires_at timestamptz,
  consent_token_hash text unique check (consent_token_hash is null or consent_token_hash ~ '^[0-9a-f]{64}$'),
  consent_expires_at timestamptz,
  email_verified_at timestamptz,
  consent_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  responsibility_checked boolean not null default false,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table cosmora_private.guardian_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references cosmora_private.guardian_requests(id) on delete cascade,
  state text not null,
  actor_id uuid references auth.users(id) on delete set null,
  notice_version text not null,
  reason text,
  created_at timestamptz not null default now()
);
-- Empty until a verified owner UID is explicitly configured server-side.
create table cosmora_private.guardian_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false
);
create table cosmora_private.guardian_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table cosmora_private.guardian_requests enable row level security;
alter table cosmora_private.guardian_events enable row level security;
alter table cosmora_private.guardian_reviewers enable row level security;
alter table cosmora_private.guardian_rate_limits enable row level security;
revoke all on all tables in schema cosmora_private from public, anon, authenticated;
revoke all on all sequences in schema cosmora_private from public, anon, authenticated;
grant all on all tables in schema cosmora_private to service_role;
grant usage, select on all sequences in schema cosmora_private to service_role;

create function public.cosmora_guardian_rate_limit(p_key text, p_window_seconds integer, p_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_attempts integer;
begin
  if p_key !~ '^[0-9a-f]{64}$' or p_window_seconds not between 1 and 86400 or p_limit not between 1 and 1000 then
    raise exception 'INVALID_RATE_LIMIT' using errcode = '22023';
  end if;
  insert into cosmora_private.guardian_rate_limits as current (key_hash, window_start, attempts)
  values (p_key, now(), 1)
  on conflict (key_hash) do update set
    window_start = case when current.window_start + make_interval(secs => p_window_seconds) <= now() then now() else current.window_start end,
    attempts = case when current.window_start + make_interval(secs => p_window_seconds) <= now() then 1 else least(current.attempts + 1, 1001) end
  returning attempts into v_attempts;
  return v_attempts <= p_limit;
end;
$$;

-- Projection contains no token hashes. Functions are service-role only.
create function public.cosmora_guardian_record(p_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('id',r.id,'userId',r.user_id,'guardianEmail',r.guardian_email,
    'age',r.declared_age,'locale',r.locale,'state',r.state,'createdAt',r.created_at,
    'expiresAt',r.email_expires_at)
  from cosmora_private.guardian_requests r where r.id=p_id;
$$;
create function public.cosmora_guardian_status(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select public.cosmora_guardian_record(r.id) from cosmora_private.guardian_requests r where r.user_id=p_user_id;
$$;

-- Recheck the target at every transition, including unauthenticated parent POSTs.
create function public.cosmora_guardian_active_user(p_user_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from auth.users u where u.id=p_user_id and u.email_confirmed_at is not null
    and u.deleted_at is null and u.is_anonymous is not true
    and coalesce(u.raw_app_meta_data->>'deletion_pending','false')<>'true')
  and not exists (select 1 from public.user_moderation m where m.user_id=p_user_id and m.suspended);
$$;

create function public.cosmora_guardian_request(p_value jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := (p_value->>'userId')::uuid; v_id uuid; v_existing text;
  v_email text := lower(btrim(p_value->>'guardianEmail'));
  v_age integer := (p_value->>'age')::integer;
  v_expires timestamptz := (p_value->>'expiresAt')::timestamptz;
begin
  -- Serialize create/resend so no concurrent request can undo a review.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 47));
  if v_user is null or v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or v_age is null or v_age not between 13 and 17
    or p_value->>'tokenHash' is null or p_value->>'tokenHash' !~ '^[0-9a-f]{64}$'
    or p_value->>'locale' not in ('it','en','fr','de','es')
    or p_value->>'noticeVersion' <> '2026-10-28-draft'
    or v_expires is null or v_expires <= now() or v_expires > now()+interval '49 hours'
    or not exists (select 1 from auth.users u where u.id=v_user and u.email_confirmed_at is not null
      and u.deleted_at is null and u.is_anonymous is not true and lower(btrim(u.email)) <> v_email
      and coalesce(u.raw_app_meta_data->>'deletion_pending','false') <> 'true')
    or exists (select 1 from public.user_moderation m where m.user_id=v_user and m.suspended)
  then raise exception 'INVALID_GUARDIAN_REQUEST' using errcode='22023'; end if;
  select state into v_existing from cosmora_private.guardian_requests where user_id=v_user for update;
  if found and v_existing not in ('pending_request','email_verified') then
    raise exception 'CONTACT_SUPPORT' using errcode='42501';
  end if;
  insert into cosmora_private.guardian_requests (user_id,guardian_email,declared_age,locale,state,notice_version,email_token_hash,email_expires_at)
  values (v_user,v_email,v_age,p_value->>'locale','pending_request',p_value->>'noticeVersion',p_value->>'tokenHash',v_expires)
  on conflict (user_id) do update set guardian_email=excluded.guardian_email,declared_age=excluded.declared_age,
    locale=excluded.locale,state='pending_request',notice_version=excluded.notice_version,email_token_hash=excluded.email_token_hash,
    email_expires_at=excluded.email_expires_at,consent_token_hash=null,consent_expires_at=null,email_verified_at=null,consent_at=null,updated_at=now()
  returning id into v_id;
  insert into cosmora_private.guardian_events(request_id,state,actor_id,notice_version)
    values(v_id,'pending_request',v_user,p_value->>'noticeVersion');
  return public.cosmora_guardian_record(v_id);
end;
$$;

create function public.cosmora_guardian_verify(p_token_hash text, p_consent_hash text, p_expires_at timestamptz)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_version text;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_consent_hash !~ '^[0-9a-f]{64}$'
    or p_token_hash is null or p_consent_hash is null or p_expires_at is null
    or p_expires_at <= now() or p_expires_at > now()+interval '31 minutes' then return null; end if;
  update cosmora_private.guardian_requests set state='email_verified',email_verified_at=now(),email_token_hash=null,
    email_expires_at=null,consent_token_hash=p_consent_hash,consent_expires_at=p_expires_at,updated_at=now()
  where email_token_hash=p_token_hash and state='pending_request' and email_expires_at > now()
    and public.cosmora_guardian_active_user(user_id)
  returning id,notice_version into v_id,v_version;
  if v_id is null then return null; end if;
  insert into cosmora_private.guardian_events(request_id,state,notice_version) values(v_id,'email_verified',v_version);
  return public.cosmora_guardian_record(v_id);
end;
$$;

create function public.cosmora_guardian_consent(p_consent_hash text, p_notice_version text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  if p_consent_hash is null or p_consent_hash !~ '^[0-9a-f]{64}$' or p_notice_version is distinct from '2026-10-28-draft' then return null; end if;
  update cosmora_private.guardian_requests set state='pending_review',consent_at=now(),consent_token_hash=null,
    consent_expires_at=null,updated_at=now()
  where consent_token_hash=p_consent_hash and state='email_verified' and consent_expires_at>now()
    and email_verified_at is not null and notice_version=p_notice_version
    and public.cosmora_guardian_active_user(user_id)
  returning id into v_id;
  if v_id is null then return null; end if;
  insert into cosmora_private.guardian_events(request_id,state,notice_version)
    values(v_id,'pending_review',p_notice_version);
  return public.cosmora_guardian_record(v_id);
end;
$$;

create function public.cosmora_guardian_review(p_value jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_reviewer uuid := (p_value->>'reviewerId')::uuid; v_id uuid;
  v_decision text := p_value->>'decision'; v_expected text := p_value->>'expectedState';
  v_reason text := btrim(p_value->>'reason');
  v_checked boolean := coalesce((p_value->>'responsibilityChecked')::boolean,false);
  v_version text;
begin
  if not exists (select 1 from cosmora_private.guardian_reviewers r join auth.users u on u.id=r.user_id
    where r.user_id=v_reviewer and r.enabled and u.email_confirmed_at is not null and u.deleted_at is null
      and coalesce(u.raw_app_meta_data->>'deletion_pending','false')<>'true'
      and (u.raw_app_meta_data->>'cosmora_role'='admin' or u.raw_app_meta_data->>'cosmora_dashboard_access'='true'))
    or exists (select 1 from public.user_moderation m where m.user_id=v_reviewer and m.suspended)
  then raise exception 'REVIEW_FORBIDDEN' using errcode='42501'; end if;
  if v_decision is null or v_expected is null or v_reason is null or char_length(v_reason) not between 20 and 1000
    or not ((v_expected='pending_review' and v_decision in ('approved','denied')) or (v_expected='approved' and v_decision='revoked'))
    or (v_decision='approved' and not v_checked) then return null; end if;
  update cosmora_private.guardian_requests set state=v_decision,reviewed_at=now(),reviewed_by=v_reviewer,
    responsibility_checked=case when v_decision='approved' then v_checked else responsibility_checked end,
    review_reason=v_reason,email_token_hash=null,email_expires_at=null,
    consent_token_hash=null,consent_expires_at=null,updated_at=now()
  where id=(p_value->>'requestId')::uuid and state=v_expected and email_verified_at is not null and consent_at is not null
    and user_id<>v_reviewer
    and (v_decision='revoked' or public.cosmora_guardian_active_user(user_id))
  returning id,notice_version into v_id,v_version;
  if v_id is null then return null; end if;
  insert into cosmora_private.guardian_events(request_id,state,actor_id,notice_version,reason)
    values(v_id,v_decision,v_reviewer,v_version,v_reason);
  return public.cosmora_guardian_record(v_id);
end;
$$;

revoke all on function public.cosmora_guardian_rate_limit(text,integer,integer), public.cosmora_guardian_record(uuid),
  public.cosmora_guardian_status(uuid), public.cosmora_guardian_active_user(uuid), public.cosmora_guardian_request(jsonb), public.cosmora_guardian_verify(text,text,timestamptz),
  public.cosmora_guardian_consent(text,text), public.cosmora_guardian_review(jsonb) from public,anon,authenticated;
grant execute on function public.cosmora_guardian_rate_limit(text,integer,integer), public.cosmora_guardian_record(uuid),
  public.cosmora_guardian_status(uuid), public.cosmora_guardian_active_user(uuid), public.cosmora_guardian_request(jsonb), public.cosmora_guardian_verify(text,text,timestamptz),
  public.cosmora_guardian_consent(text,text), public.cosmora_guardian_review(jsonb) to service_role;
commit;
