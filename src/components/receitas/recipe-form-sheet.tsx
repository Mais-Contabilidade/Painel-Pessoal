"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Input, Textarea, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useRecipesStore } from "@/store/recipes-store";
import { useSupabase } from "@/lib/supabase-provider";
import { RECIPE_CATEGORY_OPTIONS } from "@/lib/recipes";
import type { RecipeCategory, RecipeRow } from "@/lib/supabase/types";
import type { RecipeInput } from "@/lib/supabase/queries/recipes";

export function RecipeFormSheet({
  recipe,
  onClose,
  onSaved,
}: {
  recipe: RecipeRow | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const supabase = useSupabase();
  const addRecipe = useRecipesStore((s) => s.addRecipe);
  const updateRecipe = useRecipesStore((s) => s.updateRecipe);

  const [name, setName] = useState(recipe?.name ?? "");
  const [category, setCategory] = useState<RecipeCategory>(recipe?.category ?? "salgado");
  const [prepTime, setPrepTime] = useState(recipe?.prep_time_minutes?.toString() ?? "");
  const [servings, setServings] = useState(recipe?.servings ?? "");
  const [instructions, setInstructions] = useState(recipe?.instructions ?? "");
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Informe o nome da receita.");
      return;
    }
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const input: RecipeInput = {
      name: name.trim(),
      category,
      prepTimeMinutes: prepTime ? Number(prepTime) : null,
      servings: servings.trim() || null,
      instructions: instructions.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (recipe) {
        await updateRecipe(supabase, recipe.id, input);
        onSaved?.(recipe.id);
      } else {
        const created = await addRecipe(supabase, input);
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title={recipe ? "Editar receita" : "Nova receita"}>
      <div className="space-y-4">
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div>
          <Label>Categoria</Label>
          <div className="flex flex-wrap gap-1.5">
            {RECIPE_CATEGORY_OPTIONS.map((o) => (
              <Chip key={o.value} active={category === o.value} onClick={() => setCategory(o.value)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Tempo de preparo (min, opcional)</Label>
            <Input type="number" min={1} value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label>Porções (opcional)</Label>
            <Input value={servings} onChange={(e) => setServings(e.target.value)} placeholder="Ex.: 4 porções" />
          </div>
        </div>

        <div>
          <Label>Modo de preparo (opcional, uma etapa por linha)</Label>
          <Textarea rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </div>

        <div>
          <Label>Observações (opcional)</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </Sheet>
  );
}
