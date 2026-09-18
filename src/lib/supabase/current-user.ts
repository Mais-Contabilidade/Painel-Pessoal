import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentUserId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Sessão não encontrada. Faça login novamente.");
  return data.session.user.id;
}
