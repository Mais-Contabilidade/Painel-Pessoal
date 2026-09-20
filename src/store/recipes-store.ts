import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as rq from "@/lib/supabase/queries/recipes";
import * as sq from "@/lib/supabase/queries/shopping";
import type { RecipeRow, RecipeIngredientRow, ShoppingListRow, ShoppingListItemRow } from "@/lib/supabase/types";
import type { RecipeInput } from "@/lib/supabase/queries/recipes";

type Status = "idle" | "loading" | "ready" | "error";

type RecipesState = {
  status: Status;
  errorMessage: string | null;
  recipes: RecipeRow[];
  ingredients: RecipeIngredientRow[];
  shoppingLists: ShoppingListRow[];
  shoppingItems: ShoppingListItemRow[];

  initialize: (supabase: SupabaseClient) => Promise<void>;
  addIngredientsToShoppingList: (
    supabase: SupabaseClient,
    items: { name: string; quantity: number | null; unit: string | null; sourceRecipeId: string | null }[]
  ) => Promise<void>;
  toggleShoppingItemChecked: (supabase: SupabaseClient, id: string, checked: boolean) => Promise<void>;
  deleteShoppingItem: (supabase: SupabaseClient, id: string) => Promise<void>;
  addRecipe: (supabase: SupabaseClient, input: RecipeInput) => Promise<RecipeRow>;
  updateRecipe: (supabase: SupabaseClient, id: string, input: RecipeInput) => Promise<void>;
  toggleFavorite: (supabase: SupabaseClient, id: string, favorite: boolean) => Promise<void>;
  deleteRecipe: (supabase: SupabaseClient, id: string) => Promise<void>;
  addIngredient: (
    supabase: SupabaseClient,
    recipeId: string,
    input: { name: string; quantity: number | null; unit: string | null }
  ) => Promise<void>;
  updateIngredient: (
    supabase: SupabaseClient,
    id: string,
    input: { name: string; quantity: number | null; unit: string | null }
  ) => Promise<void>;
  deleteIngredient: (supabase: SupabaseClient, id: string) => Promise<void>;
  reorderIngredient: (supabase: SupabaseClient, recipeId: string, id: string, direction: "up" | "down") => Promise<void>;
};

export const useRecipesStore = create<RecipesState>()((set, get) => ({
  status: "idle",
  errorMessage: null,
  recipes: [],
  ingredients: [],
  shoppingLists: [],
  shoppingItems: [],

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const [recipes, ingredients, shoppingLists, shoppingItems] = await Promise.all([
        rq.fetchRecipes(supabase),
        rq.fetchRecipeIngredients(supabase),
        sq.fetchShoppingLists(supabase),
        sq.fetchShoppingListItems(supabase),
      ]);
      set({ status: "ready", recipes, ingredients, shoppingLists, shoppingItems });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar receitas." });
    }
  },

  addIngredientsToShoppingList: async (supabase, items) => {
    const userId = await getCurrentUserId(supabase);
    const list = await sq.getOrCreateDefaultList(supabase, userId, get().shoppingLists);
    const created = await sq.addItemsToList(supabase, userId, list.id, items);
    set((state) => ({
      shoppingLists: state.shoppingLists.some((l) => l.id === list.id) ? state.shoppingLists : [...state.shoppingLists, list],
      shoppingItems: [...state.shoppingItems, ...created],
    }));
  },

  toggleShoppingItemChecked: async (supabase, id, checked) => {
    set((state) => ({ shoppingItems: state.shoppingItems.map((i) => (i.id === id ? { ...i, checked } : i)) }));
    await sq.toggleShoppingItemChecked(supabase, id, checked);
  },

  deleteShoppingItem: async (supabase, id) => {
    await sq.deleteShoppingItem(supabase, id);
    set((state) => ({ shoppingItems: state.shoppingItems.filter((i) => i.id !== id) }));
  },

  addRecipe: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const created = await rq.insertRecipe(supabase, userId, input);
    set((state) => ({ recipes: [...state.recipes, created] }));
    return created;
  },

  updateRecipe: async (supabase, id, input) => {
    const updated = await rq.updateRecipe(supabase, id, input);
    set((state) => ({ recipes: state.recipes.map((r) => (r.id === id ? updated : r)) }));
  },

  toggleFavorite: async (supabase, id, favorite) => {
    set((state) => ({ recipes: state.recipes.map((r) => (r.id === id ? { ...r, favorite } : r)) }));
    await rq.toggleRecipeFavorite(supabase, id, favorite);
  },

  deleteRecipe: async (supabase, id) => {
    await rq.deleteRecipe(supabase, id);
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== id),
      ingredients: state.ingredients.filter((i) => i.recipe_id !== id),
    }));
  },

  addIngredient: async (supabase, recipeId, input) => {
    const userId = await getCurrentUserId(supabase);
    const existing = get().ingredients.filter((i) => i.recipe_id === recipeId);
    const nextOrder = existing.length;
    const created = await rq.addIngredient(supabase, userId, recipeId, input, nextOrder);
    set((state) => ({ ingredients: [...state.ingredients, created] }));
  },

  updateIngredient: async (supabase, id, input) => {
    await rq.updateIngredient(supabase, id, input);
    set((state) => ({
      ingredients: state.ingredients.map((i) => (i.id === id ? { ...i, ...input } : i)),
    }));
  },

  deleteIngredient: async (supabase, id) => {
    await rq.deleteIngredient(supabase, id);
    set((state) => ({ ingredients: state.ingredients.filter((i) => i.id !== id) }));
  },

  reorderIngredient: async (supabase, recipeId, id, direction) => {
    const list = get()
      .ingredients.filter((i) => i.recipe_id === recipeId)
      .sort((a, b) => a.order_index - b.order_index);
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= list.length) return;

    const a = list[idx];
    const b = list[swapWith];
    await rq.swapIngredientOrder(supabase, { id: a.id, order_index: a.order_index }, { id: b.id, order_index: b.order_index });

    set((state) => ({
      ingredients: state.ingredients.map((i) => {
        if (i.id === a.id) return { ...i, order_index: b.order_index };
        if (i.id === b.id) return { ...i, order_index: a.order_index };
        return i;
      }),
    }));
  },
}));
