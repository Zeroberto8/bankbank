# E-Mail Tagesbericht einrichten

Der tägliche E-Mail-Report sendet jeden Abend um 20:00 Uhr eine Liste aller neu eingetragenen Bänke.

## 1. Resend API-Key erstellen (kostenlos)

1. Gehe zu [resend.com](https://resend.com) und erstelle einen Account
2. Gehe zu **API Keys** und erstelle einen neuen Key
3. Kopiere den Key (beginnt mit `re_...`)

## 2. Supabase CLI installieren

```bash
npm install -g supabase
```

## 3. Edge Function deployen

```bash
cd BankBank
supabase login
supabase link --project-ref DEINE_PROJECT_REF
supabase functions deploy daily-bench-report
```

Die Project-Ref findest du in deiner Supabase-URL: `https://DEINE_PROJECT_REF.supabase.co`

## 4. Secrets setzen

```bash
supabase secrets set RESEND_API_KEY=re_dein_api_key
supabase secrets set NOTIFICATION_EMAIL=ralf.kroell@gmx.de
```

(SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY sind automatisch verfügbar)

## 5. Tabelle `email_runs` anlegen

Die Funktion merkt sich den Zeitpunkt jedes erfolgreichen Cron-Versands, damit
der nächste Lauf "alles seit dem letzten Bericht" melden kann. Einmalig im
Supabase **SQL Editor** ausführen:

```bash
# Datei liegt im Repo unter supabase/email-runs.sql
```

Inhalt: siehe `supabase/email-runs.sql`.

## 6. Täglichen Cron-Job einrichten

Gehe im Supabase Dashboard zu **SQL Editor** und führe aus:

```sql
-- Extensions aktivieren (falls noch nicht geschehen)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Täglicher Report um 20:00 Uhr deutscher Zeit (18:00 UTC Sommerzeit / 19:00 UTC Winterzeit)
-- Passe die Stunde je nach Sommer-/Winterzeit an:
-- Sommerzeit (MESZ): 18:00 UTC = 20:00 deutscher Zeit
-- Winterzeit (MEZ):  19:00 UTC = 20:00 deutscher Zeit

select cron.schedule(
  'daily-bench-report',
  '0 18 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-bench-report',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Falls `current_setting` nicht funktioniert, ersetze die URL und den Key direkt:

```sql
select cron.schedule(
  'daily-bench-report',
  '0 18 * * *',
  $$
  select net.http_post(
    url := 'https://DEINE_PROJECT_REF.supabase.co/functions/v1/daily-bench-report',
    headers := '{"Authorization": "Bearer DEIN_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

## 7. Testen

Im Admin-Panel (`#admin`) gibt es den Button **"Test senden"**.
Klicke darauf, um sofort eine Test-E-Mail auszulösen.

## Cron-Job verwalten

```sql
-- Alle Jobs anzeigen
select * from cron.job;

-- Job pausieren
select cron.unschedule('daily-bench-report');

-- Zeit ändern (z.B. auf 19:00 UTC für Winterzeit)
select cron.unschedule('daily-bench-report');
select cron.schedule('daily-bench-report', '0 19 * * *', $$ ... $$);
```
