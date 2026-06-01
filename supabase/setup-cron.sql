-- ============================================================
-- BankBank: Täglichen Cron-Job für den E-Mail-Report einrichten
-- ============================================================
-- Im Supabase Dashboard des AKTIVEN Projekts (vsvxkikraedffgvpttnn)
-- unter "SQL Editor" ausführen.
--
-- Richtet einen täglichen Aufruf der Edge Function
-- "daily-bench-report" um 20:00 Uhr (Europe/Berlin) ein.
-- ============================================================

-- 1) Benötigte Erweiterungen aktivieren (idempotent).
--    pg_cron = Zeitplaner, pg_net = HTTP-Requests aus der DB heraus.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Falls schon ein gleichnamiger Job existiert: erst entfernen,
--    damit dieses Skript gefahrlos erneut ausgeführt werden kann.
select cron.unschedule('daily-bench-report')
where exists (select 1 from cron.job where jobname = 'daily-bench-report');

-- 3) Cron-Job anlegen.
--    Cron-Zeiten in pg_cron sind in UTC.
--    20:00 Europe/Berlin = 18:00 UTC (Sommerzeit / CEST, gilt aktuell).
--    Im Winter (CET) feuert '0 18 * * *' um 19:00 Berlin — dann ggf.
--    auf '0 19 * * *' ändern.
select cron.schedule(
  'daily-bench-report',
  '0 18 * * *',
  $$
  select net.http_post(
    url     := 'https://vsvxkikraedffgvpttnn.supabase.co/functions/v1/daily-bench-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- Vor dem Ausführen: YOUR_ANON_KEY ersetzen!
--   Dashboard -> Project Settings -> API -> "anon public" key.
--   (Der anon-Key ist ohnehin öffentlich; die Funktion nutzt intern
--    ihren eigenen Service-Role-Key für den DB-Zugriff.)
--
-- Leerer Body ('{}') = Cron-Modus: meldet alles seit dem letzten Lauf
-- und schreibt den Zeitpunkt in email_runs. (test:true wäre nur Vorschau.)
-- ============================================================

-- Prüfen, ob der Job angelegt wurde:
--   select jobid, jobname, schedule, active from cron.job;
--
-- Letzte Ausführungen ansehen (nach dem ersten Lauf):
--   select * from cron.job_run_details
--     where command like '%daily-bench-report%'
--     order by start_time desc limit 10;
