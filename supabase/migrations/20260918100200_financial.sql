-- Painel Pessoal v2 — Financeiro: Guardando / Pagando / Emprestado-A receber.
-- Três universos deliberadamente em tabelas separadas — nunca misturar semanticamente.

-- =========================================================================
-- GUARDANDO — metas/cofrinhos (mesmo motor de competência mensal do v1).
-- =========================================================================

create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_value_cents bigint not null check (target_value_cents > 0),
  start_month char(7) not null, -- 'YYYY-MM'
  end_month char(7) not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_goals enable row level security;

create policy "financial_goals_all_own" on public.financial_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index financial_goals_user_idx on public.financial_goals (user_id) where not archived;

create trigger set_financial_goals_updated_at
  before update on public.financial_goals
  for each row execute function public.set_updated_at();

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.financial_goals (id) on delete cascade,
  type text not null check (type in ('aporte', 'rendimento', 'retirada')),
  value_cents bigint not null check (value_cents > 0),
  occurred_on date not null,
  note text,
  justification text, -- obrigatório em retirada, validado na aplicação
  created_at timestamptz not null default now()
);

alter table public.financial_transactions enable row level security;

create policy "financial_transactions_all_own" on public.financial_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index financial_transactions_goal_idx on public.financial_transactions (goal_id, occurred_on);

-- =========================================================================
-- PAGANDO — dívidas/parcelas já assumidas.
-- =========================================================================

create table public.financial_obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  creditor text,
  total_value_cents bigint check (total_value_cents > 0),
  installment_value_cents bigint not null check (installment_value_cents > 0),
  start_month char(7) not null,
  end_month char(7),
  due_day int check (due_day between 1 and 31),
  installments_count int check (installments_count > 0),
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_obligations enable row level security;

create policy "financial_obligations_all_own" on public.financial_obligations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index financial_obligations_user_idx on public.financial_obligations (user_id) where not archived;

create trigger set_financial_obligations_updated_at
  before update on public.financial_obligations
  for each row execute function public.set_updated_at();

create table public.financial_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  obligation_id uuid not null references public.financial_obligations (id) on delete cascade,
  competence_month char(7) not null,
  due_date date,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado')),
  paid_at timestamptz,
  paid_value_cents bigint check (paid_value_cents > 0),
  created_at timestamptz not null default now(),
  unique (obligation_id, competence_month)
);

alter table public.financial_installments enable row level security;

create policy "financial_installments_all_own" on public.financial_installments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index financial_installments_obligation_idx on public.financial_installments (obligation_id, competence_month);
create index financial_installments_due_idx on public.financial_installments (user_id, due_date) where status <> 'pago';

-- =========================================================================
-- EMPRESTADO / A RECEBER — saiu temporariamente, deve voltar.
-- =========================================================================

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person text not null,
  original_value_cents bigint not null check (original_value_cents > 0),
  lent_on date not null,
  agreed_return_date date,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.receivables enable row level security;

create policy "receivables_all_own" on public.receivables
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index receivables_user_idx on public.receivables (user_id) where not archived;

create trigger set_receivables_updated_at
  before update on public.receivables
  for each row execute function public.set_updated_at();

create table public.receivable_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  receivable_id uuid not null references public.receivables (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  paid_on date not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.receivable_payments enable row level security;

create policy "receivable_payments_all_own" on public.receivable_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index receivable_payments_receivable_idx on public.receivable_payments (receivable_id);

-- =========================================================================
-- Dispensas de lembretes automáticos (parcela/dívida/empréstimo/meta) —
-- os lembretes em si são computados a partir das tabelas acima, não armazenados.
-- =========================================================================

create table public.reminder_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reminder_key text not null, -- ex.: 'installment:<uuid>', 'receivable:<uuid>', 'goal:<uuid>'
  dismissed_at timestamptz not null default now(),
  unique (user_id, reminder_key)
);

alter table public.reminder_dismissals enable row level security;

create policy "reminder_dismissals_all_own" on public.reminder_dismissals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
