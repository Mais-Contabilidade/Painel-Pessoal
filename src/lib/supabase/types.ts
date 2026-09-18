/**
 * Tipos manuais espelhando o schema real de `supabase/migrations/`. Escritos à mão porque
 * `database.types.ts` ainda é um placeholder (sem projeto linkado para gerar de verdade) —
 * ver o comentário nesse arquivo para o comando que os substitui quando isso for possível.
 */

export type WeekVariantDb = "A" | "B";

export type WorkoutDayTemplateRow = {
  id: string;
  user_id: string;
  variant: WeekVariantDb;
  weekday: number;
  name: string;
  muscle_groups: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutTemplateExerciseRow = {
  id: string;
  user_id: string;
  template_id: string;
  name: string;
  target_sets: number;
  rep_range_min: number | null;
  rep_range_max: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type WorkoutWeekOverrideRow = {
  id: string;
  user_id: string;
  week_start_date: string;
  variant: WeekVariantDb;
  note: string | null;
  created_at: string;
};

export type WorkoutSessionRow = {
  id: string;
  user_id: string;
  template_id: string | null;
  day_name: string;
  variant: WeekVariantDb | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  created_at: string;
};

export type WorkoutSessionSetRow = {
  id: string;
  user_id: string;
  session_id: string;
  exercise_name: string;
  set_index: number;
  completed: boolean;
  weight_kg: number | null;
  reps: number | null;
  created_at: string;
};

export type CardioWeekGoalRow = {
  id: string;
  user_id: string;
  week_start_date: string;
  goal_minutes: number;
  created_at: string;
};

export type CardioEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  minutes: number;
  note: string | null;
  created_at: string;
};

export type UserSettingsRow = {
  user_id: string;
  theme: "light" | "dark" | "system";
  cardio_default_goal_minutes: number;
  cycle_anchor_date: string;
  hide_financial_values: boolean;
  hide_financial_on_startup: boolean;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  migrated_from_local_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialGoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_value_cents: number;
  start_month: string;
  end_month: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type FinancialTransactionType = "aporte" | "rendimento" | "retirada";

export type FinancialTransactionRow = {
  id: string;
  user_id: string;
  goal_id: string;
  type: FinancialTransactionType;
  value_cents: number;
  occurred_on: string;
  note: string | null;
  justification: string | null;
  created_at: string;
};

export type FinancialObligationRow = {
  id: string;
  user_id: string;
  name: string;
  creditor: string | null;
  total_value_cents: number | null;
  installment_value_cents: number | null;
  start_month: string;
  end_month: string | null;
  due_day: number | null;
  installments_count: number | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type InstallmentStatus = "pendente" | "pago" | "atrasado";

export type FinancialInstallmentRow = {
  id: string;
  user_id: string;
  obligation_id: string;
  competence_month: string;
  due_date: string | null;
  status: InstallmentStatus;
  paid_at: string | null;
  paid_value_cents: number | null;
  created_at: string;
};

export type ReceivableReturnMode = "avista" | "parcelado";

export type ReceivableRow = {
  id: string;
  user_id: string;
  person: string;
  original_value_cents: number;
  lent_on: string;
  agreed_return_date: string | null;
  notes: string | null;
  archived: boolean;
  return_mode: ReceivableReturnMode;
  installments_count: number | null;
  first_due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type ReceivableInstallmentRow = {
  id: string;
  user_id: string;
  receivable_id: string;
  installment_number: number;
  due_date: string;
  value_cents: number;
  created_at: string;
};

export type ReceivablePaymentRow = {
  id: string;
  user_id: string;
  receivable_id: string;
  amount_cents: number;
  paid_on: string;
  note: string | null;
  created_at: string;
};

export type InsightRow = {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  tags: string[];
  favorite: boolean;
  created_at: string;
  updated_at: string;
};
