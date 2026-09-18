import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as wq from "@/lib/supabase/queries/workout";
import type { WeekVariantDb } from "@/lib/supabase/types";

export type ExerciseTemplate = {
  id: string;
  name: string;
  sets: number;
  repMin: number | null;
  repMax: number | null;
  orderIndex: number;
};

export type DayPlan = {
  id: string;
  variant: WeekVariantDb;
  weekday: number;
  name: string;
  muscleGroups: string | null;
  exercises: ExerciseTemplate[];
};

export type SetEntry = {
  id: string;
  exerciseName: string;
  setIndex: number;
  completed: boolean;
  weightKg: number | null;
  reps: number | null;
};

export type ActiveSession = {
  id: string;
  templateId: string | null;
  dayName: string;
  variant: WeekVariantDb | null;
  startedAt: string;
  sets: SetEntry[];
};

export type WorkoutHistoryEntry = {
  id: string;
  date: string;
  dayName: string;
  durationMs: number;
  completedSets: number;
  totalSets: number;
  variant: WeekVariantDb | null;
};

function toDayPlan(t: wq.TemplateWithExercises): DayPlan {
  return {
    id: t.id,
    variant: t.variant,
    weekday: t.weekday,
    name: t.name,
    muscleGroups: t.muscle_groups,
    exercises: t.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      sets: e.target_sets,
      repMin: e.rep_range_min,
      repMax: e.rep_range_max,
      orderIndex: e.order_index,
    })),
  };
}

function toSetEntry(s: { id: string; exercise_name: string; set_index: number; completed: boolean; weight_kg: number | null; reps: number | null }): SetEntry {
  return {
    id: s.id,
    exerciseName: s.exercise_name,
    setIndex: s.set_index,
    completed: s.completed,
    weightKg: s.weight_kg,
    reps: s.reps,
  };
}

type Status = "idle" | "loading" | "ready" | "error";

type WorkoutState = {
  status: Status;
  errorMessage: string | null;
  plan: DayPlan[];
  weekOverrides: { weekStartDate: string; variant: WeekVariantDb }[];
  cycleAnchorDate: string;
  activeSession: ActiveSession | null;
  history: WorkoutHistoryEntry[];

  initialize: (supabase: SupabaseClient) => Promise<void>;

  renameDay: (supabase: SupabaseClient, dayId: string, name: string) => Promise<void>;
  addExercise: (
    supabase: SupabaseClient,
    dayId: string,
    name: string,
    sets: number,
    repMin: number | null,
    repMax: number | null
  ) => Promise<void>;
  updateExercise: (
    supabase: SupabaseClient,
    dayId: string,
    exerciseId: string,
    updates: Partial<Pick<ExerciseTemplate, "name" | "sets" | "repMin" | "repMax">>
  ) => Promise<void>;
  removeExercise: (supabase: SupabaseClient, dayId: string, exerciseId: string) => Promise<void>;
  reorderExercise: (
    supabase: SupabaseClient,
    dayId: string,
    exerciseId: string,
    direction: "up" | "down"
  ) => Promise<void>;

  setWeekOverride: (supabase: SupabaseClient, weekStartDate: string, variant: WeekVariantDb) => Promise<void>;
  setCycleAnchor: (supabase: SupabaseClient, date: string) => Promise<void>;

  startSession: (supabase: SupabaseClient, dayId: string) => Promise<void>;
  toggleSet: (supabase: SupabaseClient, setId: string, completed: boolean) => Promise<void>;
  updateSetDetails: (
    supabase: SupabaseClient,
    setId: string,
    weightKg: number | null,
    reps: number | null
  ) => Promise<void>;
  finishSession: (supabase: SupabaseClient) => Promise<void>;
  discardSession: (supabase: SupabaseClient) => Promise<void>;
};

