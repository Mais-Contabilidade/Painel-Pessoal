import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 * `null` se as env vars não estiverem configuradas — quem chama decide o que mostrar.
 */
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // chamado de um Server Component sem permissão de escrever cookie —
          // o proxy já cuida do refresh de sessão nesse caso.
        }
      },
    },
  });
}
