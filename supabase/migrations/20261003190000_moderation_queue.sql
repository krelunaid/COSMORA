-- Apply before deploying the moderation APIs. No client may assign a moderator role.
begin;

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('POST','SQUAD','MEETUP','USER','LISTING'));
alter table public.reports add column if not exists context_message_id uuid
  references public.direct_messages(id) on delete set null;

alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check
  check (status in ('draft','active','paused','sold','pending_review','moderated'));
-- Every marketplace write must pass the server moderation checks.
revoke insert, update, delete on public.listings, public.listing_images, public.meetups, public.profiles from anon, authenticated;
-- Uploads and replacements must also pass authenticated server guards.
drop policy if exists "Users upload listing images to their folder" on storage.objects;
drop policy if exists "Users manage their listing images" on storage.objects;
drop policy if exists "Users delete their listing images" on storage.objects;
drop policy if exists "Users upload community media to their folder" on storage.objects;
drop policy if exists "Users manage their community media" on storage.objects;
drop policy if exists "Users delete their community media" on storage.objects;
drop policy if exists "Public listing images are readable" on storage.objects;
drop policy if exists "Public community media are readable" on storage.objects;
update storage.buckets set public = false where id in ('listing-images','community-media');

create table if not exists public.user_moderation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  suspended boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.user_moderation enable row level security;
revoke all on public.user_moderation from anon, authenticated;
grant all on public.user_moderation to service_role;
alter table public.profiles add column if not exists moderation_hidden boolean not null default false;
update public.profiles p set moderation_hidden = true
  where exists (select 1 from public.user_moderation m where m.user_id = p.id and m.suspended);
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable" on public.profiles
  for select using (not moderation_hidden or auth.uid() = id);

alter table public.moderation_actions enable row level security;
revoke all on public.moderation_actions from anon, authenticated;
grant all on public.moderation_actions to service_role;
alter table public.moderation_actions add column if not exists previous_state jsonb;
alter table public.moderation_actions add column if not exists next_state jsonb;
create index if not exists moderation_actions_target_idx
  on public.moderation_actions(target_type, target_id, created_at desc);

