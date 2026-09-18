import { create } from "zustand";
import { persist } from "zustand/middleware";
import { makeId } from "@/lib/id";
import { safeStorage } from "@/lib/safe-storage";

export type Insight = {
  id: string;
  title?: string;
  content: string;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

type InsightsState = {
  insights: Insight[];
  addInsight: (input: { title?: string; content: string; tags: string[] }) => void;
  updateInsight: (
    id: string,
    updates: Partial<Pick<Insight, "title" | "content" | "tags">>
  ) => void;
  toggleFavorite: (id: string) => void;
  deleteInsight: (id: string) => void;
};

export const useInsightsStore = create<InsightsState>()(
  persist(
    (set) => ({
      insights: [],

      addInsight: (input) =>
        set((state) => ({
          insights: [
            {
              id: makeId(),
              title: input.title?.trim() || undefined,
              content: input.content,
              tags: input.tags,
              favorite: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...state.insights,
          ],
        })),

      updateInsight: (id, updates) =>
        set((state) => ({
          insights: state.insights.map((i) =>
            i.id === id
              ? {
                  ...i,
                  ...updates,
                  title: updates.title !== undefined ? updates.title?.trim() || undefined : i.title,
                  updatedAt: new Date().toISOString(),
                }
              : i
          ),
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          insights: state.insights.map((i) =>
            i.id === id ? { ...i, favorite: !i.favorite, updatedAt: new Date().toISOString() } : i
          ),
        })),

      deleteInsight: (id) =>
        set((state) => ({ insights: state.insights.filter((i) => i.id !== id) })),
    }),
    {
      name: "hub-insights",
      version: 1,
      storage: safeStorage,
    }
  )
);
