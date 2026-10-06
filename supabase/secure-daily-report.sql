-- ============================================================
-- BankBank: Tagesbericht nur noch durch Cron-Job oder Admin auslösbar
-- ============================================================
-- Im Supabase Dashboard (Projekt bankbank2) unter "SQL Editor" ausführen.
-- Der Cron-Job schickt ein Geheimnis aus dem Vault mit, das die
-- Edge Function daily-bench-report über check_report_secret() prüft.
-- Der Test-Knopf im Admin-Panel schickt stattdessen das Admin-Token.
-- ============================================================

-- 1. Zufälliges Geheimnis im Vault anlegen (nur beim ersten Mal)
select vault.create_secret(gen_random_uuid()::text, 'daily_report_cron_secret',
                           'Geheimnis für den Cron-Aufruf von daily-bench-report')
where not exists (select 1 from vault.secrets where name = 'daily_report_cron_secret');

-- 2. Prüffunktion – nur für die Edge Function (service_role) aufrufbar
create or replace function public.check_report_secret(secret text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'daily_report_cron_secret' and decrypted_secret = secret
  )
$$;
revoke all on function public.check_report_secret(text) from public, anon, authenticated;
grant execute on function public.check_report_secret(text) to service_role;

-- 3. Cron-Job neu anlegen, jetzt mit Geheimnis im Header
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
    body    := '{}'::jsonb
  );
  $$
);
