-- Only the authenticated server API can mutate membership. Locking the crew
-- prevents concurrent approvals from exceeding its capacity.
create or replace function public.cosmora_membership(p_actor uuid,p_squad uuid,p_action text,p_member uuid default null)
returns text language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.squads; member_status text; active_count integer; target uuid;
begin
 select * into s from public.squads where id=p_squad for update;
 if not found then raise exception 'CREW_NOT_FOUND'; end if;
 target:=coalesce(p_member,p_actor);
 if p_action='leave' then
   if p_actor=s.owner_id then raise exception 'OWNER_CANNOT_LEAVE'; end if;
   delete from public.squad_members where squad_id=p_squad and user_id=p_actor;
   return 'LEFT';
 end if;
 if s.status not in ('ACTIVE','FULL') or s.starts_at<=now() then raise exception 'CREW_CLOSED'; end if;
 if p_action in ('approve','decline') then
   if s.owner_id<>p_actor or target=s.owner_id then raise exception 'FORBIDDEN'; end if;
   if not exists(select 1 from public.squad_members where squad_id=p_squad and user_id=target and membership_status='PENDING') then raise exception 'REQUEST_NOT_FOUND'; end if;
   member_status:=case when p_action='approve' then 'ACTIVE' else 'DECLINED' end;
 elsif p_action='join' then
   target:=p_actor;
   if p_actor=s.owner_id then return 'ACTIVE'; end if;
   select membership_status into member_status from public.squad_members where squad_id=p_squad and user_id=p_actor;
   if member_status in ('PENDING','ACTIVE') then return member_status; end if;
   if member_status='REMOVED' then raise exception 'FORBIDDEN'; end if;
   member_status:=case when s.approval_required then 'PENDING' else 'ACTIVE' end;
 else raise exception 'INVALID_ACTION';
 end if;
 select count(*) into active_count from public.squad_members where squad_id=p_squad and membership_status='ACTIVE';
 if member_status='ACTIVE' and s.max_members is not null and active_count>=s.max_members then raise exception 'CREW_FULL'; end if;
 insert into public.squad_members(squad_id,user_id,role,membership_status)
 values(p_squad,target,'MEMBER',member_status)
 on conflict(squad_id,user_id) do update set membership_status=excluded.membership_status;
 return member_status;
end; $$;
revoke all on function public.cosmora_membership(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.cosmora_membership(uuid,uuid,text,uuid) to service_role;
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
