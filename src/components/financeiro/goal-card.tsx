import { Progress } from "@/components/ui/progress";
import { PrivateValue, PrivatePercent } from "@/components/ui/private-value";
import { formatBRL } from "@/lib/money";
import { monthLabelLong } from "@/lib/month";
import type { GoalSummary } from "@/lib/finance";

export function GoalCard({ summary, onOpen }: { summary: GoalSummary; onOpen: () => void }) {
  const { goal, totalAllocated, targetValue, totalRemaining, isCompleted, isOverdue } = summary;
  const pct = targetValue > 0 ? (totalAllocated / targetValue) * 100 : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-text-faint"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[15px] font-medium text-text">{goal.name}</p>
        {isCompleted ? (
          <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
            Concluída
          </span>
        ) : isOverdue ? (
          <span className="shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
            Atrasada
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-[13px] text-text-muted">
        <PrivateValue>{`${formatBRL(totalAllocated)} de ${formatBRL(targetValue)}`}</PrivateValue>
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <Progress value={pct} className="flex-1" />
        <span className="shrink-0 text-[12px] text-text-muted">
          <PrivatePercent>{`${Math.round(pct)}%`}</PrivatePercent>
        </span>
      </div>
      {!isCompleted && (
        <div className="mt-1.5 flex items-center justify-between text-[12px] text-text-faint">
          <span>
            Falta <PrivateValue>{formatBRL(totalRemaining)}</PrivateValue>
          </span>
          <span>até {monthLabelLong(goal.endMonth)}</span>
        </div>
      )}
    </button>
  );
}
