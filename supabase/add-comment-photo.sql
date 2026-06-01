-- ============================================================
-- BankBank: Foto zu Bewertungen/Kommentaren erlauben
-- ============================================================
-- Im Supabase Dashboard unter "SQL Editor" ausführen.
-- Fügt der comments-Tabelle eine Spalte für ein optionales
-- Foto hinzu (URL aus dem bench-photos Storage-Bucket).
-- ============================================================

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS photo_url text;
