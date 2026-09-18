-- ==========================================================================
-- Painel Pessoal — script único para colar no SQL Editor do Supabase.
-- Gerado por concatenação EXATA dos arquivos de supabase/migrations/, na
-- mesma ordem — nenhuma linha de lógica foi alterada, só empacotado em uma
-- única transação para ser tudo-ou-nada (se algo falhar, nada fica aplicado
-- pela metade). Os arquivos individuais continuam sendo a fonte de verdade
-- versionada; use este arquivo só como atalho para rodar tudo de uma vez.
-- ==========================================================================

begin;

-- ========================= 20260918100000_core.sql =========================
-- Painel Pessoal v2 — núcleo: extensões, helper de updated_at, whitelist, profiles, user_settings.
-- Rode este arquivo primeiro, na ordem do nome (timestamp crescente).

create extension if not exists "pgcrypto";

-- Helper reutilizado por toda tabela que tem updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- Whitelist de acesso — só e-mails aqui podem terminar de criar conta.
-- =========================================================================

create table public.allowed_emails (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.allowed_emails is
  'Whitelist de e-mails autorizados a usar o painel. Login Google de e-mail fora desta lista é rejeitado no próprio auth.users (ver handle_new_user).';

-- Preencha com o(s) e-mail(s) autorizado(s) antes de tentar logar pela primeira vez, ex.:
-- insert into public.allowed_emails (email, note) values ('voce@exemplo.com', 'dono do painel');

alter table public.allowed_emails enable row level security;
-- Ninguém acessa esta tabela pelo cliente (nem para leitura) — só o trigger (security definer) a consulta.
-- Nenhuma policy = nenhum acesso via PostgREST/anon/authenticated.

-- =========================================================================
-- profiles — 1:1 com auth.users
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  migrated_from_local_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Sem policy de insert/delete: linhas são criadas só pelo trigger handle_new_user (security definer).

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Trigger: cria a conta em auth.users somente se o e-mail estiver na whitelist.
-- Lançar exceção aqui reverte a transação inteira, incluindo o insert em auth.users
-- (é o mecanismo padrão do Supabase para allow-list de signup).
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(new.email)
  ) then
    raise exception 'E-mail % não autorizado para este painel pessoal.', new.email
      using errcode = '28000'; -- invalid_authorization_specification
  end if;

  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- =========================================================================
-- user_settings — preferências, criado depois de profiles pois é referenciado acima
-- (a tabela precisa existir antes do trigger ser criado, então ela é definida agora
-- e o trigger só é efetivamente registrado no fim deste arquivo).
-- =========================================================================

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  cardio_default_goal_minutes int not null default 120 check (cardio_default_goal_minutes > 0),
  cycle_anchor_date date not null default date_trunc('week', now())::date,
  hide_financial_values boolean not null default true,
  hide_financial_on_startup boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Agora que profiles e user_settings existem, registra o trigger de criação de conta.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Storage — bucket de avatar (privado; acesso via signed URL ou policy abaixo)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "avatar_select_own" on storage.objects
  for select using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_insert_own" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_delete_own" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Convenção de path: avatars/{user_id}/{arquivo}

-- ========================= 20260918100100_workout.sql =========================
-- Painel Pessoal v2 — Treino: ficha A/B, sessões, cardio.

-- =========================================================================
-- Ficha: um "dia" por variante (A/B) × dia da semana (1=segunda..5=sexta).
-- =========================================================================

create table public.workout_day_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  variant char(1) not null check (variant in ('A', 'B')),
  weekday int not null check (weekday between 1 and 5),
  name text not null,
  muscle_groups text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, variant, weekday)
);

alter table public.workout_day_templates enable row level security;

create policy "workout_day_templates_all_own" on public.workout_day_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index workout_day_templates_user_idx on public.workout_day_templates (user_id);

create trigger set_workout_day_templates_updated_at
  before update on public.workout_day_templates
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Exercícios de cada dia — totalmente editáveis (nome, séries, faixa de reps, ordem).
-- =========================================================================

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null references public.workout_day_templates (id) on delete cascade,
  name text not null,
  target_sets int not null default 3 check (target_sets > 0),
  rep_range_min int check (rep_range_min > 0),
  rep_range_max int check (rep_range_max >= rep_range_min),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workout_template_exercises enable row level security;

create policy "workout_template_exercises_all_own" on public.workout_template_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index workout_template_exercises_template_idx on public.workout_template_exercises (template_id, order_index);

create trigger set_workout_template_exercises_updated_at
  before update on public.workout_template_exercises
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Override manual de ciclo: "esta semana (segunda X) deveria ser A/B".
-- Resolução de variante da semana: procura aqui primeiro; se não achar,
-- calcula a partir de user_settings.cycle_anchor_date (par/ímpar de semanas).
-- =========================================================================

