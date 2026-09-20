import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import * as pq from "@/lib/supabase/queries/profile";
import type { ProfileRow } from "@/lib/supabase/types";

export type Profile = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarPath: string | null;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    avatarPath: row.avatar_path,
  };
}

type Status = "idle" | "loading" | "ready" | "error";

type ProfileState = {
  status: Status;
  errorMessage: string | null;
  profile: Profile | null;
  avatarSignedUrl: string | null;

  initialize: (supabase: SupabaseClient) => Promise<void>;
  uploadAvatar: (supabase: SupabaseClient, file: File) => Promise<void>;
  removeAvatar: (supabase: SupabaseClient) => Promise<void>;
};

export const useProfileStore = create<ProfileState>()((set, get) => ({
  status: "idle",
  errorMessage: null,
  profile: null,
  avatarSignedUrl: null,

  initialize: async (supabase) => {
    set({ status: "loading", errorMessage: null });
    try {
      const row = await pq.fetchProfile(supabase);
      const profile = toProfile(row);
      const avatarSignedUrl = profile.avatarPath
        ? await pq.createSignedAvatarUrl(supabase, profile.avatarPath)
        : null;
      set({ status: "ready", profile, avatarSignedUrl });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : "Erro ao carregar perfil." });
    }
  },

  uploadAvatar: async (supabase, file) => {
    const userId = await getCurrentUserId(supabase);
    const updated = await pq.uploadAvatar(supabase, userId, file);
    const profile = toProfile(updated);
    const avatarSignedUrl = profile.avatarPath
      ? await pq.createSignedAvatarUrl(supabase, profile.avatarPath)
      : null;
    set({ profile, avatarSignedUrl });
  },

  removeAvatar: async (supabase) => {
    const userId = await getCurrentUserId(supabase);
    const current = get().profile;
    const updated = await pq.removeAvatar(supabase, userId, current?.avatarPath ?? null);
    set({ profile: toProfile(updated), avatarSignedUrl: null });
  },
}));
