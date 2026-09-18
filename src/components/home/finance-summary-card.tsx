"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";
import { useObligationsStore } from "@/store/obligations-store";
import { useReceivablesStore } from "@/store/receivables-store";
import { computeFinanceTotals } from "@/lib/finance-totals";
import { formatBRL } from "@/lib/money";
import { PrivateValue } from "@/components/ui/private-value";

export function FinanceSummaryCard() {
  const goals = useFinanceStore((s) => s.goals);
  const transactions = useFinanceStore((s) => s.transactions);
  const obligations = useObligationsStore((s) => s.obligations);
  const installments = useObligationsStore((s) => s.installments);
  const receivables = useReceivablesStore((s) => s.receivables);
  const payments = useReceivablesStore((s) => s.payments);

  const totals = useMemo(
    () => computeFinanceTotals(goals, transactions, obligations, installments, receivables, payments),
    [goals, transactions, obligations, installments, receivables, payments]
  );

  return (
    <Link
      href="/financeiro"
      className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-text-faint"
    >
      <div className="flex items-center gap-2">
        <PiggyBank size={16} className="text-text-faint" />
        <p className="text-[12.5px] font-medium text-text-muted">Financeiro</p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10.5px] text-text-faint">Guardando</p>
          <p className="text-[13px] font-medium text-text">
            <PrivateValue mask="••••">{formatBRL(totals.guardado)}</PrivateValue>
          </p>
        </div>
        <div>
          <p className="text-[10.5px] text-text-faint">Pagando</p>
          <p className="text-[13px] font-medium text-danger">
            <PrivateValue mask="••••">{formatBRL(totals.aPagar)}</PrivateValue>
          </p>
        </div>
        <div>
          <p className="text-[10.5px] text-text-faint">A receber</p>
          <p className="text-[13px] font-medium text-success">
            <PrivateValue mask="••••">{formatBRL(totals.aReceber)}</PrivateValue>
          </p>
        </div>
      </div>
    </Link>
  );
}
