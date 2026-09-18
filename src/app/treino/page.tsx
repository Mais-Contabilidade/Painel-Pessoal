"use client";

import { useState } from "react";
import { useWorkoutStore } from "@/store/workout-store";
import { useMounted } from "@/lib/use-mounted";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { DayCard } from "@/components/treino/day-card";
import { EditDaySheet } from "@/components/treino/edit-day-sheet";
import { ActiveSession } from "@/components/treino/active-session";
import { HistoryList } from "@/components/treino/history-list";

export default function TreinoPage() {
  const mounted = useMounted();
  const plan = useWorkoutStore((s) => s.plan);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const history = useWorkoutStore((s) => s.history);
  const startSession = useWorkoutStore((s) => s.startSession);

  const [tab, setTab] = useState<"treinos" | "historico">("treinos");
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
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
              { value: "historico", label: "Histórico" },
            ]}
          />
        }
      />

      <div className="px-5 pb-6">
        {tab === "treinos" ? (
          <div className="space-y-2">
            {plan.map((day) => (
              <DayCard
                key={day.id}
                day={day}
                onStart={() => startSession(day.id)}
                onEdit={() => setEditingDayId(day.id)}
              />
            ))}
          </div>
        ) : (
          <HistoryList history={history} />
        )}
      </div>

      <EditDaySheet day={editingDay} onClose={() => setEditingDayId(null)} />
    </div>
  );
}
