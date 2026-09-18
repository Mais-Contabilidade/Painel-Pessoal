"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useReceivablesStore } from "@/store/receivables-store";
import { useMounted } from "@/lib/use-mounted";
import { useSupabase } from "@/lib/supabase-provider";
import { formatBRL } from "@/lib/money";
import { formatDateShort } from "@/lib/format";
import { computeReceivableSummary } from "@/lib/receivables";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { PrivateValue } from "@/components/ui/private-value";
import { ReceivablePaymentSheet } from "@/components/financeiro/receivable-payment-sheet";

const STATUS_LABEL: Record<string, string> = {
  em_dia: "Em dia",
  vence_em_breve: "Vence em breve",
  atrasado: "Atrasado",
  recebido: "Recebido",
};

const STATUS_STYLE: Record<string, string> = {
  em_dia: "bg-surface-2 text-text-muted",
  vence_em_breve: "bg-warning-soft text-warning",
  atrasado: "bg-danger-soft text-danger",
  recebido: "bg-success-soft text-success",
};

export default function ReceivableDetailPage() {
  const mounted = useMounted();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = useSupabase();
  const receivables = useReceivablesStore((s) => s.receivables);
  const payments = useReceivablesStore((s) => s.payments);
  const deleteReceivable = useReceivablesStore((s) => s.deleteReceivable);
  const deletePayment = useReceivablesStore((s) => s.deletePayment);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [registeringPayment, setRegisteringPayment] = useState(false);

  const receivable = receivables.find((r) => r.id === params.id) ?? null;
  const ownPayments = useMemo(
    () =>
      payments
        .filter((p) => p.receivableId === params.id)
        .sort((a, b) => (a.paidOn < b.paidOn ? 1 : -1)),
    [payments, params.id]
  );
  const summary = useMemo(
    () => (receivable ? computeReceivableSummary(receivable, ownPayments) : null),
    [receivable, ownPayments]
  );

  if (!mounted) return null;

  if (!receivable || !summary) {
    return (
      <div className="px-5 pt-6">
        <button onClick={() => router.push("/financeiro/emprestado")} className="flex items-center gap-1 text-[13.5px] text-text-muted">
          <ArrowLeft size={15} /> Voltar
        </button>
        <p className="mt-6 text-[13.5px] text-text-muted">Empréstimo não encontrado.</p>
      </div>
    );
  }

  const pct = receivable.originalValueCents > 0 ? (summary.totalReceived / receivable.originalValueCents) * 100 : 0;

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/financeiro/emprestado")}
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft size={17} />
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          aria-label="Excluir empréstimo"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <h1 className="text-[20px] font-semibold text-text">{receivable.person}</h1>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[summary.status]}`}>
          {STATUS_LABEL[summary.status]}
        </span>
      </div>
      {receivable.agreedReturnDate && (
        <p className="text-[13px] text-text-muted">Combinado para {formatDateShort(receivable.agreedReturnDate)}</p>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[22px] font-semibold text-text">
            <PrivateValue>{formatBRL(summary.totalReceived)}</PrivateValue>
          </p>
          <p className="text-[13px] text-text-muted">
            de <PrivateValue>{formatBRL(receivable.originalValueCents)}</PrivateValue>
          </p>
        </div>
        <Progress value={pct} className="mt-2.5" />
        <p className="mt-3 text-[12.5px] text-text-muted">
          Falta <PrivateValue>{formatBRL(summary.remaining)}</PrivateValue>
        </p>
        {receivable.notes && <p className="mt-2 text-[13px] text-text-muted">{receivable.notes}</p>}
      </div>

      {summary.remaining > 0 && (
        <Button className="mt-3 w-full" onClick={() => setRegisteringPayment(true)}>
          <Plus size={16} />
          Registrar recebimento
        </Button>
      )}

      {ownPayments.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">Recebimentos</p>
          <ul className="space-y-1.5">
            {ownPayments.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-border-subtle px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] text-text">
                    <PrivateValue>{formatBRL(p.amountCents)}</PrivateValue>
                  </p>
                  <p className="truncate text-[12px] text-text-muted">
                    {formatDateShort(p.paidOn)}
                    {p.note && ` · ${p.note}`}
                  </p>
                </div>
                <button
                  onClick={() => supabase && deletePayment(supabase, p.id)}
                  aria-label="Remover recebimento"
                  className="shrink-0 text-text-faint hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {registeringPayment && (
        <ReceivablePaymentSheet
          receivableId={receivable.id}
          maxCents={summary.remaining}
          onClose={() => setRegisteringPayment(false)}
        />
      )}

      {confirmDelete && (
        <Sheet onClose={() => setConfirmDelete(false)} title="Excluir empréstimo?">
          <p className="text-[14px] text-text-muted">
            Isso apaga o registro e todos os recebimentos associados. Essa ação não pode ser desfeita.
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
                await deleteReceivable(supabase, receivable.id);
                router.push("/financeiro/emprestado");
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
