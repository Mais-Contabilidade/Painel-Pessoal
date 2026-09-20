"use client";

import { useState } from "react";
import { useJournalStore } from "@/store/journal-store";
import { useSupabase } from "@/lib/supabase-provider";
import type { JournalEntry } from "@/lib/journal";
import { Textarea, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/** Montado com key={entryDate} pelo pai — cada data é uma instância nova, sem precisar de efeito para resetar o formulário. */
export function EntryForm({ entryDate, initialEntry }: { entryDate: string; initialEntry: JournalEntry | null }) {
  const supabase = useSupabase();
  const saveEntry = useJournalStore((s) => s.saveEntry);

  const [daySummary, setDaySummary] = useState(initialEntry?.daySummary ?? "");
  const [gratitude, setGratitude] = useState(initialEntry?.gratitude ?? "");
  const [reflection, setReflection] = useState(initialEntry?.reflection ?? "");
  const [notes, setNotes] = useState(initialEntry?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    try {
      await saveEntry(supabase, {
        entryDate,
        daySummary,
        gratitude,
        reflection,
        notes: notes.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <Label>Como foi meu dia?</Label>
        <Textarea rows={3} value={daySummary} onChange={(e) => setDaySummary(e.target.value)} />
      </div>
      <div>
        <Label>Pelo que sou grato hoje?</Label>
        <Textarea rows={2} value={gratitude} onChange={(e) => setGratitude(e.target.value)} />
      </div>
      <div>
        <Label>Reflexão / aprendizado</Label>
        <Textarea rows={2} value={reflection} onChange={(e) => setReflection(e.target.value)} />
      </div>
      <div>
        <Label>Observação livre (opcional)</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Salvando..." : saved ? "Salvo" : initialEntry ? "Atualizar entrada" : "Salvar entrada"}
      </Button>
    </div>
  );
}
