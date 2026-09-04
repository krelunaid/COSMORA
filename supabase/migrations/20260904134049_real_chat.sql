create table public.direct_messages (
 id uuid primary key,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 body text not null check (char_length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now(),
 check (sender_id <> recipient_id)
);
create index direct_messages_sender_created on public.direct_messages(sender_id, created_at desc);
create index direct_messages_recipient_created on public.direct_messages(recipient_id, created_at desc);
alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from anon, authenticated;
grant select on public.direct_messages to authenticated;
grant all on public.direct_messages to service_role;
create policy "Participants read direct messages" on public.direct_messages for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
