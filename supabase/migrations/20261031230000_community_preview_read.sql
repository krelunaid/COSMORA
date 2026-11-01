-- One indexed read per preview. No client receives table or RPC access.
create or replace function public.cosmora_read_media_preview(p_media_id uuid)
returns table(jpeg_base64 text, author_id uuid)
language sql stable security invoker set search_path = public, pg_temp
as $$
 select v.jpeg_base64, p.author_id
 from public.community_media_previews v
 join public.post_media m on m.id=v.media_id and m.storage_path=v.original_path and m.media_type='IMAGE'
 join public.community_posts p on p.id=m.post_id and p.status='ACTIVE'
 where v.media_id=p_media_id;
$$;
revoke all on function public.cosmora_read_media_preview(uuid) from public,anon,authenticated;
grant execute on function public.cosmora_read_media_preview(uuid) to service_role;
