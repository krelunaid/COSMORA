-- Apply before deploying the API/UI changes. Existing native clients still POST
-- { userId, blocked } to the authenticated server, so they also produce notices.
-- No backfill: existing blocks and reports are not rewritten by this migration.
begin;

alter table public.user_blocks
  add column context_target_type text,
  add column context_target_id uuid,
  add constraint user_blocks_context_check check (
    (context_target_type is null) = (context_target_id is null)
    and (context_target_type is null or context_target_type in ('POST','SQUAD','LISTING','USER'))
  );

alter table public.reports
  add column source text not null default 'USER_REPORT',
  add column context_target_type text,
  add column context_target_id uuid,
  add constraint reports_source_check check (
    source in ('USER_REPORT','USER_BLOCK')
    and (source <> 'USER_BLOCK' or target_type = 'USER')
  ),
  add constraint reports_context_target_check check (
    (context_target_type is null) = (context_target_id is null)
    and (context_target_type is null or context_target_type in ('POST','SQUAD','LISTING','USER'))
  );

-- One durable notice per blocker/author, even after unblock and block again.
-- Ordinary user reports retain their existing behaviour and constraints.
create unique index reports_user_block_notice_unique
  on public.reports (reporter_id, target_id)
  where source = 'USER_BLOCK' and target_type = 'USER';

create function public.cosmora_notify_user_block()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  notice text := 'Un utente ha bloccato questo autore. Avviso automatico al gestore; il blocco non costituisce da solo una violazione.';
begin
  if new.blocker_id = new.blocked_id then
    raise exception 'INVALID_SELF_BLOCK' using errcode = '22023';
  end if;
  if new.context_target_type is not null then
    notice := notice || ' Contesto: ' || new.context_target_type || ' ' || new.context_target_id::text || '.';
  end if;

  -- This insert runs in the block transaction: a queue failure rolls back the
  -- block too. No security-definer escalation or additional client grants.
  insert into public.reports (
    reporter_id, target_type, target_id, reason, details, source,
    context_target_type, context_target_id
  ) values (
    new.blocker_id, 'USER', new.blocked_id, 'OTHER', notice, 'USER_BLOCK',
    new.context_target_type, new.context_target_id
  )
  on conflict (reporter_id, target_id)
    where source = 'USER_BLOCK' and target_type = 'USER'
  do update set
    status = case
      when tg_op = 'INSERT' and public.reports.status not in ('OPEN','REVIEWING')
        then 'OPEN'::public.report_status
      else public.reports.status
    end,
    created_at = case
      when tg_op = 'INSERT' and public.reports.status not in ('OPEN','REVIEWING')
        then now()
      else public.reports.created_at
    end,
    context_target_type = coalesce(excluded.context_target_type, public.reports.context_target_type),
    context_target_id = coalesce(excluded.context_target_id, public.reports.context_target_id),
    details = case when excluded.context_target_type is not null then excluded.details else public.reports.details end
  where tg_op = 'INSERT'
    or (public.reports.context_target_id is null and excluded.context_target_id is not null);
  return new;
end;
$$;

revoke all on function public.cosmora_notify_user_block() from public, anon, authenticated;
grant execute on function public.cosmora_notify_user_block() to service_role;

-- UPDATE also covers retries from legacy upserts and blocks created before this
-- migration. It never reopens a resolved notice for an already-existing block.
create trigger user_blocks_notify_moderators
after insert or update on public.user_blocks
for each row execute function public.cosmora_notify_user_block();

commit;
