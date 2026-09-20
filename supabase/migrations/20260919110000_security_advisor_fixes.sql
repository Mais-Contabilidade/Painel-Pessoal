-- Painel Pessoal — corrige os avisos do Supabase Security Advisor:
--
-- 1) function_search_path_mutable: toda função precisa de um search_path travado na
--    definição (não herdado da sessão de quem chama). handle_new_user e
--    seed_default_workout_plan já tinham `set search_path = public`; só faltava em
--    set_updated_at.
-- 2) SECURITY DEFINER executável por anon/authenticated: por padrão o Postgres concede
--    EXECUTE a PUBLIC (o que inclui anon via PostgREST) em toda função nova. Nenhuma das
--    quatro precisa disso — set_updated_at, handle_new_user e rls_auto_enable só são
--    chamadas por trigger/event trigger (nunca por RPC), e seed_default_workout_plan só
--    deve ser chamável pelo próprio usuário autenticado, nunca por anon. A checagem
--    interna (auth.uid() = p_user_id) já barrava abuso, mas a Advisor pede o cinto e a
--    suspensório: revogar o EXECUTE público em vez de confiar só na lógica interna.
--
-- rls_auto_enable() não é criada por nenhuma migration deste repositório — já existia
-- no projeto Supabase real antes desta migration (event trigger que ativa RLS
-- automaticamente em tabelas novas). Por isso o revoke é condicional: em qualquer
-- ambiente onde ela não exista (um projeto novo criado só a partir destas migrations),
-- este bloco não faz nada. Revogar EXECUTE de uma função não impede um event trigger de
-- invocá-la — o mesmo mecanismo já validado para set_updated_at/handle_new_user com
-- triggers de linha se aplica a event triggers: a invocação automática não passa pela
-- checagem de EXECUTE do chamador.

alter function public.set_updated_at() set search_path = '';

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.handle_new_user() from public;

revoke execute on function public.seed_default_workout_plan(uuid) from public;
grant execute on function public.seed_default_workout_plan(uuid) to authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon;
    revoke execute on function public.rls_auto_enable() from authenticated;
  end if;
end $$;
