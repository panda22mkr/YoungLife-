-- Push-уведомления. Запустите один раз: Supabase -> SQL Editor -> Run.
-- Сервер сам отправляет уведомления через сервис Expo: ничего устанавливать не нужно.

create extension if not exists pg_net;

-- Адреса телефонов, на которые отправляются уведомления.
create table if not exists public.push_tokens (
  token      text primary key check (char_length(token) between 10 and 200),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;
grant select, delete on public.push_tokens to authenticated;

drop policy if exists "push_tokens_read"   on public.push_tokens;
drop policy if exists "push_tokens_delete" on public.push_tokens;
create policy "push_tokens_read" on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy "push_tokens_delete" on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

-- Приложение вызывает эту функцию, чтобы запомнить телефон (если телефон уже был у другого аккаунта, он переходит к текущему).
create or replace function public.register_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_tokens (token, user_id)
  values (p_token, (select auth.uid()))
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
$$;
revoke execute on function public.register_push_token(text) from public, anon;
grant execute on function public.register_push_token(text) to authenticated;

-- Отправка: пачками по 100 штук (так требует Expo). Вызывается только изнутри базы.
create or replace function public.send_push(p_users uuid[], p_title text, p_body text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tokens text[];
  v_chunk  text[];
  i int := 1;
begin
  select coalesce(array_agg(token), '{}') into v_tokens from public.push_tokens where user_id = any (p_users);
  while i <= coalesce(array_length(v_tokens, 1), 0) loop
    v_chunk := v_tokens[i : i + 99];
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := (
        select jsonb_agg(jsonb_build_object(
          'to', t, 'title', left(p_title, 80), 'body', left(p_body, 140), 'data', p_data, 'sound', 'default'))
        from unnest(v_chunk) as t
      ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
    i := i + 100;
  end loop;
exception when others then
  null; -- ошибка уведомления никогда не должна ломать отправку сообщения
end;
$$;
revoke execute on function public.send_push(uuid[], text, text, jsonb) from public, anon, authenticated;

-- Личное сообщение -> уведомление получателю.
create or replace function public.push_on_dm()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.send_push(
    array[new.recipient_id],
    coalesce((select name from public.profiles where id = new.sender_id), 'YoungLife'),
    new.body,
    jsonb_build_object('type', 'dm', 'id', new.sender_id));
  return new;
end;
$$;
revoke execute on function public.push_on_dm() from public, anon, authenticated;
drop trigger if exists push_dm on public.direct_messages;
create trigger push_dm after insert on public.direct_messages for each row execute function public.push_on_dm();

-- Сообщение в общем чате -> автору мероприятия и тем, кто уже писал в этом чате (кроме отправителя).
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
  ) s where u <> new.sender_id;
  perform public.send_push(
    v_users,
    coalesce(v_event.title, 'YoungLife'),
    coalesce((select name from public.profiles where id = new.sender_id), '') || ': ' || new.body,
    jsonb_build_object('type', 'chat', 'id', new.event_id));
  return new;
end;
$$;
revoke execute on function public.push_on_chat() from public, anon, authenticated;
drop trigger if exists push_chat on public.event_messages;
create trigger push_chat after insert on public.event_messages for each row execute function public.push_on_chat();

-- Новое мероприятие -> всем, кроме автора.
create or replace function public.push_on_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.send_push(
    (select coalesce(array_agg(distinct user_id), '{}') from public.push_tokens where user_id <> new.author_id),
    'Новое мероприятие / New event',
    new.title,
    jsonb_build_object('type', 'event', 'id', new.id));
  return new;
end;
$$;
revoke execute on function public.push_on_event() from public, anon, authenticated;
drop trigger if exists push_event on public.events;
create trigger push_event after insert on public.events for each row execute function public.push_on_event();
