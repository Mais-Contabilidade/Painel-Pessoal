import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinancialGoalRow, FinancialTransactionRow, FinancialTransactionType } from "@/lib/supabase/types";

export async function fetchGoals(supabase: SupabaseClient): Promise<FinancialGoalRow[]> {
  const { data, error } = await supabase
    .from("financial_goals")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as FinancialGoalRow[];
}

export async function fetchTransactions(supabase: SupabaseClient): Promise<FinancialTransactionRow[]> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .order("occurred_on", { ascending: true });
  if (error) throw new Error(error.message);
  return data as FinancialTransactionRow[];
}

export async function insertGoal(
  supabase: SupabaseClient,
  userId: string,
  input: { name: string; targetValueCents: number; startMonth: string; endMonth: string }
): Promise<FinancialGoalRow> {
  const { data, error } = await supabase
    .from("financial_goals")
    .insert({
      user_id: userId,
      name: input.name,
      target_value_cents: input.targetValueCents,
      start_month: input.startMonth,
      end_month: input.endMonth,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialGoalRow;
}

export async function updateGoalRow(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<FinancialGoalRow, "name" | "target_value_cents" | "start_month" | "end_month" | "archived">>
): Promise<FinancialGoalRow> {
  const { data, error } = await supabase.from("financial_goals").update(updates).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as FinancialGoalRow;
}

export async function deleteGoalRow(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("financial_goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function insertTransaction(
  supabase: SupabaseClient,
  userId: string,
  input: {
    goalId: string;
    type: FinancialTransactionType;
    valueCents: number;
    occurredOn: string;
    note?: string;
    justification?: string;
  }
): Promise<FinancialTransactionRow> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      user_id: userId,
      goal_id: input.goalId,
      type: input.type,
      value_cents: input.valueCents,
      occurred_on: input.occurredOn,
      note: input.note || null,
      justification: input.justification || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialTransactionRow;
}

export async function deleteTransactionRow(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
