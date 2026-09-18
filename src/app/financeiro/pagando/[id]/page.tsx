"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Trash2, Undo2 } from "lucide-react";
import { useObligationsStore } from "@/store/obligations-store";
import { useMounted } from "@/lib/use-mounted";
import { useSupabase } from "@/lib/supabase-provider";
import { formatBRL } from "@/lib/money";
import { monthLabel } from "@/lib/month";
import { computeObligationProgress, displayInstallmentStatus } from "@/lib/obligations";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { PrivateValue } from "@/components/ui/private-value";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
};

const STATUS_STYLE: Record<string, string> = {
  pendente: "text-text-faint",
  pago: "text-success",
  atrasado: "text-danger",
};

export default function ObligationDetailPage() {
  const mounted = useMounted();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = useSupabase();
  const obligations = useObligationsStore((s) => s.obligations);
  const installments = useObligationsStore((s) => s.installments);
  const markPaid = useObligationsStore((s) => s.markInstallmentPaid);
  const markUnpaid = useObligationsStore((s) => s.markInstallmentUnpaid);
  const deleteObligation = useObligationsStore((s) => s.deleteObligation);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const obligation = obligations.find((o) => o.id === params.id) ?? null;
  const ownInstallments = useMemo(
    () =>
      installments
        .filter((i) => i.obligationId === params.id)
        .sort((a, b) => (a.competenceMonth < b.competenceMonth ? -1 : 1)),
    [installments, params.id]
  );
  const progress = useMemo(() => computeObligationProgress(ownInstallments), [ownInstallments]);

  if (!mounted) return null;

  if (!obligation) {
    return (
      <div className="px-5 pt-6">
        <button onClick={() => router.push("/financeiro/pagando")} className="flex items-center gap-1 text-[13.5px] text-text-muted">
          <ArrowLeft size={15} /> Voltar
        </button>
        <p className="mt-6 text-[13.5px] text-text-muted">Compromisso não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/financeiro/pagando")}
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft size={17} />
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          aria-label="Excluir compromisso"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <h1 className="mt-2 text-[20px] font-semibold text-text">{obligation.name}</h1>
      {obligation.creditor && <p className="text-[13px] text-text-muted">{obligation.creditor}</p>}

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-medium text-text">
            {obligation.installmentValueCents ? (
              <PrivateValue>{`${formatBRL(obligation.installmentValueCents)}/mês`}</PrivateValue>
            ) : (
              <span className="text-text-faint">valor a definir</span>
            )}
          </p>
          <p className="text-[13px] text-text-muted">
            {progress.paidCount}/{progress.totalCount} parcelas
          </p>
        </div>
        <Progress value={progress.percentPaid} className="mt-2.5" />
        {obligation.notes && <p className="mt-3 text-[13px] text-text-muted">{obligation.notes}</p>}
      </div>

      <div className="mt-6">
        <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">Parcelas</p>
        <div className="divide-y divide-border-subtle rounded-2xl border border-border bg-surface">
          {ownInstallments.map((installment) => {
            const status = displayInstallmentStatus(installment);
            const isPaid = status === "pago";
            return (
              <div key={installment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[13.5px] font-medium text-text capitalize">
                    {monthLabel(installment.competenceMonth)}
                  </p>
                  <p className={`mt-0.5 text-[11.5px] font-medium ${STATUS_STYLE[status]}`}>
                    {STATUS_LABEL[status]}
                    {installment.dueDate && ` · vence dia ${installment.dueDate.slice(8, 10)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    supabase &&
                    (isPaid
                      ? markUnpaid(supabase, installment.id)
                      : markPaid(supabase, installment.id, obligation.installmentValueCents))
                  }
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isPaid ? "bg-success-soft text-success" : "bg-surface-2 text-text-faint hover:text-text"
                  }`}
                  aria-label={isPaid ? "Desmarcar como paga" : "Marcar como paga"}
                >
                  {isPaid ? <Undo2 size={15} /> : <Check size={15} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {confirmDelete && (
        <Sheet onClose={() => setConfirmDelete(false)} title="Excluir compromisso?">
          <p className="text-[14px] text-text-muted">
            Isso apaga o compromisso e todas as suas parcelas. Essa ação não pode ser desfeita.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (!supabase) return;
                await deleteObligation(supabase, obligation.id);
                router.push("/financeiro/pagando");
              }}
            >
              Excluir
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
