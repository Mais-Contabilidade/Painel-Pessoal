"use client";

import { useMemo, useState } from "react";
import { useWorkoutStore } from "@/store/workout-store";
import { useCardioStore, resolveWeekGoal } from "@/store/cardio-store";
import { Segmented } from "@/components/ui/segmented";
import { Progress } from "@/components/ui/progress";
import { formatDurationShort } from "@/lib/format";
import { computeWorkoutAnalytics, type AnalyticsWindow } from "@/lib/workout-analytics";

export function HistoryAnalytics() {
  const [window, setWindow] = useState<"4" | "12">("4");
  const windowWeeks = (Number(window) as AnalyticsWindow);
  const history = useWorkoutStore((s) => s.history);
  const cardioEntries = useCardioStore((s) => s.entries);
  const weekGoals = useCardioStore((s) => s.weekGoals);
  const defaultGoalMinutes = useCardioStore((s) => s.defaultGoalMinutes);

  const analytics = useMemo(
    () =>
      computeWorkoutAnalytics(
        history,
        cardioEntries,
        (weekStartISO) => resolveWeekGoal({ weekGoals, defaultGoalMinutes }, weekStartISO),
        windowWeeks
      ),
    [history, cardioEntries, weekGoals, defaultGoalMinutes, windowWeeks]
  );

  return (
    <div className="mb-5 space-y-3">
      <Segmented
        value={window}
        onChange={setWindow}
        options={[
          { value: "4", label: "4 semanas" },
          { value: "12", label: "12 semanas" },
        ]}
      />

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[12px] text-text-muted">Sessões realizadas</p>
            <p className="text-[17px] font-semibold text-text">
              {analytics.sessionsCount}/{analytics.expectedSessions}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-text-muted">Duração média</p>
            <p className="text-[17px] font-semibold text-text">
              {analytics.averageDurationMs > 0 ? formatDurationShort(analytics.averageDurationMs) : "—"}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[12px] text-text-muted">
            <span>Aderência</span>
            <span>{Math.round(analytics.adherencePercent)}%</span>
          </div>
          <Progress value={analytics.adherencePercent} className="mt-1" />
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[12px] text-text-muted">
            <span>Cardio</span>
            <span>
              {analytics.cardioMinutesDone}/{analytics.cardioMinutesGoal} min
            </span>
          </div>
          <Progress
            value={analytics.cardioMinutesGoal > 0 ? (analytics.cardioMinutesDone / analytics.cardioMinutesGoal) * 100 : 0}
            className="mt-1"
          />
        </div>

        {analytics.muscleGroupFrequency.length > 0 && (
          <div className="mt-4 border-t border-border-subtle pt-3">
            <p className="mb-2 text-[12px] text-text-muted">Frequência por treino</p>
            <div className="space-y-1.5">
              {analytics.muscleGroupFrequency.map((g) => (
                <div key={g.name} className="flex items-center justify-between text-[13px] text-text">
                  <span>{g.name}</span>
                  <span className="text-text-muted">{g.count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
