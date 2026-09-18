"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Star, X } from "lucide-react";
import { useInsightsStore, type Insight } from "@/store/insights-store";
import { useMounted } from "@/lib/use-mounted";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { InsightCard } from "@/components/insights/insight-card";
import { InsightEditorSheet } from "@/components/insights/insight-editor-sheet";

export default function InsightsPage() {
  const mounted = useMounted();
  const insights = useInsightsStore((s) => s.insights);
  const status = useInsightsStore((s) => s.status);

  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [editing, setEditing] = useState<Insight | "new" | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    insights.forEach((i) => i.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [insights]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return insights.filter((i) => {
      if (favoritesOnly && !i.favorite) return false;
      if (activeTags.length > 0 && !activeTags.some((t) => i.tags.includes(t))) return false;
      if (q && !(i.title?.toLowerCase().includes(q) || i.content.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [insights, query, activeTags, favoritesOnly]);

  if (!mounted) return null;

  const toggleTag = (tag: string) =>
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <div>
      <PageHeader
        title="Insights"
        action={
          <Button size="sm" onClick={() => setEditing("new")}>
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
            placeholder="Buscar insights"
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

        {(allTags.length > 0 || insights.some((i) => i.favorite)) && (
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
            <Chip active={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)}>
              <span className="flex items-center gap-1">
                <Star size={11} fill={favoritesOnly ? "currentColor" : "none"} />
                Favoritos
              </span>
            </Chip>
            {allTags.map((tag) => (
              <Chip key={tag} active={activeTags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pt-4 pb-6">
        {status === "loading" ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-[13.5px] text-text-muted">Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-[13.5px] text-text-muted">
              {insights.length === 0
                ? "Sua biblioteca está vazia. Crie o primeiro insight."
                : "Nada encontrado com esses filtros."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((insight) => (
              <InsightCard key={insight.id} insight={insight} onOpen={() => setEditing(insight)} />
            ))}
          </div>
        )}
      </div>

      {editing && <InsightEditorSheet insight={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
