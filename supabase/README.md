# Migrations do Painel Pessoal

## Caminho recomendado — um único script

1. Abra seu projeto no [supabase.com](https://supabase.com) → **SQL Editor → New query**.
2. Cole o conteúdo inteiro de `supabase/apply_all.sql` e rode.
3. Se aparecer `COMMIT`/sucesso no final, está tudo aplicado — pode pular para "Antes de logar" abaixo.

Esse arquivo é a concatenação exata dos 9 arquivos de `migrations/` (nenhuma linha de lógica foi alterada), embrulhada numa única transação: **ou aplica tudo, ou nada** — se algo falhar no meio, nada fica pela metade e o erro aparece direto no SQL Editor.

Se rodar esse script uma segunda vez sobre um projeto que já o tem aplicado, ele vai falhar logo no primeiro `create table` (porque a tabela já existe) — isso é esperado e inofensivo: a transação inteira é revertida, nada é duplicado nem perdido. É só sinal de que já estava aplicado.

Não precisei de senha de banco, access token nem nenhuma credencial sensível para preparar isso — só o SQL Editor, que já é autenticado pela sua própria sessão logada no Supabase.

### Já rodou o script antes? Aplique só o que falta

Se você já aplicou `apply_all.sql` (ou os arquivos individuais) em algum momento anterior a hoje, **não rode o script inteiro de novo** — ele vai falhar em `create table`. Em vez disso, rode só os dois arquivos novos, na ordem, colando cada um separadamente no SQL Editor:

1. `20260919090000_obligation_value_optional.sql` — torna o valor da parcela opcional em `financial_obligations` (para compromissos com valor "a definir").
2. `20260919110000_security_advisor_fixes.sql` — corrige os avisos do Supabase Security Advisor (search_path mutável e funções `SECURITY DEFINER` executáveis por `anon`/`authenticated`).

Se o primeiro (`20260919090000`) der erro do tipo "constraint already exists" ou similar, é sinal de que ele já estava aplicado — ignore o erro dessa etapa e rode só o `20260919110000` sozinho. Rodar um `alter table ... drop not null` que já foi aplicado antes é seguro (idempotente); o que não é idempotente é a `add constraint`, por isso esse comportamento é esperado nesse cenário.

## Caminho alternativo — Supabase CLI

Só use se você já tiver a CLI configurada na sua própria máquina (`supabase login` local seu, nunca compartilhe esse token comigo):

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

## Caminho alternativo — arquivo por arquivo

Os 9 arquivos originais em `migrations/` continuam sendo a fonte de verdade versionada (histórico de mudanças do schema). Rode-os **em ordem pelo nome** se preferir revisar cada um antes de aplicar:

1. `20260918100000_core.sql` — extensões, whitelist (`allowed_emails`), `profiles`, `user_settings`, trigger de signup.
2. `20260918100100_workout.sql` — ficha A/B, exercícios, sessões, cardio.
3. `20260918100200_financial.sql` — Guardando, Pagando, Emprestado/A receber.
4. `20260918100300_insights.sql`
5. `20260918100400_library.sql` — livros, filmes&séries, cursos.
6. `20260918100500_recipes.sql` — receitas e lista de compras.
7. `20260918100600_seed_default_workout.sql` — função `seed_default_workout_plan` (ficha inicial).
8. `20260919090000_obligation_value_optional.sql` — permite parcela de compromisso sem valor definido ainda.
9. `20260919110000_security_advisor_fixes.sql` — corrige os avisos do Supabase Security Advisor (search_path e permissão de execução).

## Antes de logar pela primeira vez

Insira seu e-mail na whitelist (troque pelo e-mail que você vai usar no login Google):

```sql
insert into public.allowed_emails (email, note)
values ('seu-email@gmail.com', 'dono do painel');
```

Sem essa linha, o login Google **é rejeitado** — é o mecanismo de segurança pedido (nenhum e-mail fora da whitelist consegue criar conta).

## Buckets de Storage

O script já cria o bucket privado `avatars`. Um bucket `photos` (fotos de receita) será adicionado quando o módulo de Receitas for implementado (fase 5).

## Validado localmente

Tanto o script único (`apply_all.sql`) quanto os 7 arquivos separados foram testados de ponta a ponta contra um Postgres real (simulando os schemas `auth`/`storage` do Supabase) antes de chegar aqui: 24 tabelas criadas, whitelist bloqueando e-mail não autorizado, `profiles`/`user_settings` criados automaticamente no signup, RLS isolando dois usuários entre si (inclusive contra tentativa de inserir dado em nome de outro `user_id`), e a função `seed_default_workout_plan` gerando a ficha A/B completa de forma idempotente. O que ainda falta validar é o ambiente Supabase real (Auth/Google OAuth de verdade) — isso só é possível depois que o projeto existir.
