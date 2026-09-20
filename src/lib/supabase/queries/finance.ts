import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FinancialGoalRow,
  FinancialGoalParticipantRow,
  FinancialTransactionRow,
  FinancialTransactionType,
  FinancialGoalAllocationType,
} from "@/lib/supabase/types";

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

export async function fetchGoalParticipants(supabase: SupabaseClient): Promise<FinancialGoalParticipantRow[]> {
  const { data, error } = await supabase
    .from("financial_goal_participants")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return data as FinancialGoalParticipantRow[];
}

export async function insertGoal(
  supabase: SupabaseClient,
  userId: string,
  input: {
    name: string;
    targetValueCents: number;
    startMonth: string;
    endMonth: string;
    originalMonthlyTargetCents: number;
    initialBalanceCents: number;
  }
): Promise<{ goal: FinancialGoalRow; initialBalanceTx: FinancialTransactionRow | null }> {
  const { data, error } = await supabase
    .from("financial_goals")
    .insert({
      user_id: userId,
      name: input.name,
      target_value_cents: input.targetValueCents,
      start_month: input.startMonth,
      end_month: input.endMonth,
      original_monthly_target_cents: input.originalMonthlyTargetCents,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const goal = data as FinancialGoalRow;

  let initialBalanceTx: FinancialTransactionRow | null = null;
  if (input.initialBalanceCents > 0) {
    const { data: txData, error: txError } = await supabase
      .from("financial_transactions")
      .insert({
        user_id: userId,
        goal_id: goal.id,
        type: "saldo_inicial",
        value_cents: input.initialBalanceCents,
        occurred_on: `${input.startMonth}-01`,
        note: "Saldo já guardado antes do planejamento",
      })
      .select()
      .single();
    if (txError) throw new Error(txError.message);
    initialBalanceTx = txData as FinancialTransactionRow;
  }

  return { goal, initialBalanceTx };
}

export async function updateGoalRow(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<
    Pick<
      FinancialGoalRow,
      "name" | "target_value_cents" | "start_month" | "end_month" | "archived" | "allocation_type"
    >
  >
): Promise<FinancialGoalRow> {
  const { data, error } = await supabase.from("financial_goals").update(updates).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as FinancialGoalRow;
}

export async function deleteGoalRow(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("financial_goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type TransactionInput = {
  goalId: string;
  type: FinancialTransactionType;
  valueCents: number;
  occurredOn: string;
  participantId?: string | null;
  source?: string | null;
  note?: string;
  justification?: string;
};

export async function insertTransaction(
  supabase: SupabaseClient,
  userId: string,
  input: TransactionInput
): Promise<FinancialTransactionRow> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      user_id: userId,
      goal_id: input.goalId,
      type: input.type,
      value_cents: input.valueCents,
      occurred_on: input.occurredOn,
      participant_id: input.participantId ?? null,
      source: input.source || null,
      note: input.note || null,
      justification: input.justification || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialTransactionRow;
}

export async function updateTransactionRow(
  supabase: SupabaseClient,
  id: string,
  input: Omit<TransactionInput, "goalId">
): Promise<FinancialTransactionRow> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .update({
      type: input.type,
      value_cents: input.valueCents,
      occurred_on: input.occurredOn,
      participant_id: input.participantId ?? null,
      source: input.source || null,
      note: input.note || null,
      justification: input.justification || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialTransactionRow;
}

export async function deleteTransactionRow(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function insertParticipant(
  supabase: SupabaseClient,
  userId: string,
  input: { goalId: string; name: string; sharePercent: number | null; monthlyTargetCents: number | null },
  orderIndex: number
): Promise<FinancialGoalParticipantRow> {
  const { data, error } = await supabase
    .from("financial_goal_participants")
    .insert({
      user_id: userId,
      goal_id: input.goalId,
      name: input.name,
      share_percent: input.sharePercent,
      monthly_target_cents: input.monthlyTargetCents,
      order_index: orderIndex,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialGoalParticipantRow;
}

export async function updateParticipant(
  supabase: SupabaseClient,
  id: string,
  input: { name: string; sharePercent: number | null; monthlyTargetCents: number | null }
) {
  const { error } = await supabase
    .from("financial_goal_participants")
    .update({ name: input.name, share_percent: input.sharePercent, monthly_target_cents: input.monthlyTargetCents })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteParticipant(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("financial_goal_participants").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setGoalAllocationType(
  supabase: SupabaseClient,
  goalId: string,
  allocationType: FinancialGoalAllocationType
) {
  const { error } = await supabase.from("financial_goals").update({ allocation_type: allocationType }).eq("id", goalId);
  if (error) throw new Error(error.message);
}
