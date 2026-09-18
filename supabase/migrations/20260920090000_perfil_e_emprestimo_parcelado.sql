-- Painel Pessoal v2 — finalização (P1): foto de perfil própria + devolução
-- parcelada em Emprestado/A receber.

-- =========================================================================
-- Perfil: path do storage da foto enviada pelo usuário (distinto de
-- avatar_url, que guarda a foto do Google vinda do signup). Precedência
-- decidida no app: avatar_path (upload próprio) > avatar_url (Google) >
-- iniciais.
-- =========================================================================

alter table public.profiles add column avatar_path text;

-- =========================================================================
-- Emprestado/A receber: devolução à vista (padrão, comportamento atual
-- preservado) ou parcelada, com cronograma previsto separado dos
-- recebimentos reais (receivable_payments, inalterado).
-- =========================================================================

alter table public.receivables
  add column return_mode text not null default 'avista' check (return_mode in ('avista', 'parcelado')),
  add column installments_count int check (installments_count > 0),
  add column first_due_date date;

create table public.receivable_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  receivable_id uuid not null references public.receivables (id) on delete cascade,
  installment_number int not null check (installment_number > 0),
  due_date date not null,
  value_cents bigint not null check (value_cents > 0),
  created_at timestamptz not null default now(),
  unique (receivable_id, installment_number)
);

alter table public.receivable_installments enable row level security;

create policy "receivable_installments_all_own" on public.receivable_installments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index receivable_installments_receivable_idx
  on public.receivable_installments (receivable_id, installment_number);
