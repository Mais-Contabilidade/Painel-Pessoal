"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { useLibraryStore } from "@/store/library-store";
import { useSupabase } from "@/lib/supabase-provider";
import { useMounted } from "@/lib/use-mounted";
import { isInProgress, isUpcoming, isDone } from "@/lib/library";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { LibraryItemCard } from "@/components/biblioteca/item-card";
import { ItemFormSheet } from "@/components/biblioteca/item-form-sheet";
import type { LibraryItemKind, LibraryItemRow } from "@/lib/supabase/types";

const KIND_FILTERS: { value: LibraryItemKind | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "book", label: "Livros" },
  { value: "movie_show", label: "Filmes/Séries" },
  { value: "course", label: "Cursos" },
];

export default function BibliotecaPage() {
  const mounted = useMounted();
  const router = useRouter();
  const supabase = useSupabase();
  const items = useLibraryStore((s) => s.items);
  const status = useLibraryStore((s) => s.status);
  const errorMessage = useLibraryStore((s) => s.errorMessage);
  const initialize = useLibraryStore((s) => s.initialize);

  const [kindFilter, setKindFilter] = useState<LibraryItemKind | "todos">("todos");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (kindFilter !== "todos" && i.kind !== kindFilter) return false;
      if (q && !(i.title.toLowerCase().includes(q) || i.subtitle?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, kindFilter, query]);

  const continuando = filtered.filter((i) => isInProgress(i.status));
  const proximos = filtered.filter((i) => isUpcoming(i.status));
  const concluidos = filtered.filter((i) => isDone(i.status));
  const pausados = filtered.filter((i) => !isInProgress(i.status) && !isUpcoming(i.status) && !isDone(i.status));

  if (!mounted) return null;

  return (
    <div>
      <PageHeader
        title="Biblioteca"
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={16} />
            Novo
          </Button>
        }
      />

      <div className="px-5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título"
            className="h-10 w-full rounded-lg border border-border bg-surface pr-9 pl-9 text-[14px] text-text placeholder:text-text-faint outline-none focus:border-accent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-text-faint hover:text-text"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {KIND_FILTERS.map((f) => (
            <Chip key={f.value} active={kindFilter === f.value} onClick={() => setKindFilter(f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-6">
        {status === "loading" && (
          <p className="py-16 text-center text-[13.5px] text-text-muted">Carregando...</p>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[13.5px] text-text-muted">{errorMessage ?? "Não foi possível carregar a biblioteca."}</p>
            <button
              type="button"
              onClick={() => supabase && initialize(supabase)}
              className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-text hover:bg-surface-2"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {status === "ready" && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[13.5px] text-text-muted">Nenhum item ainda.</p>
            <p className="text-[12.5px] text-text-faint">Adicione o primeiro livro, filme/série ou curso.</p>
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} />
              Adicionar
            </Button>
          </div>
        )}

        {status === "ready" && items.length > 0 && filtered.length === 0 && (
          <p className="py-16 text-center text-[13.5px] text-text-muted">Nada encontrado com esses filtros.</p>
        )}

        {status === "ready" && filtered.length > 0 && (
          <div className="space-y-6">
            {continuando.length > 0 && (
              <Section title="Continuar" items={continuando} onOpen={(id) => router.push(`/biblioteca/${id}`)} />
            )}
            {proximos.length > 0 && (
              <Section title="Próximos" items={proximos} onOpen={(id) => router.push(`/biblioteca/${id}`)} />
            )}
            {pausados.length > 0 && (
              <Section title="Pausados" items={pausados} onOpen={(id) => router.push(`/biblioteca/${id}`)} />
            )}
            {concluidos.length > 0 && (
              <Section title="Concluídos" items={concluidos} onOpen={(id) => router.push(`/biblioteca/${id}`)} />
            )}
          </div>
        )}
      </div>

      {creating && (
        <ItemFormSheet
          item={null}
          defaultKind={kindFilter === "todos" ? "book" : kindFilter}
          onClose={() => setCreating(false)}
          onSaved={(id) => router.push(`/biblioteca/${id}`)}
        />
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: LibraryItemRow[];
  onOpen: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">
        {title} <span className="text-text-faint">({items.length})</span>
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <LibraryItemCard key={item.id} item={item} onOpen={() => onOpen(item.id)} />
        ))}
      </div>
    </div>
  );
}
