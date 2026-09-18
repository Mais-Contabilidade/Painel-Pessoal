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
