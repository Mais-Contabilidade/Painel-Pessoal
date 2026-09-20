import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShoppingListRow, ShoppingListItemRow } from "@/lib/supabase/types";

export async function fetchShoppingLists(supabase: SupabaseClient): Promise<ShoppingListRow[]> {
  const { data, error } = await supabase.from("shopping_lists").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as ShoppingListRow[];
}

export async function fetchShoppingListItems(supabase: SupabaseClient): Promise<ShoppingListItemRow[]> {
  const { data, error } = await supabase
    .from("shopping_list_items")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as ShoppingListItemRow[];
}

/** Garante uma lista única "Lista de compras" por usuário — cria na primeira vez que for precisa. */
export async function getOrCreateDefaultList(
  supabase: SupabaseClient,
  userId: string,
  existing: ShoppingListRow[]
): Promise<ShoppingListRow> {
  if (existing.length > 0) return existing[0];
  const { data, error } = await supabase
    .from("shopping_lists")
    .insert({ user_id: userId, name: "Lista de compras" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ShoppingListRow;
}

export async function addItemsToList(
  supabase: SupabaseClient,
  userId: string,
  listId: string,
  items: { name: string; quantity: number | null; unit: string | null; sourceRecipeId: string | null }[]
): Promise<ShoppingListItemRow[]> {
  const rows = items.map((i) => ({
    user_id: userId,
    list_id: listId,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    source_recipe_id: i.sourceRecipeId,
  }));
  const { data, error } = await supabase.from("shopping_list_items").insert(rows).select();
  if (error) throw new Error(error.message);
  return data as ShoppingListItemRow[];
}

export async function toggleShoppingItemChecked(supabase: SupabaseClient, id: string, checked: boolean) {
  const { error } = await supabase.from("shopping_list_items").update({ checked }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteShoppingItem(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("shopping_list_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
