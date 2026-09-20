-- Painel Pessoal v2 — módulo Diário (P2): uma entrada por dia, com
-- calendário e navegação por data. Migration incremental separada,
-- independente de apply_all.sql.

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  day_summary text not null default '',
  gratitude text not null default '',
  reflection text not null default '',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.journal_entries enable row level security;

create policy "journal_entries_all_own" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index journal_entries_user_date_idx on public.journal_entries (user_id, entry_date desc);

create trigger set_journal_entries_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();
