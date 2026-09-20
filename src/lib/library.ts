import type { LibraryItemKind, LibraryNoteType } from "@/lib/supabase/types";

export const KIND_LABEL: Record<LibraryItemKind, string> = {
  book: "Livro",
  movie_show: "Filme/Série",
  course: "Curso",
};

export type StatusOption = { value: string; label: string };

export const STATUS_OPTIONS: Record<LibraryItemKind, StatusOption[]> = {
  book: [
    { value: "quero_ler", label: "Quero ler" },
    { value: "lendo", label: "Lendo" },
    { value: "concluido", label: "Concluído" },
    { value: "pausado", label: "Pausado" },
  ],
  movie_show: [
    { value: "quero_assistir", label: "Quero assistir" },
    { value: "assistindo", label: "Assistindo" },
    { value: "concluido", label: "Concluído" },
    { value: "pausado", label: "Pausado" },
  ],
  course: [
    { value: "quero_fazer", label: "Quero fazer" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "concluido", label: "Concluído" },
    { value: "pausado", label: "Pausado" },
  ],
};

const IN_PROGRESS_STATUSES = new Set(["lendo", "assistindo", "em_andamento"]);
const UPCOMING_STATUSES = new Set(["quero_ler", "quero_assistir", "quero_fazer"]);

export function statusLabel(kind: LibraryItemKind, status: string): string {
  return STATUS_OPTIONS[kind].find((o) => o.value === status)?.label ?? status;
}

export function isInProgress(status: string): boolean {
  return IN_PROGRESS_STATUSES.has(status);
}

export function isUpcoming(status: string): boolean {
  return UPCOMING_STATUSES.has(status);
}

export function isDone(status: string): boolean {
  return status === "concluido";
}

/** subtitle tem significado diferente por kind: autor (livro) ou plataforma (filme/série, curso). */
export function subtitleLabel(kind: LibraryItemKind): string {
  return kind === "book" ? "Autor" : "Plataforma";
}

export const NOTE_TYPE_LABEL: Record<LibraryNoteType, string> = {
  ponto_principal: "Ponto principal",
  aprendizado: "Aprendizado",
  citacao: "Citação/trecho",
  aplicacao: "Aplicação prática",
  comentario: "Nota livre",
};

export const NOTE_TYPE_OPTIONS: { value: LibraryNoteType; label: string }[] = (
  Object.entries(NOTE_TYPE_LABEL) as [LibraryNoteType, string][]
).map(([value, label]) => ({ value, label }));
