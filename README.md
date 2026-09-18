# Painel Pessoal

Hub pessoal com quatro áreas: Início, Treino, Insights e Financeiro.

- **Início** — resumo enxuto do que importa agora: treino do dia, progresso da semana, um insight relevante e um resumo financeiro discreto.
- **Treino** — ficha de 5 dias, sessão com cronômetro total (sobrevive a fechar/atualizar a página), checklist de séries e histórico simples.
- **Insights** — biblioteca pessoal de ideias e aprendizados, com título opcional, tags, favoritos, busca e filtros.
- **Financeiro** — cofrinhos e metas com planejamento por competência mensal, aportes, rendimento de CDI (não conta como aporte pessoal) e retiradas com justificativa obrigatória e prévia de impacto nos meses seguintes.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + Zustand (persistência em `localStorage`). Mobile-first, com tema claro/escuro consistente e sem flash de estilo.

## Rodando localmente

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` — build de produção
- `npm run start` — serve o build de produção
- `npm run lint` — lint
