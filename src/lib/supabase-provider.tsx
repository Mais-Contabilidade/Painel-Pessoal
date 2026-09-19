"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useWorkoutStore } from "@/store/workout-store";
import { useInsightsStore } from "@/store/insights-store";
import { useFinanceStore } from "@/store/finance-store";
import { useCardioStore } from "@/store/cardio-store";
import { useObligationsStore } from "@/store/obligations-store";
import { useReceivablesStore } from "@/store/receivables-store";
import { useProfileStore } from "@/store/profile-store";
import { useJournalStore } from "@/store/journal-store";
import { usePrivacyStore } from "@/store/privacy-store";

const SupabaseContext = createContext<SupabaseClient | null>(null);

/**
 * Cria o cliente Supabase uma vez e dispara o carregamento inicial de todas as stores
 * assim que há sessão. As stores vivem só em memória (Zustand sem persist) — Supabase é
 * sempre a fonte de verdade; cada reload desta árvore refaz o fetch.
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState<SupabaseClient | null>(() => createClient());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!supabase || initializedRef.current) return;
    initializedRef.current = true;
    useWorkoutStore.getState().initialize(supabase);
    useInsightsStore.getState().initialize(supabase);
    useFinanceStore.getState().initialize(supabase);
    useCardioStore.getState().initialize(supabase);
    useObligationsStore.getState().initialize(supabase);
    useReceivablesStore.getState().initialize(supabase);
    useProfileStore.getState().initialize(supabase);
    useJournalStore.getState().initialize(supabase);
    usePrivacyStore.getState().initialize(supabase);
  }, [supabase]);

  return <SupabaseContext.Provider value={supabase}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
