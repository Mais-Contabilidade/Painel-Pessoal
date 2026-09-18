-- Painel Pessoal — corrige os avisos do Supabase Security Advisor:
--
-- 1) function_search_path_mutable: toda função precisa de um search_path travado na
--    definição (não herdado da sessão de quem chama). handle_new_user e
--    seed_default_workout_plan já tinham `set search_path = public`; só faltava em
--    set_updated_at.
-- 2) SECURITY DEFINER executável por anon/authenticated: por padrão o Postgres concede
--    EXECUTE a PUBLIC (o que inclui anon via PostgREST) em toda função nova. Nenhuma das
--    três precisa disso — set_updated_at e handle_new_user só são chamadas por trigger
--    (não por RPC), e seed_default_workout_plan só deve ser chamável pelo próprio usuário
--    autenticado, nunca por anon. A checagem interna (auth.uid() = p_user_id) já barrava
--    abuso, mas a Advisor pede o cinto e a suspensório: revogar o EXECUTE público em vez
--    de confiar só na lógica interna.

alter function public.set_updated_at() set search_path = '';

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.handle_new_user() from public;

revoke execute on function public.seed_default_workout_plan(uuid) from public;
grant execute on function public.seed_default_workout_plan(uuid) to authenticated;
