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
