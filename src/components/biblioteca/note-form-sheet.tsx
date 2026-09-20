"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Textarea, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useLibraryStore } from "@/store/library-store";
import { useSupabase } from "@/lib/supabase-provider";
import { NOTE_TYPE_OPTIONS } from "@/lib/library";
import type { LibraryNoteType } from "@/lib/supabase/types";

export function NoteFormSheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const supabase = useSupabase();
  const addNote = useLibraryStore((s) => s.addNote);

  const [noteType, setNoteType] = useState<LibraryNoteType>("ponto_principal");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      setError("Escreva a anotação.");
      return;
    }
    if (!supabase) return;
    setSaving(true);
    setError(null);
    try {
      await addNote(supabase, { itemId, noteType, title: title.trim() || null, content: content.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title="Nova anotação">
      <div className="space-y-4">
        <div>
          <Label>Tipo</Label>
          <div className="flex flex-wrap gap-1.5">
            {NOTE_TYPE_OPTIONS.map((o) => (
              <Chip key={o.value} active={noteType === o.value} onClick={() => setNoteType(o.value)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label>Título (opcional)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Anotação</Label>
          <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} autoFocus />
        </div>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar anotação"}
        </Button>
      </div>
    </Sheet>
  );
}
