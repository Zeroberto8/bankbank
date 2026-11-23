-- ============================================================
-- BankBank: Tagesbericht – Zeitlimit des Cron-Aufrufs erhöhen
-- ============================================================
-- Im Supabase Dashboard (Projekt bankbank2) unter "SQL Editor" ausführen.
--
-- Problem: net.http_post bricht standardmäßig nach 5 Sekunden ab
-- ("Timeout of 5000 ms reached"). Seit die Edge Function zusätzlich das
-- Cron-Geheimnis prüft, dauert der Lauf länger – der Aufruf wird
-- abgebrochen, bevor die Mail verschickt ist.
-- Lösung: Cron-Job mit 60 s Zeitlimit neu anlegen.
-- ============================================================

select cron.unschedule('daily-bench-report')
where exists (select 1 from cron.job where jobname = 'daily-bench-report');

select cron.schedule(
  'daily-bench-report',
  '0 18 * * *',   -- 18:00 UTC = 20:00 Uhr Sommerzeit / 19:00 Uhr Winterzeit
  $$
  select net.http_post(
    url     := 'https://vsvxkikraedffgvpttnn.supabase.co/functions/v1/daily-bench-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzdnhraWtyYWVkZmZndnB0dG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjk4NTksImV4cCI6MjA4ODY0NTg1OX0.58ssEBkGF6NvK6Lk99cvXyDv5tRtkNpkbfocdfh180U',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_report_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Optional sofort testen (verschickt einen echten Bericht und zählt als Lauf):
--   select net.http_post(
--     url     := 'https://vsvxkikraedffgvpttnn.supabase.co/functions/v1/daily-bench-report',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzdnhraWtyYWVkZmZndnB0dG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjk4NTksImV4cCI6MjA4ODY0NTg1OX0.58ssEBkGF6NvK6Lk99cvXyDv5tRtkNpkbfocdfh180U',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_report_cron_secret')),
--     body    := '{}'::jsonb,
--     timeout_milliseconds := 60000);
-- Ergebnis nach ein paar Sekunden:
--   select status_code, timed_out, error_msg, content from net._http_response order by created desc limit 1;
