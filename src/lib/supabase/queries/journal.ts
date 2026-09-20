import type { SupabaseClient } from "@supabase/supabase-js";
import type { JournalEntryRow } from "@/lib/supabase/types";

export async function fetchJournalEntries(supabase: SupabaseClient): Promise<JournalEntryRow[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("entry_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data as JournalEntryRow[];
}

export async function upsertJournalEntry(
  supabase: SupabaseClient,
  userId: string,
  input: { entryDate: string; daySummary: string; gratitude: string; reflection: string; notes: string | null }
): Promise<JournalEntryRow> {
  const { data, error } = await supabase
    .from("journal_entries")
    .upsert(
      {
        user_id: userId,
        entry_date: input.entryDate,
        day_summary: input.daySummary,
        gratitude: input.gratitude,
        reflection: input.reflection,
        notes: input.notes,
      },
      { onConflict: "user_id,entry_date" }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as JournalEntryRow;
}