-- Atomic decision, report closure and audit log. An API/service-role caller is
-- required, and the actor's server-managed app_metadata is checked again here.
create or replace function public.cosmora_moderation_decision(
  p_actor uuid, p_target_type text, p_target_id uuid, p_action text,
  p_reason text, p_expected_status text, p_report_ids uuid[]
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_table text;
  v_status text;
  v_next text;
  v_previous jsonb;
  v_report_ids uuid[];
  v_target_role text;
begin
  if not exists (
    select 1 from auth.users
    where id = p_actor
      and raw_app_meta_data->>'cosmora_role' in ('admin','moderator')
      and coalesce((raw_app_meta_data->>'deletion_pending')::boolean, false) = false
  ) or exists (select 1 from public.user_moderation where user_id = p_actor and suspended) then
    raise exception 'MODERATION_FORBIDDEN' using errcode = '42501';
  end if;
  if p_action not in ('APPROVE','HIDE','REJECT','RESTORE','SUSPEND','DISMISS','RESOLVE')
    or char_length(btrim(coalesce(p_reason,''))) not between 5 and 2000 then
    raise exception 'INVALID_DECISION' using errcode = '22023';
  end if;

  if p_target_type = 'USER' then
    select raw_app_meta_data->>'cosmora_role' into v_target_role
      from auth.users where id = p_target_id for update;
    if not found then
      v_status := 'MISSING';
    else
      select case when coalesce((select suspended from public.user_moderation where user_id = p_target_id), false)
        then 'SUSPENDED' else 'ACTIVE' end into v_status;
    end if;
  else
    v_table := case p_target_type
      when 'POST' then 'community_posts' when 'SQUAD' then 'squads'
      when 'MEETUP' then 'meetups' when 'LISTING' then 'listings' else null end;
    if v_table is null then raise exception 'INVALID_TARGET' using errcode = '22023'; end if;
    execute format('select status::text from public.%I where id = $1 for update', v_table)
      into v_status using p_target_id;
    v_status := coalesce(v_status, 'MISSING');
  end if;
  if v_status = 'MISSING' and p_action not in ('DISMISS','RESOLVE') then
    raise exception 'TARGET_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_status is distinct from p_expected_status then
    raise exception 'TARGET_CHANGED' using errcode = '40001';
  end if;
  v_next := v_status;

  if p_action not in ('DISMISS','RESOLVE') then
    if p_target_type = 'USER' then
      if p_action not in ('SUSPEND','RESTORE')
        or (p_action = 'SUSPEND' and (p_target_id = p_actor or v_target_role in ('admin','moderator')))
        or (p_action = 'SUSPEND' and v_status <> 'ACTIVE')
        or (p_action = 'RESTORE' and v_status <> 'SUSPENDED') then
        raise exception 'INVALID_TRANSITION' using errcode = '22023';
      end if;
      v_next := case when p_action = 'SUSPEND' then 'SUSPENDED' else 'ACTIVE' end;
      insert into public.user_moderation(user_id, suspended)
        values (p_target_id, p_action = 'SUSPEND')
        on conflict (user_id) do update set suspended = excluded.suspended, updated_at = now();
      update public.profiles set moderation_hidden = (p_action = 'SUSPEND'), updated_at = now()
        where id = p_target_id;
    else
      if p_action = 'APPROVE' then
        if v_status not in ('PENDING_REVIEW','pending_review') then
          raise exception 'INVALID_TRANSITION' using errcode = '22023';
        end if;
        v_next := case when p_target_type = 'LISTING' then 'active' else 'ACTIVE' end;
      elsif p_action in ('HIDE','REJECT') then
        if v_status in ('DRAFT','draft','sold','SUSPENDED','REMOVED','moderated') then
          raise exception 'INVALID_TRANSITION' using errcode = '22023';
        end if;
        v_next := case when p_target_type = 'LISTING' then 'moderated'
          when p_action = 'HIDE' then 'SUSPENDED' else 'REMOVED' end;
      elsif p_action = 'RESTORE' then
        if v_status not in ('SUSPENDED','REMOVED','moderated') then
          raise exception 'INVALID_TRANSITION' using errcode = '22023';
        end if;
        select previous_state->>'status' into v_next
          from public.moderation_actions
          where target_type = p_target_type and target_id = p_target_id
            and action in ('HIDE','REJECT')
            and previous_state->>'status' not in ('SUSPENDED','REMOVED','moderated')
          order by created_at desc, id desc limit 1;
        -- Old content without an audited previous state goes back to review.
        v_next := coalesce(v_next, case when p_target_type = 'LISTING' then 'pending_review' else 'PENDING_REVIEW' end);
      else
        raise exception 'INVALID_TRANSITION' using errcode = '22023';
      end if;
      if p_target_type = 'LISTING' then
        execute format('update public.%I set status = $1, updated_at = now() where id = $2', v_table)
          using v_next, p_target_id;
      elsif p_target_type = 'MEETUP' then
        update public.meetups set status = v_next::public.community_status where id = p_target_id;
      else
        execute format('update public.%I set status = $1::public.community_status, updated_at = now() where id = $2', v_table)
          using v_next, p_target_id;
      end if;
    end if;
  end if;

  -- Only close reports already present in this decision's locked snapshot.
  select array_agg(id) into v_report_ids from (
    select id from public.reports where target_type = p_target_type and target_id = p_target_id
      and status in ('OPEN','REVIEWING') and id = any(coalesce(p_report_ids,array[]::uuid[])) for update
  ) reports_to_close;
  if p_action in ('DISMISS','RESOLVE') and v_report_ids is null then
    raise exception 'TARGET_CHANGED' using errcode = '40001';
  end if;
  if v_report_ids is not null then
    update public.reports set status = case when p_action = 'DISMISS'
      then 'DISMISSED'::public.report_status else 'RESOLVED'::public.report_status end
      where id = any(v_report_ids);
  end if;
  v_previous := jsonb_build_object('status', v_status);
  insert into public.moderation_actions(moderator_id,target_type,target_id,action,reason,previous_state,next_state)
    values(p_actor,p_target_type,p_target_id,p_action,btrim(p_reason),v_previous,
      jsonb_build_object('status',v_next,'report_ids',coalesce(v_report_ids,array[]::uuid[])));
  return jsonb_build_object('status',v_next);
end;
$$;
revoke all on function public.cosmora_moderation_decision(uuid,text,uuid,text,text,text,uuid[]) from public, anon, authenticated;
grant execute on function public.cosmora_moderation_decision(uuid,text,uuid,text,text,text,uuid[]) to service_role;
commit;
