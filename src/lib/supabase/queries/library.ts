import type { SupabaseClient } from "@supabase/supabase-js";
import type { LibraryItemRow, LibraryNoteRow, LibraryItemKind, LibraryNoteType } from "@/lib/supabase/types";

export async function fetchLibraryItems(supabase: SupabaseClient): Promise<LibraryItemRow[]> {
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as LibraryItemRow[];
}

export async function fetchLibraryNotes(supabase: SupabaseClient): Promise<LibraryNoteRow[]> {
  const { data, error } = await supabase
    .from("library_notes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as LibraryNoteRow[];
}

export type LibraryItemInput = {
  kind: LibraryItemKind;
  title: string;
  subtitle: string | null;
  status: string;
  rating: number | null;
  favorite: boolean;
  startedOn: string | null;
  finishedOn: string | null;
  progressPercent: number | null;
  metadata: LibraryItemRow["metadata"];
};

export async function insertLibraryItem(
  supabase: SupabaseClient,
  userId: string,
  input: LibraryItemInput
): Promise<LibraryItemRow> {
  const { data, error } = await supabase
    .from("library_items")
    .insert({
      user_id: userId,
      kind: input.kind,
      title: input.title,
      subtitle: input.subtitle,
      status: input.status,
      rating: input.rating,
      favorite: input.favorite,
      started_on: input.startedOn,
      finished_on: input.finishedOn,
      progress_percent: input.progressPercent,
      metadata: input.metadata,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as LibraryItemRow;
}

export async function updateLibraryItem(
  supabase: SupabaseClient,
  id: string,
  input: LibraryItemInput
): Promise<LibraryItemRow> {
  const { data, error } = await supabase
    .from("library_items")
    .update({
      title: input.title,
      subtitle: input.subtitle,
      status: input.status,
      rating: input.rating,
      favorite: input.favorite,
      started_on: input.startedOn,
      finished_on: input.finishedOn,
      progress_percent: input.progressPercent,
      metadata: input.metadata,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as LibraryItemRow;
}

export async function toggleLibraryItemFavorite(supabase: SupabaseClient, id: string, favorite: boolean) {
  const { error } = await supabase.from("library_items").update({ favorite }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteLibraryItem(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("library_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function insertLibraryNote(
  supabase: SupabaseClient,
  userId: string,
  input: { itemId: string; noteType: LibraryNoteType; title: string | null; content: string }
): Promise<LibraryNoteRow> {
  const { data, error } = await supabase
    .from("library_notes")
    .insert({
      user_id: userId,
      item_id: input.itemId,
      note_type: input.noteType,
      title: input.title,
      content: input.content,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as LibraryNoteRow;
}

export async function deleteLibraryNote(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("library_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
