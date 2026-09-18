import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as iq from "@/lib/supabase/queries/insights";
import type { InsightRow } from "@/lib/supabase/types";

export type Insight = {
  id: string;
  title?: string;
  content: string;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

function toInsight(row: InsightRow): Insight {
  return {
    id: row.id,
    title: row.title ?? undefined,
    content: row.content,
    tags: row.tags,
    favorite: row.favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type Status = "idle" | "loading" | "ready" | "error";

type InsightsState = {
  status: Status;
  errorMessage: string | null;
  insights: Insight[];

  initialize: (supabase: SupabaseClient) => Promise<void>;
  addInsight: (
    supabase: SupabaseClient,
    input: { title?: string; content: string; tags: string[] }
  ) => Promise<void>;
  updateInsight: (
    supabase: SupabaseClient,
    id: string,
    updates: Partial<Pick<Insight, "title" | "content" | "tags">>
  ) => Promise<void>;
  toggleFavorite: (supabase: SupabaseClient, id: string) => Promise<void>;
  deleteInsight: (supabase: SupabaseClient, id: string) => Promise<void>;
};

export const useInsightsStore = create<InsightsState>()((set, get) => ({
  status: "idle",
  errorMessage: null,
  insights: [],

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const rows = await iq.fetchInsights(supabase);
      set({ status: "ready", insights: rows.map(toInsight) });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar insights." });
    }
  },

  addInsight: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const created = await iq.insertInsight(supabase, userId, input);
    set((state) => ({ insights: [toInsight(created), ...state.insights] }));
  },

  updateInsight: async (supabase, id, updates) => {
    const updated = await iq.updateInsightRow(supabase, id, {
      ...(updates.title !== undefined ? { title: updates.title.trim() || null } : {}),
      ...(updates.content !== undefined ? { content: updates.content } : {}),
      ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
    });
    set((state) => ({ insights: state.insights.map((i) => (i.id === id ? toInsight(updated) : i)) }));
  },

  toggleFavorite: async (supabase, id) => {
    const current = get().insights.find((i) => i.id === id);
    if (!current) return;
    const updated = await iq.updateInsightRow(supabase, id, { favorite: !current.favorite });
    set((state) => ({ insights: state.insights.map((i) => (i.id === id ? toInsight(updated) : i)) }));
  },

  deleteInsight: async (supabase, id) => {
    await iq.deleteInsightRow(supabase, id);
    set((state) => ({ insights: state.insights.filter((i) => i.id !== id) }));
  },
}));
