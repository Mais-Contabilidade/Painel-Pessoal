"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Textarea, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Chip } from "@/components/ui/chip";
import { useLibraryStore } from "@/store/library-store";
import { useSupabase } from "@/lib/supabase-provider";
import { KIND_LABEL, STATUS_OPTIONS, subtitleLabel } from "@/lib/library";
import type { LibraryItemKind, LibraryItemRow } from "@/lib/supabase/types";
import type { LibraryItemInput } from "@/lib/supabase/queries/library";

export function ItemFormSheet({
  item,
  defaultKind,
  onClose,
  onSaved,
}: {
  item: LibraryItemRow | null;
  defaultKind: LibraryItemKind;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const supabase = useSupabase();
  const addItem = useLibraryStore((s) => s.addItem);
  const updateItem = useLibraryStore((s) => s.updateItem);

  const [kind] = useState<LibraryItemKind>(item?.kind ?? defaultKind);
  const [title, setTitle] = useState(item?.title ?? "");
  const [subtitle, setSubtitle] = useState(item?.subtitle ?? "");
  const [status, setStatus] = useState(item?.status ?? STATUS_OPTIONS[kind][0].value);
  const [mediaType, setMediaType] = useState<"filme" | "serie">(item?.metadata.media_type ?? "filme");
  const [progressPercent, setProgressPercent] = useState(item?.progress_percent?.toString() ?? "");
  const [rating, setRating] = useState(item?.rating ?? 0);
  const [startedOn, setStartedOn] = useState(item?.started_on ?? "");
  const [finishedOn, setFinishedOn] = useState(item?.finished_on ?? "");
  const [nextAction, setNextAction] = useState(item?.metadata.next_action ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Informe o título.");
      return;
    }
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const input: LibraryItemInput = {
      kind,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      status,
      rating: rating > 0 ? rating : null,
      favorite: item?.favorite ?? false,
      startedOn: startedOn || null,
      finishedOn: finishedOn || null,
      progressPercent: progressPercent ? Math.max(0, Math.min(100, Number(progressPercent))) : null,
      metadata: {
        ...(kind === "movie_show" ? { media_type: mediaType } : {}),
        ...(kind !== "movie_show" && nextAction.trim() ? { next_action: nextAction.trim() } : {}),
      },
    };
    try {
      if (item) {
        await updateItem(supabase, item.id, input);
        onSaved?.(item.id);
      } else {
        const created = await addItem(supabase, input);
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title={item ? `Editar ${KIND_LABEL[kind].toLowerCase()}` : `Novo ${KIND_LABEL[kind].toLowerCase()}`}>
      <div className="space-y-4">
        <div>
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>

        {kind === "movie_show" && (
          <div>
            <Label>Tipo</Label>
            <Segmented
              value={mediaType}
              onChange={setMediaType}
              options={[
                { value: "filme", label: "Filme" },
                { value: "serie", label: "Série" },
              ]}
            />
          </div>
        )}

        <div>
          <Label>{subtitleLabel(kind)} (opcional)</Label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </div>

        <div>
          <Label>Status</Label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS[kind].map((o) => (
              <Chip key={o.value} active={status === o.value} onClick={() => setStatus(o.value)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <Label>Progresso % (opcional)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={progressPercent}
            onChange={(e) => setProgressPercent(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Início (opcional)</Label>
            <Input type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label>Conclusão (opcional)</Label>
            <Input type="date" value={finishedOn} onChange={(e) => setFinishedOn(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Avaliação (opcional)</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? 0 : n)}
                aria-label={`${n} estrelas`}
              >
                <Star size={20} className="text-warning" fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>

        {kind !== "movie_show" && (
          <div>
            <Label>Próxima ação (opcional)</Label>
            <Textarea rows={2} value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
          </div>
        )}

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </Sheet>
  );
}