create table public.workout_week_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start_date date not null,
  variant char(1) not null check (variant in ('A', 'B')),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

alter table public.workout_week_overrides enable row level security;

create policy "workout_week_overrides_all_own" on public.workout_week_overrides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index workout_week_overrides_user_idx on public.workout_week_overrides (user_id, week_start_date);

-- =========================================================================
-- Sessões realizadas.
-- =========================================================================

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid references public.workout_day_templates (id) on delete set null,
  day_name text not null,
  variant char(1) check (variant in ('A', 'B')),
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_ms bigint,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_all_own" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index workout_sessions_user_idx on public.workout_sessions (user_id, started_at desc);

-- =========================================================================
-- Séries concluídas na sessão — carga/reps opcionais.
-- =========================================================================

create table public.workout_session_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_name text not null,
  set_index int not null,
  completed boolean not null default false,
  weight_kg numeric(6, 2),
  reps int,
  created_at timestamptz not null default now()
);

alter table public.workout_session_sets enable row level security;

create policy "workout_session_sets_all_own" on public.workout_session_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index workout_session_sets_session_idx on public.workout_session_sets (session_id);

-- =========================================================================
-- Cardio — módulo separado da musculação.
-- =========================================================================

create table public.cardio_week_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start_date date not null,
  goal_minutes int not null check (goal_minutes > 0),
  created_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

alter table public.cardio_week_goals enable row level security;

create policy "cardio_week_goals_all_own" on public.cardio_week_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index cardio_week_goals_user_idx on public.cardio_week_goals (user_id, week_start_date);

create table public.cardio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  minutes int not null check (minutes > 0),
  note text,
  created_at timestamptz not null default now()
);

alter table public.cardio_entries enable row level security;

create policy "cardio_entries_all_own" on public.cardio_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index cardio_entries_user_date_idx on public.cardio_entries (user_id, entry_date desc);

-- ========================= 20260918100200_financial.sql =========================
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

-- ========================= 20260918100300_insights.sql =========================
-- Painel Pessoal v2 — Insights (mesma modelagem do v1, agora no Supabase).

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  content text not null,
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.insights enable row level security;

create policy "insights_all_own" on public.insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index insights_user_idx on public.insights (user_id, updated_at desc);
create index insights_tags_idx on public.insights using gin (tags);

create trigger set_insights_updated_at
  before update on public.insights
  for each row execute function public.set_updated_at();

-- ========================= 20260918100400_library.sql =========================
-- Painel Pessoal v2 — Biblioteca: Livros, Filmes & Séries, Cursos.
-- Um item = uma linha, discriminado por "kind"; campos específicos de cada
-- tipo (gêneros, ISBN, plataforma, certificado...) vivem em metadata jsonb
-- para não multiplicar colunas nulas entre os três tipos.

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('book', 'movie_show', 'course')),
  title text not null,
  subtitle text, -- autor / instrutor-plataforma
  cover_url text,
  status text not null, -- validado por kind na aplicação (ex.: livro: quero_ler|lendo|concluido|pausado)
  rating int check (rating between 1 and 5),
  favorite boolean not null default false,
  started_on date,
  finished_on date,
  progress_percent int check (progress_percent between 0 and 100),
  tags text[] not null default '{}',
  external_source text check (external_source in ('google_books', 'tmdb', 'manual')),
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.library_items enable row level security;

create policy "library_items_all_own" on public.library_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index library_items_user_kind_idx on public.library_items (user_id, kind);
create index library_items_tags_idx on public.library_items using gin (tags);
create index library_items_metadata_idx on public.library_items using gin (metadata);

create trigger set_library_items_updated_at
  before update on public.library_items
  for each row execute function public.set_updated_at();

-- Pontos principais / o que aprendi / o que vou aplicar — N por item.
create table public.library_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.library_items (id) on delete cascade,
  note_type text not null check (note_type in ('ponto_principal', 'aprendizado', 'aplicacao', 'comentario')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.library_notes enable row level security;

create policy "library_notes_all_own" on public.library_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index library_notes_item_idx on public.library_notes (item_id);

-- ========================= 20260918100500_recipes.sql =========================
-- Painel Pessoal v2 — Receitas + lista de compras.

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  photo_url text,
  category text not null check (category in ('doce', 'salgado', 'bebida')),
  tags text[] not null default '{}',
  prep_time_minutes int check (prep_time_minutes > 0),
  servings text,
  difficulty text check (difficulty in ('facil', 'medio', 'dificil')),
  rating int check (rating between 1 and 5),
  notes text,
  instructions text,
  status text not null default 'quero_fazer' check (status in ('quero_fazer', 'ja_fiz')),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "recipes_all_own" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index recipes_user_idx on public.recipes (user_id);
create index recipes_tags_idx on public.recipes using gin (tags);

create trigger set_recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  name text not null,
  quantity numeric(10, 2),
  unit text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients_all_own" on public.recipe_ingredients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, order_index);

-- =========================================================================
-- Lista de compras — pode consolidar ingredientes de uma ou várias receitas.
-- =========================================================================

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Lista de compras',
  created_at timestamptz not null default now()
);

