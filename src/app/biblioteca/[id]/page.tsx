"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useLibraryStore } from "@/store/library-store";
import { useMounted } from "@/lib/use-mounted";
import { useSupabase } from "@/lib/supabase-provider";
import { formatDateShort } from "@/lib/format";
import { KIND_LABEL, statusLabel, NOTE_TYPE_LABEL } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { ItemFormSheet } from "@/components/biblioteca/item-form-sheet";
import { NoteFormSheet } from "@/components/biblioteca/note-form-sheet";

export default function LibraryItemDetailPage() {
  const mounted = useMounted();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = useSupabase();
  const items = useLibraryStore((s) => s.items);
  const notes = useLibraryStore((s) => s.notes);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const deleteItem = useLibraryStore((s) => s.deleteItem);
  const deleteNote = useLibraryStore((s) => s.deleteNote);

  const [editing, setEditing] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const item = items.find((i) => i.id === params.id) ?? null;
  const itemNotes = useMemo(() => notes.filter((n) => n.item_id === params.id), [notes, params.id]);

  if (!mounted) return null;

  if (!item) {
    return (
      <div className="px-5 pt-6">
        <button onClick={() => router.push("/biblioteca")} className="flex items-center gap-1 text-[13.5px] text-text-muted">
          <ArrowLeft size={15} /> Voltar
        </button>
        <p className="mt-6 text-[13.5px] text-text-muted">Item não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/biblioteca")}
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => supabase && toggleFavorite(supabase, item.id, !item.favorite)}
            aria-label="Favoritar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-warning"
          >
            <Star size={16} className={item.favorite ? "text-warning" : ""} fill={item.favorite ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => setEditing(true)}
            aria-label="Editar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Excluir"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-danger"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <p className="mt-2 text-[12.5px] font-medium text-text-faint">{KIND_LABEL[item.kind]}</p>
      <h1 className="text-[20px] font-semibold text-text">{item.title}</h1>
      {item.subtitle && <p className="text-[13px] text-text-muted">{item.subtitle}</p>}

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-text-muted">
            {statusLabel(item.kind, item.status)}
          </span>
          {item.rating && (
            <span className="flex items-center gap-0.5">
              {Array.from({ length: item.rating }, (_, i) => (
                <Star key={i} size={13} className="text-warning" fill="currentColor" />
              ))}
            </span>
          )}
        </div>
        {item.progress_percent != null && <Progress value={item.progress_percent} className="mt-3" />}
        {(item.started_on || item.finished_on) && (
          <p className="mt-2.5 text-[12.5px] text-text-muted">
            {item.started_on && `Início ${formatDateShort(item.started_on)}`}
            {item.started_on && item.finished_on && " · "}
            {item.finished_on && `Conclusão ${formatDateShort(item.finished_on)}`}
          </p>
        )}
        {item.metadata.next_action && (
          <p className="mt-2.5 text-[13px] text-text">
            <span className="font-medium text-text-muted">Próxima ação: </span>
            {item.metadata.next_action}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="px-1 text-[12.5px] font-medium text-text-muted">Anotações</p>
        <button
          type="button"
          onClick={() => setAddingNote(true)}
          className="flex items-center gap-1 text-[12.5px] font-medium text-accent"
        >
          <Plus size={14} /> Nova
        </button>
      </div>

      {itemNotes.length === 0 ? (
        <p className="mt-2 px-1 text-[13px] text-text-faint">Nenhuma anotação ainda.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {itemNotes.map((n) => (
            <li key={n.id} className="rounded-xl border border-border-subtle px-3.5 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11.5px] font-medium text-accent">{NOTE_TYPE_LABEL[n.note_type]}</p>
                  {n.title && <p className="text-[13.5px] font-medium text-text">{n.title}</p>}
                  <p className="text-[13px] whitespace-pre-wrap text-text">{n.content}</p>
                  <p className="mt-1 text-[11.5px] text-text-faint">{formatDateShort(n.created_at)}</p>
                </div>
                <button
                  onClick={() => supabase && deleteNote(supabase, n.id)}
                  aria-label="Remover anotação"
                  className="shrink-0 text-text-faint hover:text-danger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <ItemFormSheet item={item} defaultKind={item.kind} onClose={() => setEditing(false)} />}
      {addingNote && <NoteFormSheet itemId={item.id} onClose={() => setAddingNote(false)} />}

      {confirmDelete && (
        <Sheet onClose={() => setConfirmDelete(false)} title="Excluir item?">
          <p className="text-[14px] text-text-muted">
            Isso apaga o item e todas as anotações associadas. Essa ação não pode ser desfeita.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (!supabase) return;
                await deleteItem(supabase, item.id);
                router.push("/biblioteca");
              }}
            >
              Excluir
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
