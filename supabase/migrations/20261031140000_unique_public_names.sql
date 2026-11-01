-- Must run only after the owner has chosen how to resolve existing duplicates.
-- Abort rather than silently renaming another person's profile.
create function public.cosmora_public_name_key(value text) returns text
language sql immutable strict parallel safe set search_path = '' as $$
  select nullif(lower(btrim(regexp_replace(normalize(value, NFKC), '[[:space:]]+', ' ', 'g'))), '')
$$;
revoke all on function public.cosmora_public_name_key(text) from public, anon, authenticated;
grant execute on function public.cosmora_public_name_key(text) to service_role;

do $$
begin
  if exists (
    select public.cosmora_public_name_key(display_name) from public.profiles
    where public.cosmora_public_name_key(display_name) is not null
    group by 1 having count(*) > 1
  ) then
    raise exception 'Resolve existing duplicate public names before activating uniqueness';
  end if;
end $$;

create function public.cosmora_normalize_public_name() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.display_name := nullif(btrim(regexp_replace(normalize(new.display_name, NFKC), '[[:space:]]+', ' ', 'g')), '');
  return new;
end $$;
revoke all on function public.cosmora_normalize_public_name() from public, anon, authenticated;
create trigger profiles_normalize_public_name
  before insert or update of display_name on public.profiles
  for each row execute function public.cosmora_normalize_public_name();
update public.profiles set display_name = display_name;
-- The index is the authority for simultaneous requests, including older clients.
create unique index profiles_public_name_unique
  on public.profiles(public.cosmora_public_name_key(display_name));
