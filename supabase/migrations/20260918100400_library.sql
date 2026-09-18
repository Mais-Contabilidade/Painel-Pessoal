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
