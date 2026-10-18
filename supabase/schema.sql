-- YoungLife: схема базы данных (Supabase / Postgres).
-- Запустить целиком один раз в Supabase: SQL Editor -> New query -> вставить -> Run.
-- Скрипт можно запускать повторно, ничего не сломается.

-- =====================================================================
-- Таблицы
-- =====================================================================

-- Публичный профиль (его видят все вошедшие пользователи).
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  bio        text not null default '' check (char_length(bio) <= 200),
  role       text not null default 'guest' check (role in ('guest', 'leader', 'senior')),
  created_at timestamptz not null default now()
);

-- Приватные данные профиля: их видит только сам владелец.
create table if not exists public.profile_private (
  id         uuid primary key references public.profiles (id) on delete cascade,
  birth_date date not null
);

-- Мероприятия.
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  place       text not null check (char_length(btrim(place)) between 1 and 200),
  starts_at   timestamptz not null,
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events (starts_at);

-- =====================================================================
-- Создание профиля при регистрации (с проверкой возраста от 14 лет)
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := btrim(coalesce(new.raw_user_meta_data ->> 'name', ''));
  v_birth date;
begin
  begin
    v_birth := (new.raw_user_meta_data ->> 'birth_date')::date;
  exception when others then
    raise exception 'invalid_birth_date';
  end;

  if v_birth is null or v_birth > current_date then
    raise exception 'invalid_birth_date';
  end if;

  if v_birth > (current_date - interval '14 years')::date then
    raise exception 'min_age_14';
  end if;

  if char_length(v_name) = 0 then
    raise exception 'name_required';
  end if;

  insert into public.profiles (id, name) values (new.id, left(v_name, 60));
  insert into public.profile_private (id, birth_date) values (new.id, v_birth);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Вспомогательная функция: старший лидер ли текущий пользователь
-- =====================================================================

create or replace function public.is_senior()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'senior'
  );
$$;

revoke execute on function public.is_senior() from public, anon;
grant execute on function public.is_senior() to authenticated;

-- =====================================================================
-- Защита данных (Row Level Security)
-- =====================================================================

alter table public.profiles        enable row level security;
alter table public.profile_private enable row level security;
alter table public.events          enable row level security;

drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "private_read"    on public.profile_private;
drop policy if exists "events_read"     on public.events;
drop policy if exists "events_insert"   on public.events;
drop policy if exists "events_update"   on public.events;
drop policy if exists "events_delete"   on public.events;

-- Вошедшие пользователи видят имена, описания и роли других.
create policy "profiles_read" on public.profiles
  for select to authenticated using (true);

-- Менять можно только свой профиль (и только имя и описание, см. права ниже).
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Дату рождения видит только владелец.
create policy "private_read" on public.profile_private
  for select to authenticated using (id = (select auth.uid()));

-- Мероприятия видят все вошедшие.
create policy "events_read" on public.events
  for select to authenticated using (true);

-- Создавать мероприятия может только старший лидер, и только от своего имени.
create policy "events_insert" on public.events
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_senior());

-- Менять своё мероприятие может его автор, если он по-прежнему старший лидер.
create policy "events_update" on public.events
  for update to authenticated
  using (author_id = (select auth.uid()) and public.is_senior())
  with check (author_id = (select auth.uid()) and public.is_senior());

-- Удалять мероприятие может автор или любой старший лидер.
create policy "events_delete" on public.events
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_senior());

-- =====================================================================
-- Права доступа к таблицам (анонимным пользователям доступа нет совсем)
-- =====================================================================

revoke all on public.profiles, public.profile_private, public.events from anon, authenticated;

grant select on public.profiles to authenticated;
-- Роль менять нельзя: в списке только имя и описание.
grant update (name, bio) on public.profiles to authenticated;

grant select on public.profile_private to authenticated;

grant select, insert, update, delete on public.events to authenticated;

-- =====================================================================
-- Как сделать себя старшим лидером (выполнить отдельно, подставив свою почту):
--
--   update public.profiles
--   set role = 'senior'
--   where id = (select id from auth.users where email = 'ВАША_ПОЧТА');
--
-- Роли 'leader' и 'senior' выдаёт только администратор (через SQL Editor или Table Editor).
-- =====================================================================
