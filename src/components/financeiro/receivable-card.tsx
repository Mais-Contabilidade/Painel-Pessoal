import { PrivateValue } from "@/components/ui/private-value";
import { formatBRL } from "@/lib/money";
import { computeReceivableSummary, type Receivable, type ReceivablePayment } from "@/lib/receivables";

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
  onOpen,
}: {
  receivable: Receivable;
  payments: ReceivablePayment[];
  onOpen: () => void;
}) {
  const summary = computeReceivableSummary(receivable, payments);

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
    </button>
  );
}
