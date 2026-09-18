"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/store/finance-store";
import { currentMonthKey, addMonths, compareMonthKeys } from "@/lib/month";
import type { Goal } from "@/lib/finance";

export function GoalFormSheet({
  goal,
  onClose,
  onSaved,
}: {
  goal: Goal | null;
  onClose: () => void;
  onSaved?: (goalId: string) => void;
}) {
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);

  const [name, setName] = useState(goal?.name ?? "");
  const [targetValue, setTargetValue] = useState(goal?.targetValue ?? 0);
  const [startMonth, setStartMonth] = useState(goal?.startMonth ?? currentMonthKey());
  const [endMonth, setEndMonth] = useState(goal?.endMonth ?? addMonths(currentMonthKey(), 5));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError("Dê um nome para a meta.");
      return;
    }
    if (targetValue <= 0) {
      setError("Informe o valor da meta.");
      return;
    }
    if (compareMonthKeys(endMonth, startMonth) < 0) {
      setError("O mês final precisa ser igual ou depois do mês inicial.");
      return;
    }
    if (goal) {
      updateGoal(goal.id, { name: name.trim(), targetValue, startMonth, endMonth });
      onSaved?.(goal.id);
    } else {
      const created = addGoal({ name: name.trim(), targetValue, startMonth, endMonth });
      onSaved?.(created.id);
    }
    onClose();
  };

  return (
    <Sheet onClose={onClose} title={goal ? "Editar meta" : "Nova meta"}>
      <div className="space-y-4">
        <div>
          <Label>Nome</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Viagem, reserva, emergência"
            autoFocus
          />
        </div>
        <div>
          <Label>Valor da meta</Label>
          <MoneyInput valueCents={targetValue} onChange={setTargetValue} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Mês inicial</Label>
            <Input
              type="month"
              value={startMonth}
              onChange={(e) => e.target.value && setStartMonth(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label>Mês final</Label>
            <Input
              type="month"
              value={endMonth}
              onChange={(e) => e.target.value && setEndMonth(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave}>
          {goal ? "Salvar alterações" : "Criar meta"}
        </Button>
      </div>
    </Sheet>
  );
}
