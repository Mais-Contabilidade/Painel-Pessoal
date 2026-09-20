"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { PrivateValue } from "@/components/ui/private-value";
import { useFinanceStore } from "@/store/finance-store";
import { currentMonthKey, addMonths, compareMonthKeys, monthsBetweenInclusive } from "@/lib/month";
import { computeInitialMonthlyTarget, type Goal } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { useSupabase } from "@/lib/supabase-provider";

export function GoalFormSheet({
  goal,
  onClose,
  onSaved,
}: {
  goal: Goal | null;
  onClose: () => void;
  onSaved?: (goalId: string) => void;
}) {
  const supabase = useSupabase();
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);

  const [name, setName] = useState(goal?.name ?? "");
  const [targetValue, setTargetValue] = useState(goal?.targetValue ?? 0);
  const [startMonth, setStartMonth] = useState(goal?.startMonth ?? currentMonthKey());
  const [endMonth, setEndMonth] = useState(goal?.endMonth ?? addMonths(currentMonthKey(), 5));
  const [initialBalance, setInitialBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    if (targetValue <= 0 || compareMonthKeys(endMonth, startMonth) < 0) return null;
    const totalMonths = monthsBetweenInclusive(startMonth, endMonth);
    const remaining = Math.max(0, targetValue - initialBalance);
    return {
      remaining,
      perMonth: computeInitialMonthlyTarget(targetValue, startMonth, endMonth, initialBalance),
      totalMonths,
    };
  }, [targetValue, startMonth, endMonth, initialBalance]);

  const handleSave = async () => {
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
    if (!supabase) return;
    setSaving(true);
    setError(null);
    try {
      if (goal) {
        await updateGoal(supabase, goal.id, { name: name.trim(), targetValue, startMonth, endMonth });
        onSaved?.(goal.id);
      } else {
        const created = await addGoal(supabase, {
          name: name.trim(),
          targetValue,
          startMonth,
          endMonth,
          initialBalance,
        });
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
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

        {!goal && (
          <div>
            <Label>Saldo já guardado (opcional)</Label>
            <MoneyInput valueCents={initialBalance} onChange={setInitialBalance} />
          </div>
        )}

        {preview && (
          <div className="rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-accent">
            <p>
              Restante: <PrivateValue>{formatBRL(preview.remaining)}</PrivateValue>
            </p>
            <p className="mt-0.5">
              Necessário por mês: <PrivateValue>{formatBRL(preview.perMonth)}</PrivateValue> ({preview.totalMonths} meses)
            </p>
          </div>
        )}

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : goal ? "Salvar alterações" : "Criar meta"}
        </Button>
      </div>
    </Sheet>
  );
}
