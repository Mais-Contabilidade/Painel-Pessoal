"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useReceivablesStore } from "@/store/receivables-store";
import { useSupabase } from "@/lib/supabase-provider";
import { formatBRL } from "@/lib/money";
import type { ReceivableReturnMode } from "@/lib/supabase/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ReceivableFormSheet({ onClose, onSaved }: { onClose: () => void; onSaved?: (id: string) => void }) {
  const supabase = useSupabase();
  const addReceivable = useReceivablesStore((s) => s.addReceivable);

  const [person, setPerson] = useState("");
  const [originalValueCents, setOriginalValueCents] = useState(0);
  const [lentOn, setLentOn] = useState(todayISO());
  const [agreedReturnDate, setAgreedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [returnMode, setReturnMode] = useState<ReceivableReturnMode>("avista");
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [firstDueDate, setFirstDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewInstallmentValue = useMemo(() => {
    if (returnMode !== "parcelado" || installmentsCount <= 0 || originalValueCents <= 0) return null;
    return Math.floor(originalValueCents / installmentsCount);
  }, [returnMode, installmentsCount, originalValueCents]);

  const handleSave = async () => {
    if (!person.trim()) {
      setError("Informe para quem foi emprestado.");
      return;
    }
    if (originalValueCents <= 0) {
      setError("Informe o valor emprestado.");
      return;
    }
    if (returnMode === "parcelado" && (!installmentsCount || installmentsCount < 2 || !firstDueDate)) {
      setError("Informe quantidade de parcelas (mínimo 2) e a primeira data de vencimento.");
      return;
    }
    if (!supabase) return;
    setSaving(true);
    setError(null);
    try {
      const created = await addReceivable(supabase, {
        person: person.trim(),
        originalValueCents,
        lentOn,
        agreedReturnDate: agreedReturnDate || null,
        notes: notes.trim() || undefined,
        returnMode,
        installmentsCount: returnMode === "parcelado" ? installmentsCount : null,
        firstDueDate: returnMode === "parcelado" ? firstDueDate : null,
      });
      onSaved?.(created.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title="Novo empréstimo">
      <div className="space-y-4">
        <div>
          <Label>Pessoa</Label>
          <Input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Nome" autoFocus />
        </div>
        <div>
          <Label>Valor emprestado</Label>
          <MoneyInput valueCents={originalValueCents} onChange={setOriginalValueCents} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Data</Label>
            <Input type="date" value={lentOn} onChange={(e) => setLentOn(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label>Devolução combinada (opcional)</Label>
            <Input type="date" value={agreedReturnDate} onChange={(e) => setAgreedReturnDate(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Observações (opcional)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
        </div>

        <div>
          <Label>Devolução</Label>
          <Segmented
            value={returnMode}
            onChange={setReturnMode}
            options={[
              { value: "avista", label: "À vista" },
              { value: "parcelado", label: "Parcelado" },
            ]}
          />
        </div>

        {returnMode === "parcelado" && (
          <div className="space-y-3 rounded-xl border border-border-subtle p-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Nº de parcelas</Label>
                <Input
                  type="number"
                  min={2}
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <Label>1ª parcela em</Label>
                <Input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} />
              </div>
            </div>
            {previewInstallmentValue !== null && (
              <p className="text-[12.5px] text-text-muted">
                Frequência mensal · parcelas de aprox. {formatBRL(previewInstallmentValue)} (ajustável depois)
              </p>
            )}
          </div>
        )}

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Registrar empréstimo"}
        </Button>
      </div>
    </Sheet>
  );
}
