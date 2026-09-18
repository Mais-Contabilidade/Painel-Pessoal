/**
 * Lê as credenciais públicas do Supabase sem nunca lançar no carregamento do módulo —
 * assim o build e o app continuam de pé mesmo antes das variáveis serem configuradas
 * na Vercel. `isSupabaseConfigured()` é o que decide se as telas mostram os dados reais
 * ou um estado de "integração não configurada".
 *
 * Usa a Publishable Key (formato `sb_publishable_...`), o padrão atual do Supabase para
 * chaves de cliente/browser — substitui a legada "anon key" (JWT). Ela é segura para o
 * bundle do navegador porque RLS decide o que cada usuário pode ler/escrever; nunca use
 * a Secret Key (`sb_secret_...`, sucessora da service_role) aqui.
 */
export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}
