"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useWorkoutStore, type SetEntry } from "@/store/workout-store";
import { useSupabase } from "@/lib/supabase-provider";
import { useElapsed } from "@/lib/use-elapsed";
import { formatDuration } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

function groupByExercise(sets: SetEntry[]): { exerciseName: string; sets: SetEntry[] }[] {
  const order: string[] = [];
  const map = new Map<string, SetEntry[]>();
  for (const set of sets) {
    if (!map.has(set.exerciseName)) {
      map.set(set.exerciseName, []);
      order.push(set.exerciseName);
    }
    map.get(set.exerciseName)!.push(set);
  }
  return order.map((exerciseName) => ({
    exerciseName,
    sets: map.get(exerciseName)!.sort((a, b) => a.setIndex - b.setIndex),
  }));
}

export function ActiveSession() {
  const supabase = useSupabase();
  const session = useWorkoutStore((s) => s.activeSession);
  const toggleSet = useWorkoutStore((s) => s.toggleSet);
  const updateSetDetails = useWorkoutStore((s) => s.updateSetDetails);
  const finishSession = useWorkoutStore((s) => s.finishSession);
  const discardSession = useWorkoutStore((s) => s.discardSession);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const elapsed = useElapsed(session?.startedAt ?? null);
  const grouped = useMemo(() => (session ? groupByExercise(session.sets) : []), [session]);

  if (!session) return null;

  const done = session.sets.filter((s) => s.completed).length;
  const total = session.sets.length;

  return (
    <div className="px-5 pb-6">
      <div className="sticky top-0 z-10 -mx-5 mb-5 border-b border-border bg-bg/95 px-5 pt-6 pb-4 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[12.5px] font-medium text-accent">
              Treino em andamento{session.variant && ` · Semana ${session.variant}`}
            </p>
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
        {grouped.map(({ exerciseName, sets }) => {
          const anyCompleted = sets.some((s) => s.completed);
          return (
            <div key={exerciseName} className="rounded-2xl border border-border bg-surface p-4">
              <p className="mb-3 text-[14.5px] font-medium text-text">{exerciseName}</p>
              <div className="flex flex-wrap gap-2">
                {sets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => supabase && toggleSet(supabase, set.id, !set.completed)}
                    aria-pressed={set.completed}
                    aria-label={`Série ${set.setIndex + 1}${set.completed ? " concluída" : ""}`}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-[13px] font-medium transition-colors ${
                      set.completed
                        ? "border-accent bg-accent text-accent-text"
                        : "border-border text-text-muted hover:border-text-faint"
                    }`}
                  >
                    {set.completed ? <Check size={16} /> : set.setIndex + 1}
                  </button>
                ))}
              </div>

              {anyCompleted && (
                <div className="mt-3 space-y-1.5 border-t border-border-subtle pt-3">
                  {sets
                    .filter((s) => s.completed)
                    .map((set) => (
                      <div key={set.id} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-[12px] text-text-faint">Série {set.setIndex + 1}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="kg"
                          defaultValue={set.weightKg ?? ""}
                          onBlur={(e) =>
                            supabase &&
                            updateSetDetails(
                              supabase,
                              set.id,
                              e.target.value ? Number(e.target.value) : null,
                              set.reps
                            )
                          }
                          className="h-8 w-16 rounded-md bg-surface-2 px-2 text-center text-[12.5px] text-text outline-none"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="reps"
                          defaultValue={set.reps ?? ""}
                          onBlur={(e) =>
                            supabase &&
                            updateSetDetails(
                              supabase,
                              set.id,
                              set.weightKg,
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="h-8 w-16 rounded-md bg-surface-2 px-2 text-center text-[12.5px] text-text outline-none"
                        />
                        <span className="text-[11px] text-text-faint">opcional</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-20 mt-6 flex gap-2 md:bottom-4">
        <Button variant="secondary" onClick={() => setConfirmDiscard(true)} className="flex-1">
          Descartar
        </Button>
        <Button onClick={() => supabase && finishSession(supabase)} className="flex-[2]">
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
                if (supabase) discardSession(supabase);
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
