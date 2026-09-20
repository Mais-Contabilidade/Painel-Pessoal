import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReceivableRow, ReceivablePaymentRow, ReceivableInstallmentRow, ReceivableReturnMode } from "@/lib/supabase/types";
import { generateInstallmentSchedule } from "@/lib/receivables";

export async function fetchReceivables(supabase: SupabaseClient): Promise<ReceivableRow[]> {
  const { data, error } = await supabase
    .from("receivables")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as ReceivableRow[];
}

export async function fetchReceivablePayments(supabase: SupabaseClient): Promise<ReceivablePaymentRow[]> {
  const { data, error } = await supabase
    .from("receivable_payments")
    .select("*")
    .order("paid_on", { ascending: true });
  if (error) throw new Error(error.message);
  return data as ReceivablePaymentRow[];
}

export async function insertReceivable(
  supabase: SupabaseClient,
  userId: string,
  input: {
    person: string;
    originalValueCents: number;
    lentOn: string;
    agreedReturnDate: string | null;
    notes?: string;
    returnMode?: ReceivableReturnMode;
    installmentsCount?: number | null;
    firstDueDate?: string | null;
  }
): Promise<ReceivableRow> {
  const { data, error } = await supabase
    .from("receivables")
    .insert({
      user_id: userId,
      person: input.person,
      original_value_cents: input.originalValueCents,
      lent_on: input.lentOn,
      agreed_return_date: input.agreedReturnDate,
      notes: input.notes || null,
      return_mode: input.returnMode ?? "avista",
      installments_count: input.installmentsCount ?? null,
      first_due_date: input.firstDueDate ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const receivable = data as ReceivableRow;

  if (input.returnMode === "parcelado" && input.installmentsCount && input.firstDueDate) {
    const schedule = generateInstallmentSchedule(input.originalValueCents, input.installmentsCount, input.firstDueDate);
    const rows = schedule.map((s) => ({
      user_id: userId,
      receivable_id: receivable.id,
      installment_number: s.installmentNumber,
      due_date: s.dueDate,
      value_cents: s.valueCents,
    }));
    const { error: instError } = await supabase.from("receivable_installments").insert(rows);
    if (instError) throw new Error(instError.message);
  }

  return receivable;
}

export async function fetchReceivableInstallments(supabase: SupabaseClient): Promise<ReceivableInstallmentRow[]> {
  const { data, error } = await supabase
    .from("receivable_installments")
    .select("*")
    .order("installment_number", { ascending: true });
  if (error) throw new Error(error.message);
  return data as ReceivableInstallmentRow[];
}

export async function updateReceivableInstallmentValue(
  supabase: SupabaseClient,
  id: string,
  valueCents: number
): Promise<ReceivableInstallmentRow> {
  const { data, error } = await supabase
    .from("receivable_installments")
    .update({ value_cents: valueCents })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ReceivableInstallmentRow;
}

export async function updateReceivableRow(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<ReceivableRow, "person" | "original_value_cents" | "agreed_return_date" | "notes" | "archived">>
): Promise<ReceivableRow> {
  const { data, error } = await supabase.from("receivables").update(updates).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as ReceivableRow;
}

export async function deleteReceivableRow(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("receivables").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function insertReceivablePayment(
  supabase: SupabaseClient,
  userId: string,
  input: { receivableId: string; amountCents: number; paidOn: string; note?: string }
): Promise<ReceivablePaymentRow> {
  const { data, error } = await supabase
    .from("receivable_payments")
    .insert({
      user_id: userId,
      receivable_id: input.receivableId,
      amount_cents: input.amountCents,
      paid_on: input.paidOn,
      note: input.note || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ReceivablePaymentRow;
}

export async function deleteReceivablePayment(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("receivable_payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
