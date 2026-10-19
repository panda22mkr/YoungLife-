-- YoungLife: инструменты лидера (Дерево, Список, Карта).
-- Запускать ПОСЛЕ schema.sql: SQL Editor -> New query -> вставить -> Run.
-- Скрипт можно запускать повторно, ничего не сломается.
--
-- Правила (проверяются на сервере):
--   * записи видит и меняет ТОЛЬКО их владелец (чужие, даже старшие лидеры, не видят);
--   * пользоваться инструментами могут только лидеры и старшие лидеры;
--   * у каждого лидера одно имя на стволе Дерева;
--   * есть разумные ограничения на количество записей.

-- =====================================================================
-- Помощник: лидер ли текущий пользователь (лидер или старший лидер)
-- =====================================================================

create or replace function public.is_leader()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('leader', 'senior')
  );
$$;

revoke execute on function public.is_leader() from public, anon;
grant execute on function public.is_leader() to authenticated;

-- =====================================================================
-- Таблицы
-- =====================================================================

-- Дерево: ствол (одно имя), корни и ветки (сколько угодно).
create table if not exists public.tree_people (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('trunk', 'root', 'branch')),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  note        text not null default '' check (char_length(note) <= 1000),
  note_hidden boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index if not exists tree_people_one_trunk on public.tree_people (owner_id) where kind = 'trunk';
create index if not exists tree_people_owner_idx on public.tree_people (owner_id, created_at);

-- Список: имена по столбцам (перетаскиваются между столбцами).
create table if not exists public.prayer_people (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  col         text not null check (col in ('new', 'club', 'leaders', 'students', 'sponsors')),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  note        text not null default '' check (char_length(note) <= 1000),
  note_hidden boolean not null default false,
  position    double precision not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists prayer_people_owner_idx on public.prayer_people (owner_id, col, position);

-- Карта: места, за которые молится лидер (положение на схеме от 0 до 1).
create table if not exists public.map_places (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  kind        text not null default 'other' check (kind in ('school', 'field', 'park', 'village', 'city', 'country', 'other')),
  status      text not null default 'praying' check (status in ('praying', 'planning', 'started')),
  note        text not null default '' check (char_length(note) <= 1000),
  note_hidden boolean not null default false,
  x           double precision not null default 0.5 check (x between 0 and 1),
  y           double precision not null default 0.5 check (y between 0 and 1),
  created_at  timestamptz not null default now()
);

create index if not exists map_places_owner_idx on public.map_places (owner_id, created_at);

-- =====================================================================
-- Ограничение количества записей у одного лидера
-- =====================================================================

create or replace function public.limit_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer := tg_argv[0]::integer;
  v_count integer;
begin
  execute format('select count(*) from %I.%I where owner_id = $1', tg_table_schema, tg_table_name)
    into v_count using new.owner_id;
  if v_count >= v_max then
    raise exception 'limit_reached';
  end if;
  return new;
end;
$$;

revoke execute on function public.limit_rows() from public, anon, authenticated;

drop trigger if exists tree_people_limit   on public.tree_people;
drop trigger if exists prayer_people_limit on public.prayer_people;
drop trigger if exists map_places_limit    on public.map_places;

create trigger tree_people_limit   before insert on public.tree_people   for each row execute function public.limit_rows(300);
create trigger prayer_people_limit before insert on public.prayer_people for each row execute function public.limit_rows(1000);
create trigger map_places_limit    before insert on public.map_places    for each row execute function public.limit_rows(200);

-- =====================================================================
-- Защита данных (Row Level Security): только владелец и только лидер
-- =====================================================================

alter table public.tree_people   enable row level security;
alter table public.prayer_people enable row level security;
alter table public.map_places    enable row level security;

drop policy if exists "tree_people_own"   on public.tree_people;
drop policy if exists "prayer_people_own" on public.prayer_people;
drop policy if exists "map_places_own"    on public.map_places;

create policy "tree_people_own" on public.tree_people
  for all to authenticated
  using (owner_id = (select auth.uid()) and public.is_leader())
  with check (owner_id = (select auth.uid()) and public.is_leader());

create policy "prayer_people_own" on public.prayer_people
  for all to authenticated
  using (owner_id = (select auth.uid()) and public.is_leader())
  with check (owner_id = (select auth.uid()) and public.is_leader());

create policy "map_places_own" on public.map_places
  for all to authenticated
  using (owner_id = (select auth.uid()) and public.is_leader())
  with check (owner_id = (select auth.uid()) and public.is_leader());

-- =====================================================================
-- Права доступа (анонимным пользователям доступа нет совсем)
-- =====================================================================

revoke all on public.tree_people, public.prayer_people, public.map_places from anon, authenticated;

grant select, insert, delete on public.tree_people, public.prayer_people, public.map_places to authenticated;

-- Менять можно только содержимое, но не владельца.
grant update (name, note, note_hidden) on public.tree_people to authenticated;
grant update (col, name, note, note_hidden, position) on public.prayer_people to authenticated;
grant update (name, kind, status, note, note_hidden, x, y) on public.map_places to authenticated;
