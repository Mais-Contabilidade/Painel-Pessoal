import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as rq from "@/lib/supabase/queries/receivables";
import type { Receivable, ReceivablePayment } from "@/lib/receivables";
import type { ReceivableRow, ReceivablePaymentRow } from "@/lib/supabase/types";

function toReceivable(row: ReceivableRow): Receivable {
  return {
    id: row.id,
    person: row.person,
    originalValueCents: row.original_value_cents,
    lentOn: row.lent_on,
    agreedReturnDate: row.agreed_return_date,
    notes: row.notes,
    archived: row.archived,
  };
}

function toPayment(row: ReceivablePaymentRow): ReceivablePayment {
  return {
    id: row.id,
    receivableId: row.receivable_id,
    amountCents: row.amount_cents,
    paidOn: row.paid_on,
    note: row.note,
  };
}

type Status = "idle" | "loading" | "ready" | "error";

type ReceivablesState = {
  status: Status;
  errorMessage: string | null;
  receivables: Receivable[];
  payments: ReceivablePayment[];

  initialize: (supabase: SupabaseClient) => Promise<void>;
  addReceivable: (
    supabase: SupabaseClient,
    input: { person: string; originalValueCents: number; lentOn: string; agreedReturnDate: string | null; notes?: string }
  ) => Promise<Receivable>;
  updateReceivable: (
    supabase: SupabaseClient,
    id: string,
    updates: Partial<Pick<Receivable, "person" | "originalValueCents" | "agreedReturnDate" | "notes">>
  ) => Promise<void>;
  deleteReceivable: (supabase: SupabaseClient, id: string) => Promise<void>;
  addPayment: (
    supabase: SupabaseClient,
    input: { receivableId: string; amountCents: number; paidOn: string; note?: string }
  ) => Promise<void>;
  deletePayment: (supabase: SupabaseClient, id: string) => Promise<void>;
};

export const useReceivablesStore = create<ReceivablesState>()((set) => ({
  status: "idle",
  errorMessage: null,
  receivables: [],
  payments: [],

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const [receivables, payments] = await Promise.all([
        rq.fetchReceivables(supabase),
        rq.fetchReceivablePayments(supabase),
      ]);
      set({ status: "ready", receivables: receivables.map(toReceivable), payments: payments.map(toPayment) });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar empréstimos." });
    }
  },

  addReceivable: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const created = await rq.insertReceivable(supabase, userId, input);
    const mapped = toReceivable(created);
    set((state) => ({ receivables: [...state.receivables, mapped] }));
    return mapped;
  },

  updateReceivable: async (supabase, id, updates) => {
    const updated = await rq.updateReceivableRow(supabase, id, {
      ...(updates.person !== undefined ? { person: updates.person } : {}),
      ...(updates.originalValueCents !== undefined ? { original_value_cents: updates.originalValueCents } : {}),
      ...(updates.agreedReturnDate !== undefined ? { agreed_return_date: updates.agreedReturnDate } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    });
    set((state) => ({ receivables: state.receivables.map((r) => (r.id === id ? toReceivable(updated) : r)) }));
  },

  deleteReceivable: async (supabase, id) => {
    await rq.deleteReceivableRow(supabase, id);
    set((state) => ({
      receivables: state.receivables.filter((r) => r.id !== id),
      payments: state.payments.filter((p) => p.receivableId !== id),
    }));
  },

  addPayment: async (supabase, input) => {
    const userId = await getCurrentUserId(supabase);
    const created = await rq.insertReceivablePayment(supabase, userId, input);
    set((state) => ({ payments: [...state.payments, toPayment(created)] }));
  },

  deletePayment: async (supabase, id) => {
    await rq.deleteReceivablePayment(supabase, id);
    set((state) => ({ payments: state.payments.filter((p) => p.id !== id) }));
  },
}));
