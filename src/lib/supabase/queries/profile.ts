import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRow } from "@/lib/supabase/types";

export async function fetchProfile(supabase: SupabaseClient): Promise<ProfileRow> {
  const { data, error } = await supabase.from("profiles").select("*").single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

export async function createSignedAvatarUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<ProfileRow> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

export async function removeAvatar(supabase: SupabaseClient, userId: string, currentPath: string | null): Promise<ProfileRow> {
  if (currentPath) {
    await supabase.storage.from("avatars").remove([currentPath]);
  }
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_path: null, avatar_url: null })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}
