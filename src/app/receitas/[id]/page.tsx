"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useRecipesStore } from "@/store/recipes-store";
import { useMounted } from "@/lib/use-mounted";
import { useSupabase } from "@/lib/supabase-provider";
import { RECIPE_CATEGORY_LABEL, parseSteps } from "@/lib/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { RecipeFormSheet } from "@/components/receitas/recipe-form-sheet";
import { IngredientRow } from "@/components/receitas/ingredient-row";

export default function RecipeDetailPage() {
  const mounted = useMounted();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = useSupabase();
  const recipes = useRecipesStore((s) => s.recipes);
  const ingredients = useRecipesStore((s) => s.ingredients);
  const toggleFavorite = useRecipesStore((s) => s.toggleFavorite);
  const deleteRecipe = useRecipesStore((s) => s.deleteRecipe);
  const addIngredient = useRecipesStore((s) => s.addIngredient);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const recipe = recipes.find((r) => r.id === params.id) ?? null;
  const recipeIngredients = useMemo(
    () =>
      ingredients
        .filter((i) => i.recipe_id === params.id)
        .sort((a, b) => a.order_index - b.order_index),
    [ingredients, params.id]
  );
  const steps = useMemo(() => parseSteps(recipe?.instructions ?? null), [recipe]);

  if (!mounted) return null;

  if (!recipe) {
    return (
      <div className="px-5 pt-6">
        <button onClick={() => router.push("/receitas")} className="flex items-center gap-1 text-[13.5px] text-text-muted">
          <ArrowLeft size={15} /> Voltar
        </button>
        <p className="mt-6 text-[13.5px] text-text-muted">Receita não encontrada.</p>
      </div>
    );
  }

  const handleAddIngredient = async () => {
    if (!supabase || !newName.trim()) return;
    await addIngredient(supabase, recipe.id, {
      name: newName.trim(),
      quantity: newQuantity ? Number(newQuantity) : null,
      unit: newUnit.trim() || null,
    });
    setNewName("");
    setNewQuantity("");
    setNewUnit("");
  };

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/receitas")}
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => supabase && toggleFavorite(supabase, recipe.id, !recipe.favorite)}
            aria-label="Favoritar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-warning"
          >
            <Star size={16} className={recipe.favorite ? "text-warning" : ""} fill={recipe.favorite ? "currentColor" : "none"} />
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

      <p className="mt-2 text-[12.5px] font-medium text-text-faint">{RECIPE_CATEGORY_LABEL[recipe.category]}</p>
      <h1 className="text-[20px] font-semibold text-text">{recipe.name}</h1>
      {(recipe.prep_time_minutes || recipe.servings) && (
        <p className="flex items-center gap-1 text-[13px] text-text-muted">
          {recipe.prep_time_minutes && (
            <>
              <Clock size={13} /> {recipe.prep_time_minutes} min
            </>
          )}
          {recipe.prep_time_minutes && recipe.servings && " · "}
          {recipe.servings}
        </p>
      )}
      {recipe.notes && <p className="mt-2 text-[13px] text-text-muted">{recipe.notes}</p>}

      <div className="mt-6">
        <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">Ingredientes</p>
        {recipeIngredients.length > 0 && (
          <ul className="space-y-1.5">
            {recipeIngredients.map((ing, idx) => (
              <IngredientRow
                key={ing.id}
                ingredient={ing}
                isFirst={idx === 0}
                isLast={idx === recipeIngredients.length - 1}
              />
            ))}
          </ul>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ingrediente" className="flex-1" />
          <Input value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} placeholder="Qtd" className="w-16" />
          <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Un." className="w-16" />
          <button
            onClick={handleAddIngredient}
            aria-label="Adicionar ingrediente"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted hover:text-text"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {steps.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">Modo de preparo</p>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2.5 rounded-xl border border-border-subtle px-3.5 py-2.5">
                <span className="shrink-0 text-[13px] font-medium text-accent">{i + 1}.</span>
                <span className="text-[13.5px] text-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {editing && <RecipeFormSheet recipe={recipe} onClose={() => setEditing(false)} />}

      {confirmDelete && (
        <Sheet onClose={() => setConfirmDelete(false)} title="Excluir receita?">
          <p className="text-[14px] text-text-muted">
            Isso apaga a receita e os ingredientes associados. Essa ação não pode ser desfeita.
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
                await deleteRecipe(supabase, recipe.id);
                router.push("/receitas");
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
