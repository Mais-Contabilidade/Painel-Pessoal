"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useWorkoutStore } from "@/store/workout-store";
import { useSupabase } from "@/lib/supabase-provider";
import { useMounted } from "@/lib/use-mounted";
import { resolveWeekVariant, currentWeekStartISO } from "@/lib/workout-cycle";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { DayCard } from "@/components/treino/day-card";
import { EditDaySheet } from "@/components/treino/edit-day-sheet";
import { ActiveSession } from "@/components/treino/active-session";
import { HistoryList } from "@/components/treino/history-list";
import { HistoryAnalytics } from "@/components/treino/history-analytics";
import { WeekOverrideSheet } from "@/components/treino/week-override-sheet";
import { CardioTab } from "@/components/cardio/cardio-tab";

export default function TreinoPage() {
  const mounted = useMounted();
  const supabase = useSupabase();
  const plan = useWorkoutStore((s) => s.plan);
  const status = useWorkoutStore((s) => s.status);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const history = useWorkoutStore((s) => s.history);
  const weekOverrides = useWorkoutStore((s) => s.weekOverrides);
  const cycleAnchorDate = useWorkoutStore((s) => s.cycleAnchorDate);
  const startSession = useWorkoutStore((s) => s.startSession);

  const [tab, setTab] = useState<"treinos" | "cardio" | "historico">("treinos");
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [viewingVariant, setViewingVariant] = useState<"auto" | "A" | "B">("auto");
  const [showOverride, setShowOverride] = useState(false);

  const todayWeekday = new Date().getDay();
  const weekStartISO = currentWeekStartISO();
  const resolvedVariant = useMemo(
    () => resolveWeekVariant(new Date(), cycleAnchorDate, weekOverrides),
    [cycleAnchorDate, weekOverrides]
  );
  const shownVariant = viewingVariant === "auto" ? resolvedVariant : viewingVariant;

  const daysForVariant = plan.filter((d) => d.variant === shownVariant).sort((a, b) => a.weekday - b.weekday);
  const editingDay = plan.find((d) => d.id === editingDayId) ?? null;

  if (!mounted) return null;

  if (activeSession) {
    return <ActiveSession />;
  }

  return (
    <div>
      <PageHeader
        title="Treino"
        action={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "treinos", label: "Treinos" },
              { value: "cardio", label: "Cardio" },
              { value: "historico", label: "Histórico" },
            ]}
          />
        }
      />

      <div className="px-5 pb-6">
        {tab === "treinos" && status === "loading" && (
          <p className="py-16 text-center text-[13.5px] text-text-muted">Carregando...</p>
        )}

        {tab === "treinos" && status !== "loading" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Segmented
                value={viewingVariant === "auto" ? resolvedVariant : viewingVariant}
                onChange={(v) => setViewingVariant(v as "A" | "B")}
                options={[
                  { value: "A", label: "Semana A" },
                  { value: "B", label: "Semana B" },
                ]}
              />
              <button
                type="button"
                onClick={() => setShowOverride(true)}
                aria-label="Corrigir semana atual"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
                title="Esta semana deveria ser A/B?"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            <div className="space-y-2">
              {daysForVariant.map((day) => (
                <DayCard
                  key={day.id}
                  day={day}
                  isToday={shownVariant === resolvedVariant && day.weekday === todayWeekday}
                  onStart={() => supabase && startSession(supabase, day.id)}
                  onEdit={() => setEditingDayId(day.id)}
                />
              ))}
            </div>
            {shownVariant === resolvedVariant && (todayWeekday === 0 || todayWeekday === 6) && (
              <p className="px-1 text-[12.5px] text-text-faint">Fim de semana — sem treino programado.</p>
            )}
          </div>
        )}

        {tab === "cardio" && <CardioTab />}

        {tab === "historico" && (
          <>
            <HistoryAnalytics />
            <HistoryList history={history} />
          </>
        )}
      </div>

      <EditDaySheet day={editingDay} onClose={() => setEditingDayId(null)} />

      {showOverride && (
        <WeekOverrideSheet
          weekStartDate={weekStartISO}
          currentVariant={resolvedVariant}
          onClose={() => setShowOverride(false)}
        />
      )}
    </div>
  );
}
