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

export function ReceivableFormSheet({ onClose, onSaved }: { onClose: () => void; onSaved?: (id: string) => void }) {
  const supabase = useSupabase();
  const addReceivable = useReceivablesStore((s) => s.addReceivable);

  const [person, setPerson] = useState("");
  const [originalValueCents, setOriginalValueCents] = useState(0);
  const [lentOn, setLentOn] = useState(todayISO());
  const [agreedReturnDate, setAgreedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!person.trim()) {
      setError("Informe para quem foi emprestado.");
      return;
    }
    if (originalValueCents <= 0) {
      setError("Informe o valor emprestado.");
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

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Registrar empréstimo"}
        </Button>
      </div>
    </Sheet>
  );
}
