-- Фото профиля: запустите этот файл один раз в Supabase -> SQL Editor -> Run.

alter table public.profiles
  add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 400);

-- Менять своё фото можно (вместе с именем и описанием).
grant update (name, bio, avatar_url) on public.profiles to authenticated;

-- Хранилище фото: публичная папка "avatars", до 1 МБ, только картинки.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Каждый пользователь работает только со своей папкой (имя папки = его id).
drop policy if exists "avatars_read"   on storage.objects;
drop policy if exists "avatars_insert" on storage.objects;
drop policy if exists "avatars_update" on storage.objects;
drop policy if exists "avatars_delete" on storage.objects;

create policy "avatars_read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
create policy "avatars_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- Фото мероприятий (обложка). Загружать может только старший лидер.
-- ---------------------------------------------------------------------
alter table public.events
  add column if not exists image_url text check (image_url is null or char_length(image_url) <= 400);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "event_photos_read"   on storage.objects;
drop policy if exists "event_photos_insert" on storage.objects;
drop policy if exists "event_photos_delete" on storage.objects;

create policy "event_photos_read" on storage.objects for select to authenticated
  using (bucket_id = 'event-photos');
create policy "event_photos_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_senior()
  );
create policy "event_photos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'event-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
