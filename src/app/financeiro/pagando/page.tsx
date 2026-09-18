"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { useObligationsStore } from "@/store/obligations-store";
import { useMounted } from "@/lib/use-mounted";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ObligationCard } from "@/components/financeiro/obligation-card";
import { ObligationFormSheet } from "@/components/financeiro/obligation-form-sheet";

export default function PagandoPage() {
  const mounted = useMounted();
  const router = useRouter();
  const obligations = useObligationsStore((s) => s.obligations);
  const installments = useObligationsStore((s) => s.installments);
  const [creating, setCreating] = useState(false);

  if (!mounted) return null;

  const active = obligations.filter((o) => !o.archived);

  return (
    <div>
      <div className="flex items-center gap-2 px-5 pt-6">
        <button
          onClick={() => router.push("/financeiro")}
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft size={17} />
        </button>
        <span className="text-[13px] text-text-muted">Financeiro</span>
      </div>
      <PageHeader
        title="Pagando"
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={16} />
            Compromisso
          </Button>
        }
      />

      <div className="px-5 pb-6">
        {active.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[13.5px] text-text-muted">Nenhum compromisso cadastrado ainda.</p>
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} />
              Novo compromisso
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((o) => (
              <ObligationCard
                key={o.id}
                obligation={o}
                installments={installments.filter((i) => i.obligationId === o.id)}
                onOpen={() => router.push(`/financeiro/pagando/${o.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <ObligationFormSheet
          onClose={() => setCreating(false)}
          onSaved={(id) => router.push(`/financeiro/pagando/${id}`)}
        />
      )}
    </div>
  );
}
