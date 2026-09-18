"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useCardioStore } from "@/store/cardio-store";
import { useSupabase } from "@/lib/supabase-provider";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CardioEntrySheet({ onClose }: { onClose: () => void }) {
  const supabase = useSupabase();
  const addEntry = useCardioStore((s) => s.addEntry);

  const [date, setDate] = useState(todayISO());
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const mins = Number(minutes);
    if (!mins || mins <= 0) {
      setError("Informe quantos minutos você fez.");
      return;
    }
    if (!supabase) return;
    setSaving(true);
    setError(null);
    try {
      await addEntry(supabase, date, mins, note.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title="Registrar cardio">
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="w-24">
            <Label>Minutos</Label>
            <Input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div>
          <Label>Observação (opcional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: corrida, bike..." />
        </div>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Registrar"}
        </Button>
      </div>
    </Sheet>
  );
}
