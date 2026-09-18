"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";
import { useMounted } from "@/lib/use-mounted";
import { useSupabase } from "@/lib/supabase-provider";
import { computeGoalSummary, type TransactionType } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { monthLabelLong } from "@/lib/month";
import { formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { PrivateValue } from "@/components/ui/private-value";
import { MonthRow } from "@/components/financeiro/month-row";
import { GoalFormSheet } from "@/components/financeiro/goal-form-sheet";
import { TransactionSheet } from "@/components/financeiro/transaction-sheet";

const TX_ICON: Record<TransactionType, typeof ArrowUpCircle> = {
  aporte: ArrowUpCircle,
  rendimento: Sparkles,
  retirada: ArrowDownCircle,
};

const TX_COLOR: Record<TransactionType, string> = {
  aporte: "text-success",
  rendimento: "text-accent",
  retirada: "text-danger",
};

const TX_LABEL: Record<TransactionType, string> = {
  aporte: "Aporte",
  rendimento: "Rendimento",
  retirada: "Retirada",
};

export default function GoalDetailPage() {
  const mounted = useMounted();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = useSupabase();
  const goals = useFinanceStore((s) => s.goals);
  const transactions = useFinanceStore((s) => s.transactions);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [txType, setTxType] = useState<TransactionType | null>(null);

  const goal = goals.find((g) => g.id === params.id) ?? null;

  const summary = useMemo(() => (goal ? computeGoalSummary(goal, transactions) : null), [goal, transactions]);
  const goalTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.goalId === params.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, params.id]
  );

  if (!mounted) return null;

  if (!goal || !summary) {
    return (
      <div className="px-5 pt-6">
        <button onClick={() => router.push("/financeiro/guardando")} className="flex items-center gap-1 text-[13.5px] text-text-muted">
          <ArrowLeft size={15} /> Voltar
        </button>
        <p className="mt-6 text-[13.5px] text-text-muted">Meta não encontrada.</p>
      </div>
    );
  }

  const pct = summary.targetValue > 0 ? (summary.totalAllocated / summary.targetValue) * 100 : 0;

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/financeiro/guardando")}
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            aria-label="Editar meta"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Excluir meta"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-danger"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <h1 className="mt-2 text-[20px] font-semibold text-text">{goal.name}</h1>
      <p className="text-[13px] text-text-muted">
        {monthLabelLong(goal.startMonth)} até {monthLabelLong(goal.endMonth)}
      </p>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[22px] font-semibold text-text">
            <PrivateValue>{formatBRL(summary.totalAllocated)}</PrivateValue>
          </p>
          <p className="text-[13px] text-text-muted">
            de <PrivateValue>{formatBRL(summary.targetValue)}</PrivateValue>
          </p>
        </div>
        <Progress value={pct} className="mt-2.5" />
        <div className="mt-3 flex items-center justify-between text-[12.5px] text-text-muted">
          <span>
            Falta <PrivateValue>{formatBRL(summary.totalRemaining)}</PrivateValue>
          </span>
          {summary.totalRendimentos > 0 && (
            <span className="text-accent">
              +<PrivateValue>{formatBRL(summary.totalRendimentos)}</PrivateValue> rendimento CDI
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="secondary" onClick={() => setTxType("aporte")}>
          Aportar
        </Button>
        <Button variant="secondary" onClick={() => setTxType("rendimento")}>
          Rendimento
        </Button>
        <Button variant="ghost" onClick={() => setTxType("retirada")}>
          Retirar
        </Button>
      </div>

      <div className="mt-6">
        <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">Planejamento mensal</p>
        <div className="divide-y divide-border-subtle rounded-2xl border border-border bg-surface">
          {summary.months.map((m) => (
            <MonthRow key={m.month} month={m} />
          ))}
        </div>
      </div>

      {goalTransactions.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">Histórico</p>
          <ul className="space-y-1.5">
            {goalTransactions.map((t) => {
              const Icon = TX_ICON[t.type];
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-border-subtle px-3.5 py-2.5"
                >
                  <Icon size={17} className={`shrink-0 ${TX_COLOR[t.type]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-text">
                      {TX_LABEL[t.type]} · <PrivateValue>{formatBRL(t.value)}</PrivateValue>
                    </p>
                    <p className="truncate text-[12px] text-text-muted">
                      {formatDateShort(t.date)}
                      {(t.note || t.justification) && ` · ${t.note ?? t.justification}`}
                    </p>
                  </div>
                  <button
                    onClick={() => supabase && deleteTransaction(supabase, t.id)}
                    aria-label="Remover lançamento"
                    className="shrink-0 text-text-faint hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {editing && <GoalFormSheet goal={goal} onClose={() => setEditing(false)} />}
      {txType && (
        <TransactionSheet goal={goal} initialType={txType} onClose={() => setTxType(null)} />
      )}

      {confirmDelete && (
        <Sheet onClose={() => setConfirmDelete(false)} title="Excluir meta?">
          <p className="text-[14px] text-text-muted">
            Isso apaga a meta e todos os lançamentos associados a ela. Essa ação não pode ser desfeita.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (!supabase) return;
                await deleteGoal(supabase, goal.id);
                router.push("/financeiro/guardando");
              }}
            >
              Excluir
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