export const useWorkoutStore = create<WorkoutState>()((set, get) => ({
  status: "idle",
  errorMessage: null,
  plan: [],
  weekOverrides: [],
  cycleAnchorDate: new Date().toISOString().slice(0, 10),
  activeSession: null,
  history: [],

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const userId = await getCurrentUserId(supabase);
      await wq.seedDefaultPlanIfEmpty(supabase, userId);

      const [templates, overrides, openSession, history, settingsRes] = await Promise.all([
        wq.fetchTemplates(supabase),
        wq.fetchWeekOverrides(supabase),
        wq.fetchOpenSession(supabase),
        wq.fetchHistory(supabase),
        supabase.from("user_settings").select("cycle_anchor_date").single(),
      ]);

      set({
        status: "ready",
        plan: templates.map(toDayPlan),
        weekOverrides: overrides.map((o) => ({ weekStartDate: o.week_start_date, variant: o.variant })),
        cycleAnchorDate: settingsRes.data?.cycle_anchor_date ?? get().cycleAnchorDate,
        activeSession: openSession
          ? {
              id: openSession.id,
              templateId: openSession.template_id,
              dayName: openSession.day_name,
              variant: openSession.variant,
              startedAt: openSession.started_at,
              sets: openSession.sets.map(toSetEntry),
            }
          : null,
        history: history.map((h) => {
          const totalSets = h.sets.length;
          const completedSets = h.sets.filter((s) => s.completed).length;
          return {
            id: h.id,
            date: h.started_at,
            dayName: h.day_name,
            durationMs: h.duration_ms ?? 0,
            completedSets,
            totalSets,
            variant: h.variant,
          };
        }),
      });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar treino." });
    }
  },

  renameDay: async (supabase, dayId, name) => {
    await wq.renameDayTemplate(supabase, dayId, name);
    set((state) => ({ plan: state.plan.map((d) => (d.id === dayId ? { ...d, name } : d)) }));
  },

  addExercise: async (supabase, dayId, name, sets, repMin, repMax) => {
    const userId = await getCurrentUserId(supabase);
    const day = get().plan.find((d) => d.id === dayId);
    const nextOrder = day ? day.exercises.length : 0;
    const created = await wq.addExercise(
      supabase,
      userId,
      dayId,
      { name, targetSets: sets, repMin, repMax },
      nextOrder
    );
    set((state) => ({
      plan: state.plan.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: [
                ...d.exercises,
                {
                  id: created.id,
                  name: created.name,
                  sets: created.target_sets,
                  repMin: created.rep_range_min,
                  repMax: created.rep_range_max,
                  orderIndex: created.order_index,
                },
              ],
            }
          : d
      ),
    }));
  },

  updateExercise: async (supabase, dayId, exerciseId, updates) => {
    await wq.updateExercise(supabase, exerciseId, {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.sets !== undefined ? { target_sets: updates.sets } : {}),
      ...(updates.repMin !== undefined ? { rep_range_min: updates.repMin } : {}),
      ...(updates.repMax !== undefined ? { rep_range_max: updates.repMax } : {}),
    });
    set((state) => ({
      plan: state.plan.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) => (e.id === exerciseId ? { ...e, ...updates } : e)),
            }
          : d
      ),
    }));
  },

  removeExercise: async (supabase, dayId, exerciseId) => {
    await wq.deleteExercise(supabase, exerciseId);
    set((state) => ({
      plan: state.plan.map((d) =>
        d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) } : d
      ),
    }));
  },

  reorderExercise: async (supabase, dayId, exerciseId, direction) => {
    const day = get().plan.find((d) => d.id === dayId);
    if (!day) return;
    const idx = day.exercises.findIndex((e) => e.id === exerciseId);
    if (idx === -1) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= day.exercises.length) return;

    const a = day.exercises[idx];
    const b = day.exercises[swapWith];
    await wq.swapExerciseOrder(
      supabase,
      { id: a.id, order_index: a.orderIndex },
      { id: b.id, order_index: b.orderIndex }
    );

    set((state) => ({
      plan: state.plan.map((d) => {
        if (d.id !== dayId) return d;
        const exercises = [...d.exercises];
        const swappedA = { ...exercises[idx], orderIndex: b.orderIndex };
        const swappedB = { ...exercises[swapWith], orderIndex: a.orderIndex };
        exercises[idx] = swappedB;
        exercises[swapWith] = swappedA;
        return { ...d, exercises };
      }),
    }));
  },

  setWeekOverride: async (supabase, weekStartDate, variant) => {
    const userId = await getCurrentUserId(supabase);
    await wq.setWeekOverride(supabase, userId, weekStartDate, variant);
    set((state) => ({
      weekOverrides: [
        ...state.weekOverrides.filter((o) => o.weekStartDate !== weekStartDate),
        { weekStartDate, variant },
      ],
    }));
  },

  setCycleAnchor: async (supabase, date) => {
    const userId = await getCurrentUserId(supabase);
    const { updateCycleAnchor } = await import("@/lib/supabase/queries/settings");
    await updateCycleAnchor(supabase, userId, date);
    set({ cycleAnchorDate: date });
  },

  startSession: async (supabase, dayId) => {
    const userId = await getCurrentUserId(supabase);
    const day = get().plan.find((d) => d.id === dayId);
    if (!day) return;
    const created = await wq.startSession(supabase, userId, {
      id: day.id,
      variant: day.variant,
      weekday: day.weekday,
      name: day.name,
      user_id: userId,
      muscle_groups: null,
      created_at: "",
      updated_at: "",
      exercises: day.exercises.map((e) => ({
        id: e.id,
        user_id: userId,
        template_id: day.id,
        name: e.name,
        target_sets: e.sets,
        rep_range_min: e.repMin,
        rep_range_max: e.repMax,
        order_index: e.orderIndex,
        created_at: "",
        updated_at: "",
      })),
    });
    set({
      activeSession: {
        id: created.id,
        templateId: created.template_id,
        dayName: created.day_name,
        variant: created.variant,
        startedAt: created.started_at,
        sets: created.sets.map(toSetEntry),
      },
    });
  },

  toggleSet: async (supabase, setId, completed) => {
    set((state) =>
      state.activeSession
        ? {
            activeSession: {
              ...state.activeSession,
              sets: state.activeSession.sets.map((s) => (s.id === setId ? { ...s, completed } : s)),
            },
          }
        : state
    );
    await wq.toggleSessionSet(supabase, setId, completed);
  },

  updateSetDetails: async (supabase, setId, weightKg, reps) => {
    set((state) =>
      state.activeSession
        ? {
            activeSession: {
              ...state.activeSession,
              sets: state.activeSession.sets.map((s) =>
                s.id === setId ? { ...s, weightKg, reps } : s
              ),
            },
          }
        : state
    );
    await wq.updateSessionSetDetails(supabase, setId, { weight_kg: weightKg, reps });
  },

  finishSession: async (supabase) => {
    const session = get().activeSession;
    if (!session) return;
    const durationMs = Date.now() - new Date(session.startedAt).getTime();
    await wq.finishSession(supabase, session.id, durationMs);
    const completedSets = session.sets.filter((s) => s.completed).length;
    set((state) => ({
      activeSession: null,
      history: [
        {
          id: session.id,
          date: session.startedAt,
          dayName: session.dayName,
          durationMs,
          completedSets,
          totalSets: session.sets.length,
          variant: session.variant,
        },
        ...state.history,
      ],
    }));
  },

  discardSession: async (supabase) => {
    const session = get().activeSession;
    if (!session) return;
    await wq.discardSession(supabase, session.id);
    set({ activeSession: null });
  },
}));
