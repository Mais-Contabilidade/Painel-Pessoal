"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/field";
import { Chip } from "@/components/ui/chip";
import { PrivateValue } from "@/components/ui/private-value";
import { formatBRL } from "@/lib/money";
import { useFinanceStore } from "@/store/finance-store";
import { useSupabase } from "@/lib/supabase-provider";
import { computeParticipantContributions, type Goal, type GoalParticipant, type GoalAllocationType, type Transaction } from "@/lib/finance";

const ALLOCATION_OPTIONS: { value: GoalAllocationType; label: string }[] = [
  { value: "livre", label: "Livre" },
  { value: "igual", label: "Igual" },
  { value: "percentual", label: "Percentual" },
  { value: "valor_mensal", label: "Valor mensal" },
];

export function ParticipantsSection({
  goal,
  participants,
  transactions,
}: {
  goal: Goal;
  participants: GoalParticipant[];
  transactions: Transaction[];
}) {
  const supabase = useSupabase();
  const setAllocationType = useFinanceStore((s) => s.setAllocationType);
  const addParticipant = useFinanceStore((s) => s.addParticipant);
  const updateParticipant = useFinanceStore((s) => s.updateParticipant);
  const deleteParticipant = useFinanceStore((s) => s.deleteParticipant);

  const [newName, setNewName] = useState("");

  const contributions = computeParticipantContributions(goal, participants, transactions);

  const handleAdd = async () => {
    if (!supabase || !newName.trim()) return;
    await addParticipant(supabase, goal.id, { name: newName.trim(), sharePercent: null, monthlyTargetCents: null });
    setNewName("");
  };

  return (
    <div className="mt-6">
      <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">Participantes</p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {ALLOCATION_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            active={goal.allocationType === o.value}
            onClick={() => supabase && setAllocationType(supabase, goal.id, o.value)}
          >
            {o.label}
          </Chip>
        ))}
      </div>

      {contributions.length > 0 && (
        <ul className="space-y-1.5">
          {contributions.map(({ participant, contributed, personalTarget, remaining }) => (
            <li key={participant.id} className="rounded-xl border border-border-subtle px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13.5px] font-medium text-text">{participant.name}</p>
                <button
                  onClick={() => supabase && deleteParticipant(supabase, participant.id)}
                  aria-label="Remover participante"
                  className="shrink-0 text-text-faint hover:text-danger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="mt-0.5 text-[12.5px] text-text-muted">
                Já colocou <PrivateValue>{formatBRL(contributed)}</PrivateValue>
                {personalTarget != null && (
                  <>
                    {" "}
                    · Meta pessoal <PrivateValue>{formatBRL(personalTarget)}</PrivateValue>
                    {" "}
                    · Falta <PrivateValue>{formatBRL(remaining ?? 0)}</PrivateValue>
                  </>
                )}
              </p>
              {goal.allocationType === "percentual" && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[12px] text-text-faint">%</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={participant.sharePercent ?? ""}
                    onBlur={(e) =>
                      supabase &&
                      updateParticipant(supabase, participant.id, {
                        name: participant.name,
                        sharePercent: e.target.value ? Number(e.target.value) : null,
                        monthlyTargetCents: participant.monthlyTargetCents,
                      })
                    }
                    className="h-8 w-20"
                  />
                </div>
              )}
              {goal.allocationType === "valor_mensal" && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[12px] text-text-faint">R$/mês</span>
                  <Input
                    type="number"
                    min={0}
                    defaultValue={participant.monthlyTargetCents ? participant.monthlyTargetCents / 100 : ""}
                    onBlur={(e) =>
                      supabase &&
                      updateParticipant(supabase, participant.id, {
                        name: participant.name,
                        sharePercent: participant.sharePercent,
                        monthlyTargetCents: e.target.value ? Math.round(Number(e.target.value) * 100) : null,
                      })
                    }
                    className="h-8 w-24"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do participante"
          className="flex-1"
        />
        <button
          onClick={handleAdd}
          aria-label="Adicionar participante"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted hover:text-text"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
