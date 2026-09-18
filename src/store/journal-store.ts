import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as jq from "@/lib/supabase/queries/journal";
import type { JournalEntry } from "@/lib/journal";
import type { JournalEntryRow } from "@/lib/supabase/types";

function toEntry(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    daySummary: row.day_summary,
    gratitude: row.gratitude,
    reflection: row.reflection,
    notes: row.notes,
  };
}

type Status = "idle" | "loading" | "ready" | "error";

type JournalState = {
  status: Status;
  errorMessage: string | null;
  entries: JournalEntry[];

  initialize: (supabase: SupabaseClient) => Promise<void>;
  saveEntry: (
    supabase: SupabaseClient,
    input: { entryDate: string; daySummary: string; gratitude: string; reflection: string; notes: string | null }
  ) => Promise<void>;
};

export const useJournalStore = create<JournalState>()((set) => ({
  status: "idle",
  errorMessage: null,
  entries: [],

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const rows = await jq.fetchJournalEntries(supabase);
      set({ status: "ready", entries: rows.map(toEntry) });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar o diário." });
    }
  },

  saveEntry: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const saved = await jq.upsertJournalEntry(supabase, userId, input);
    const mapped = toEntry(saved);
    set((state) => ({
      entries: [mapped, ...state.entries.filter((e) => e.entryDate !== mapped.entryDate)],
    }));
  },
}));
