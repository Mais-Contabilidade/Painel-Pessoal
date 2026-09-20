-- Painel Pessoal v2 — ajustes mínimos para ligar Biblioteca e Receitas ao
-- frontend, reaproveitando o schema já existente (library_items,
-- library_notes, recipes, recipe_ingredients, shopping_lists,
-- shopping_list_items — nenhuma tabela nova criada aqui).
--
-- 1) GRANT explícito às 6 tabelas para `authenticated`. O projeto real
--    está com "exposição automática de tabelas" desativada — sem GRANT
--    explícito, mesmo com RLS correto, o PostgREST responde "permission
--    denied for table X" porque o Postgres checa privilégio de tabela
--    ANTES de avaliar as policies de RLS. `anon` não recebe nada (dados
--    pessoais nunca são públicos).
-- 2) library_notes.note_type ganha 'citacao' (Citação/trecho) — os
--    outros 4 tipos pedidos já existiam (ponto_principal, aprendizado,
--    aplicacao, comentario = "Nota livre").
-- 3) recipes.category ganha 'lanche', 'molho_acompanhamento' e 'outro' —
--    'salgado'/'doce'/'bebida' já existiam.
-- 4) library_notes ganha "título opcional" da anotação (content já cobria
--    o texto da nota; título é a única coluna que faltava).

grant select, insert, update, delete on public.library_items to authenticated;
grant select, insert, update, delete on public.library_notes to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.shopping_lists to authenticated;
grant select, insert, update, delete on public.shopping_list_items to authenticated;

revoke all on public.library_items from anon;
revoke all on public.library_notes from anon;
revoke all on public.recipes from anon;
revoke all on public.recipe_ingredients from anon;
revoke all on public.shopping_lists from anon;
revoke all on public.shopping_list_items from anon;

alter table public.library_notes
  drop constraint if exists library_notes_note_type_check;

alter table public.library_notes
  add constraint library_notes_note_type_check
  check (note_type in ('ponto_principal', 'aprendizado', 'citacao', 'aplicacao', 'comentario'));

alter table public.recipes
  drop constraint if exists recipes_category_check;

alter table public.recipes
  add constraint recipes_category_check
  check (category in ('salgado', 'doce', 'bebida', 'lanche', 'molho_acompanhamento', 'outro'));

alter table public.library_notes add column if not exists title text;
