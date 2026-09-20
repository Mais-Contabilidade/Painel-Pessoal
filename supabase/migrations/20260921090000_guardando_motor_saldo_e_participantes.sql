-- Painel Pessoal v2 — Guardando: novo motor de planejamento (saldo + prazo,
-- sem waterfall entre meses), saldo inicial como tipo de lançamento e
-- participantes por meta. Migration incremental — nada é apagado nem
-- recriado; lançamentos e metas existentes continuam válidos.
-- participant_id/source nascem NULL nos lançamentos antigos ("Não
-- informado" na UI); não tentamos inferir automaticamente.

-- =========================================================================
-- 1) financial_transactions: novo tipo 'saldo_inicial' + origem opcional.
-- =========================================================================

alter table public.financial_transactions
  drop constraint if exists financial_transactions_type_check;

alter table public.financial_transactions
  add constraint financial_transactions_type_check
  check (type in ('aporte', 'saldo_inicial', 'rendimento', 'retirada'));

alter table public.financial_transactions
  add column if not exists source text;

-- =========================================================================
-- 2) financial_goals: plano original congelado (necessidade mensal na
--    criação) + tipo de divisão entre participantes. Metas existentes
--    ganham allocation_type='livre' (comportamento individual, igual ao
--    de antes) e original_monthly_target_cents=null (a UI usa
--    target/meses como estimativa quando null, sem inventar histórico).
-- =========================================================================

alter table public.financial_goals
  add column if not exists original_monthly_target_cents bigint;

alter table public.financial_goals
  add column if not exists allocation_type text not null default 'livre';

alter table public.financial_goals
  drop constraint if exists financial_goals_allocation_type_check;

alter table public.financial_goals
  add constraint financial_goals_allocation_type_check
  check (allocation_type in ('livre', 'igual', 'percentual', 'valor_mensal'));

alter table public.financial_goals
  drop constraint if exists financial_goals_month_order_check;

alter table public.financial_goals
  add constraint financial_goals_month_order_check
  check (end_month >= start_month);

-- =========================================================================
-- 3) financial_goal_participants — quem está juntando dinheiro para a
--    meta. Não precisa ser usuário autenticado (é só um rótulo
--    financeiro, ex.: "Pri").
-- =========================================================================

create table public.financial_goal_participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.financial_goals (id) on delete cascade,
  name text not null,
  share_percent numeric(5, 2) check (share_percent >= 0 and share_percent <= 100),
  monthly_target_cents bigint check (monthly_target_cents >= 0),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_goal_participants enable row level security;

create policy "financial_goal_participants_all_own" on public.financial_goal_participants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index financial_goal_participants_goal_idx on public.financial_goal_participants (goal_id, order_index);

create trigger set_financial_goal_participants_updated_at
  before update on public.financial_goal_participants
  for each row execute function public.set_updated_at();

-- Tabela nova: projeto real está com exposição automática desativada, então
-- precisa de GRANT explícito além da RLS (mesmo caso já resolvido para
-- Biblioteca/Receitas — sem isso dá "permission denied for table").
grant select, insert, update, delete on public.financial_goal_participants to authenticated;
revoke all on public.financial_goal_participants from anon;

-- =========================================================================
-- 4) financial_transactions.participant_id — só agora, com a tabela acima
--    já existindo.
-- =========================================================================

alter table public.financial_transactions
  add column if not exists participant_id uuid references public.financial_goal_participants (id) on delete set null;

create index if not exists financial_transactions_participant_idx on public.financial_transactions (participant_id);

-- Garante que o participante escolhido pertence à mesma meta e ao mesmo
-- usuário do lançamento — checagem entre tabelas não dá para expressar
-- como CHECK simples, por isso é trigger (mesmo mecanismo de
-- handle_new_user/set_updated_at: dispara automaticamente mesmo com
-- EXECUTE revogado de public).
create or replace function public.validate_transaction_participant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.participant_id is not null then
    if not exists (
      select 1 from public.financial_goal_participants p
      where p.id = new.participant_id
        and p.goal_id = new.goal_id
        and p.user_id = new.user_id
    ) then
      raise exception 'Participante não pertence a esta meta.';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.validate_transaction_participant() from public;

drop trigger if exists validate_transaction_participant_trigger on public.financial_transactions;

create trigger validate_transaction_participant_trigger
  before insert or update on public.financial_transactions
  for each row execute function public.validate_transaction_participant();
