"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PiggyBank, CreditCard, HandCoins, ChevronRight } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";
import { useObligationsStore } from "@/store/obligations-store";
import { useReceivablesStore } from "@/store/receivables-store";
import { useMounted } from "@/lib/use-mounted";
import { computeGoalSummary } from "@/lib/finance";
import { displayInstallmentStatus } from "@/lib/obligations";
import { computeReceivableSummary } from "@/lib/receivables";
import { formatBRL } from "@/lib/money";
import { monthLabel } from "@/lib/month";
import { formatDateShort } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { PrivateValue } from "@/components/ui/private-value";

export default function FinanceiroDashboardPage() {
  const mounted = useMounted();
  const goals = useFinanceStore((s) => s.goals);
  const transactions = useFinanceStore((s) => s.transactions);
  const obligations = useObligationsStore((s) => s.obligations);
  const installments = useObligationsStore((s) => s.installments);
  const receivables = useReceivablesStore((s) => s.receivables);
  const payments = useReceivablesStore((s) => s.payments);

  const goalSummaries = useMemo(
    () => goals.filter((g) => !g.archived).map((g) => computeGoalSummary(g, transactions)),
    [goals, transactions]
  );

  const receivableSummaries = useMemo(
    () =>
      receivables
        .filter((r) => !r.archived)
        .map((r) => computeReceivableSummary(r, payments.filter((p) => p.receivableId === r.id))),
    [receivables, payments]
  );

  const totals = useMemo(() => {
    const guardado = goalSummaries.reduce((acc, s) => acc + s.totalAllocated, 0);

    let aPagar = 0;
    for (const o of obligations.filter((o) => !o.archived)) {
      if (!o.installmentValueCents) continue;
      const own = installments.filter((i) => i.obligationId === o.id);
      const unpaid = own.filter((i) => displayInstallmentStatus(i) !== "pago").length;
      aPagar += unpaid * o.installmentValueCents;
    }

    const aReceber = receivableSummaries.reduce((acc, s) => acc + s.remaining, 0);
    const posicaoLiquida = guardado + aReceber - aPagar;

    return { guardado, aPagar, aReceber, posicaoLiquida };
  }, [goalSummaries, obligations, installments, receivableSummaries]);

  const proximosVencimentos = useMemo(() => {
    const now = new Date();
    return installments
      .filter((i) => displayInstallmentStatus(i) !== "pago" && i.dueDate)
      .map((i) => ({ installment: i, obligation: obligations.find((o) => o.id === i.obligationId) }))
      .filter((x) => x.obligation)
      .sort((a, b) => (a.installment.dueDate! < b.installment.dueDate! ? -1 : 1))
      .filter((x) => new Date(x.installment.dueDate!).getTime() >= now.getTime() - 24 * 60 * 60 * 1000)
      .slice(0, 4);
  }, [installments, obligations]);

  const proximasCobrancas = useMemo(
    () => receivableSummaries.filter((s) => s.status === "atrasado" || s.status === "vence_em_breve").slice(0, 4),
    [receivableSummaries]
  );

  if (!mounted) return null;

  return (
    <div>
      <PageHeader title="Financeiro" />

      <div className="px-5 pb-6">
        <div className="grid grid-cols-3 gap-2">
          <SummaryTile icon={PiggyBank} label="Guardado" value={totals.guardado} tone="text" />
          <SummaryTile icon={CreditCard} label="A pagar" value={totals.aPagar} tone="danger" />
          <SummaryTile icon={HandCoins} label="A receber" value={totals.aReceber} tone="success" />
        </div>

        <div className="mt-2 flex items-center justify-between rounded-xl bg-surface-2 px-4 py-2.5">
          <span className="text-[12.5px] font-medium text-text-muted">Posição líquida</span>
          <span className="text-[13.5px] font-semibold text-text">
            <PrivateValue>{formatBRL(totals.posicaoLiquida)}</PrivateValue>
          </span>
        </div>

        <div className="mt-5 space-y-2">
          <UniverseLink
            href="/financeiro/guardando"
            icon={PiggyBank}
            title="Guardando"
            subtitle={`${goalSummaries.length} meta${goalSummaries.length === 1 ? "" : "s"}`}
          />
          <UniverseLink
            href="/financeiro/pagando"
            icon={CreditCard}
            title="Pagando"
            subtitle={`${obligations.filter((o) => !o.archived).length} compromisso${obligations.length === 1 ? "" : "s"}`}
          />
          <UniverseLink
            href="/financeiro/emprestado"
            icon={HandCoins}
            title="Emprestado / A receber"
            subtitle={`${receivables.filter((r) => !r.archived).length} registro${receivables.length === 1 ? "" : "s"}`}
          />
        </div>

        {(proximosVencimentos.length > 0 || proximasCobrancas.length > 0) && (
          <div className="mt-6 space-y-2">
            <p className="px-1 text-[12.5px] font-medium text-text-muted">Nos próximos dias</p>
            {proximosVencimentos.map(({ installment, obligation }) => (
              <div
                key={installment.id}
                className="flex items-center justify-between rounded-xl border border-border-subtle px-3.5 py-2.5"
              >
                <p className="text-[13px] text-text">
                  {obligation!.name} · {monthLabel(installment.competenceMonth)}
                </p>
                <p className="text-[12.5px] text-text-muted">
                  {installment.dueDate && `vence ${formatDateShort(installment.dueDate)}`}
                </p>
              </div>
            ))}
            {proximasCobrancas.map((s) => (
              <div
                key={s.receivable.id}
                className="flex items-center justify-between rounded-xl border border-border-subtle px-3.5 py-2.5"
              >
                <p className="text-[13px] text-text">Cobrar {s.receivable.person}</p>
                <p className="text-[12.5px] text-danger">
                  <PrivateValue>{formatBRL(s.remaining)}</PrivateValue>
                </p>
              </div>
            ))}
          </div>
        )}

        {goalSummaries.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">Progresso das metas</p>
            <div className="space-y-2">
              {goalSummaries.slice(0, 3).map((s) => (
                <div key={s.goal.id} className="rounded-xl border border-border-subtle px-3.5 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-text">{s.goal.name}</p>
                    <p className="text-[12px] text-text-muted">
                      {s.targetValue > 0 ? Math.round((s.totalAllocated / s.targetValue) * 100) : 0}%
                    </p>
                  </div>
                  <Progress
                    value={s.targetValue > 0 ? (s.totalAllocated / s.targetValue) * 100 : 0}
                    className="mt-1.5"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof PiggyBank;
  label: string;
  value: number;
  tone: "text" | "danger" | "success";
}) {
  const toneClass = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-text";
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <Icon size={16} className="text-text-faint" />
      <p className="mt-2 text-[12px] text-text-muted">{label}</p>
      <p className={`mt-0.5 text-[15px] font-semibold ${toneClass}`}>
        <PrivateValue>{formatBRL(value)}</PrivateValue>
      </p>
    </div>
  );
}

function UniverseLink({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: typeof PiggyBank;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-text-faint"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-muted">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-medium text-text">{title}</p>
        <p className="text-[13px] text-text-muted">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-text-faint" />
    </Link>
  );
}
