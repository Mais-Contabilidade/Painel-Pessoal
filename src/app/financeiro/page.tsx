"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";
import { useMounted } from "@/lib/use-mounted";
import { computeGoalSummary } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { GoalCard } from "@/components/financeiro/goal-card";
import { GoalFormSheet } from "@/components/financeiro/goal-form-sheet";

export default function FinanceiroPage() {
  const mounted = useMounted();
  const router = useRouter();
  const goals = useFinanceStore((s) => s.goals);
  const transactions = useFinanceStore((s) => s.transactions);
  const [creating, setCreating] = useState(false);

  const summaries = useMemo(
    () =>
      goals
        .filter((g) => !g.archived)
        .map((g) => computeGoalSummary(g, transactions))
        .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted)),
    [goals, transactions]
  );

  const totals = useMemo(
    () => ({
      guardado: summaries.reduce((acc, s) => acc + s.totalAllocated, 0),
      meta: summaries.reduce((acc, s) => acc + s.targetValue, 0),
    }),
    [summaries]
  );

  if (!mounted) return null;

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle={goals.length > 0 ? `${formatBRL(totals.guardado)} guardados de ${formatBRL(totals.meta)}` : undefined}
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={16} />
            Meta
          </Button>
        }
      />

      <div className="px-5 pb-6">
        {summaries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[13.5px] text-text-muted">
              Crie sua primeira meta para começar a planejar os cofrinhos.
            </p>
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} />
              Nova meta
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {summaries.map((s) => (
              <GoalCard key={s.goal.id} summary={s} onOpen={() => router.push(`/financeiro/${s.goal.id}`)} />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <GoalFormSheet
          goal={null}
          onClose={() => setCreating(false)}
          onSaved={(id) => router.push(`/financeiro/${id}`)}
        />
      )}
    </div>
  );
}
