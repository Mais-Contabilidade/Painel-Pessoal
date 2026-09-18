import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as oq from "@/lib/supabase/queries/obligations";
import type { Obligation, Installment } from "@/lib/obligations";
import type { FinancialObligationRow, FinancialInstallmentRow } from "@/lib/supabase/types";

function toObligation(row: FinancialObligationRow): Obligation {
  return {
    id: row.id,
    name: row.name,
    creditor: row.creditor,
    totalValueCents: row.total_value_cents,
    installmentValueCents: row.installment_value_cents,
    startMonth: row.start_month,
    endMonth: row.end_month,
    dueDay: row.due_day,
    installmentsCount: row.installments_count,
    notes: row.notes,
    archived: row.archived,
  };
}

function toInstallment(row: FinancialInstallmentRow): Installment {
  return {
    id: row.id,
    obligationId: row.obligation_id,
    competenceMonth: row.competence_month,
    dueDate: row.due_date,
    status: row.status,
    paidAt: row.paid_at,
    paidValueCents: row.paid_value_cents,
  };
}

type Status = "idle" | "loading" | "ready" | "error";

type ObligationsState = {
  status: Status;
  errorMessage: string | null;
  obligations: Obligation[];
  installments: Installment[];

  initialize: (supabase: SupabaseClient) => Promise<void>;
  addObligation: (
    supabase: SupabaseClient,
    input: {
      name: string;
      creditor?: string;
      totalValueCents: number | null;
      installmentValueCents: number | null;
      startMonth: string;
      endMonth: string | null;
      dueDay: number | null;
      installmentsCount: number | null;
      notes?: string;
    }
  ) => Promise<Obligation>;
  updateObligation: (
    supabase: SupabaseClient,
    id: string,
    updates: Partial<Pick<Obligation, "name" | "creditor" | "totalValueCents" | "installmentValueCents" | "dueDay" | "notes">>
  ) => Promise<void>;
  deleteObligation: (supabase: SupabaseClient, id: string) => Promise<void>;
  markInstallmentPaid: (supabase: SupabaseClient, installmentId: string, paidValueCents: number | null) => Promise<void>;
  markInstallmentUnpaid: (supabase: SupabaseClient, installmentId: string) => Promise<void>;
};

export const useObligationsStore = create<ObligationsState>()((set) => ({
  status: "idle",
  errorMessage: null,
  obligations: [],
  installments: [],

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const [obligations, installments] = await Promise.all([
        oq.fetchObligations(supabase),
        oq.fetchInstallments(supabase),
      ]);
      set({
        status: "ready",
        obligations: obligations.map(toObligation),
        installments: installments.map(toInstallment),
      });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar dívidas." });
    }
  },

  addObligation: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const { obligation, installments } = await oq.insertObligation(supabase, userId, input);
    const mapped = toObligation(obligation);
    set((state) => ({
      obligations: [...state.obligations, mapped],
      installments: [...state.installments, ...installments.map(toInstallment)],
    }));
    return mapped;
  },

  updateObligation: async (supabase, id, updates) => {
    const updated = await oq.updateObligationRow(supabase, id, {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.creditor !== undefined ? { creditor: updates.creditor } : {}),
      ...(updates.totalValueCents !== undefined ? { total_value_cents: updates.totalValueCents } : {}),
      ...(updates.installmentValueCents !== undefined
        ? { installment_value_cents: updates.installmentValueCents }
        : {}),
      ...(updates.dueDay !== undefined ? { due_day: updates.dueDay } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    });
    set((state) => ({
      obligations: state.obligations.map((o) => (o.id === id ? toObligation(updated) : o)),
    }));
  },

  deleteObligation: async (supabase, id) => {
    await oq.deleteObligationRow(supabase, id);
    set((state) => ({
      obligations: state.obligations.filter((o) => o.id !== id),
      installments: state.installments.filter((i) => i.obligationId !== id),
    }));
  },

  markInstallmentPaid: async (supabase, installmentId, paidValueCents) => {
    const updated = await oq.markInstallmentPaid(supabase, installmentId, paidValueCents);
    set((state) => ({
      installments: state.installments.map((i) => (i.id === installmentId ? toInstallment(updated) : i)),
    }));
  },

  markInstallmentUnpaid: async (supabase, installmentId) => {
    const updated = await oq.markInstallmentUnpaid(supabase, installmentId);
    set((state) => ({
      installments: state.installments.map((i) => (i.id === installmentId ? toInstallment(updated) : i)),
    }));
  },
}));
