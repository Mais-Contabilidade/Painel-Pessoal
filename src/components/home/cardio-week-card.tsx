"use client";

import { useMemo } from "react";
import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { useCardioStore, resolveWeekGoal } from "@/store/cardio-store";
import { startOfWeek } from "@/lib/week";
import { Progress } from "@/components/ui/progress";

export function CardioWeekCard() {
  const entries = useCardioStore((s) => s.entries);
  const weekGoals = useCardioStore((s) => s.weekGoals);
  const defaultGoalMinutes = useCardioStore((s) => s.defaultGoalMinutes);

  const { doneMinutes, goalMinutes } = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const done = entries
      .filter((e) => {
        const d = new Date(`${e.date}T12:00:00`);
        return d >= start && d <= end;
      })
      .reduce((acc, e) => acc + e.minutes, 0);
    const goal = resolveWeekGoal({ weekGoals, defaultGoalMinutes }, start.toISOString().slice(0, 10));
    return { doneMinutes: done, goalMinutes: goal };
  }, [entries, weekGoals, defaultGoalMinutes]);

  const remaining = Math.max(0, goalMinutes - doneMinutes);
  const pct = goalMinutes > 0 ? (doneMinutes / goalMinutes) * 100 : 0;

  return (
    <Link
      href="/treino"
      className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-text-faint"
    >
      <div className="flex items-center gap-2">
        <HeartPulse size={16} className="text-text-faint" />
        <p className="text-[12.5px] font-medium text-text-muted">Cardio semanal</p>
      </div>
      <p className="mt-1 text-[16px] font-semibold text-text">
        {doneMinutes} <span className="text-[13px] font-normal text-text-muted">/ {goalMinutes} min</span>
      </p>
      <Progress value={pct} className="mt-2" />
      <p className="mt-1.5 text-[12.5px] text-text-muted">
        {remaining > 0 ? `Faltam ${remaining} min` : "Meta concluída"}
      </p>
    </Link>
  );
}
