import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as fq from "@/lib/supabase/queries/finance";
import type { Goal, Transaction, TransactionType } from "@/lib/finance";
import type { Cents } from "@/lib/money";
import type { MonthKey } from "@/lib/month";
import type { FinancialGoalRow, FinancialTransactionRow } from "@/lib/supabase/types";

function toGoal(row: FinancialGoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetValue: row.target_value_cents,
    startMonth: row.start_month,
    endMonth: row.end_month,
    createdAt: row.created_at,
    archived: row.archived,
  };
}

function toTransaction(row: FinancialTransactionRow): Transaction {
  return {
    id: row.id,
    goalId: row.goal_id,
    type: row.type,
    value: row.value_cents,
    date: row.occurred_on,
    note: row.note ?? undefined,
    justification: row.justification ?? undefined,
    createdAt: row.created_at,
  };
}

type Status = "idle" | "loading" | "ready" | "error";

type FinanceState = {
  status: Status;
  errorMessage: string | null;
  goals: Goal[];
  transactions: Transaction[];

  initialize: (supabase: SupabaseClient) => Promise<void>;

  addGoal: (
    supabase: SupabaseClient,
    input: { name: string; targetValue: Cents; startMonth: MonthKey; endMonth: MonthKey }
  ) => Promise<Goal>;
  updateGoal: (
    supabase: SupabaseClient,
    goalId: string,
    updates: Partial<Pick<Goal, "name" | "targetValue" | "startMonth" | "endMonth">>
  ) => Promise<void>;
  archiveGoal: (supabase: SupabaseClient, goalId: string) => Promise<void>;
  deleteGoal: (supabase: SupabaseClient, goalId: string) => Promise<void>;

  addTransaction: (
    supabase: SupabaseClient,
    input: {
      goalId: string;
      type: TransactionType;
      value: Cents;
      date: string;
      note?: string;
      justification?: string;
    }
  ) => Promise<void>;
  deleteTransaction: (supabase: SupabaseClient, transactionId: string) => Promise<void>;
};

export const useFinanceStore = create<FinanceState>()((set) => ({
  status: "idle",
  errorMessage: null,
  goals: [],
  transactions: [],

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const [goals, transactions] = await Promise.all([fq.fetchGoals(supabase), fq.fetchTransactions(supabase)]);
      set({ status: "ready", goals: goals.map(toGoal), transactions: transactions.map(toTransaction) });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar financeiro." });
    }
  },

  addGoal: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const created = await fq.insertGoal(supabase, userId, {
      name: input.name,
      targetValueCents: input.targetValue,
      startMonth: input.startMonth,
      endMonth: input.endMonth,
    });
    const goal = toGoal(created);
    set((state) => ({ goals: [...state.goals, goal] }));
    return goal;
  },

  updateGoal: async (supabase, goalId, updates) => {
    const updated = await fq.updateGoalRow(supabase, goalId, {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.targetValue !== undefined ? { target_value_cents: updates.targetValue } : {}),
      ...(updates.startMonth !== undefined ? { start_month: updates.startMonth } : {}),
      ...(updates.endMonth !== undefined ? { end_month: updates.endMonth } : {}),
    });
    set((state) => ({ goals: state.goals.map((g) => (g.id === goalId ? toGoal(updated) : g)) }));
  },

  archiveGoal: async (supabase, goalId) => {
    await fq.updateGoalRow(supabase, goalId, { archived: true });
    set((state) => ({ goals: state.goals.map((g) => (g.id === goalId ? { ...g, archived: true } : g)) }));
  },

  deleteGoal: async (supabase, goalId) => {
    await fq.deleteGoalRow(supabase, goalId);
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== goalId),
      transactions: state.transactions.filter((t) => t.goalId !== goalId),
    }));
  },

  addTransaction: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const created = await fq.insertTransaction(supabase, userId, {
      goalId: input.goalId,
      type: input.type,
      valueCents: input.value,
      occurredOn: input.date.slice(0, 10),
      note: input.note,
      justification: input.justification,
    });
    set((state) => ({ transactions: [...state.transactions, toTransaction(created)] }));
  },

  deleteTransaction: async (supabase, transactionId) => {
    await fq.deleteTransactionRow(supabase, transactionId);
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== transactionId) }));
  },
}));
