import type { SupabaseClient } from "@supabase/supabase-js";
import type { InsightRow } from "@/lib/supabase/types";

export async function fetchInsights(supabase: SupabaseClient): Promise<InsightRow[]> {
  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as InsightRow[];
}

export async function insertInsight(
  supabase: SupabaseClient,
  userId: string,
  input: { title?: string; content: string; tags: string[] }
): Promise<InsightRow> {
  const { data, error } = await supabase
    .from("insights")
    .insert({
      user_id: userId,
      title: input.title?.trim() || null,
      content: input.content,
      tags: input.tags,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as InsightRow;
}

export async function updateInsightRow(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<InsightRow, "title" | "content" | "tags" | "favorite">>
): Promise<InsightRow> {
  const { data, error } = await supabase
    .from("insights")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as InsightRow;
}

export async function deleteInsightRow(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("insights").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
