-- Безопасность: жалобы, блокировка пользователей, защита от спама, удаление аккаунта.
-- Запускать ПОСЛЕДНИМ (после schema, chat, tools, photos, push): SQL Editor -> New query -> Run.
-- Скрипт можно запускать повторно.

-- ---------------------------------------------------------------------
-- Блокировка пользователей
-- ---------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;
revoke all on public.blocks from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;

drop policy if exists "blocks_read"   on public.blocks;
drop policy if exists "blocks_insert" on public.blocks;
drop policy if exists "blocks_delete" on public.blocks;
create policy "blocks_read"   on public.blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy "blocks_insert" on public.blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "blocks_delete" on public.blocks for delete to authenticated using (blocker_id = (select auth.uid()));

-- Есть ли блокировка между мной и другим человеком (в любую сторону). Другим людям список блокировок не виден.
create or replace function public.is_blocked_pair(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = (select auth.uid()) and blocked_id = p_other)
       or (blocker_id = p_other and blocked_id = (select auth.uid()))
  );
$$;
revoke execute on function public.is_blocked_pair(uuid) from public, anon;
grant execute on function public.is_blocked_pair(uuid) to authenticated;

-- Я не вижу сообщения тех, кого заблокировал (и они не видят мои в личке).
drop policy if exists "event_messages_read" on public.event_messages;
create policy "event_messages_read" on public.event_messages
  for select to authenticated
  using (not exists (
    select 1 from public.blocks b
    where b.blocker_id = (select auth.uid()) and b.blocked_id = sender_id
  ));

drop policy if exists "direct_messages_read" on public.direct_messages;
create policy "direct_messages_read" on public.direct_messages
  for select to authenticated
  using (
    (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()))
    and not public.is_blocked_pair(case when sender_id = (select auth.uid()) then recipient_id else sender_id end)
  );

drop policy if exists "direct_messages_insert" on public.direct_messages;
create policy "direct_messages_insert" on public.direct_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.dm_allowed(recipient_id)
    and not public.is_blocked_pair(recipient_id)
  );

-- ---------------------------------------------------------------------
-- Жалобы (читает только администратор в панели Supabase: Table Editor -> reports)
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('event_message', 'direct_message', 'user')),
  target_id   uuid,
  target_user uuid not null references public.profiles (id) on delete cascade,
  reason      text not null default '' check (char_length(reason) <= 500),
  body        text not null default '' check (char_length(body) <= 2000),
  created_at  timestamptz not null default now()
);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant insert on public.reports to authenticated;
drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and target_user <> (select auth.uid()));

-- ---------------------------------------------------------------------
-- Защита от спама: не больше 20 сообщений в минуту от одного человека
-- ---------------------------------------------------------------------
create or replace function public.limit_message_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  select (select count(*) from public.event_messages where sender_id = new.sender_id and created_at > now() - interval '1 minute')
       + (select count(*) from public.direct_messages where sender_id = new.sender_id and created_at > now() - interval '1 minute')
  into v_count;
  if v_count >= 20 then
    raise exception 'rate_limited';
  end if;
  return new;
end;
$$;
revoke execute on function public.limit_message_rate() from public, anon, authenticated;

drop trigger if exists event_messages_rate on public.event_messages;
create trigger event_messages_rate before insert on public.event_messages for each row execute function public.limit_message_rate();
drop trigger if exists direct_messages_rate on public.direct_messages;
create trigger direct_messages_rate before insert on public.direct_messages for each row execute function public.limit_message_rate();

-- ---------------------------------------------------------------------
-- Удаление своего аккаунта (требование App Store и Google Play).
-- Удаляются профиль, сообщения, мероприятия, записи инструментов, токены.
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------
-- Уведомления не отправляются тем, кто заблокировал отправителя
-- ---------------------------------------------------------------------
create or replace function public.push_on_chat()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_event record;
  v_users uuid[];
begin
  select title, author_id into v_event from public.events where id = new.event_id;
  select coalesce(array_agg(u), '{}') into v_users from (
    select v_event.author_id as u
    union
    select sender_id from public.event_messages where event_id = new.event_id
  ) s
  where u <> new.sender_id
    and not exists (select 1 from public.blocks b where b.blocker_id = u and b.blocked_id = new.sender_id);
  perform public.send_push(
    v_users,
    coalesce(v_event.title, 'YoungLife'),
    coalesce((select name from public.profiles where id = new.sender_id), '') || ': ' || new.body,
    jsonb_build_object('type', 'chat', 'id', new.event_id));
  return new;
end;
$$;
revoke execute on function public.push_on_chat() from public, anon, authenticated;
