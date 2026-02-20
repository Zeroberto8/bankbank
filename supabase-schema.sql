-- ============================================================
-- BANKBANK – Supabase Datenbankschema
-- ============================================================
-- Dieses SQL im Supabase Dashboard unter "SQL Editor" ausführen.
-- ============================================================

-- 1. Tabelle: benches (Sitzbänke)
create table public.benches (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  photo_url text,
  user_id uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

-- 2. Tabelle: reviews (Bewertungen)
create table public.reviews (
  id bigint generated always as identity primary key,
  bench_id bigint references public.benches on delete cascade not null,
  user_id uuid references auth.users on delete set null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- 3. Indizes für Performance
create index idx_benches_location on public.benches (lat, lng);
create index idx_reviews_bench_id on public.reviews (bench_id);

-- ============================================================
-- 4. Row Level Security (RLS) aktivieren
-- ============================================================

alter table public.benches enable row level security;
alter table public.reviews enable row level security;

-- Bänke: Jeder kann lesen, angemeldete User können erstellen
create policy "Benches are viewable by everyone"
  on public.benches for select
  using (true);

create policy "Authenticated users can insert benches"
  on public.benches for insert
  with check (auth.uid() = user_id);

create policy "Users can update own benches"
  on public.benches for update
  using (auth.uid() = user_id);

-- Bewertungen: Jeder kann lesen, angemeldete User können erstellen
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

create policy "Authenticated users can insert reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 5. Storage Bucket für Fotos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('bench-photos', 'bench-photos', true);

create policy "Anyone can view bench photos"
  on storage.objects for select
  using (bucket_id = 'bench-photos');

create policy "Authenticated users can upload bench photos"
  on storage.objects for insert
  with check (
    bucket_id = 'bench-photos'
    and auth.role() = 'authenticated'
  );

-- ============================================================
-- 6. Beispieldaten (optional – zum Testen)
-- ============================================================

insert into public.benches (title, description, lat, lng) values
  ('Tiergarten Lieblingsbank', 'Wunderschöne Bank am See mit Blick auf die Fontäne. Perfekt für die Mittagspause.', 52.5163, 13.3777),
  ('Englischer Garten Panorama', 'Holzbank auf dem kleinen Hügel mit 360° Blick über den Park.', 48.1374, 11.5755),
  ('Rheinufer Köln Deutz', 'Moderne Bank direkt am Rhein mit Blick auf den Dom. Abends wunderschön beleuchtet.', 50.9375, 6.9603),
  ('Alster-Uferbank', 'Klassische weiße Holzbank an der Außenalster. Segelboote beobachten inklusive.', 53.5511, 9.9937),
  ('Clara-Zetkin-Park Lesebank', 'Versteckte Bank zwischen alten Eichen. Perfekt zum Lesen und Entspannen.', 51.3397, 12.3731);
