import { create } from "zustand";

/**
 * Revelar/ocultar valores financeiros — estado de sessão, não é dado do usuário.
 * Começa sempre oculto (comportamento padrão pedido); não persiste em lugar nenhum,
 * nem localStorage nem Supabase — é só um estado de visualização da tela atual.
 */
type PrivacyState = {
  financialValuesVisible: boolean;
  toggle: () => void;
};

export const usePrivacyStore = create<PrivacyState>()((set) => ({
  financialValuesVisible: false,
  toggle: () => set((s) => ({ financialValuesVisible: !s.financialValuesVisible })),
}));
