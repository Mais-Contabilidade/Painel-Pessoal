"use client";

import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { useWorkoutStore } from "@/store/workout-store";
import { useSupabase } from "@/lib/supabase-provider";
import { useElapsed } from "@/lib/use-elapsed";
import { formatDuration } from "@/lib/format";
import { resolveWeekVariant } from "@/lib/workout-cycle";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function WorkoutTodayCard() {
  const router = useRouter();
  const supabase = useSupabase();
  const plan = useWorkoutStore((s) => s.plan);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const weekOverrides = useWorkoutStore((s) => s.weekOverrides);
  const cycleAnchorDate = useWorkoutStore((s) => s.cycleAnchorDate);
  const startSession = useWorkoutStore((s) => s.startSession);

  const elapsed = useElapsed(activeSession?.startedAt ?? null);

  if (activeSession) {
    const done = activeSession.sets.filter((s) => s.completed).length;
    const total = activeSession.sets.length;
    return (
      <div className="rounded-2xl border border-accent bg-accent-soft p-4">
        <div className="flex items-center gap-2">
          <Dumbbell size={16} className="text-accent" />
          <p className="text-[12.5px] font-medium text-accent">Treino em andamento</p>
        </div>
        <p className="mt-1 text-[16px] font-semibold text-text">{activeSession.dayName}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[15px] font-semibold text-text">{formatDuration(elapsed)}</span>
          <span className="text-[12px] text-text-muted">
            {done}/{total} séries
          </span>
        </div>
        <Progress value={total > 0 ? (done / total) * 100 : 0} className="mt-2" />
        <Button className="mt-3 w-full" size="sm" onClick={() => router.push("/treino")}>
          Continuar
        </Button>
      </div>
    );
  }

  const now = new Date();
  const weekday = now.getDay();
  const variant = resolveWeekVariant(now, cycleAnchorDate, weekOverrides);
  const today = plan.find((d) => d.variant === variant && d.weekday === weekday);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Dumbbell size={16} className="text-text-faint" />
        <p className="text-[12.5px] font-medium text-text-muted">Treino de hoje</p>
      </div>
      {today ? (
        <>
          <p className="mt-1 text-[16px] font-semibold text-text">{today.name}</p>
          <p className="mt-0.5 text-[13px] text-text-muted">
            {today.muscleGroups ?? `${today.exercises.length} exercícios`}
          </p>
          <Button
            className="mt-3 w-full"
            size="sm"
            disabled={today.exercises.length === 0}
            onClick={async () => {
              if (!supabase) return;
              await startSession(supabase, today.id);
              router.push("/treino");
            }}
          >
            Iniciar treino
          </Button>
        </>
      ) : (
        <p className="mt-2 text-[14px] text-text-muted">Sem treino programado hoje. Descanso.</p>
      )}
    </div>
  );
}
