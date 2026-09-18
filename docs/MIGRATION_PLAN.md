# Plano técnico — Painel Pessoal v2

## 1. Estado atual (v1, em produção na `main`)

Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Zustand (`persist` em `localStorage`).

Módulos existentes e onde vivem:

| Módulo | Store | Arquivo de regras | Persistência |
|---|---|---|---|
| Treino | `useWorkoutStore` (`src/store/workout-store.ts`) | — | `localStorage` (`hub-workout`) |
| Insights | `useInsightsStore` (`src/store/insights-store.ts`) | — | `localStorage` (`hub-insights`) |
| Financeiro | `useFinanceStore` (`src/store/finance-store.ts`) | `src/lib/finance.ts` (motor de competência mensal/waterfall) | `localStorage` (`hub-finance`) |

Pontos reaproveitáveis identificados:

- **Motor financeiro** (`src/lib/finance.ts`): `computeGoalSummary`, `previewWithdrawalImpact`, waterfall de alocação mês a mês, distinção aporte/rendimento. Lógica pura, sem dependência de `localStorage` — **mantém-se integralmente**, só passa a operar sobre linhas vindas do Supabase em vez do array do Zustand.
- **Utilitários de dinheiro/mês** (`src/lib/money.ts`, `src/lib/month.ts`): centavos como inteiro, `distributeCents`, `MonthKey`. Mantidos.
- **Componentes de UI** (`src/components/ui/*`): `Button`, `Sheet`, `Field`, `Chip`, `Progress`, `Segmented`, `MoneyInput`, `PageHeader`. Todos agnósticos de fonte de dados — reaproveitados 1:1 nos módulos novos.
- **`AppShell`** e `theme.tsx` (tema claro/escuro sem flash via `useSyncExternalStore`): mantidos, só a navegação ganha itens novos.
- **Padrão de sheet "mount = open"** (sem `useEffect`+`setState` para reset de formulário): mantido como padrão para os novos formulários.
- **`useElapsed`** (cronômetro de sessão de treino, recalculado pela hora real): reaproveitado tal qual para o cronômetro de sessão.

O que **não** é reaproveitável como está: os três stores Zustand viram apenas *cache/estado de UI* (ex.: sessão de treino em andamento antes de sincronizar), e o `localStorage` deixa de ser fonte de verdade — conforme exigido.

## 2. Arquitetura alvo

- **Banco**: Supabase Postgres, schema `public`, uma tabela por entidade (seção 5), todas com `user_id uuid references auth.users(id)` e RLS restringindo a `auth.uid() = user_id`.
- **Auth**: Supabase Auth, único provedor **Google OAuth**. Nenhum cadastro por e-mail/senha.
- **Whitelist**: tabela `allowed_emails` + trigger `on_auth_user_created` em `auth.users` que **rejeita a criação da conta** (rollback da transação) se o e-mail do login Google não estiver na tabela. Isto é, quem não está na whitelist nem chega a ter uma linha em `auth.users` — não é um bloqueio só na UI.
- **Cliente Supabase no Next.js App Router**: padrão oficial `@supabase/ssr` — `createBrowserClient` para componentes client, `createServerClient` para Server Components/Route Handlers, middleware para refresh de sessão em cada request.
- **Storage**: bucket `avatars` (foto de perfil) e bucket `photos` (fotos de receitas), ambos privados, acessados via signed URL ou política RLS de storage restrita a `auth.uid()`.
- **Segredos**: `service_role key` nunca entra no bundle do frontend — o app roda inteiramente com `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave pública, protegida por RLS). Chaves do TMDB e Google Books ficam em variáveis **sem** prefixo `NEXT_PUBLIC_`, usadas só em Route Handlers server-side.
- **`localStorage` no v2**: usado somente para (a) preferência de tema, (b) rascunho de sessão de treino ativa enquanto não sincroniza, (c) cache leve para abrir mais rápido offline-first. Nunca como fonte de verdade — sempre reconciliado com o Supabase ao reconectar.

## 3. Modelo de dados (visão geral — DDL completo em `supabase/migrations/`)

```
profiles                     — 1:1 com auth.users
allowed_emails                — whitelist de acesso
user_settings                 — preferências (tema, privacidade financeira, meta cardio padrão, âncora do ciclo A/B)

workout_day_templates         — ficha por variante (A/B) × dia da semana (seg–sex)
workout_template_exercises    — exercícios de cada dia (editáveis: nome, séries, faixa de reps, ordem)
workout_week_overrides        — override manual "esta semana é A/B"
workout_sessions               — sessão realizada (início real, duração, variante, dia)
workout_session_sets           — séries concluídas na sessão (carga/reps opcionais)

cardio_week_goals              — meta de minutos por semana (default ou específica)
cardio_entries                 — lançamentos de minutos por data

financial_goals                — metas "Guardando" (mesmo motor de competência mensal)
financial_transactions         — aporte / rendimento / retirada

financial_obligations          — "Pagando": dívidas/parcelas assumidas
financial_installments         — parcelas geradas por competência

