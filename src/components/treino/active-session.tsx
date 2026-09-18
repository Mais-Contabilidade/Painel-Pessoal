"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useWorkoutStore } from "@/store/workout-store";
import { useElapsed } from "@/lib/use-elapsed";
import { formatDuration } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

export function ActiveSession() {
  const session = useWorkoutStore((s) => s.activeSession);
  const plan = useWorkoutStore((s) => s.plan);
  const toggleSet = useWorkoutStore((s) => s.toggleSet);
  const finishSession = useWorkoutStore((s) => s.finishSession);
  const discardSession = useWorkoutStore((s) => s.discardSession);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const elapsed = useElapsed(session?.startedAt ?? null);

  if (!session) return null;

  const day = plan.find((d) => d.id === session.dayId);
  const exercises = day?.exercises ?? [];

  const allSets = Object.values(session.setsDone).flat();
  const done = allSets.filter(Boolean).length;
  const total = allSets.length;

  return (
    <div className="px-5 pb-6">
      <div className="sticky top-0 z-10 -mx-5 mb-5 border-b border-border bg-bg/95 px-5 pt-6 pb-4 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[12.5px] font-medium text-accent">Treino em andamento</p>
            <h1 className="text-[19px] font-semibold text-text">{session.dayName}</h1>
          </div>
          <p className="font-mono text-2xl font-semibold tabular-nums text-text">
            {formatDuration(elapsed)}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Progress value={total > 0 ? (done / total) * 100 : 0} className="flex-1" />
          <span className="shrink-0 text-[12px] text-text-muted">
            {done}/{total} séries
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {exercises.map((ex) => {
          const sets = session.setsDone[ex.id] ?? [];
          return (
            <div key={ex.id} className="rounded-2xl border border-border bg-surface p-4">
              <p className="mb-3 text-[14.5px] font-medium text-text">{ex.name}</p>
              <div className="flex flex-wrap gap-2">
                {sets.map((doneSet, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleSet(ex.id, idx)}
                    aria-pressed={doneSet}
                    aria-label={`Série ${idx + 1}${doneSet ? " concluída" : ""}`}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-[13px] font-medium transition-colors ${
                      doneSet
                        ? "border-accent bg-accent text-accent-text"
                        : "border-border text-text-muted hover:border-text-faint"
                    }`}
                  >
                    {doneSet ? <Check size={16} /> : idx + 1}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-20 mt-6 flex gap-2 md:bottom-4">
        <Button variant="secondary" onClick={() => setConfirmDiscard(true)} className="flex-1">
          Descartar
        </Button>
        <Button onClick={finishSession} className="flex-[2]">
          Finalizar treino
        </Button>
      </div>

      {confirmDiscard && (
        <Sheet onClose={() => setConfirmDiscard(false)} title="Descartar treino?">
          <p className="text-[14px] text-text-muted">
            O progresso desta sessão será perdido e nada será salvo no histórico.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDiscard(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                discardSession();
                setConfirmDiscard(false);
              }}
            >
              Descartar
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
