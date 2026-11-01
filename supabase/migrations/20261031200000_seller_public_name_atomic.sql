-- Changing a shop's public COSMORA name and saving its private seller data
-- must succeed or fail together. The caller must authenticate the owner first.
create or replace function public.cosmora_save_shop_public_name(
  p_user_id uuid, p_public_name text, p_country text, p_details jsonb
) returns void language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if p_user_id is null or p_public_name is null or p_country is null or p_details is null then
    raise exception 'Missing seller profile data' using errcode = '22004';
  end if;
  insert into public.profiles(id, display_name, role, country, updated_at)
  values (p_user_id, p_public_name, 'pro_shop', p_country, now())
  on conflict (id) do update set display_name=excluded.display_name,
    role=excluded.role, country=excluded.country, updated_at=excluded.updated_at;
  insert into public.seller_details(user_id, seller_type, country_code, details, updated_at)
  values (p_user_id, 'shop', p_country, p_details, now())
  on conflict (user_id) do update set seller_type=excluded.seller_type,
    country_code=excluded.country_code, details=excluded.details, updated_at=excluded.updated_at;
end;
$$;
revoke all on function public.cosmora_save_shop_public_name(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.cosmora_save_shop_public_name(uuid, text, text, jsonb) to service_role;
