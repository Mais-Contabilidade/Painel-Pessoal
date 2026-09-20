import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as lq from "@/lib/supabase/queries/library";
import type { LibraryItemRow, LibraryNoteRow, LibraryNoteType } from "@/lib/supabase/types";
import type { LibraryItemInput } from "@/lib/supabase/queries/library";

type Status = "idle" | "loading" | "ready" | "error";

type LibraryState = {
  status: Status;
  errorMessage: string | null;
  items: LibraryItemRow[];
  notes: LibraryNoteRow[];

  initialize: (supabase: SupabaseClient) => Promise<void>;
  addItem: (supabase: SupabaseClient, input: LibraryItemInput) => Promise<LibraryItemRow>;
  updateItem: (supabase: SupabaseClient, id: string, input: LibraryItemInput) => Promise<void>;
  toggleFavorite: (supabase: SupabaseClient, id: string, favorite: boolean) => Promise<void>;
  deleteItem: (supabase: SupabaseClient, id: string) => Promise<void>;
  addNote: (
    supabase: SupabaseClient,
    input: { itemId: string; noteType: LibraryNoteType; title: string | null; content: string }
  ) => Promise<void>;
  deleteNote: (supabase: SupabaseClient, id: string) => Promise<void>;
};

export const useLibraryStore = create<LibraryState>()((set) => ({
  status: "idle",
  errorMessage: null,
  items: [],
  notes: [],

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const [items, notes] = await Promise.all([lq.fetchLibraryItems(supabase), lq.fetchLibraryNotes(supabase)]);
      set({ status: "ready", items, notes });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar a biblioteca." });
    }
  },

  addItem: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const created = await lq.insertLibraryItem(supabase, userId, input);
    set((state) => ({ items: [created, ...state.items] }));
    return created;
  },

  updateItem: async (supabase, id, input) => {
    const updated = await lq.updateLibraryItem(supabase, id, input);
    set((state) => ({ items: state.items.map((i) => (i.id === id ? updated : i)) }));
  },

  toggleFavorite: async (supabase, id, favorite) => {
    set((state) => ({ items: state.items.map((i) => (i.id === id ? { ...i, favorite } : i)) }));
    await lq.toggleLibraryItemFavorite(supabase, id, favorite);
  },

  deleteItem: async (supabase, id) => {
    await lq.deleteLibraryItem(supabase, id);
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      notes: state.notes.filter((n) => n.item_id !== id),
    }));
  },

  addNote: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const created = await lq.insertLibraryNote(supabase, userId, input);
    set((state) => ({ notes: [created, ...state.notes] }));
  },

  deleteNote: async (supabase, id) => {
    await lq.deleteLibraryNote(supabase, id);
    set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
  },
}));
