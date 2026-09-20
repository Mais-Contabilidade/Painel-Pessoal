import { Progress } from "@/components/ui/progress";
import { PrivateValue, PrivatePercent } from "@/components/ui/private-value";
import { formatBRL } from "@/lib/money";
import { formatDateShort } from "@/lib/format";
import {
  computeReceivableSummary,
  allocateReceivableInstallments,
  computeInstallmentPlanProgress,
  type Receivable,
  type ReceivablePayment,
  type ReceivableInstallment,
} from "@/lib/receivables";

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

export function ReceivableCard({
  receivable,
  payments,
  installments,
  onOpen,
}: {
  receivable: Receivable;
  payments: ReceivablePayment[];
  installments: ReceivableInstallment[];
  onOpen: () => void;
}) {
  const summary = computeReceivableSummary(receivable, payments);
  const pct = receivable.originalValueCents > 0 ? (summary.totalReceived / receivable.originalValueCents) * 100 : 0;

  const allocations =
    receivable.returnMode === "parcelado" ? allocateReceivableInstallments(installments, summary.totalReceived) : [];
  const planProgress = computeInstallmentPlanProgress(allocations);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-text-faint"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[15px] font-medium text-text">{receivable.person}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[summary.status]}`}>
          {STATUS_LABEL[summary.status]}
        </span>
      </div>
      <p className="mt-0.5 text-[13px] text-text-muted">
        <PrivateValue>{`Falta ${formatBRL(summary.remaining)}`}</PrivateValue> de{" "}
        <PrivateValue>{formatBRL(receivable.originalValueCents)}</PrivateValue>
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Progress value={pct} className="flex-1" />
        <span className="shrink-0 text-[12px] text-text-muted">
          <PrivatePercent>{`${Math.round(pct)}%`}</PrivatePercent>
        </span>
      </div>
      {receivable.returnMode === "parcelado" && planProgress.totalCount > 0 && (
        <div className="mt-1.5 flex items-center justify-between text-[12px] text-text-faint">
          <span>
            {planProgress.paidCount}/{planProgress.totalCount} parcelas
            {planProgress.nextInstallment && ` · próxima ${formatDateShort(planProgress.nextInstallment.dueDate)}`}
          </span>
          {planProgress.overdueCount > 0 && (
            <span className="text-danger">
              {planProgress.overdueCount} vencida{planProgress.overdueCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