alter table public.shopping_lists enable row level security;

create policy "shopping_lists_all_own" on public.shopping_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  name text not null,
  quantity numeric(10, 2),
  unit text,
  checked boolean not null default false,
  source_recipe_id uuid references public.recipes (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.shopping_list_items enable row level security;

create policy "shopping_list_items_all_own" on public.shopping_list_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index shopping_list_items_list_idx on public.shopping_list_items (list_id);

-- ========================= 20260918100600_seed_default_workout.sql =========================
-- Painel Pessoal v2 — ficha inicial padrão (braços/ombros priorizados, 5x/semana, A/B).
-- Chamada uma vez por usuário (via RPC) na primeira vez que ele abre o Treino sem
-- nenhum dia cadastrado ainda. É idempotente: não faz nada se o usuário já tiver
-- qualquer workout_day_templates (mesmo que tenha editado/apagado depois).

create or replace function public.seed_default_workout_plan(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Não autorizado.';
  end if;

  if exists (select 1 from public.workout_day_templates where user_id = p_user_id) then
    return; -- já tem ficha (inicial ou editada) — não sobrescreve.
  end if;

  -- ===================== SEMANA A =====================

  -- A · Segunda · Peito + Ombro + Tríceps
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'A', 1, 'Peito + Ombro + Tríceps', 'Peito, ombro, tríceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Supino reto', 4, 6, 8, 0),
    (p_user_id, v_template_id, 'Supino inclinado com halteres', 3, 8, 10, 1),
    (p_user_id, v_template_id, 'Desenvolvimento', 3, 6, 10, 2),
    (p_user_id, v_template_id, 'Elevação lateral', 4, 10, 15, 3),
    (p_user_id, v_template_id, 'Crucifixo/crossover', 2, 10, 15, 4),
    (p_user_id, v_template_id, 'Tríceps francês', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Tríceps corda', 3, 10, 15, 6);

  -- A · Terça · Pernas A (ênfase quadríceps)
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'A', 2, 'Pernas A — ênfase quadríceps', 'Quadríceps, panturrilha')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Agachamento ou Hack Squat', 4, 6, 10, 0),
    (p_user_id, v_template_id, 'Leg Press', 3, 8, 12, 1),
    (p_user_id, v_template_id, 'Cadeira extensora', 3, 10, 15, 2),
    (p_user_id, v_template_id, 'Afundo/passada', 3, 8, 12, 3),
    (p_user_id, v_template_id, 'Mesa/cadeira flexora', 3, 10, 15, 4),
    (p_user_id, v_template_id, 'Panturrilha', 4, 10, 15, 5);

  -- A · Quarta · Costas + Bíceps
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'A', 3, 'Costas + Bíceps', 'Costas, bíceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Puxada ou barra fixa', 4, 6, 10, 0),
    (p_user_id, v_template_id, 'Remada', 3, 6, 10, 1),
    (p_user_id, v_template_id, 'Remada baixa', 3, 8, 12, 2),
    (p_user_id, v_template_id, 'Pullover no cabo', 2, 10, 15, 3),
    (p_user_id, v_template_id, 'Rosca direta', 3, 8, 12, 4),
    (p_user_id, v_template_id, 'Rosca inclinada', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Rosca martelo', 2, 10, 15, 6);

  -- A · Quinta · Ombros + Braços
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'A', 4, 'Ombros + Braços', 'Ombro, bíceps, tríceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Desenvolvimento', 3, 8, 10, 0),
    (p_user_id, v_template_id, 'Elevação lateral', 4, 12, 15, 1),
    (p_user_id, v_template_id, 'Posterior de ombro', 3, 12, 15, 2),
    (p_user_id, v_template_id, 'Rosca Scott', 3, 8, 12, 3),
    (p_user_id, v_template_id, 'Rosca no cabo', 2, 10, 15, 4),
    (p_user_id, v_template_id, 'Tríceps testa', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Tríceps unilateral', 2, 10, 15, 6);

  -- A · Sexta · Pernas B (posterior/glúteos)
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'A', 5, 'Pernas B — posterior/glúteos', 'Posterior de coxa, glúteos, panturrilha')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Terra romeno', 4, 6, 10, 0),
    (p_user_id, v_template_id, 'Flexora', 4, 8, 12, 1),
    (p_user_id, v_template_id, 'Hip Thrust', 3, 8, 12, 2),
    (p_user_id, v_template_id, 'Leg Press (posição mais alta)', 3, 10, 12, 3),
    (p_user_id, v_template_id, 'Búlgaro/unilateral', 2, 8, 12, 4),
    (p_user_id, v_template_id, 'Panturrilha', 4, 10, 15, 5);

  -- ===================== SEMANA B =====================

  -- B · Segunda · Peito + Ombro + Tríceps (mesma base da segunda A)
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'B', 1, 'Peito + Ombro + Tríceps', 'Peito, ombro, tríceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Supino reto', 4, 6, 8, 0),
    (p_user_id, v_template_id, 'Supino inclinado com halteres', 3, 8, 10, 1),
    (p_user_id, v_template_id, 'Desenvolvimento', 3, 6, 10, 2),
    (p_user_id, v_template_id, 'Elevação lateral', 4, 10, 15, 3),
    (p_user_id, v_template_id, 'Crucifixo/crossover', 2, 10, 15, 4),
    (p_user_id, v_template_id, 'Tríceps francês', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Tríceps corda', 3, 10, 15, 6);

  -- B · Terça · Costas + Bíceps (mesma base da quarta A)
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'B', 2, 'Costas + Bíceps', 'Costas, bíceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Puxada ou barra fixa', 4, 6, 10, 0),
    (p_user_id, v_template_id, 'Remada', 3, 6, 10, 1),
    (p_user_id, v_template_id, 'Remada baixa', 3, 8, 12, 2),
    (p_user_id, v_template_id, 'Pullover no cabo', 2, 10, 15, 3),
    (p_user_id, v_template_id, 'Rosca direta', 3, 8, 12, 4),
    (p_user_id, v_template_id, 'Rosca inclinada', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Rosca martelo', 2, 10, 15, 6);

  -- B · Quarta · Pernas completas
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'B', 3, 'Pernas completas', 'Quadríceps, posterior, panturrilha')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Agachamento ou Hack', 4, 6, 10, 0),
    (p_user_id, v_template_id, 'Terra romeno', 3, 6, 10, 1),
    (p_user_id, v_template_id, 'Leg Press', 3, 10, 12, 2),
    (p_user_id, v_template_id, 'Flexora', 3, 10, 15, 3),
    (p_user_id, v_template_id, 'Extensora', 2, 12, 15, 4),
    (p_user_id, v_template_id, 'Panturrilha', 4, 10, 15, 5);

  -- B · Quinta · Ombros + Braços (mesma base da quinta A)
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'B', 4, 'Ombros + Braços', 'Ombro, bíceps, tríceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Desenvolvimento', 3, 8, 10, 0),
    (p_user_id, v_template_id, 'Elevação lateral', 4, 12, 15, 1),
    (p_user_id, v_template_id, 'Posterior de ombro', 3, 12, 15, 2),
    (p_user_id, v_template_id, 'Rosca Scott', 3, 8, 12, 3),
    (p_user_id, v_template_id, 'Rosca no cabo', 2, 10, 15, 4),
    (p_user_id, v_template_id, 'Tríceps testa', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Tríceps unilateral', 2, 10, 15, 6);

  -- B · Sexta · Upper — ênfase Ombros e Braços
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'B', 5, 'Upper — ênfase Ombros e Braços', 'Ombro, bíceps, tríceps, peito, costas')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Supino inclinado', 3, 8, 10, 0),
    (p_user_id, v_template_id, 'Puxada', 3, 8, 10, 1),
    (p_user_id, v_template_id, 'Remada', 3, 8, 12, 2),
    (p_user_id, v_template_id, 'Elevação lateral', 4, 12, 15, 3),
    (p_user_id, v_template_id, 'Posterior de ombro', 3, 12, 15, 4),
    (p_user_id, v_template_id, 'Bíceps (rosca à sua escolha)', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Tríceps (variação à sua escolha)', 3, 8, 12, 6);
end;
$$;

comment on function public.seed_default_workout_plan(uuid) is
  'Popula a ficha inicial padrão (A/B, 5x/semana, braços e ombros priorizados) para um usuário sem nenhum dia cadastrado. Idempotente e chamável via RPC do app.';

-- ========================= 20260919090000_obligation_value_optional.sql =========================
-- Painel Pessoal — permite cadastrar um compromisso (Pagando) com estrutura e competências
-- definidas antes de o valor da parcela ser conhecido (ex.: "Outubro até Março, valor a definir").
-- Sem isso o app seria forçado a inventar um valor só para satisfazer o NOT NULL, o que a
-- regra de negócio proíbe explicitamente.

alter table public.financial_obligations
  alter column installment_value_cents drop not null;

alter table public.financial_obligations
  drop constraint if exists financial_obligations_installment_value_cents_check;

alter table public.financial_obligations
  add constraint financial_obligations_installment_value_cents_check
  check (installment_value_cents is null or installment_value_cents > 0);

commit;
