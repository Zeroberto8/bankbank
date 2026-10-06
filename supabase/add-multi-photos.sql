-- ============================================================
-- BankBank: Bis zu 5 Fotos pro Bank und pro Kommentar
-- ============================================================
-- Im Supabase Dashboard (Projekt bankbank2) unter "SQL Editor"
-- ausführen – VOR dem Deployment des neuen Frontends.
-- photo_urls enthält alle Foto-URLs; photo_url bleibt als erstes
-- Foto erhalten (Vorschaubilder, Tagesbericht, ältere App-Versionen).
-- ============================================================

ALTER TABLE public.benches
  ADD COLUMN IF NOT EXISTS photo_urls text[];

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS photo_urls text[];

-- Bestehende Einzelfotos übernehmen
UPDATE public.benches  SET photo_urls = ARRAY[photo_url]
  WHERE photo_url IS NOT NULL AND photo_urls IS NULL;
UPDATE public.comments SET photo_urls = ARRAY[photo_url]
  WHERE photo_url IS NOT NULL AND photo_urls IS NULL;

-- Maximal 5 Fotos
ALTER TABLE public.benches  DROP CONSTRAINT IF EXISTS benches_photo_urls_max5;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_photo_urls_max5;
ALTER TABLE public.benches
  ADD CONSTRAINT benches_photo_urls_max5 CHECK (cardinality(photo_urls) <= 5);
ALTER TABLE public.comments
  ADD CONSTRAINT comments_photo_urls_max5 CHECK (cardinality(photo_urls) <= 5);
