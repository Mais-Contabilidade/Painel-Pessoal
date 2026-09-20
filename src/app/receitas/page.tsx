"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Star, X } from "lucide-react";
import { useRecipesStore } from "@/store/recipes-store";
import { useSupabase } from "@/lib/supabase-provider";
import { useMounted } from "@/lib/use-mounted";
import { RECIPE_CATEGORY_OPTIONS } from "@/lib/recipes";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { RecipeCard } from "@/components/receitas/recipe-card";
import { RecipeFormSheet } from "@/components/receitas/recipe-form-sheet";
import type { RecipeCategory } from "@/lib/supabase/types";

export default function ReceitasPage() {
  const mounted = useMounted();
  const router = useRouter();
  const supabase = useSupabase();
  const recipes = useRecipesStore((s) => s.recipes);
  const status = useRecipesStore((s) => s.status);
  const errorMessage = useRecipesStore((s) => s.errorMessage);
  const initialize = useRecipesStore((s) => s.initialize);

  const [categoryFilter, setCategoryFilter] = useState<RecipeCategory | "todas">("todas");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (categoryFilter !== "todas" && r.category !== categoryFilter) return false;
      if (favoritesOnly && !r.favorite) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recipes, categoryFilter, favoritesOnly, query]);

  if (!mounted) return null;

  return (
    <div>
      <PageHeader
        title="Receitas"
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={16} />
            Nova
          </Button>
        }
      />

      <div className="px-5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome"
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
          <Chip active={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)}>
            <span className="flex items-center gap-1">
              <Star size={11} fill={favoritesOnly ? "currentColor" : "none"} />
              Favoritas
            </span>
          </Chip>
          <Chip active={categoryFilter === "todas"} onClick={() => setCategoryFilter("todas")}>
            Todas
          </Chip>
          {RECIPE_CATEGORY_OPTIONS.map((o) => (
            <Chip key={o.value} active={categoryFilter === o.value} onClick={() => setCategoryFilter(o.value)}>
              {o.label}
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
            <p className="text-[13.5px] text-text-muted">{errorMessage ?? "Não foi possível carregar as receitas."}</p>
            <button
              type="button"
              onClick={() => supabase && initialize(supabase)}
              className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-text hover:bg-surface-2"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {status === "ready" && recipes.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[13.5px] text-text-muted">Nenhuma receita cadastrada.</p>
            <p className="text-[12.5px] text-text-faint">Adicione uma receita que você quer colocar em prática.</p>
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} />
              Nova receita
            </Button>
          </div>
        )}

        {status === "ready" && recipes.length > 0 && filtered.length === 0 && (
          <p className="py-16 text-center text-[13.5px] text-text-muted">Nada encontrado com esses filtros.</p>
        )}

        {status === "ready" && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((r) => (
              <RecipeCard key={r.id} recipe={r} onOpen={() => router.push(`/receitas/${r.id}`)} />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <RecipeFormSheet recipe={null} onClose={() => setCreating(false)} onSaved={(id) => router.push(`/receitas/${id}`)} />
      )}
    </div>
  );
}
