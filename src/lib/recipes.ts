import type { RecipeCategory } from "@/lib/supabase/types";

export const RECIPE_CATEGORY_LABEL: Record<RecipeCategory, string> = {
  salgado: "Salgado",
  doce: "Doce",
  bebida: "Bebida",
  lanche: "Lanche",
  molho_acompanhamento: "Molho/Acompanhamento",
  outro: "Outro",
};

export const RECIPE_CATEGORY_OPTIONS: { value: RecipeCategory; label: string }[] = (
  Object.entries(RECIPE_CATEGORY_LABEL) as [RecipeCategory, string][]
).map(([value, label]) => ({ value, label }));

/** Modo de preparo é guardado como texto livre; cada linha não vazia vira um passo numerado. */
export function parseSteps(instructions: string | null): string[] {
  if (!instructions) return [];
  return instructions
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
