"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCardioStore, resolveWeekGoal } from "@/store/cardio-store";
import { useSupabase } from "@/lib/supabase-provider";
import { startOfWeek } from "@/lib/week";
import { formatDateShort } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CardioEntrySheet } from "@/components/cardio/cardio-entry-sheet";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function CardioTab() {
  const supabase = useSupabase();
  const entries = useCardioStore((s) => s.entries);
  const weekGoals = useCardioStore((s) => s.weekGoals);
  const defaultGoalMinutes = useCardioStore((s) => s.defaultGoalMinutes);
  const deleteEntry = useCardioStore((s) => s.deleteEntry);
  const setDefaultGoal = useCardioStore((s) => s.setDefaultGoal);

  const [adding, setAdding] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(defaultGoalMinutes));

  const weekStartISO = toISODate(startOfWeek(new Date()));
  const goalMinutes = resolveWeekGoal({ weekGoals, defaultGoalMinutes }, weekStartISO);

  const weekEntries = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return entries.filter((e) => {
      const d = new Date(`${e.date}T12:00:00`);
      return d >= start && d <= end;
    });
  }, [entries]);

  const doneMinutes = weekEntries.reduce((acc, e) => acc + e.minutes, 0);
  const remaining = Math.max(0, goalMinutes - doneMinutes);
  const pct = goalMinutes > 0 ? (doneMinutes / goalMinutes) * 100 : 0;

  const recentEntries = entries.slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[22px] font-semibold text-text">
            {doneMinutes} <span className="text-[14px] font-normal text-text-muted">/ {goalMinutes} min</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setGoalDraft(String(defaultGoalMinutes));
              setEditingGoal((v) => !v);
            }}
            className="text-[12px] font-medium text-accent"
          >
            Meta padrão
          </button>
        </div>
        <Progress value={pct} className="mt-2.5" />
        <p className="mt-2 text-[12.5px] text-text-muted">
          {remaining > 0 ? `Faltam ${remaining} min` : "Meta da semana concluída"} · {Math.round(pct)}%
        </p>

        {editingGoal && (
          <div className="mt-3 flex items-center gap-2 border-t border-border-subtle pt-3">
            <input
              type="number"
              min={1}
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              className="h-8 w-20 rounded-md bg-surface-2 px-2 text-center text-[13px] text-text outline-none"
            />
            <span className="text-[12px] text-text-muted">min/semana</span>
            <Button
              size="sm"
              variant="secondary"
              className="ml-auto"
              onClick={async () => {
                if (!supabase) return;
                const val = Number(goalDraft);
                if (val > 0) await setDefaultGoal(supabase, val);
                setEditingGoal(false);
              }}
            >
              Salvar
            </Button>
          </div>
        )}
      </div>

      <Button className="w-full" onClick={() => setAdding(true)}>
        <Plus size={16} />
        Registrar cardio
      </Button>

      {recentEntries.length > 0 && (
        <div>
          <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">Lançamentos recentes</p>
          <ul className="space-y-1.5">
            {recentEntries.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-border-subtle px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] text-text">{e.minutes} min</p>
                  <p className="truncate text-[12px] text-text-muted">
                    {formatDateShort(e.date)}
                    {e.note && ` · ${e.note}`}
                  </p>
                </div>
                <button
                  onClick={() => supabase && deleteEntry(supabase, e.id)}
                  aria-label="Remover lançamento"
                  className="shrink-0 text-text-faint hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {adding && <CardioEntrySheet onClose={() => setAdding(false)} />}
    </div>
  );
}
