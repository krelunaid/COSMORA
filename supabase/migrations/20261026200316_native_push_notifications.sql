-- Device tokens are private: only the authenticated Edge Function and operator can access them.
create table public.push_devices (
  installation_id uuid primary key,
  secret_hash text not null check (secret_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios','android')),
  token text not null unique check (length(token) between 32 and 4096),
  locale text not null check (locale in ('it','en','de','fr','es')),
  consent_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_devices_user_idx on public.push_devices(user_id);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from public, anon, authenticated;
grant all on public.push_devices to service_role;

create table public.push_deliveries (
  campaign text not null,
  installation_id uuid not null references public.push_devices(installation_id) on delete cascade,
  status text not null check (status in ('sending','accepted','failed','unknown')),
  provider_id text,
  updated_at timestamptz not null default now(),
  primary key (campaign, installation_id)
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from public, anon, authenticated;
grant all on public.push_deliveries to service_role;

create or replace function public.register_push_device(p_id uuid, p_secret text, p_user uuid, p_platform text, p_token text, p_locale text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  -- Serialize account switches and token refreshes for this installation.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  if exists (select 1 from public.push_devices where installation_id = p_id and secret_hash <> p_secret) then
    raise exception 'Installation cannot be reassigned';
  end if;
  if (select count(*) from public.push_devices where user_id=p_user and installation_id<>p_id) >= 20 then
    raise exception 'Device limit';
  end if;
  -- A reinstall can obtain an existing provider token; only one registration should receive it.
  delete from public.push_devices where token=p_token and installation_id<>p_id;
  insert into public.push_devices(installation_id,secret_hash,user_id,platform,token,locale)
  values(p_id,p_secret,p_user,p_platform,p_token,p_locale)
  on conflict(installation_id) do update set user_id=excluded.user_id,platform=excluded.platform,token=excluded.token,locale=excluded.locale,updated_at=now(),
    consent_at=case when push_devices.user_id<>excluded.user_id then now() else push_devices.consent_at end;
end $$;
revoke all on function public.register_push_device(uuid,text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.register_push_device(uuid,text,uuid,text,text,text) to service_role;
