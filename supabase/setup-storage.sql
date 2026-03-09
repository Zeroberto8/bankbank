-- ============================================================
-- BankBank: Supabase Storage für Fotos einrichten
-- ============================================================
-- Im Supabase Dashboard unter "SQL Editor" ausführen.
-- Erstellt einen öffentlichen Storage-Bucket für Bank-Fotos
-- und erlaubt anonymes Lesen + Hochladen.
-- ============================================================

-- 1. Storage-Bucket erstellen (public = Bilder ohne Auth-Token abrufbar)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bench-photos', 'bench-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Jeder kann Fotos lesen (öffentlicher Bucket)
CREATE POLICY "Public read access on bench-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bench-photos');

-- 3. Jeder kann Fotos hochladen (ohne Login)
CREATE POLICY "Anonymous upload to bench-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bench-photos');
