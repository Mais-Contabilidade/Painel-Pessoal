import { enumerateMonths, addMonths, type MonthKey } from "@/lib/month";
import type { Cents } from "@/lib/money";
import type { InstallmentStatus } from "@/lib/supabase/types";

export type Obligation = {
  id: string;
  name: string;
  creditor: string | null;
  totalValueCents: Cents | null;
  installmentValueCents: Cents | null;
  startMonth: MonthKey;
  endMonth: MonthKey | null;
  dueDay: number | null;
  installmentsCount: number | null;
  notes: string | null;
  archived: boolean;
};

export type Installment = {
  id: string;
  obligationId: string;
  competenceMonth: MonthKey;
  dueDate: string | null;
  status: InstallmentStatus;
  paidAt: string | null;
  paidValueCents: Cents | null;
};

/** Resolve o mês final de um compromisso: explícito, ou calculado a partir da quantidade de parcelas. */
export function resolveEndMonth(obligation: Pick<Obligation, "startMonth" | "endMonth" | "installmentsCount">): MonthKey | null {
  if (obligation.endMonth) return obligation.endMonth;
  if (obligation.installmentsCount && obligation.installmentsCount > 0) {
    return addMonths(obligation.startMonth, obligation.installmentsCount - 1);
  }
  return null;
}

/** Gera as competências (YYYY-MM) de um compromisso, uma por mês, do início ao fim. */
export function generateCompetenceMonths(obligation: Pick<Obligation, "startMonth" | "endMonth" | "installmentsCount">): MonthKey[] {
  const end = resolveEndMonth(obligation);
  if (!end) return [];
  return enumerateMonths(obligation.startMonth, end);
}

function daysUntil(dateISO: string, today: Date): number {
  const due = new Date(`${dateISO}T00:00:00`);
  const diffMs = due.getTime() - new Date(today.toDateString()).getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/** Status de exibição de uma parcela: paga fica paga; pendente com vencimento passado vira atrasada. */
export function displayInstallmentStatus(installment: Pick<Installment, "status" | "dueDate">, today = new Date()): InstallmentStatus {
  if (installment.status === "pago") return "pago";
  if (installment.dueDate && daysUntil(installment.dueDate, today) < 0) return "atrasado";
  return "pendente";
}

export type ObligationProgress = {
  totalCount: number;
  paidCount: number;
  remainingCount: number;
  percentPaid: number;
  nextInstallment: Installment | null;
};

export function computeObligationProgress(installments: Installment[], today = new Date()): ObligationProgress {
  const totalCount = installments.length;
  const paidCount = installments.filter((i) => displayInstallmentStatus(i, today) === "pago").length;
  const remainingCount = totalCount - paidCount;
  const sorted = [...installments].sort((a, b) => (a.competenceMonth < b.competenceMonth ? -1 : 1));
  const nextInstallment = sorted.find((i) => displayInstallmentStatus(i, today) !== "pago") ?? null;
  return {
    totalCount,
    paidCount,
    remainingCount,
    percentPaid: totalCount > 0 ? (paidCount / totalCount) * 100 : 0,
    nextInstallment,
  };
}
