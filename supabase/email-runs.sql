-- ============================================================
-- BankBank: email_runs Tabelle
-- ============================================================
-- Im Supabase Dashboard unter "SQL Editor" einmal ausführen.
--
-- Speichert den Zeitpunkt jedes erfolgreichen Cron-Mailversands,
-- damit der nächste Lauf "alles seit dem letzten Lauf" melden kann
-- statt einer rollenden Zeitfensterheuristik.
-- ============================================================

create table if not exists public.email_runs (
  id bigint generated always as identity primary key,
  sent_at timestamptz not null default now(),
  benches_count int not null default 0,
  comments_count int not null default 0
);

create index if not exists idx_email_runs_sent_at
  on public.email_runs (sent_at desc);

-- RLS: Tabelle wird nur vom Edge-Function-Service-Role-Key beschrieben/gelesen.
-- Anon/Authenticated brauchen keinen Zugriff. Wir aktivieren RLS ohne Policies,
-- damit nur service_role (das RLS umgeht) Zugriff hat.
alter table public.email_runs enable row level security;
