-- YoungLife: чаты (общие чаты мероприятий и личные сообщения).
-- Запускать ПОСЛЕ schema.sql: SQL Editor -> New query -> вставить -> Run.
-- Скрипт можно запускать повторно, ничего не сломается.
--
-- Правила (проверяются на сервере, обойти их из приложения нельзя):
--   * в общем чате мероприятия пишут и читают все вошедшие пользователи;
--   * личные сообщения доступны, только если ОБОИМ собеседникам исполнилось 15 лет;
--   * личную переписку видят только двое её участников;
--   * сообщение можно отправить только от своего имени;
--   * свои сообщения можно удалить; сообщения общих чатов может удалить любой старший лидер.

-- =====================================================================
-- Таблицы
-- =====================================================================

create table if not exists public.event_messages (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  sender_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists event_messages_event_idx on public.event_messages (event_id, created_at desc);

create table if not exists public.direct_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at   timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists direct_messages_sender_idx    on public.direct_messages (sender_id, created_at desc);
create index if not exists direct_messages_recipient_idx on public.direct_messages (recipient_id, created_at desc);

-- =====================================================================
-- Возраст: можно ли писать личные сообщения
-- =====================================================================

-- Полных лет пользователю (дату рождения читает только сама функция).
create or replace function public.age_years(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select extract(year from age(current_date, birth_date))::integer
  from public.profile_private
  where id = p_user;
$$;

revoke execute on function public.age_years(uuid) from public, anon, authenticated;

-- Можно ли текущему пользователю писать личные сообщения указанному человеку:
-- обоим должно быть не меньше 15 лет.
create or replace function public.dm_allowed(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.age_years((select auth.uid())), 0) >= 15
     and coalesce(public.age_years(p_other), 0) >= 15;
$$;

revoke execute on function public.dm_allowed(uuid) from public, anon;
grant execute on function public.dm_allowed(uuid) to authenticated;

-- =====================================================================
-- Защита данных (Row Level Security)
-- =====================================================================

alter table public.event_messages  enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "event_messages_read"   on public.event_messages;
drop policy if exists "event_messages_insert" on public.event_messages;
drop policy if exists "event_messages_delete" on public.event_messages;
drop policy if exists "direct_messages_read"   on public.direct_messages;
drop policy if exists "direct_messages_insert" on public.direct_messages;
drop policy if exists "direct_messages_delete" on public.direct_messages;

-- Общий чат: читают и пишут все вошедшие, но только от своего имени.
create policy "event_messages_read" on public.event_messages
  for select to authenticated using (true);

create policy "event_messages_insert" on public.event_messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()));

create policy "event_messages_delete" on public.event_messages
  for delete to authenticated
  using (sender_id = (select auth.uid()) or public.is_senior());

-- Личные сообщения: видят только отправитель и получатель.
create policy "direct_messages_read" on public.direct_messages
  for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

-- Писать можно только от своего имени и только если обоим 15+.
create policy "direct_messages_insert" on public.direct_messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.dm_allowed(recipient_id));

create policy "direct_messages_delete" on public.direct_messages
  for delete to authenticated
  using (sender_id = (select auth.uid()));

-- =====================================================================
-- Права доступа (анонимным пользователям доступа нет совсем)
-- =====================================================================

revoke all on public.event_messages, public.direct_messages from anon, authenticated;

grant select, insert, delete on public.event_messages  to authenticated;
grant select, insert, delete on public.direct_messages to authenticated;

-- =====================================================================
-- Мгновенная доставка (Supabase Realtime)
-- =====================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_messages'
    ) then
      alter publication supabase_realtime add table public.event_messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
    ) then
      alter publication supabase_realtime add table public.direct_messages;
    end if;
  end if;
end
$$;
