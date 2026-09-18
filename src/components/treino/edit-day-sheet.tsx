"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useWorkoutStore, type DayPlan } from "@/store/workout-store";
import { useSupabase } from "@/lib/supabase-provider";

export function EditDaySheet({
  day,
  onClose,
}: {
  day: DayPlan | null;
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const renameDay = useWorkoutStore((s) => s.renameDay);
  const addExercise = useWorkoutStore((s) => s.addExercise);
  const updateExercise = useWorkoutStore((s) => s.updateExercise);
  const removeExercise = useWorkoutStore((s) => s.removeExercise);
  const reorderExercise = useWorkoutStore((s) => s.reorderExercise);

  const [newName, setNewName] = useState("");
  const [newSets, setNewSets] = useState("3");
  const [newRepMin, setNewRepMin] = useState("8");
  const [newRepMax, setNewRepMax] = useState("12");

  if (!day) return null;

  const handleAdd = () => {
    const name = newName.trim();
    const sets = Math.max(1, Math.min(20, Number(newSets) || 1));
    const repMin = newRepMin ? Number(newRepMin) : null;
    const repMax = newRepMax ? Number(newRepMax) : null;
    if (!name || !supabase) return;
    addExercise(supabase, day.id, name, sets, repMin, repMax);
    setNewName("");
    setNewSets("3");
  };

  return (
    <Sheet onClose={onClose} title="Configurar treino">
      <div className="space-y-5">
        <div>
          <Label>Nome do dia</Label>
          <Input
            defaultValue={day.name}
            onBlur={(e) => supabase && renameDay(supabase, day.id, e.target.value.trim() || day.name)}
            placeholder="Ex: Peito e tríceps"
          />
        </div>

        <div>
          <Label>Exercícios</Label>
          {day.exercises.length === 0 && (
            <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] text-text-muted">
              Nenhum exercício ainda. Adicione abaixo.
            </p>
          )}
          <ul className="space-y-2">
            {day.exercises.map((ex, idx) => (
              <li
                key={ex.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle px-2.5 py-2"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => supabase && reorderExercise(supabase, day.id, ex.id, "up")}
                    className="text-text-faint disabled:opacity-20 hover:text-text"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === day.exercises.length - 1}
                    onClick={() => supabase && reorderExercise(supabase, day.id, ex.id, "down")}
                    className="text-text-faint disabled:opacity-20 hover:text-text"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <input
                  defaultValue={ex.name}
                  onBlur={(e) =>
                    supabase && updateExercise(supabase, day.id, ex.id, { name: e.target.value.trim() || ex.name })
                  }
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none"
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={ex.sets}
                  onBlur={(e) =>
                    supabase &&
                    updateExercise(supabase, day.id, ex.id, {
                      sets: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                    })
                  }
                  className="w-11 rounded-md bg-surface-2 px-1.5 py-1 text-center text-[13px] text-text outline-none"
                  aria-label="Número de séries"
                  title="Séries"
                />
                <span className="text-[11px] text-text-faint">séries</span>
                <input
                  type="number"
                  min={1}
                  defaultValue={ex.repMin ?? ""}
                  placeholder="min"
                  onBlur={(e) =>
                    supabase &&
                    updateExercise(supabase, day.id, ex.id, {
                      repMin: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-11 rounded-md bg-surface-2 px-1.5 py-1 text-center text-[13px] text-text outline-none"
                  aria-label="Repetições mínimas"
                />
                <span className="text-[11px] text-text-faint">–</span>
                <input
                  type="number"
                  min={1}
                  defaultValue={ex.repMax ?? ""}
                  placeholder="max"
                  onBlur={(e) =>
                    supabase &&
                    updateExercise(supabase, day.id, ex.id, {
                      repMax: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-11 rounded-md bg-surface-2 px-1.5 py-1 text-center text-[13px] text-text outline-none"
                  aria-label="Repetições máximas"
                />
                <span className="text-[11px] text-text-faint">reps</span>
                <button
                  type="button"
                  onClick={() => supabase && removeExercise(supabase, day.id, ex.id)}
                  aria-label="Remover exercício"
                  className="text-text-faint hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 border-t border-border-subtle pt-4">
          <Label>Novo exercício</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Supino reto"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex items-end gap-2">
            <div className="w-16">
              <Label>Séries</Label>
              <Input type="number" min={1} max={20} value={newSets} onChange={(e) => setNewSets(e.target.value)} />
            </div>
            <div className="w-16">
              <Label>Reps min</Label>
              <Input type="number" min={1} value={newRepMin} onChange={(e) => setNewRepMin(e.target.value)} />
            </div>
            <div className="w-16">
              <Label>Reps max</Label>
              <Input type="number" min={1} value={newRepMax} onChange={(e) => setNewRepMax(e.target.value)} />
            </div>
            <Button size="md" variant="secondary" onClick={handleAdd} aria-label="Adicionar exercício">
              <Plus size={17} />
            </Button>
          </div>
        </div>

        <Button className="w-full" onClick={onClose}>
          Concluído
        </Button>
      </div>
    </Sheet>
  );
}
