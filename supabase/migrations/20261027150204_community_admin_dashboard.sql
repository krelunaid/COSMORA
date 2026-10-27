-- Read-only operator projection. Only the Edge Function's service role can
-- call it; no table access or additional privileges are granted to app users.
create or replace function public.cosmora_admin_dashboard(p_search text default '', p_page integer default 1)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '7s'
as $$
declare
  v_today date := (now() at time zone 'Europe/Rome')::date;
  v_start_7 timestamptz := ((v_today - 6)::timestamp at time zone 'Europe/Rome');
  v_start_30 timestamptz := ((v_today - 29)::timestamp at time zone 'Europe/Rome');
  v_search text := lower(coalesce(p_search, ''));
  v_result jsonb;
begin
  if p_page is null or p_page < 1 or p_page > 10000 or char_length(coalesce(p_search, '')) > 100 then
    raise exception using errcode = '22023', message = 'Invalid dashboard query';
  end if;

  -- Auth is authoritative, including accounts without a public profile.
  -- Test/review accounts remain included. Anonymous and deleted identities do not.
  with users as materialized (
    select u.id, u.email, p.display_name, p.country, u.created_at, u.last_sign_in_at,
      u.email_confirmed_at is not null as email_confirmed,
      coalesce(m.suspended, false) as suspended,
      coalesce(u.raw_app_meta_data -> 'deletion_pending' = 'true'::jsonb, false) as deletion_pending,
      u.raw_app_meta_data
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.user_moderation m on m.user_id = u.id
    where u.is_anonymous is not true and u.deleted_at is null
  ), filtered as materialized (
    select * from users u
    where v_search = ''
      or strpos(lower(coalesce(u.email, '')), v_search) > 0
      or strpos(lower(coalesce(u.display_name, '')), v_search) > 0
      or strpos(u.id::text, v_search) > 0
  ), page_users as (
    select * from filtered order by created_at desc nulls last, id
    limit 25 offset ((p_page - 1) * 25)
  ), registration_counts as (
    select (created_at at time zone 'Europe/Rome')::date as day, count(*) as total
    from users where created_at >= v_start_30 and created_at <= now()
    group by 1
  ), days as (
    select v_today - 29 + n as day from generate_series(0, 29) n
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'timezone', 'Europe/Rome',
    'summary', (select jsonb_build_object(
      'totalUsers', count(*),
      'confirmedUsers', count(*) filter (where email_confirmed),
      'newUsers7d', count(*) filter (where created_at >= v_start_7 and created_at <= now()),
      'newUsers30d', count(*) filter (where created_at >= v_start_30 and created_at <= now()),
      -- Counts accounts with a recent authentication, not sessions or daily usage.
      'signIns30d', count(*) filter (where last_sign_in_at >= v_start_30 and last_sign_in_at <= now()),
      'posts', (select count(*) from public.community_posts),
      'listings', (select count(*) from public.listings),
      'squads', (select count(*) from public.squads),
      'meetups', (select count(*) from public.meetups),
      'openReports', (select count(*) from public.reports where status in ('OPEN', 'REVIEWING')),
      'pushDevices', (select count(*) from public.push_devices),
      'pushIOS', (select count(*) from public.push_devices where platform = 'ios'),
      'pushAndroid', (select count(*) from public.push_devices where platform = 'android')
    ) from users),
    'registrations', (select jsonb_agg(jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'), 'count', coalesce(r.total, 0)
    ) order by d.day) from days d left join registration_counts r on r.day = d.day),
    'users', jsonb_build_object(
      'page', p_page, 'pageSize', 25, 'total', (select count(*) from filtered),
      'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', u.id, 'email', u.email, 'displayName', u.display_name, 'country', u.country,
        'createdAt', u.created_at, 'lastSignInAt', u.last_sign_in_at,
        'emailConfirmed', u.email_confirmed, 'suspended', u.suspended, 'deletionPending', u.deletion_pending,
        'providers', coalesce((select jsonb_agg(provider order by provider) from (
          select distinct value #>> '{}' as provider
          from jsonb_array_elements(case
            when jsonb_typeof(u.raw_app_meta_data -> 'providers') = 'array' then u.raw_app_meta_data -> 'providers'
            else '[]'::jsonb end)
          where jsonb_typeof(value) = 'string'
        ) provider_names), '[]'::jsonb)
      ) order by u.created_at desc nulls last, u.id) from page_users u), '[]'::jsonb)
    )
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.cosmora_admin_dashboard(text, integer) from public, anon, authenticated;
grant execute on function public.cosmora_admin_dashboard(text, integer) to service_role;
comment on function public.cosmora_admin_dashboard(text, integer) is
  'Private read-only COSMORA dashboard. Service role only; caller authorization is verified by community-admin Edge Function. Includes test/review accounts.';
