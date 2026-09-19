import type { Cents } from "@/lib/money";
import type { ReceivableReturnMode } from "@/lib/supabase/types";

export type Receivable = {
  id: string;
  person: string;
  originalValueCents: Cents;
  lentOn: string;
  agreedReturnDate: string | null;
  notes: string | null;
  archived: boolean;
  returnMode: ReceivableReturnMode;
  installmentsCount: number | null;
  firstDueDate: string | null;
};

export type ReceivableInstallment = {
  id: string;
  receivableId: string;
  installmentNumber: number;
  dueDate: string;
  valueCents: Cents;
};

export type ReceivablePayment = {
  id: string;
  receivableId: string;
  amountCents: Cents;
  paidOn: string;
  note: string | null;
};

export type ReceivableStatus = "em_dia" | "vence_em_breve" | "atrasado" | "recebido";

export type ReceivableSummary = {
  receivable: Receivable;
  totalReceived: Cents;
  remaining: Cents;
  status: ReceivableStatus;
};

const SOON_THRESHOLD_DAYS = 7;

function daysUntil(dateISO: string, today: Date): number {
  const due = new Date(`${dateISO}T00:00:00`);
  return Math.round((due.getTime() - new Date(today.toDateString()).getTime()) / (24 * 60 * 60 * 1000));
}

export function computeReceivableSummary(
  receivable: Receivable,
  payments: ReceivablePayment[],
  today = new Date()
): ReceivableSummary {
  const totalReceived = payments.reduce((acc, p) => acc + p.amountCents, 0);
  const remaining = Math.max(0, receivable.originalValueCents - totalReceived);

  let status: ReceivableStatus;
  if (remaining <= 0) {
    status = "recebido";
  } else if (receivable.agreedReturnDate && daysUntil(receivable.agreedReturnDate, today) < 0) {
    status = "atrasado";
  } else if (receivable.agreedReturnDate && daysUntil(receivable.agreedReturnDate, today) <= SOON_THRESHOLD_DAYS) {
    status = "vence_em_breve";
  } else {
    status = "em_dia";
  }

  return { receivable, totalReceived, remaining, status };
}

/**
 * Gera o cronograma previsto de parcelas (mensal, a partir de firstDueDate),
 * dividindo o valor total igualmente e jogando o resto de centavos na
 * última parcela para a soma bater exatamente com originalValueCents.
 */
export function generateInstallmentSchedule(
  totalValueCents: Cents,
  installmentsCount: number,
  firstDueDate: string
): { installmentNumber: number; dueDate: string; valueCents: Cents }[] {
  if (installmentsCount <= 0) return [];
  const base = Math.floor(totalValueCents / installmentsCount);
  const remainder = totalValueCents - base * installmentsCount;
  const [y, m, d] = firstDueDate.split("-").map(Number);
  return Array.from({ length: installmentsCount }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1 + i, d));
    const dueDate = date.toISOString().slice(0, 10);
    const valueCents = base + (i === installmentsCount - 1 ? remainder : 0);
    return { installmentNumber: i + 1, dueDate, valueCents };
  });
}

export type InstallmentAllocationStatus = "pago" | "parcial" | "pendente" | "atrasado";

export type InstallmentAllocation = ReceivableInstallment & {
  status: InstallmentAllocationStatus;
  paidCents: Cents;
  remainingCents: Cents;
};

/**
 * Aloca o total recebido (waterfall, na ordem das parcelas) contra o
 * cronograma previsto. Não vincula um recebimento específico a uma parcela
 * específica — recebimento real (receivable_payments) continua sendo só um
 * registro em dinheiro; o cronograma é só a "previsão" contra a qual o
 * progresso é medido.
 */
export function allocateReceivableInstallments(
  installments: ReceivableInstallment[],
  totalReceivedCents: Cents,
  today = new Date()
): InstallmentAllocation[] {
  const sorted = [...installments].sort((a, b) => a.installmentNumber - b.installmentNumber);
  let pool = totalReceivedCents;
  return sorted.map((inst) => {
    const paidCents = Math.max(0, Math.min(inst.valueCents, pool));
    pool -= paidCents;
    const remainingCents = inst.valueCents - paidCents;
    let status: InstallmentAllocationStatus;
    if (remainingCents <= 0) status = "pago";
    else if (paidCents > 0) status = "parcial";
    else if (daysUntil(inst.dueDate, today) < 0) status = "atrasado";
    else status = "pendente";
    return { ...inst, status, paidCents, remainingCents };
  });
}

export type InstallmentPlanProgress = {
  totalCount: number;
  paidCount: number;
  overdueCount: number;
  nextInstallment: InstallmentAllocation | null;
};

export function computeInstallmentPlanProgress(allocations: InstallmentAllocation[]): InstallmentPlanProgress {
  const totalCount = allocations.length;
  const paidCount = allocations.filter((a) => a.status === "pago").length;
  const overdueCount = allocations.filter((a) => a.status === "atrasado").length;
  const nextInstallment = allocations.find((a) => a.status !== "pago") ?? null;
  return { totalCount, paidCount, overdueCount, nextInstallment };
}