receivables                    — "Emprestado/A receber"
receivable_payments            — recebimentos parciais

insights                       — biblioteca de ideias (título opcional, tags, favorito)

library_items                  — livros / filmes&séries / cursos (kind + metadata jsonb)
library_notes                  — pontos principais / aprendizados / aplicações (N por item)

recipes                        — receitas
recipe_ingredients              — ingredientes por receita

shopping_lists                 — listas de compra
shopping_list_items             — itens (podem referenciar receita de origem)

reminder_dismissals             — lembretes automáticos são computados a partir das tabelas acima;
                                   esta tabela só guarda quais foram "dispensados" pelo usuário
```

Justificativa de não ter uma tabela `reminders` genérica populada por triggers: parcelas vencendo, dívidas atrasadas, empréstimos a cobrar e metas atrasadas já são 100% deriváveis das tabelas financeiras — duplicar esse estado em outra tabela criaria uma segunda fonte de verdade que pode dessincronizar. `reminder_dismissals` guarda só a intenção do usuário ("já vi, não me lembre de novo").

## 4. Migração dos dados existentes (localStorage → Supabase)

Fluxo, executado uma única vez por dispositivo, na primeira sessão autenticada após o deploy do v2:

1. App verifica se existem as chaves antigas `hub-workout`, `hub-insights`, `hub-finance` no `localStorage` deste navegador.
2. Se existir qualquer uma com dados não vazios **e** o usuário ainda não tiver marcado essa origem como já importada (`localStorage` guarda um carimbo `hub-migration-{deviceId}-done`), mostra o diálogo:
   > "Encontramos dados deste dispositivo. Deseja importá-los para sua conta na nuvem?"
   com opções **Ver resumo**, **Importar**, **Cancelar**.
3. **Ver resumo**: conta quantos dias de ficha/exercícios, quantas sessões de histórico, quantos insights, quantas metas/transações financeiras — sem enviar nada ainda.
4. **Importar**: envia tudo em uma transação lógica (série de inserts) para as tabelas novas, cada registro recebendo um `id` novo (gerado pelo Postgres) mas preservando datas originais. Ao final, grava o carimbo de "importado" localmente **e** um registro em `profiles.migrated_from_local_at` — dois carimbos, um por dispositivo (evita reimportar no mesmo aparelho) e um por conta (permite saber que já foi feita pelo menos uma vez, para a UI não insistir).
5. **Cancelar**: fecha o diálogo, não marca nada — pergunta de novo na próxima sessão nesse dispositivo (dado não é destruído, então não há pressa).
6. Idempotência: reimportar não duplica porque o botão “Importar” fica desabilitado assim que `profiles.migrated_from_local_at` não é nulo (a opção vira “Dados já importados anteriormente. Importar mesmo assim?” como ação secundária explícita, não automática).

Os dados antigos no `localStorage` **não são apagados** pela migração — só deixam de ser lidos como fonte de verdade depois que a importação é confirmada.

## 5. Plano de entrega faseado

O escopo pedido (24 seções) equivale a várias frentes de trabalho independentes. Para não entregar 6 módulos novos meio-testados de uma vez só (o oposto do que foi pedido), a entrega desta branch segue fases, cada uma buildando, lintando e sendo testada antes de somar a próxima:

- **Fase 0 (este commit)**: plano técnico + schema completo do banco + scaffolding do cliente Supabase. Não roda de verdade sem as credenciais (seção 6).
- **Fase 1 — Fundação**: Auth Google + whitelist, `profiles`/`user_settings`, perfil com avatar (Storage), diálogo de migração de dados locais, privacidade financeira (olho global + preferência), nova navegação (Início, Treino, Insights, Financeiro, Biblioteca, Receitas, Configurações), PWA instalável básico.
- **Fase 2 — Treino & Cardio**: ficha A/B com `cycle_anchor_date` e override manual, ficha inicial (braços/ombros priorizados) editável, sessão com carga/reps opcionais, módulo de Cardio semanal, análises de 4/12 semanas.
- **Fase 3 — Financeiro reestruturado**: Guardando (motor atual migrado), Pagando (obrigações + parcelas), Emprestado/A receber, dashboard com posição líquida, detalhamento mensal.
- **Fase 4 — Biblioteca & Receitas**: Livros (Google Books), Filmes&Séries (TMDB), Cursos, recomendações; Receitas + lista de compras.
- **Fase 5 — Transversais**: busca global (Cmd/Ctrl+K), lembretes, backup/exportação, acessibilidade, suíte E2E completa.

Cada fase abre como incremento na mesma branch `claude/painel-pessoal-v2` (não uma branch por fase) — o PR único cresce, mas cada fase só é anunciada como "pronta para testar" depois de build+lint+E2E daquela fase passarem.

## 6. Bloqueio atual

Nada nas fases 1–5 funciona de verdade sem um projeto Supabase real (a Fase 0 só _prepara_ o terreno). Ver mensagem principal desta entrega para a lista exata de credenciais e passos pedidos ao usuário.
