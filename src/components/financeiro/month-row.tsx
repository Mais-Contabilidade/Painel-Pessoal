import type { MonthPlan } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { monthLabel } from "@/lib/month";

const STATUS_STYLES: Record<MonthPlan["status"], string> = {
  completo: "text-success",
  em_dia: "text-accent",
  atrasado: "text-danger",
  pendente: "text-text-faint",
};

const STATUS_LABELS: Record<MonthPlan["status"], string> = {
  completo: "Completo",
  em_dia: "Em andamento",
  atrasado: "Atrasado",
  pendente: "Planejado",
};

export function MonthRow({ month }: { month: MonthPlan }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 ${
        month.isCurrent ? "bg-accent-soft" : ""
      }`}
    >
      <div>
        <p className="text-[13.5px] font-medium text-text capitalize">{monthLabel(month.month)}</p>
        <p className={`mt-0.5 text-[11.5px] font-medium ${STATUS_STYLES[month.status]}`}>
          {STATUS_LABELS[month.status]}
          {month.isAdvance && " · adiantado"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[13.5px] font-medium text-text">
          {formatBRL(month.allocated)}{" "}
          <span className="font-normal text-text-faint">/ {formatBRL(month.planned)}</span>
        </p>
        {month.remaining > 0 && (
          <p className="mt-0.5 text-[11.5px] text-text-muted">faltam {formatBRL(month.remaining)}</p>
        )}
      </div>
    </div>
  );
}
