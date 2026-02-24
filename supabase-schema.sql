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
  user_name text not null default 'Anonym',
  created_at timestamptz default now()
);

-- 2. Tabelle: comments (Bewertungen & Kommentare)
create table public.comments (
  id bigint generated always as identity primary key,
  bench_id bigint references public.benches on delete cascade not null,
  user_name text not null default 'Anonym',
  text text,
  rating smallint not null check (rating >= 1 and rating <= 5),
  created_at timestamptz default now()
);

-- 3. Indizes für Performance
create index idx_benches_location on public.benches (lat, lng);
create index idx_comments_bench_id on public.comments (bench_id);

-- ============================================================
-- 4. Row Level Security (RLS) aktivieren
-- ============================================================

alter table public.benches enable row level security;
alter table public.comments enable row level security;

-- Bänke: Jeder kann lesen und erstellen (ohne Auth)
create policy "Benches are viewable by everyone"
  on public.benches for select
  using (true);

create policy "Anyone can insert benches"
  on public.benches for insert
  with check (true);

create policy "Anyone can update benches"
  on public.benches for update
  using (true);

create policy "Anyone can delete benches"
  on public.benches for delete
  using (true);

-- Kommentare: Jeder kann lesen und erstellen (ohne Auth)
create policy "Comments are viewable by everyone"
  on public.comments for select
  using (true);

create policy "Anyone can insert comments"
  on public.comments for insert
  with check (true);

-- ============================================================
-- 5. Beispieldaten – 8 Demo-Bänke
-- ============================================================

insert into public.benches (title, description, lat, lng, user_name, created_at) values
  ('Tiergarten Lieblingsbank', 'Wunderschöne Bank am See mit Blick auf die Fontäne. Perfekt für die Mittagspause.', 52.52, 13.405, 'Anna M.', '2025-01-15T12:00:00Z'),
  ('Englischer Garten Panorama', 'Holzbank auf dem kleinen Hügel mit 360° Blick über den Park.', 48.137, 11.575, 'Max B.', '2025-02-03T12:00:00Z'),
  ('Rheinufer Köln Deutz', 'Moderne Bank direkt am Rhein mit Blick auf den Dom.', 50.938, 6.96, 'Julia F.', '2025-01-28T12:00:00Z'),
  ('Alster-Uferbank', 'Klassische weiße Holzbank an der Außenalster. Segelboote beobachten inklusive.', 53.551, 9.994, 'Henrik S.', '2025-01-10T12:00:00Z'),
  ('Clara-Zetkin-Park Lesebank', 'Versteckte Bank zwischen alten Eichen.', 51.34, 12.373, 'Mia T.', '2025-02-08T12:00:00Z'),
  ('Schlossplatz Stuttgart', 'Steinbank mit Blick auf das Neue Schloss.', 48.775, 9.183, 'Lena K.', '2025-02-10T12:00:00Z'),
  ('Elbwiesen Dresden', 'Holzbank mit Blick auf die Altstadt-Silhouette.', 51.05, 13.738, 'Felix W.', '2025-01-22T12:00:00Z'),
  ('Burggarten Nürnberg', 'Alte Steinbank mit Panoramablick.', 49.453, 11.077, 'Jan H.', '2025-02-15T12:00:00Z');

-- ============================================================
-- 6. Beispiel-Kommentare & Bewertungen
-- ============================================================

-- Tiergarten Lieblingsbank (id=1): 4 Bewertungen, 2 Kommentare
insert into public.comments (bench_id, user_name, text, rating, created_at) values
  (1, 'Anna M.', null, 5, '2025-01-15T12:00:00Z'),
  (1, 'Tom K.', 'Mein absoluter Lieblingsplatz! 🌿', 5, '2025-01-20T12:00:00Z'),
  (1, 'Lisa R.', 'Sehr ruhig und schattig im Sommer.', 4, '2025-02-01T12:00:00Z'),
  (1, 'Anonym', null, 4, '2025-02-05T12:00:00Z');

-- Englischer Garten Panorama (id=2): 3 Bewertungen, 1 Kommentar
insert into public.comments (bench_id, user_name, text, rating, created_at) values
  (2, 'Max B.', null, 5, '2025-02-03T12:00:00Z'),
  (2, 'Sarah W.', 'Sonnenuntergang hier ist magisch! 🌅', 5, '2025-02-10T12:00:00Z'),
  (2, 'Anonym', null, 5, '2025-02-12T12:00:00Z');

-- Rheinufer Köln Deutz (id=3): 5 Bewertungen, 1 Kommentar
insert into public.comments (bench_id, user_name, text, rating, created_at) values
  (3, 'Julia F.', null, 4, '2025-01-28T12:00:00Z'),
  (3, 'Chris P.', 'Perfekter Spot für ein Feierabendbier.', 4, '2025-02-05T12:00:00Z'),
  (3, 'Anonym', null, 5, '2025-02-08T12:00:00Z'),
  (3, 'Anonym', null, 4, '2025-02-10T12:00:00Z'),
  (3, 'Anonym', null, 5, '2025-02-12T12:00:00Z');

-- Alster-Uferbank (id=4): 3 Bewertungen
insert into public.comments (bench_id, user_name, text, rating, created_at) values
  (4, 'Henrik S.', null, 5, '2025-01-10T12:00:00Z'),
  (4, 'Anonym', null, 4, '2025-01-15T12:00:00Z'),
  (4, 'Anonym', null, 5, '2025-01-20T12:00:00Z');

-- Clara-Zetkin-Park Lesebank (id=5): 4 Bewertungen, 1 Kommentar
insert into public.comments (bench_id, user_name, text, rating, created_at) values
  (5, 'Mia T.', null, 5, '2025-02-08T12:00:00Z'),
  (5, 'Paul D.', 'Geheimtipp!', 5, '2025-02-14T12:00:00Z'),
  (5, 'Anonym', null, 4, '2025-02-16T12:00:00Z'),
  (5, 'Anonym', null, 5, '2025-02-18T12:00:00Z');

-- Schlossplatz Stuttgart (id=6): 3 Bewertungen
insert into public.comments (bench_id, user_name, text, rating, created_at) values
  (6, 'Lena K.', null, 4, '2025-02-10T12:00:00Z'),
  (6, 'Anonym', null, 4, '2025-02-12T12:00:00Z'),
  (6, 'Anonym', null, 5, '2025-02-14T12:00:00Z');

-- Elbwiesen Dresden (id=7): 4 Bewertungen
insert into public.comments (bench_id, user_name, text, rating, created_at) values
  (7, 'Felix W.', null, 5, '2025-01-22T12:00:00Z'),
  (7, 'Anonym', null, 5, '2025-01-25T12:00:00Z'),
  (7, 'Anonym', null, 5, '2025-01-28T12:00:00Z'),
  (7, 'Anonym', null, 4, '2025-02-01T12:00:00Z');

-- Burggarten Nürnberg (id=8): 3 Bewertungen
insert into public.comments (bench_id, user_name, text, rating, created_at) values
  (8, 'Jan H.', null, 4, '2025-02-15T12:00:00Z'),
  (8, 'Anonym', null, 5, '2025-02-17T12:00:00Z'),
  (8, 'Anonym', null, 4, '2025-02-19T12:00:00Z');
