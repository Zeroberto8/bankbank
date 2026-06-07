-- Bewertung (rating) optional machen.
-- Kommentare koennen jetzt ohne Sternebewertung gespeichert werden;
-- ohne diese Aenderung schlaegt der Insert mit "null value in column rating
-- violates not-null constraint" (Code 23502) fehl -> Fehlermeldung im UI.
--
-- Im Supabase SQL-Editor des Projekts vsvxkikraedffgvpttnn (bankbank2) ausfuehren.
-- Ein evtl. vorhandener Check wie (rating between 1 and 5) bleibt gueltig,
-- da CHECK-Constraints NULL durchlassen.

alter table public.comments
  alter column rating drop not null;
