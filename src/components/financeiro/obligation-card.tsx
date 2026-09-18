import { Progress } from "@/components/ui/progress";
import { PrivateValue } from "@/components/ui/private-value";
import { formatBRL } from "@/lib/money";
import { monthLabel } from "@/lib/month";
import { computeObligationProgress, type Obligation, type Installment } from "@/lib/obligations";

export function ObligationCard({
  obligation,
  installments,
  onOpen,
}: {
  obligation: Obligation;
  installments: Installment[];
  onOpen: () => void;
}) {
  const progress = computeObligationProgress(installments);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-text-faint"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[15px] font-medium text-text">{obligation.name}</p>
          {obligation.creditor && <p className="text-[12.5px] text-text-muted">{obligation.creditor}</p>}
        </div>
        <p className="shrink-0 text-[13px] font-medium text-text">
          {obligation.installmentValueCents ? (
            <PrivateValue>{formatBRL(obligation.installmentValueCents)}</PrivateValue>
          ) : (
            <span className="text-text-faint">a definir</span>
          )}
        </p>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <Progress value={progress.percentPaid} className="flex-1" />
        <span className="shrink-0 text-[12px] text-text-muted">
          {progress.paidCount}/{progress.totalCount}
        </span>
      </div>
      {progress.nextInstallment && (
        <p className="mt-1.5 text-[12px] text-text-faint">
          Próxima: {monthLabel(progress.nextInstallment.competenceMonth)}
        </p>
      )}
    </button>
  );
}
