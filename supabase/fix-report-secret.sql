-- ============================================================
-- BankBank: Tagesbericht – Prüffunktion für das Cron-Geheimnis korrigieren
-- ============================================================
-- Im Supabase Dashboard (Projekt bankbank2) unter "SQL Editor" ausführen.
--
-- Problem: Im Funktionskörper bezog sich "secret" nicht auf den Parameter,
-- sondern auf die gleichnamige (verschlüsselte) Spalte von
-- vault.decrypted_secrets. Der Vergleich war daher immer falsch und die
-- Edge Function lehnte den Cron-Job mit 401 "Nicht berechtigt" ab.
-- Lösung: Parameter über $1 ansprechen.
-- ============================================================

create or replace function public.check_report_secret(secret text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'daily_report_cron_secret' and decrypted_secret = $1
  )
$$;
revoke all on function public.check_report_secret(text) from public, anon, authenticated;
grant execute on function public.check_report_secret(text) to service_role;

-- Kontrolle – muss "true" ergeben:
select public.check_report_secret(
  (select decrypted_secret from vault.decrypted_secrets where name = 'daily_report_cron_secret')
) as pruefung;
