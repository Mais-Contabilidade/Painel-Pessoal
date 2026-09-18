import { isSupabaseConfigured } from "@/lib/supabase/config";
import { GoogleLoginButton } from "@/components/auth/google-login-button";

const ERROR_MESSAGES: Record<string, string> = {
  callback_failed: "Não foi possível concluir o login. Tente novamente.",
};

function friendlyError(raw: string | undefined): string | null {
  if (!raw) return null;
  if (ERROR_MESSAGES[raw]) return ERROR_MESSAGES[raw];
  if (/database error|not authorized|não autorizado/i.test(raw)) {
    return "Este e-mail não está autorizado a acessar este painel.";
  }
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const error = friendlyError(params.error);

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-xl bg-accent" aria-hidden />
          <h1 className="text-[19px] font-semibold text-text">Painel Pessoal</h1>
          <p className="mt-1 text-[13.5px] text-text-muted">Treino, financeiro e insights, sincronizados.</p>
        </div>

        {configured ? (
          <>
            <GoogleLoginButton next={params.next} />
            {error && <p className="mt-3 text-center text-[13px] text-danger">{error}</p>}
          </>
        ) : (
          <p className="rounded-lg bg-warning-soft px-3 py-2.5 text-center text-[13px] text-warning">
            Integração com Supabase ainda não configurada.
          </p>
        )}
      </div>
    </div>
  );
}
