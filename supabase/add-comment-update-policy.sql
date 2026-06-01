-- ============================================================
-- BankBank: Kommentare bearbeiten/löschen erlauben (RLS)
-- ============================================================
-- Im Supabase Dashboard des AKTIVEN Projekts (vsvxkikraedffgvpttnn)
-- unter "SQL Editor" ausführen.
--
-- Die comments-Tabelle hatte bisher nur SELECT- und INSERT-Policies.
-- Ohne UPDATE-/DELETE-Policy schlägt das Bearbeiten/Löschen über den
-- anon-Key STILL fehl (kein Fehler im UI, aber nichts ändert sich).
-- Dieses Skript ergänzt die fehlenden Policies.
-- ============================================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Idempotent: erst entfernen, dann neu anlegen
DROP POLICY IF EXISTS "Anyone can update comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can delete comments" ON public.comments;

-- Kommentare: Jeder kann bearbeiten
CREATE POLICY "Anyone can update comments"
  ON public.comments FOR UPDATE
  USING (true);

-- Kommentare: Jeder kann löschen
CREATE POLICY "Anyone can delete comments"
  ON public.comments FOR DELETE
  USING (true);
