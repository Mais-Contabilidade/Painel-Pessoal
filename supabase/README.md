# Migrations do Painel Pessoal

Aplique os arquivos de `migrations/` **em ordem pelo nome** (o prefixo numérico já garante a ordem certa), no SQL Editor do seu projeto Supabase (Project → SQL Editor → New query), um arquivo de cada vez, ou de uma vez usando a Supabase CLI:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Ordem dos arquivos:

1. `20260918100000_core.sql` — extensões, whitelist (`allowed_emails`), `profiles`, `user_settings`, trigger de signup.
2. `20260918100100_workout.sql` — ficha A/B, exercícios, sessões, cardio.
3. `20260918100200_financial.sql` — Guardando, Pagando, Emprestado/A receber.
4. `20260918100300_insights.sql`
5. `20260918100400_library.sql` — livros, filmes&séries, cursos.
6. `20260918100500_recipes.sql` — receitas e lista de compras.
7. `20260918100600_seed_default_workout.sql` — função `seed_default_workout_plan` (ficha inicial).

## Antes de logar pela primeira vez

Insira seu e-mail na whitelist (troque pelo e-mail que você vai usar no login Google):

```sql
insert into public.allowed_emails (email, note)
values ('seu-email@gmail.com', 'dono do painel');
```

Sem essa linha, o login Google **é rejeitado** — é o mecanismo de segurança pedido (nenhum e-mail fora da whitelist consegue criar conta).

## Buckets de Storage

O arquivo `20260918100000_core.sql` já cria o bucket privado `avatars`. Um bucket `photos` (fotos de receita) será adicionado quando o módulo de Receitas for implementado (fase 4).
