import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as fq from "@/lib/supabase/queries/finance";
import { computeInitialMonthlyTarget } from "@/lib/finance";
import type { Goal, GoalParticipant, Transaction, TransactionType, GoalAllocationType } from "@/lib/finance";
import type { Cents } from "@/lib/money";
import type { MonthKey } from "@/lib/month";
import type { FinancialGoalRow, FinancialGoalParticipantRow, FinancialTransactionRow } from "@/lib/supabase/types";

function toGoal(row: FinancialGoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetValue: row.target_value_cents,
    startMonth: row.start_month,
    endMonth: row.end_month,
    allocationType: row.allocation_type,
    originalMonthlyTargetCents: row.original_monthly_target_cents,
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
    participantId: row.participant_id,
    source: row.source,
    note: row.note ?? undefined,
    justification: row.justification ?? undefined,
    createdAt: row.created_at,
  };
}

function toParticipant(row: FinancialGoalParticipantRow): GoalParticipant {
  return {
    id: row.id,
    goalId: row.goal_id,
    name: row.name,
    sharePercent: row.share_percent,
    monthlyTargetCents: row.monthly_target_cents,
    orderIndex: row.order_index,
  };
}

type Status = "idle" | "loading" | "ready" | "error";

type FinanceState = {
  status: Status;
  errorMessage: string | null;
  goals: Goal[];
  transactions: Transaction[];
  participants: GoalParticipant[];

  initialize: (supabase: SupabaseClient) => Promise<void>;

  addGoal: (
    supabase: SupabaseClient,
    input: { name: string; targetValue: Cents; startMonth: MonthKey; endMonth: MonthKey; initialBalance: Cents }
  ) => Promise<Goal>;
  updateGoal: (
    supabase: SupabaseClient,
    goalId: string,
    updates: Partial<Pick<Goal, "name" | "targetValue" | "startMonth" | "endMonth">>
  ) => Promise<void>;
  setAllocationType: (supabase: SupabaseClient, goalId: string, allocationType: GoalAllocationType) => Promise<void>;
  archiveGoal: (supabase: SupabaseClient, goalId: string) => Promise<void>;
  deleteGoal: (supabase: SupabaseClient, goalId: string) => Promise<void>;

  addTransaction: (
    supabase: SupabaseClient,
    input: {
      goalId: string;
      type: TransactionType;
      value: Cents;
      date: string;
      participantId?: string | null;
      source?: string | null;
      note?: string;
      justification?: string;
    }
  ) => Promise<void>;
  updateTransaction: (
    supabase: SupabaseClient,
    transactionId: string,
    input: {
      type: TransactionType;
      value: Cents;
      date: string;
      participantId?: string | null;
      source?: string | null;
      note?: string;
      justification?: string;
    }
  ) => Promise<void>;
  deleteTransaction: (supabase: SupabaseClient, transactionId: string) => Promise<void>;

  addParticipant: (
    supabase: SupabaseClient,
    goalId: string,
    input: { name: string; sharePercent: number | null; monthlyTargetCents: number | null }
  ) => Promise<void>;
  updateParticipant: (
    supabase: SupabaseClient,
    id: string,
    input: { name: string; sharePercent: number | null; monthlyTargetCents: number | null }
  ) => Promise<void>;
  deleteParticipant: (supabase: SupabaseClient, id: string) => Promise<void>;
};

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  status: "idle",
  errorMessage: null,
  goals: [],
  transactions: [],
  participants: [],

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const [goals, transactions, participants] = await Promise.all([
        fq.fetchGoals(supabase),
        fq.fetchTransactions(supabase),
        fq.fetchGoalParticipants(supabase),
      ]);
      set({
        status: "ready",
        goals: goals.map(toGoal),
        transactions: transactions.map(toTransaction),
        participants: participants.map(toParticipant),
      });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar financeiro." });
    }
  },

  addGoal: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const originalMonthlyTargetCents = computeInitialMonthlyTarget(
      input.targetValue,
      input.startMonth,
      input.endMonth,
      input.initialBalance
    );
    const { goal: created, initialBalanceTx } = await fq.insertGoal(supabase, userId, {
      name: input.name,
      targetValueCents: input.targetValue,
      startMonth: input.startMonth,
      endMonth: input.endMonth,
      originalMonthlyTargetCents,
      initialBalanceCents: input.initialBalance,
    });
    const goal = toGoal(created);
    set((state) => ({
      goals: [...state.goals, goal],
      transactions: initialBalanceTx ? [...state.transactions, toTransaction(initialBalanceTx)] : state.transactions,
    }));
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

  setAllocationType: async (supabase, goalId, allocationType) => {
    set((state) => ({
      goals: state.goals.map((g) => (g.id === goalId ? { ...g, allocationType } : g)),
    }));
    await fq.setGoalAllocationType(supabase, goalId, allocationType);
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
      participants: state.participants.filter((p) => p.goalId !== goalId),
    }));
  },

  addTransaction: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const created = await fq.insertTransaction(supabase, userId, {
      goalId: input.goalId,
      type: input.type,
      valueCents: input.value,
      occurredOn: input.date.slice(0, 10),
      participantId: input.participantId,
      source: input.source,
      note: input.note,
      justification: input.justification,
    });
    set((state) => ({ transactions: [...state.transactions, toTransaction(created)] }));
  },

  updateTransaction: async (supabase, transactionId, input) => {
    const updated = await fq.updateTransactionRow(supabase, transactionId, {
      type: input.type,
      valueCents: input.value,
      occurredOn: input.date.slice(0, 10),
      participantId: input.participantId,
      source: input.source,
      note: input.note,
      justification: input.justification,
    });
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === transactionId ? toTransaction(updated) : t)),
    }));
  },

  deleteTransaction: async (supabase, transactionId) => {
    await fq.deleteTransactionRow(supabase, transactionId);
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== transactionId) }));
  },

  addParticipant: async (supabase, goalId, input) => {
    const userId = await getCurrentUserId(supabase);
    const existing = get().participants.filter((p) => p.goalId === goalId);
    const created = await fq.insertParticipant(supabase, userId, { goalId, ...input }, existing.length);
    set((state) => ({ participants: [...state.participants, toParticipant(created)] }));
  },

  updateParticipant: async (supabase, id, input) => {
    await fq.updateParticipant(supabase, id, input);
    set((state) => ({
      participants: state.participants.map((p) => (p.id === id ? { ...p, ...input } : p)),
    }));
  },

  deleteParticipant: async (supabase, id) => {
    await fq.deleteParticipant(supabase, id);
    set((state) => ({ participants: state.participants.filter((p) => p.id !== id) }));
  },
}));
