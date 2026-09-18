"use client";

import { Settings2, Play } from "lucide-react";
import type { DayPlan } from "@/store/workout-store";

export function DayCard({
  day,
  isToday,
  onStart,
  onEdit,
}: {
  day: DayPlan;
  isToday?: boolean;
  onStart: () => void;
  onEdit: () => void;
}) {
  const totalSets = day.exercises.reduce((acc, e) => acc + e.sets, 0);
  const hasExercises = day.exercises.length > 0;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 ${
        isToday ? "border-accent bg-accent-soft" : "border-border bg-surface"
      }`}
    >
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[15px] font-medium text-text">{day.name}</p>
        <p className="mt-0.5 text-[13px] text-text-muted">
          {hasExercises
            ? `${day.exercises.length} exercícios · ${totalSets} séries`
            : "Configurar exercícios"}
        </p>
      </button>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Configurar dia"
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
        >
          <Settings2 size={17} />
        </button>
        <button
          type="button"
          onClick={onStart}
          disabled={!hasExercises}
          aria-label="Iniciar treino"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-text transition-colors disabled:opacity-30"
        >
          <Play size={15} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
