import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as cq from "@/lib/supabase/queries/cardio";
import { updateCardioDefaultGoal } from "@/lib/supabase/queries/settings";

export type CardioEntry = {
  id: string;
  date: string;
  minutes: number;
  note: string | null;
};

type Status = "idle" | "loading" | "ready" | "error";

type CardioState = {
  status: Status;
  errorMessage: string | null;
  defaultGoalMinutes: number;
  weekGoals: Record<string, number>;
  entries: CardioEntry[];

  initialize: (supabase: SupabaseClient) => Promise<void>;
  addEntry: (supabase: SupabaseClient, date: string, minutes: number, note?: string) => Promise<void>;
  deleteEntry: (supabase: SupabaseClient, entryId: string) => Promise<void>;
  setWeekGoal: (supabase: SupabaseClient, weekStartDate: string, minutes: number) => Promise<void>;
  setDefaultGoal: (supabase: SupabaseClient, minutes: number) => Promise<void>;
};

const HISTORY_WINDOW_DAYS = 120;

function sinceISODate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export const useCardioStore = create<CardioState>()((set) => ({
  status: "idle",
  errorMessage: null,
  defaultGoalMinutes: 120,
  weekGoals: {},
  entries: [],

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const [settingsRes, weekGoals, entries] = await Promise.all([
        supabase.from("user_settings").select("cardio_default_goal_minutes").single(),
        cq.fetchCardioWeekGoals(supabase),
        cq.fetchCardioEntries(supabase, sinceISODate(HISTORY_WINDOW_DAYS)),
      ]);
      const weekGoalsMap: Record<string, number> = {};
      for (const g of weekGoals) weekGoalsMap[g.week_start_date] = g.goal_minutes;

      set({
        status: "ready",
        defaultGoalMinutes: settingsRes.data?.cardio_default_goal_minutes ?? 120,
        weekGoals: weekGoalsMap,
        entries: entries.map((e) => ({ id: e.id, date: e.entry_date, minutes: e.minutes, note: e.note })),
      });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar cardio." });
    }
  },

  addEntry: async (supabase, date, minutes, note) => {
    const userId = await getCurrentUserId(supabase);
    const created = await cq.addCardioEntry(supabase, userId, { entryDate: date, minutes, note });
    set((state) => ({
      entries: [
        { id: created.id, date: created.entry_date, minutes: created.minutes, note: created.note },
        ...state.entries,
      ].sort((a, b) => (a.date < b.date ? 1 : -1)),
    }));
  },

  deleteEntry: async (supabase, entryId) => {
    await cq.deleteCardioEntry(supabase, entryId);
    set((state) => ({ entries: state.entries.filter((e) => e.id !== entryId) }));
  },

  setWeekGoal: async (supabase, weekStartDate, minutes) => {
    const userId = await getCurrentUserId(supabase);
    await cq.setCardioWeekGoal(supabase, userId, weekStartDate, minutes);
    set((state) => ({ weekGoals: { ...state.weekGoals, [weekStartDate]: minutes } }));
  },

  setDefaultGoal: async (supabase, minutes) => {
    const userId = await getCurrentUserId(supabase);
    await updateCardioDefaultGoal(supabase, userId, minutes);
    set({ defaultGoalMinutes: minutes });
  },
}));

export function resolveWeekGoal(state: Pick<CardioState, "weekGoals" | "defaultGoalMinutes">, weekStartDate: string): number {
  return state.weekGoals[weekStartDate] ?? state.defaultGoalMinutes;
}
