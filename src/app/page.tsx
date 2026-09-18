"use client";

import { useMounted } from "@/lib/use-mounted";
import { WorkoutTodayCard } from "@/components/home/workout-today-card";
import { CardioWeekCard } from "@/components/home/cardio-week-card";
import { FinanceSummaryCard } from "@/components/home/finance-summary-card";
import { HomeInsightCard } from "@/components/home/home-insight-card";

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

  if (!mounted) return null;

  const now = new Date();

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-6 md:pt-10">
      <div className="mb-6">
        <p className="text-[13px] text-text-muted">
          {WEEKDAYS[now.getDay()][0].toUpperCase() + WEEKDAYS[now.getDay()].slice(1)}, {now.getDate()}{" "}
          de {MONTHS[now.getMonth()]}
        </p>
        <h1 className="text-[20px] font-semibold text-text">Início</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <WorkoutTodayCard />
        <CardioWeekCard />
        <FinanceSummaryCard />
        <HomeInsightCard />
      </div>
    </div>
  );
}
