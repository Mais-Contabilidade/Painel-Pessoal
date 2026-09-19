import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { fetchUserSettings, updateHideFinancialValues } from "@/lib/supabase/queries/settings";

/**
 * Revelar/ocultar valores financeiros — preferência do usuário, persistida em
 * user_settings.hide_financial_values (Supabase é a fonte de verdade, nunca
 * localStorage). Novo usuário já nasce com hide_financial_values=true no
 * schema, então o padrão aqui também é oculto até o initialize resolver.
 */
type PrivacyState = {
  financialValuesVisible: boolean;
  ready: boolean;

  initialize: (supabase: SupabaseClient) => Promise<void>;
  toggle: (supabase: SupabaseClient) => Promise<void>;
};

export const usePrivacyStore = create<PrivacyState>()((set, get) => ({
  financialValuesVisible: false,
  ready: false,

  initialize: async (supabase) => {
    try {
      const settings = await fetchUserSettings(supabase);
      set({ financialValuesVisible: !settings.hide_financial_values, ready: true });
    } catch {
      set({ financialValuesVisible: false, ready: true });
    }
  },

  toggle: async (supabase) => {
    const next = !get().financialValuesVisible;
    set({ financialValuesVisible: next });
    try {
      const userId = await getCurrentUserId(supabase);
      await updateHideFinancialValues(supabase, userId, !next);
    } catch {
      set({ financialValuesVisible: !next });
    }
  },
}));
