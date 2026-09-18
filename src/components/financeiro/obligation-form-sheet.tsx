"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { useObligationsStore } from "@/store/obligations-store";
import { useSupabase } from "@/lib/supabase-provider";
import { currentMonthKey } from "@/lib/month";
import { generateCompetenceMonths } from "@/lib/obligations";

export function ObligationFormSheet({ onClose, onSaved }: { onClose: () => void; onSaved?: (id: string) => void }) {
  const supabase = useSupabase();
  const addObligation = useObligationsStore((s) => s.addObligation);

  const [name, setName] = useState("");
  const [creditor, setCreditor] = useState("");
  const [installmentValueCents, setInstallmentValueCents] = useState(0);
  const [valueKnown, setValueKnown] = useState(true);
  const [totalValueCents, setTotalValueCents] = useState(0);
  const [startMonth, setStartMonth] = useState(currentMonthKey());
  const [endMonth, setEndMonth] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewMonths = endMonth ? generateCompetenceMonths({ startMonth, endMonth, installmentsCount: null }) : [];

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Dê um nome para o compromisso.");
      return;
    }
    if (!endMonth) {
      setError("Informe até quando vão as parcelas.");
      return;
    }
    if (!supabase) return;
    setSaving(true);
    setError(null);
    try {
      const created = await addObligation(supabase, {
        name: name.trim(),
        creditor: creditor.trim() || undefined,
        totalValueCents: totalValueCents > 0 ? totalValueCents : null,
        installmentValueCents: valueKnown && installmentValueCents > 0 ? installmentValueCents : null,
        startMonth,
        endMonth,
        dueDay: dueDay ? Number(dueDay) : null,
        installmentsCount: null,
        notes: notes.trim() || undefined,
      });
      onSaved?.(created.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title="Novo compromisso">
      <div className="space-y-4">
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Aliança" autoFocus />
        </div>
        <div>
          <Label>Credor/pessoa (opcional)</Label>
          <Input value={creditor} onChange={(e) => setCreditor(e.target.value)} placeholder="Opcional" />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label>Valor da parcela</Label>
            <button
              type="button"
              onClick={() => setValueKnown((v) => !v)}
              className="text-[12px] font-medium text-accent"
            >
              {valueKnown ? "Ainda não sei o valor" : "Já sei o valor"}
            </button>
          </div>
          {valueKnown ? (
            <MoneyInput valueCents={installmentValueCents} onChange={setInstallmentValueCents} />
          ) : (
            <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] text-text-muted">
              Sem problema — você define o valor depois, quando souber.
            </p>
          )}
        </div>

        <div>
          <Label>Valor total (opcional, se conhecido)</Label>
          <MoneyInput valueCents={totalValueCents} onChange={setTotalValueCents} />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Mês inicial</Label>
            <Input type="month" value={startMonth} onChange={(e) => e.target.value && setStartMonth(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label>Mês final</Label>
            <Input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Dia do vencimento (opcional)</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            placeholder="Preencha quando souber"
          />
        </div>

        <div>
          <Label>Observações (opcional)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
        </div>

        {previewMonths.length > 0 && (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] text-accent">
            {previewMonths.length} parcela{previewMonths.length > 1 ? "s" : ""} será
            {previewMonths.length > 1 ? "ão" : ""} criada{previewMonths.length > 1 ? "s" : ""}, de{" "}
            {previewMonths[0]} até {previewMonths[previewMonths.length - 1]}.
          </p>
        )}

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Criar compromisso"}
        </Button>
      </div>
    </Sheet>
  );
}
