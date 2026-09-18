import { create } from "zustand";
import { persist } from "zustand/middleware";
import { makeId } from "@/lib/id";
import { safeStorage } from "@/lib/safe-storage";
import type { Goal, Transaction, TransactionType } from "@/lib/finance";
import type { Cents } from "@/lib/money";
import type { MonthKey } from "@/lib/month";

type FinanceState = {
  goals: Goal[];
  transactions: Transaction[];

  addGoal: (input: { name: string; targetValue: Cents; startMonth: MonthKey; endMonth: MonthKey }) => Goal;
  updateGoal: (goalId: string, updates: Partial<Pick<Goal, "name" | "targetValue" | "startMonth" | "endMonth">>) => void;
  archiveGoal: (goalId: string) => void;
  deleteGoal: (goalId: string) => void;

  addTransaction: (input: {
    goalId: string;
    type: TransactionType;
    value: Cents;
    date: string;
    note?: string;
    justification?: string;
  }) => void;
  deleteTransaction: (transactionId: string) => void;
};

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      goals: [],
      transactions: [],

      addGoal: (input) => {
        const goal: Goal = {
          id: makeId(),
          name: input.name,
          targetValue: input.targetValue,
          startMonth: input.startMonth,
          endMonth: input.endMonth,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ goals: [...state.goals, goal] }));
        return goal;
      },

      updateGoal: (goalId, updates) =>
        set((state) => ({
          goals: state.goals.map((g) => (g.id === goalId ? { ...g, ...updates } : g)),
        })),

      archiveGoal: (goalId) =>
        set((state) => ({
          goals: state.goals.map((g) => (g.id === goalId ? { ...g, archived: true } : g)),
        })),

      deleteGoal: (goalId) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== goalId),
          transactions: state.transactions.filter((t) => t.goalId !== goalId),
        })),

      addTransaction: (input) => {
        const transaction: Transaction = {
          id: makeId(),
          goalId: input.goalId,
          type: input.type,
          value: input.value,
          date: input.date,
          note: input.note,
          justification: input.justification,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ transactions: [...state.transactions, transaction] }));
      },

      deleteTransaction: (transactionId) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== transactionId),
        })),
    }),
    {
      name: "hub-finance",
      version: 1,
      storage: safeStorage,
    }
  )
);
