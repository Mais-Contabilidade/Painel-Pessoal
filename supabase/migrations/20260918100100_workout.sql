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
