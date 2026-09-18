import { create } from "zustand";
import { persist } from "zustand/middleware";
import { makeId } from "@/lib/id";
import { safeStorage } from "@/lib/safe-storage";

export type ExerciseTemplate = {
  id: string;
  name: string;
  sets: number;
};

export type DayPlan = {
  id: string;
  order: number;
  name: string;
  exercises: ExerciseTemplate[];
};

export type ActiveSession = {
  id: string;
  dayId: string;
  dayName: string;
  startedAt: string;
  setsDone: Record<string, boolean[]>;
};

export type WorkoutHistoryEntry = {
  id: string;
  date: string;
  dayName: string;
  durationMs: number;
  completedSets: number;
  totalSets: number;
};

function defaultPlan(): DayPlan[] {
  return [1, 2, 3, 4, 5].map((order) => ({
    id: makeId(),
    order,
    name: `Dia ${order}`,
    exercises: [],
  }));
}

type WorkoutState = {
  plan: DayPlan[];
  activeSession: ActiveSession | null;
  history: WorkoutHistoryEntry[];

  renameDay: (dayId: string, name: string) => void;
  addExercise: (dayId: string, name: string, sets: number) => void;
  updateExercise: (dayId: string, exerciseId: string, updates: Partial<Pick<ExerciseTemplate, "name" | "sets">>) => void;
  removeExercise: (dayId: string, exerciseId: string) => void;
  reorderExercise: (dayId: string, exerciseId: string, direction: "up" | "down") => void;

  startSession: (dayId: string) => void;
  toggleSet: (exerciseId: string, setIndex: number) => void;
  finishSession: () => void;
  discardSession: () => void;
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      plan: defaultPlan(),
      activeSession: null,
      history: [],

      renameDay: (dayId, name) =>
        set((state) => ({
          plan: state.plan.map((d) => (d.id === dayId ? { ...d, name } : d)),
        })),

      addExercise: (dayId, name, sets) =>
        set((state) => ({
          plan: state.plan.map((d) =>
            d.id === dayId
              ? { ...d, exercises: [...d.exercises, { id: makeId(), name, sets }] }
              : d
          ),
        })),

      updateExercise: (dayId, exerciseId, updates) =>
        set((state) => ({
          plan: state.plan.map((d) =>
            d.id === dayId
              ? {
                  ...d,
                  exercises: d.exercises.map((e) =>
                    e.id === exerciseId ? { ...e, ...updates } : e
                  ),
                }
              : d
          ),
        })),

      removeExercise: (dayId, exerciseId) =>
        set((state) => ({
          plan: state.plan.map((d) =>
            d.id === dayId
              ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
              : d
          ),
        })),

      reorderExercise: (dayId, exerciseId, direction) =>
        set((state) => ({
          plan: state.plan.map((d) => {
            if (d.id !== dayId) return d;
            const idx = d.exercises.findIndex((e) => e.id === exerciseId);
            if (idx === -1) return d;
            const swapWith = direction === "up" ? idx - 1 : idx + 1;
            if (swapWith < 0 || swapWith >= d.exercises.length) return d;
            const exercises = [...d.exercises];
            [exercises[idx], exercises[swapWith]] = [exercises[swapWith], exercises[idx]];
            return { ...d, exercises };
          }),
        })),

      startSession: (dayId) => {
        const day = get().plan.find((d) => d.id === dayId);
        if (!day) return;
        const setsDone: Record<string, boolean[]> = {};
        for (const ex of day.exercises) {
          setsDone[ex.id] = Array(ex.sets).fill(false);
        }
        set({
          activeSession: {
            id: makeId(),
            dayId: day.id,
            dayName: day.name,
            startedAt: new Date().toISOString(),
            setsDone,
          },
        });
      },

      toggleSet: (exerciseId, setIndex) =>
        set((state) => {
          if (!state.activeSession) return state;
          const current = state.activeSession.setsDone[exerciseId] ?? [];
          const next = [...current];
          next[setIndex] = !next[setIndex];
          return {
            activeSession: {
              ...state.activeSession,
              setsDone: { ...state.activeSession.setsDone, [exerciseId]: next },
            },
          };
        }),

      finishSession: () => {
        const session = get().activeSession;
        if (!session) return;
        const durationMs = Date.now() - new Date(session.startedAt).getTime();
        const allSets = Object.values(session.setsDone).flat();
        const completedSets = allSets.filter(Boolean).length;
        const entry: WorkoutHistoryEntry = {
          id: makeId(),
          date: new Date().toISOString(),
          dayName: session.dayName,
          durationMs,
          completedSets,
          totalSets: allSets.length,
        };
        set((state) => ({
          history: [entry, ...state.history],
          activeSession: null,
        }));
      },

      discardSession: () => set({ activeSession: null }),
    }),
    {
      name: "hub-workout",
      version: 1,
      storage: safeStorage,
    }
  )
);
