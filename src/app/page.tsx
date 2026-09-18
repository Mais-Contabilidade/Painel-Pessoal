"use client";

import { useMemo } from "react";
import { Dumbbell, Lightbulb, PiggyBank } from "lucide-react";
import { useWorkoutStore } from "@/store/workout-store";
import { useInsightsStore } from "@/store/insights-store";
import { useFinanceStore } from "@/store/finance-store";
import { useMounted } from "@/lib/use-mounted";
import { useElapsed } from "@/lib/use-elapsed";
import { computeGoalSummary } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { formatDuration } from "@/lib/format";
import { startOfWeek } from "@/lib/week";
import { Progress } from "@/components/ui/progress";
import { HomeRow } from "@/components/home/home-row";

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export default function HomePage() {
  const mounted = useMounted();
  const plan = useWorkoutStore((s) => s.plan);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const history = useWorkoutStore((s) => s.history);
  const insights = useInsightsStore((s) => s.insights);
  const goals = useFinanceStore((s) => s.goals);
  const transactions = useFinanceStore((s) => s.transactions);

  const elapsed = useElapsed(activeSession?.startedAt ?? null);

  const weekCount = useMemo(() => {
    const start = startOfWeek(new Date());
    return history.filter((h) => new Date(h.date) >= start).length;
  }, [history]);

  const nextDay = useMemo(() => {
    if (plan.length === 0) return null;
    if (history.length === 0) return plan[0];
    const idx = plan.findIndex((d) => d.name === history[0].dayName);
    return idx === -1 ? plan[0] : plan[(idx + 1) % plan.length];
  }, [plan, history]);

  const insight = useMemo(() => {
    const favorites = insights.filter((i) => i.favorite);
    const pool = favorites.length > 0 ? favorites : insights;
    return (
      [...pool].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ??
      null
    );
  }, [insights]);

  const financeSummary = useMemo(() => {
    const activeGoals = goals.filter((g) => !g.archived);
    if (activeGoals.length === 0) return null;
    let planned = 0;
    let allocated = 0;
    for (const g of activeGoals) {
      const s = computeGoalSummary(g, transactions);
      if (s.currentMonthPlan) {
        planned += s.currentMonthPlan.planned;
        allocated += s.currentMonthPlan.allocated;
      }
    }
    return { planned, allocated };
  }, [goals, transactions]);

  if (!mounted) return null;

  const now = new Date();

  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 pt-8 pb-6 md:pt-10">
      <div>
        <p className="text-[13px] text-text-muted">
          {WEEKDAYS[now.getDay()][0].toUpperCase() + WEEKDAYS[now.getDay()].slice(1)}, {now.getDate()}{" "}
          de {MONTHS[now.getMonth()]}
        </p>
        <h1 className="text-[20px] font-semibold text-text">Início</h1>
      </div>

      <HomeRow
        href="/treino"
        icon={Dumbbell}
        title={activeSession ? `Em andamento · ${activeSession.dayName}` : nextDay?.name ?? "Treino"}
        subtitle={
          activeSession
            ? formatDuration(elapsed)
            : nextDay && nextDay.exercises.length > 0
              ? `${nextDay.exercises.length} exercícios planejados`
              : "Configure sua ficha de treino"
        }
        extra={
          <div className="mt-2 flex items-center gap-2">
            <Progress value={(Math.min(weekCount, 5) / 5) * 100} className="flex-1" />
            <span className="shrink-0 text-[11px] text-text-faint">{weekCount}/5 semana</span>
          </div>
        }
      />

      <HomeRow
        href="/insights"
        icon={Lightbulb}
        title={insight ? insight.title || insight.content : "Nenhum insight ainda"}
        subtitle={
          insight
            ? insight.title
              ? insight.content
              : (insight.tags[0] ?? "Toque para ver mais")
            : "Guarde uma ideia ou aprendizado"
        }
      />

      {financeSummary && (
        <HomeRow
          href="/financeiro"
          icon={PiggyBank}
          title={`${formatBRL(financeSummary.allocated)} guardados este mês`}
          subtitle={`Planejado: ${formatBRL(financeSummary.planned)}`}
          extra={
            <Progress
              value={
                financeSummary.planned > 0
                  ? (financeSummary.allocated / financeSummary.planned) * 100
                  : 0
              }
              className="mt-2"
            />
          }
        />
      )}
    </div>
  );
}
