import { Star, Clock } from "lucide-react";
import { RECIPE_CATEGORY_LABEL } from "@/lib/recipes";
import type { RecipeRow } from "@/lib/supabase/types";

export function RecipeCard({ recipe, onOpen }: { recipe: RecipeRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-text-faint"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[15px] font-medium text-text">{recipe.name}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          {recipe.favorite && <Star size={13} className="text-warning" fill="currentColor" />}
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-text-muted">
            {RECIPE_CATEGORY_LABEL[recipe.category]}
          </span>
        </div>
      </div>
      {recipe.prep_time_minutes && (
        <p className="mt-1 flex items-center gap-1 text-[12px] text-text-faint">
          <Clock size={12} /> {recipe.prep_time_minutes} min
          {recipe.servings && ` · ${recipe.servings}`}
        </p>
      )}
    </button>
  );
}
