import type { Cents } from "@/lib/money";
import { distributeCents } from "@/lib/money";
import type { MonthKey } from "@/lib/month";
import {
  compareMonthKeys,
  currentMonthKey,
  dateToMonthKey,
  enumerateMonths,
} from "@/lib/month";

export type TransactionType = "aporte" | "rendimento" | "retirada";

export type Goal = {
  id: string;
  name: string;
  targetValue: Cents;
  startMonth: MonthKey;
  endMonth: MonthKey;
  createdAt: string;
  archived?: boolean;
};

export type Transaction = {
  id: string;
  goalId: string;
  type: TransactionType;
  value: Cents;
  date: string;
  note?: string;
  justification?: string;
  createdAt: string;
};

export type MonthPlan = {
  month: MonthKey;
  planned: Cents;
  allocated: Cents;
  remaining: Cents;
  isFuture: boolean;
  isAdvance: boolean;
  isCurrent: boolean;
  status: "completo" | "em_dia" | "atrasado" | "pendente";
};

export type GoalSummary = {
  goal: Goal;
  months: MonthPlan[];
  targetValue: Cents;
  netSaved: Cents;
  totalAllocated: Cents;
  totalRemaining: Cents;
  totalAportes: Cents;
  totalRendimentos: Cents;
  totalRetiradas: Cents;
  currentMonthPlan: MonthPlan | null;
  isCompleted: boolean;
  isOverdue: boolean;
};

function sumByType(transactions: Transaction[], type: TransactionType): Cents {
  return transactions.reduce((acc, t) => (t.type === type ? acc + t.value : acc), 0);
}

export function goalTransactions(goalId: string, all: Transaction[]): Transaction[] {
  return all.filter((t) => t.goalId === goalId);
}

/**
 * Aloca o saldo líquido da meta (aportes + rendimentos - retiradas) mês a mês, em ordem,
 * até o teto do planejado de cada mês (waterfall). Sobra de um mês adianta o(s) próximo(s).
 * Rendimento entra no saldo alocável mas é contabilizado à parte do aporte pessoal.
 */
export function computeGoalSummary(goal: Goal, allTransactions: Transaction[]): GoalSummary {
  const tx = goalTransactions(goal.id, allTransactions);
  const totalAportes = sumByType(tx, "aporte");
  const totalRendimentos = sumByType(tx, "rendimento");
  const totalRetiradas = sumByType(tx, "retirada");
  const netSaved = totalAportes + totalRendimentos - totalRetiradas;

  const monthKeys = enumerateMonths(goal.startMonth, goal.endMonth);
  const plannedPerMonth = distributeCents(goal.targetValue, monthKeys.length);
  const nowKey = currentMonthKey();

  let pool = Math.max(0, netSaved);
  let frontierReached = false;
  const months: MonthPlan[] = monthKeys.map((month, i) => {
    const planned = plannedPerMonth[i];
    const allocated = Math.min(pool, planned);
    pool -= allocated;
    const remaining = planned - allocated;
    const isFuture = compareMonthKeys(month, nowKey) > 0;
    const isCurrent = compareMonthKeys(month, nowKey) === 0;
    const isAdvance = isFuture && allocated > 0;

    let status: MonthPlan["status"];
    if (remaining <= 0) status = "completo";
    else if (isFuture) status = "pendente";
    else if (compareMonthKeys(month, nowKey) < 0) status = "atrasado";
    else status = "em_dia";

    if (!frontierReached && remaining > 0) frontierReached = true;

    return { month, planned, allocated, remaining, isFuture, isAdvance, isCurrent, status };
  });

  const totalAllocated = months.reduce((acc, m) => acc + m.allocated, 0);
  const totalRemaining = goal.targetValue - totalAllocated;
  const currentMonthPlan = months.find((m) => m.isCurrent) ?? null;
  const isCompleted = totalRemaining <= 0;
  const isOverdue = !isCompleted && compareMonthKeys(goal.endMonth, nowKey) < 0;

  return {
    goal,
    months,
    targetValue: goal.targetValue,
    netSaved,
    totalAllocated,
    totalRemaining: Math.max(0, totalRemaining),
    totalAportes,
    totalRendimentos,
    totalRetiradas,
    currentMonthPlan,
    isCompleted,
    isOverdue,
  };
}

/** Soma dos aportes pessoais (exclui rendimento) feitos num mês de competência específico. */
export function personalContributionInMonth(
  goalId: string,
  all: Transaction[],
  month: MonthKey
): Cents {
  return all
    .filter((t) => t.goalId === goalId && t.type === "aporte" && dateToMonthKey(t.date) === month)
    .reduce((acc, t) => acc + t.value, 0);
}

export type WithdrawalImpact = {
  remainingBefore: Cents;
  remainingAfter: Cents;
  nextMonthBefore: MonthPlan | null;
  nextMonthAfter: MonthPlan | null;
};

/** Simula o impacto de uma retirada antes de confirmá-la, comparando o "antes" e "depois". */
export function previewWithdrawalImpact(
  goal: Goal,
  allTransactions: Transaction[],
  withdrawalValue: Cents
): WithdrawalImpact {
  const before = computeGoalSummary(goal, allTransactions);
  const hypothetical: Transaction = {
    id: "__preview__",
    goalId: goal.id,
    type: "retirada",
    value: withdrawalValue,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const after = computeGoalSummary(goal, [...allTransactions, hypothetical]);

  const firstUnfinished = (s: GoalSummary) => s.months.find((m) => m.remaining > 0) ?? null;

  return {
    remainingBefore: before.totalRemaining,
    remainingAfter: after.totalRemaining,
    nextMonthBefore: firstUnfinished(before),
    nextMonthAfter: firstUnfinished(after),
  };
}
