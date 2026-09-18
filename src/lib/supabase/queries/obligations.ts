import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinancialObligationRow, FinancialInstallmentRow, InstallmentStatus } from "@/lib/supabase/types";
import { generateCompetenceMonths } from "@/lib/obligations";

export async function fetchObligations(supabase: SupabaseClient): Promise<FinancialObligationRow[]> {
  const { data, error } = await supabase
    .from("financial_obligations")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as FinancialObligationRow[];
}

export async function fetchInstallments(supabase: SupabaseClient): Promise<FinancialInstallmentRow[]> {
  const { data, error } = await supabase
    .from("financial_installments")
    .select("*")
    .order("competence_month", { ascending: true });
  if (error) throw new Error(error.message);
  return data as FinancialInstallmentRow[];
}

function dueDateFor(competenceMonth: string, dueDay: number | null): string | null {
  if (!dueDay) return null;
  const [year, month] = competenceMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return `${competenceMonth}-${String(day).padStart(2, "0")}`;
}

export async function insertObligation(
  supabase: SupabaseClient,
  userId: string,
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
): Promise<{ obligation: FinancialObligationRow; installments: FinancialInstallmentRow[] }> {
  const { data: obligation, error } = await supabase
    .from("financial_obligations")
    .insert({
      user_id: userId,
      name: input.name,
      creditor: input.creditor || null,
      total_value_cents: input.totalValueCents,
      installment_value_cents: input.installmentValueCents,
      start_month: input.startMonth,
      end_month: input.endMonth,
      due_day: input.dueDay,
      installments_count: input.installmentsCount,
      notes: input.notes || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const row = obligation as FinancialObligationRow;

  const months = generateCompetenceMonths({
    startMonth: row.start_month,
    endMonth: row.end_month,
    installmentsCount: row.installments_count,
  });
  const installmentRows = months.map((m) => ({
    user_id: userId,
    obligation_id: row.id,
    competence_month: m,
    due_date: dueDateFor(m, row.due_day),
    status: "pendente" as InstallmentStatus,
  }));

  let installments: FinancialInstallmentRow[] = [];
  if (installmentRows.length > 0) {
    const { data, error: insError } = await supabase
      .from("financial_installments")
      .insert(installmentRows)
      .select();
    if (insError) throw new Error(insError.message);
    installments = data as FinancialInstallmentRow[];
  }

  return { obligation: row, installments };
}

export async function updateObligationRow(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<
    Pick<
      FinancialObligationRow,
      "name" | "creditor" | "total_value_cents" | "installment_value_cents" | "due_day" | "notes" | "archived"
    >
  >
): Promise<FinancialObligationRow> {
  const { data, error } = await supabase
    .from("financial_obligations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialObligationRow;
}

export async function deleteObligationRow(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("financial_obligations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markInstallmentPaid(
  supabase: SupabaseClient,
  id: string,
  paidValueCents: number | null
): Promise<FinancialInstallmentRow> {
  const { data, error } = await supabase
    .from("financial_installments")
    .update({ status: "pago", paid_at: new Date().toISOString(), paid_value_cents: paidValueCents })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialInstallmentRow;
}

export async function markInstallmentUnpaid(supabase: SupabaseClient, id: string): Promise<FinancialInstallmentRow> {
  const { data, error } = await supabase
    .from("financial_installments")
    .update({ status: "pendente", paid_at: null, paid_value_cents: null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialInstallmentRow;
}
