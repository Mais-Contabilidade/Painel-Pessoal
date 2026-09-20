"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/field";
import { useRecipesStore } from "@/store/recipes-store";
import { useSupabase } from "@/lib/supabase-provider";
import type { RecipeIngredientRow } from "@/lib/supabase/types";

export function IngredientRow({
  ingredient,
  isFirst,
  isLast,
}: {
  ingredient: RecipeIngredientRow;
  isFirst: boolean;
  isLast: boolean;
}) {
  const supabase = useSupabase();
  const updateIngredient = useRecipesStore((s) => s.updateIngredient);
  const deleteIngredient = useRecipesStore((s) => s.deleteIngredient);
  const reorderIngredient = useRecipesStore((s) => s.reorderIngredient);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ingredient.name);
  const [quantity, setQuantity] = useState(ingredient.quantity?.toString() ?? "");
  const [unit, setUnit] = useState(ingredient.unit ?? "");

  const save = async () => {
    if (!supabase || !name.trim()) return;
    await updateIngredient(supabase, ingredient.id, {
      name: name.trim(),
      quantity: quantity ? Number(quantity) : null,
      unit: unit.trim() || null,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="flex items-center gap-2 rounded-xl border border-border-subtle px-3.5 py-2.5">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" autoFocus />
        <Input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qtd"
          className="w-16"
        />
        <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Un." className="w-16" />
        <button onClick={save} className="shrink-0 text-[12.5px] font-medium text-accent">
          Salvar
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 rounded-xl border border-border-subtle px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] text-text">
          {ingredient.name}
          {(ingredient.quantity || ingredient.unit) && (
            <span className="text-text-muted"> — {ingredient.quantity ?? ""} {ingredient.unit ?? ""}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 text-text-faint">
        <button
          onClick={() => supabase && reorderIngredient(supabase, ingredient.recipe_id, ingredient.id, "up")}
          disabled={isFirst}
          aria-label="Mover para cima"
          className="disabled:opacity-30 hover:text-text"
        >
          <ChevronUp size={15} />
        </button>
        <button
          onClick={() => supabase && reorderIngredient(supabase, ingredient.recipe_id, ingredient.id, "down")}
          disabled={isLast}
          aria-label="Mover para baixo"
          className="disabled:opacity-30 hover:text-text"
        >
          <ChevronDown size={15} />
        </button>
        <button onClick={() => setEditing(true)} aria-label="Editar ingrediente" className="hover:text-text">
          <Pencil size={13} />
        </button>
        <button
          onClick={() => supabase && deleteIngredient(supabase, ingredient.id)}
          aria-label="Remover ingrediente"
          className="hover:text-danger"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </li>
  );
}
