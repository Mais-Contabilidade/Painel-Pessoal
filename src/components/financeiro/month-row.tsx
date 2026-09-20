import type { MonthPlan, MonthPlanStatus } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { monthLabel } from "@/lib/month";
import { PrivateValue } from "@/components/ui/private-value";

const STATUS_STYLES: Record<MonthPlanStatus, string> = {
  completo: "text-success",
  parcial: "text-accent",
  pendente: "text-text-faint",
};

const STATUS_LABELS: Record<MonthPlanStatus, string> = {
  completo: "Completo",
  parcial: "Parcial",
  pendente: "Pendente",
};

/** Mês passado: só mostra o que de fato aconteceu — não reescrevemos o histórico com o plano atual. */
function PastMonthRow({ month }: { month: MonthPlan }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3">
      <p className="text-[13.5px] font-medium text-text capitalize">{monthLabel(month.month)}</p>
      <p className="text-[13px] text-text-muted">
        Aportado <PrivateValue>{formatBRL(month.aportado)}</PrivateValue>
      </p>
    </div>
  );
}

export function MonthRow({ month }: { month: MonthPlan }) {
  if (month.isPast) return <PastMonthRow month={month} />;

  const planned = month.planned ?? 0;
  const remaining = month.remaining ?? 0;
  const status = month.status ?? "pendente";
  const excess = month.aportado > planned ? month.aportado - planned : 0;

  return (
    <div
      className={`rounded-xl px-3.5 py-3 ${month.isCurrent ? "bg-accent-soft" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13.5px] font-medium text-text capitalize">{monthLabel(month.month)}</p>
        <p className={`text-[11.5px] font-medium ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</p>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[12.5px] text-text-muted">
        <span>
          Planejado <PrivateValue>{formatBRL(planned)}</PrivateValue>
        </span>
        <span>
          Aportado <PrivateValue>{formatBRL(month.aportado)}</PrivateValue>
        </span>
      </div>
      {remaining > 0 ? (
        <p className="mt-0.5 text-[11.5px] text-text-faint">
          Falta <PrivateValue>{formatBRL(remaining)}</PrivateValue>
        </p>
      ) : excess > 0 ? (
        <p className="mt-0.5 text-[11.5px] text-success">
          Acima do planejado em <PrivateValue>{formatBRL(excess)}</PrivateValue>
        </p>
      ) : null}
    </div>
  );
}
