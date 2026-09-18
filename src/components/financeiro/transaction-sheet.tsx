"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Segmented } from "@/components/ui/segmented";
import { Input, Label, Textarea } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/store/finance-store";
import { previewWithdrawalImpact, type Goal, type TransactionType } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { monthLabel } from "@/lib/month";
import { useSupabase } from "@/lib/supabase-provider";

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "aporte", label: "Aporte" },
  { value: "rendimento", label: "Rendimento" },
  { value: "retirada", label: "Retirada" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionSheet({
  goal,
  initialType,
  onClose,
}: {
  goal: Goal;
  initialType: TransactionType;
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const transactions = useFinanceStore((s) => s.transactions);

  const [type, setType] = useState<TransactionType>(initialType);
  const [valueCents, setValueCents] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const impact = useMemo(() => {
    if (type !== "retirada" || valueCents <= 0) return null;
    return previewWithdrawalImpact(goal, transactions, valueCents);
  }, [goal, type, valueCents, transactions]);

  const handleSave = async () => {
    if (valueCents <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    if (type === "retirada" && justification.trim().length < 3) {
      setError("Explique o motivo da retirada.");
      return;
    }
    if (!supabase) return;
    setSaving(true);
    setError(null);
    try {
      await addTransaction(supabase, {
        goalId: goal.id,
        type,
        value: valueCents,
        date: new Date(date).toISOString(),
        note: note.trim() || undefined,
        justification: type === "retirada" ? justification.trim() : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
  };

  const titles: Record<TransactionType, string> = {
    aporte: "Novo aporte",
    rendimento: "Registrar rendimento",
    retirada: "Retirar valor",
  };

  return (
    <Sheet onClose={onClose} title={titles[type]}>
      <div className="space-y-4">
        <Segmented value={type} onChange={setType} options={TYPE_OPTIONS} />

        {type === "rendimento" && (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] text-accent">
            Rendimento de CDI aumenta o saldo guardado, mas não conta como aporte pessoal.
          </p>
        )}

        <div>
          <Label>Valor</Label>
          <MoneyInput valueCents={valueCents} onChange={setValueCents} autoFocus />
        </div>

        <div>
          <Label>Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {type === "retirada" ? (
          <div>
            <Label>Justificativa (obrigatória)</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              placeholder="Por que você está retirando esse valor?"
            />
          </div>
        ) : (
          <div>
            <Label>Observação (opcional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
          </div>
        )}

        {impact && (
          <div className="rounded-lg border border-warning-soft bg-warning-soft px-3 py-2.5">
            <p className="text-[12.5px] font-medium text-warning">Impacto nos próximos meses</p>
            <p className="mt-1 text-[13px] text-text">
              Falta total: {formatBRL(impact.remainingBefore)} → {formatBRL(impact.remainingAfter)}
            </p>
            {impact.nextMonthAfter && (
              <p className="mt-0.5 text-[13px] text-text">
                {monthLabel(impact.nextMonthAfter.month)} passa a precisar de{" "}
                {formatBRL(impact.nextMonthAfter.remaining)}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Confirmar"}
        </Button>
      </div>
    </Sheet>
  );
}
