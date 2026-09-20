import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserSettingsRow } from "@/lib/supabase/types";

export async function fetchUserSettings(supabase: SupabaseClient): Promise<UserSettingsRow> {
  const { data, error } = await supabase.from("user_settings").select("*").single();
  if (error) throw new Error(error.message);
  return data as UserSettingsRow;
}

export async function updateCycleAnchor(supabase: SupabaseClient, userId: string, date: string) {
  const { error } = await supabase
    .from("user_settings")
    .update({ cycle_anchor_date: date })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function updateCardioDefaultGoal(supabase: SupabaseClient, userId: string, minutes: number) {
  const { error } = await supabase
    .from("user_settings")
    .update({ cardio_default_goal_minutes: minutes })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function updateHideFinancialValues(supabase: SupabaseClient, userId: string, hide: boolean) {
  const { error } = await supabase
    .from("user_settings")
    .update({ hide_financial_values: hide })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
