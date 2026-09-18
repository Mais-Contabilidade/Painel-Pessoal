/**
 * Lê as credenciais públicas do Supabase sem nunca lançar no carregamento do módulo —
 * assim o build e o app continuam de pé mesmo antes das variáveis serem configuradas
 * na Vercel. `isSupabaseConfigured()` é o que decide se as telas mostram os dados reais
 * ou um estado de "integração não configurada".
 */
export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}
