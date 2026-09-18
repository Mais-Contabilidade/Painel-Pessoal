"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { useReceivablesStore } from "@/store/receivables-store";
import { useMounted } from "@/lib/use-mounted";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ReceivableCard } from "@/components/financeiro/receivable-card";
import { ReceivableFormSheet } from "@/components/financeiro/receivable-form-sheet";

export default function EmprestadoPage() {
  const mounted = useMounted();
  const router = useRouter();
  const receivables = useReceivablesStore((s) => s.receivables);
  const payments = useReceivablesStore((s) => s.payments);
  const [creating, setCreating] = useState(false);

  if (!mounted) return null;

  const active = receivables.filter((r) => !r.archived);

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
        title="Emprestado / A receber"
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={16} />
            Empréstimo
          </Button>
        }
      />

      <div className="px-5 pb-6">
        {active.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[13.5px] text-text-muted">Nada emprestado por aqui ainda.</p>
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} />
              Novo empréstimo
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((r) => (
              <ReceivableCard
                key={r.id}
                receivable={r}
                payments={payments.filter((p) => p.receivableId === r.id)}
                onOpen={() => router.push(`/financeiro/emprestado/${r.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <ReceivableFormSheet
          onClose={() => setCreating(false)}
          onSaved={(id) => router.push(`/financeiro/emprestado/${id}`)}
        />
      )}
    </div>
  );
}
