-- ============================================================
-- BankBank: RLS-Richtlinien prüfen und reparieren
-- ============================================================
-- Im Supabase Dashboard unter "SQL Editor" ausführen.
-- Stellt sicher, dass SELECT (Lesen) für alle erlaubt ist,
-- auch ohne Login.
-- ============================================================

-- Bestehende Policies löschen (falls vorhanden) und neu erstellen
DO $$
BEGIN
  -- benches policies
  DROP POLICY IF EXISTS "Benches are viewable by everyone" ON public.benches;
  DROP POLICY IF EXISTS "Anyone can insert benches" ON public.benches;
  DROP POLICY IF EXISTS "Anyone can update benches" ON public.benches;
  DROP POLICY IF EXISTS "Anyone can delete benches" ON public.benches;

  -- comments policies
  DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
  DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
END $$;

-- RLS aktivieren (idempotent, schadet nicht wenn bereits aktiv)
ALTER TABLE public.benches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Bänke: Jeder kann lesen (auch ohne Auth / anon key)
CREATE POLICY "Benches are viewable by everyone"
  ON public.benches FOR SELECT
  USING (true);

-- Bänke: Jeder kann erstellen
CREATE POLICY "Anyone can insert benches"
  ON public.benches FOR INSERT
  WITH CHECK (true);

-- Bänke: Jeder kann bearbeiten
CREATE POLICY "Anyone can update benches"
  ON public.benches FOR UPDATE
  USING (true);

-- Bänke: Jeder kann löschen
CREATE POLICY "Anyone can delete benches"
  ON public.benches FOR DELETE
  USING (true);

-- Kommentare: Jeder kann lesen
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (true);

-- Kommentare: Jeder kann erstellen
CREATE POLICY "Anyone can insert comments"
  ON public.comments FOR INSERT
  WITH CHECK (true);
