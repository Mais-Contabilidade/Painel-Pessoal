import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WorkoutDayTemplateRow,
  WorkoutTemplateExerciseRow,
  WorkoutWeekOverrideRow,
  WorkoutSessionRow,
  WorkoutSessionSetRow,
  WeekVariantDb,
} from "@/lib/supabase/types";

export type TemplateWithExercises = WorkoutDayTemplateRow & {
  exercises: WorkoutTemplateExerciseRow[];
};

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function fetchTemplates(supabase: SupabaseClient): Promise<TemplateWithExercises[]> {
  const res = await supabase
    .from("workout_day_templates")
    .select("*, workout_template_exercises(*)")
    .order("variant", { ascending: true })
    .order("weekday", { ascending: true });
  const rows = unwrap<(WorkoutDayTemplateRow & { workout_template_exercises: WorkoutTemplateExerciseRow[] })[]>(res);
  return rows.map((r) => ({
    ...r,
    exercises: [...r.workout_template_exercises].sort((a, b) => a.order_index - b.order_index),
  }));
}

export async function seedDefaultPlanIfEmpty(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("workout_day_templates")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  if (count && count > 0) return false;
  const { error: rpcError } = await supabase.rpc("seed_default_workout_plan", { p_user_id: userId });
  if (rpcError) throw new Error(rpcError.message);
  return true;
}

export async function renameDayTemplate(supabase: SupabaseClient, templateId: string, name: string) {
  const res = await supabase.from("workout_day_templates").update({ name }).eq("id", templateId);
  if (res.error) throw new Error(res.error.message);
}

export async function addExercise(
  supabase: SupabaseClient,
  userId: string,
  templateId: string,
  input: { name: string; targetSets: number; repMin: number | null; repMax: number | null },
  nextOrderIndex: number
): Promise<WorkoutTemplateExerciseRow> {
  const res = await supabase
    .from("workout_template_exercises")
    .insert({
      user_id: userId,
      template_id: templateId,
      name: input.name,
      target_sets: input.targetSets,
      rep_range_min: input.repMin,
      rep_range_max: input.repMax,
      order_index: nextOrderIndex,
    })
    .select()
    .single();
  return unwrap<WorkoutTemplateExerciseRow>(res);
}

export async function updateExercise(
  supabase: SupabaseClient,
  exerciseId: string,
  updates: Partial<Pick<WorkoutTemplateExerciseRow, "name" | "target_sets" | "rep_range_min" | "rep_range_max">>
) {
  const res = await supabase.from("workout_template_exercises").update(updates).eq("id", exerciseId);
  if (res.error) throw new Error(res.error.message);
}

export async function deleteExercise(supabase: SupabaseClient, exerciseId: string) {
  const res = await supabase.from("workout_template_exercises").delete().eq("id", exerciseId);
  if (res.error) throw new Error(res.error.message);
}

export async function swapExerciseOrder(
  supabase: SupabaseClient,
  a: { id: string; order_index: number },
  b: { id: string; order_index: number }
) {
  const [r1, r2] = await Promise.all([
    supabase.from("workout_template_exercises").update({ order_index: b.order_index }).eq("id", a.id),
    supabase.from("workout_template_exercises").update({ order_index: a.order_index }).eq("id", b.id),
  ]);
  if (r1.error) throw new Error(r1.error.message);
  if (r2.error) throw new Error(r2.error.message);
}

export async function fetchWeekOverrides(supabase: SupabaseClient): Promise<WorkoutWeekOverrideRow[]> {
  const res = await supabase.from("workout_week_overrides").select("*");
  return unwrap<WorkoutWeekOverrideRow[]>(res);
}

export async function setWeekOverride(
  supabase: SupabaseClient,
  userId: string,
  weekStartDate: string,
  variant: WeekVariantDb
) {
  const res = await supabase
    .from("workout_week_overrides")
    .upsert(
      { user_id: userId, week_start_date: weekStartDate, variant },
      { onConflict: "user_id,week_start_date" }
    );
  if (res.error) throw new Error(res.error.message);
}

export type OpenSession = WorkoutSessionRow & { sets: WorkoutSessionSetRow[] };

export async function fetchOpenSession(supabase: SupabaseClient): Promise<OpenSession | null> {
  const res = await supabase
    .from("workout_sessions")
    .select("*, workout_session_sets(*)")
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error) throw new Error(res.error.message);
  if (!res.data) return null;
  const row = res.data as WorkoutSessionRow & { workout_session_sets: WorkoutSessionSetRow[] };
  return { ...row, sets: row.workout_session_sets.sort((a, b) => a.set_index - b.set_index) };
}

export async function startSession(
  supabase: SupabaseClient,
  userId: string,
  template: TemplateWithExercises
): Promise<OpenSession> {
  const sessionRes = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      template_id: template.id,
      day_name: template.name,
      variant: template.variant,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  const session = unwrap<WorkoutSessionRow>(sessionRes);

  const setRows = template.exercises.flatMap((ex) =>
    Array.from({ length: ex.target_sets }, (_, i) => ({
      user_id: userId,
      session_id: session.id,
      exercise_name: ex.name,
      set_index: i,
      completed: false,
    }))
  );
  const setsRes = await supabase.from("workout_session_sets").insert(setRows).select();
  const sets = unwrap<WorkoutSessionSetRow[]>(setsRes);

  return { ...session, sets: sets.sort((a, b) => a.set_index - b.set_index) };
}

export async function toggleSessionSet(supabase: SupabaseClient, setId: string, completed: boolean) {
  const res = await supabase.from("workout_session_sets").update({ completed }).eq("id", setId);
  if (res.error) throw new Error(res.error.message);
}

export async function updateSessionSetDetails(
  supabase: SupabaseClient,
  setId: string,
  updates: { weight_kg: number | null; reps: number | null }
) {
  const res = await supabase.from("workout_session_sets").update(updates).eq("id", setId);
  if (res.error) throw new Error(res.error.message);
}

export async function finishSession(supabase: SupabaseClient, sessionId: string, durationMs: number) {
  const res = await supabase
    .from("workout_sessions")
    .update({ finished_at: new Date().toISOString(), duration_ms: durationMs })
    .eq("id", sessionId);
  if (res.error) throw new Error(res.error.message);
}

export async function discardSession(supabase: SupabaseClient, sessionId: string) {
  const res = await supabase.from("workout_sessions").delete().eq("id", sessionId);
  if (res.error) throw new Error(res.error.message);
}

export type HistorySessionWithSets = WorkoutSessionRow & { sets: WorkoutSessionSetRow[] };

export async function fetchHistory(supabase: SupabaseClient, limit = 100): Promise<HistorySessionWithSets[]> {
  const res = await supabase
    .from("workout_sessions")
    .select("*, workout_session_sets(*)")
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);
  const rows = unwrap<(WorkoutSessionRow & { workout_session_sets: WorkoutSessionSetRow[] })[]>(res);
  return rows.map((r) => ({ ...r, sets: r.workout_session_sets }));
}
