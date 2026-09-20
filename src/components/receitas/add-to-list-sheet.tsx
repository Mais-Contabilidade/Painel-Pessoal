"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useRecipesStore } from "@/store/recipes-store";
import { useSupabase } from "@/lib/supabase-provider";
import type { RecipeIngredientRow } from "@/lib/supabase/types";

export function AddToListSheet({
  recipeId,
  ingredients,
  onClose,
}: {
  recipeId: string;
  ingredients: RecipeIngredientRow[];
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const addIngredientsToShoppingList = useRecipesStore((s) => s.addIngredientsToShoppingList);
  const [selected, setSelected] = useState<Set<string>>(new Set(ingredients.map((i) => i.id)));
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAdd = async () => {
    if (!supabase || selected.size === 0) return;
    setSaving(true);
    try {
      await addIngredientsToShoppingList(
        supabase,
        ingredients
          .filter((i) => selected.has(i.id))
          .map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, sourceRecipeId: recipeId }))
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title="Adicionar à lista de compras">
      <div className="space-y-3">
        <ul className="space-y-1.5">
          {ingredients.map((i) => (
            <li key={i.id}>
              <label className="flex items-center gap-2.5 rounded-xl border border-border-subtle px-3.5 py-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(i.id)}
                  onChange={() => toggle(i.id)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="text-[13.5px] text-text">
                  {i.name}
                  {(i.quantity || i.unit) && (
                    <span className="text-text-muted"> — {i.quantity ?? ""} {i.unit ?? ""}</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={handleAdd} disabled={saving || selected.size === 0}>
          {saving ? "Adicionando..." : `Adicionar ${selected.size} item${selected.size === 1 ? "" : "s"}`}
        </Button>
      </div>
    </Sheet>
  );
}
