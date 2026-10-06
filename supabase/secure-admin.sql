-- ============================================================
-- BankBank: Ändern/Löschen nur noch für den Admin
-- ============================================================
-- Im Supabase Dashboard (Projekt bankbank2) unter "SQL Editor" ausführen.
-- VORHER unter Authentication → Users den Admin-Nutzer anlegen
-- (E-Mail + neues Passwort, "Auto Confirm User" anhaken) und unten
-- in Schritt 2 dessen E-Mail-Adresse eintragen.
--
-- Danach gilt:
--   Jeder:  Bänke/Kommentare/Wanderwege lesen, Bänke/Kommentare anlegen,
--           Fotos hochladen
--   Admin:  zusätzlich ändern und löschen, Wanderwege anlegen
-- ============================================================

-- 1. Admin-Prüfung: die Rolle steht in app_metadata, die der Nutzer
--    selbst nicht ändern kann
create or replace function public.is_admin() returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- 2. Admin-Rolle vergeben (E-Mail-Adresse anpassen!)
update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  where email = 'DEINE-ADMIN-EMAIL';

-- 3. Alle bisherigen Regeln entfernen (auch die "Anyone can update/delete ...")
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('benches', 'comments', 'trails')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;

  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%bench-photos%' or coalesce(with_check, '') ilike '%bench-photos%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

alter table public.benches  enable row level security;
alter table public.comments enable row level security;
alter table public.trails   enable row level security;

-- 4. Neue Regeln
-- Bänke
create policy "benches_select_all"   on public.benches for select using (true);
create policy "benches_insert_all"   on public.benches for insert with check (true);
create policy "benches_update_admin" on public.benches for update using (public.is_admin()) with check (public.is_admin());
create policy "benches_delete_admin" on public.benches for delete using (public.is_admin());

-- Kommentare
create policy "comments_select_all"   on public.comments for select using (true);
create policy "comments_insert_all"   on public.comments for insert with check (true);
create policy "comments_update_admin" on public.comments for update using (public.is_admin()) with check (public.is_admin());
create policy "comments_delete_admin" on public.comments for delete using (public.is_admin());

-- Wanderwege
create policy "trails_select_all"   on public.trails for select using (true);
create policy "trails_insert_admin" on public.trails for insert with check (public.is_admin());
create policy "trails_update_admin" on public.trails for update using (public.is_admin()) with check (public.is_admin());
create policy "trails_delete_admin" on public.trails for delete using (public.is_admin());

-- Fotos (Storage-Bucket bench-photos)
create policy "bench_photos_select_all"   on storage.objects for select using (bucket_id = 'bench-photos');
create policy "bench_photos_insert_all"   on storage.objects for insert with check (bucket_id = 'bench-photos');
create policy "bench_photos_update_admin" on storage.objects for update using (bucket_id = 'bench-photos' and public.is_admin());
create policy "bench_photos_delete_admin" on storage.objects for delete using (bucket_id = 'bench-photos' and public.is_admin());

-- 5. Kontrolle: hier muss bei deiner E-Mail-Adresse "admin" stehen
select email, raw_app_meta_data ->> 'role' as rolle from auth.users;
