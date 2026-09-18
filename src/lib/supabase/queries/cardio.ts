import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardioEntryRow, CardioWeekGoalRow } from "@/lib/supabase/types";

export async function fetchCardioWeekGoals(supabase: SupabaseClient): Promise<CardioWeekGoalRow[]> {
  const { data, error } = await supabase
    .from("cardio_week_goals")
    .select("*")
    .order("week_start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data as CardioWeekGoalRow[];
}

export async function setCardioWeekGoal(
  supabase: SupabaseClient,
  userId: string,
  weekStartDate: string,
  goalMinutes: number
) {
  const { error } = await supabase
    .from("cardio_week_goals")
    .upsert(
      { user_id: userId, week_start_date: weekStartDate, goal_minutes: goalMinutes },
      { onConflict: "user_id,week_start_date" }
    );
  if (error) throw new Error(error.message);
}

export async function fetchCardioEntries(supabase: SupabaseClient, sinceISODate?: string): Promise<CardioEntryRow[]> {
  let query = supabase.from("cardio_entries").select("*").order("entry_date", { ascending: false });
  if (sinceISODate) query = query.gte("entry_date", sinceISODate);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as CardioEntryRow[];
}

export async function addCardioEntry(
  supabase: SupabaseClient,
  userId: string,
  input: { entryDate: string; minutes: number; note?: string }
): Promise<CardioEntryRow> {
  const { data, error } = await supabase
    .from("cardio_entries")
    .insert({
      user_id: userId,
      entry_date: input.entryDate,
      minutes: input.minutes,
      note: input.note || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CardioEntryRow;
}

export async function deleteCardioEntry(supabase: SupabaseClient, entryId: string) {
  const { error } = await supabase.from("cardio_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
}
