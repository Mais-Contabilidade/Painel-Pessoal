import type { Cents } from "@/lib/money";
import type { Goal, Transaction } from "@/lib/finance";
import { computeGoalSummary } from "@/lib/finance";
import type { Obligation, Installment } from "@/lib/obligations";
import { displayInstallmentStatus } from "@/lib/obligations";
import type { Receivable, ReceivablePayment } from "@/lib/receivables";
import { computeReceivableSummary } from "@/lib/receivables";

export type FinanceTotals = {
  guardado: Cents;
  aPagar: Cents;
  aReceber: Cents;
  posicaoLiquida: Cents;
};

export function computeFinanceTotals(
  goals: Goal[],
  transactions: Transaction[],
  obligations: Obligation[],
  installments: Installment[],
  receivables: Receivable[],
  payments: ReceivablePayment[]
): FinanceTotals {
  const guardado = goals
    .filter((g) => !g.archived)
    .reduce((acc, g) => acc + computeGoalSummary(g, transactions).totalAllocated, 0);

  let aPagar = 0;
  for (const o of obligations.filter((o) => !o.archived)) {
    if (!o.installmentValueCents) continue;
    const own = installments.filter((i) => i.obligationId === o.id);
    const unpaid = own.filter((i) => displayInstallmentStatus(i) !== "pago").length;
    aPagar += unpaid * o.installmentValueCents;
  }

  const aReceber = receivables
    .filter((r) => !r.archived)
    .reduce((acc, r) => acc + computeReceivableSummary(r, payments.filter((p) => p.receivableId === r.id)).remaining, 0);

  return { guardado, aPagar, aReceber, posicaoLiquida: guardado + aReceber - aPagar };
}
