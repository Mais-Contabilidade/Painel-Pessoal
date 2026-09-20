import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipeRow, RecipeIngredientRow, RecipeCategory } from "@/lib/supabase/types";

export async function fetchRecipes(supabase: SupabaseClient): Promise<RecipeRow[]> {
  const { data, error } = await supabase.from("recipes").select("*").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RecipeRow[];
}

export async function fetchRecipeIngredients(supabase: SupabaseClient): Promise<RecipeIngredientRow[]> {
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RecipeIngredientRow[];
}

export type RecipeInput = {
  name: string;
  category: RecipeCategory;
  prepTimeMinutes: number | null;
  servings: string | null;
  instructions: string | null;
  notes: string | null;
};

export async function insertRecipe(
  supabase: SupabaseClient,
  userId: string,
  input: RecipeInput
): Promise<RecipeRow> {
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      user_id: userId,
      name: input.name,
      category: input.category,
      prep_time_minutes: input.prepTimeMinutes,
      servings: input.servings,
      instructions: input.instructions,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RecipeRow;
}

export async function updateRecipe(
  supabase: SupabaseClient,
  id: string,
  input: RecipeInput
): Promise<RecipeRow> {
  const { data, error } = await supabase
    .from("recipes")
    .update({
      name: input.name,
      category: input.category,
      prep_time_minutes: input.prepTimeMinutes,
      servings: input.servings,
      instructions: input.instructions,
      notes: input.notes,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RecipeRow;
}

export async function toggleRecipeFavorite(supabase: SupabaseClient, id: string, favorite: boolean) {
  const { error } = await supabase.from("recipes").update({ favorite }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRecipe(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addIngredient(
  supabase: SupabaseClient,
  userId: string,
  recipeId: string,
  input: { name: string; quantity: number | null; unit: string | null },
  nextOrderIndex: number
): Promise<RecipeIngredientRow> {
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .insert({
      user_id: userId,
      recipe_id: recipeId,
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      order_index: nextOrderIndex,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RecipeIngredientRow;
}

export async function updateIngredient(
  supabase: SupabaseClient,
  id: string,
  input: { name: string; quantity: number | null; unit: string | null }
) {
  const { error } = await supabase
    .from("recipe_ingredients")
    .update({ name: input.name, quantity: input.quantity, unit: input.unit })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteIngredient(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("recipe_ingredients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function swapIngredientOrder(
  supabase: SupabaseClient,
  a: { id: string; order_index: number },
  b: { id: string; order_index: number }
) {
  const [r1, r2] = await Promise.all([
    supabase.from("recipe_ingredients").update({ order_index: b.order_index }).eq("id", a.id),
    supabase.from("recipe_ingredients").update({ order_index: a.order_index }).eq("id", b.id),
  ]);
  if (r1.error) throw new Error(r1.error.message);
  if (r2.error) throw new Error(r2.error.message);
}
