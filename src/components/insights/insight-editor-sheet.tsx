"use client";

import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/insights/tag-input";
import { useInsightsStore, type Insight } from "@/store/insights-store";

export function InsightEditorSheet({
  insight,
  onClose,
}: {
  insight: Insight | "new";
  onClose: () => void;
}) {
  const addInsight = useInsightsStore((s) => s.addInsight);
  const updateInsight = useInsightsStore((s) => s.updateInsight);
  const toggleFavorite = useInsightsStore((s) => s.toggleFavorite);
  const deleteInsight = useInsightsStore((s) => s.deleteInsight);
  const liveFavorite = useInsightsStore((s) =>
    insight === "new" ? false : (s.insights.find((i) => i.id === insight.id)?.favorite ?? false)
  );

  const isNew = insight === "new";

  const [title, setTitle] = useState(isNew ? "" : (insight.title ?? ""));
  const [content, setContent] = useState(isNew ? "" : insight.content);
  const [tags, setTags] = useState<string[]>(isNew ? [] : insight.tags);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = content.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (isNew) {
      addInsight({ title, content: content.trim(), tags });
    } else {
      updateInsight(insight.id, { title, content: content.trim(), tags });
    }
    onClose();
  };

  return (
    <Sheet onClose={onClose} title={isNew ? "Novo insight" : "Editar insight"}>
      <div className="space-y-4">
        <div>
          <Label>Título (opcional)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sem título" />
        </div>
        <div>
          <Label>Conteúdo</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={7}
            placeholder="Escreva a ideia, aprendizado ou lembrete..."
            autoFocus={isNew}
          />
        </div>
        <div>
          <Label>Tags</Label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        <div className="flex items-center gap-2 pt-1">
          {!isNew && (
            <button
              type="button"
              onClick={() => toggleFavorite(insight.id)}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                liveFavorite ? "text-warning" : "text-text-faint hover:text-text"
              }`}
              aria-label="Favoritar"
            >
              <Star size={18} fill={liveFavorite ? "currentColor" : "none"} />
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint transition-colors hover:text-danger"
              aria-label="Excluir"
            >
              <Trash2 size={17} />
            </button>
          )}
          <Button className="ml-auto" disabled={!canSave} onClick={handleSave}>
            Salvar
          </Button>
        </div>

        {confirmDelete && !isNew && (
          <div className="rounded-lg border border-danger-soft bg-danger-soft p-3">
            <p className="mb-2.5 text-[13.5px] text-text">Excluir este insight permanentemente?</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => {
                  deleteInsight(insight.id);
                  onClose();
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
