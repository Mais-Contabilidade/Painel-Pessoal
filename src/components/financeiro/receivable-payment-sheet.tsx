"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { useReceivablesStore } from "@/store/receivables-store";
import { useSupabase } from "@/lib/supabase-provider";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ReceivablePaymentSheet({
  receivableId,
  maxCents,
  onClose,
}: {
  receivableId: string;
  maxCents: number;
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const addPayment = useReceivablesStore((s) => s.addPayment);

  const [amountCents, setAmountCents] = useState(maxCents);
  const [paidOn, setPaidOn] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (amountCents <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    if (!supabase) return;
    setSaving(true);
    setError(null);
    try {
      await addPayment(supabase, { receivableId, amountCents, paidOn, note: note.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title="Registrar recebimento">
      <div className="space-y-4">
        <div>
          <Label>Valor recebido</Label>
          <MoneyInput valueCents={amountCents} onChange={setAmountCents} autoFocus />
        </div>
        <div>
          <Label>Data</Label>
          <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </div>
        <div>
          <Label>Observação (opcional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </div>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Confirmar recebimento"}
        </Button>
      </div>
    </Sheet>
  );
}
