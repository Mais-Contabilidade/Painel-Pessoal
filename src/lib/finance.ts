import type { Cents } from "@/lib/money";
import { distributeCents } from "@/lib/money";
import type { MonthKey } from "@/lib/month";
import { compareMonthKeys, dateToMonthKey, enumerateMonths } from "@/lib/month";

export type TransactionType = "aporte" | "saldo_inicial" | "rendimento" | "retirada";

export type GoalAllocationType = "livre" | "igual" | "percentual" | "valor_mensal";

export type Goal = {
  id: string;
  name: string;
  targetValue: Cents;
  startMonth: MonthKey;
  endMonth: MonthKey;
  allocationType: GoalAllocationType;
  originalMonthlyTargetCents: Cents | null;
  createdAt: string;
  archived?: boolean;
};

export type GoalParticipant = {
  id: string;
  goalId: string;
  name: string;
  sharePercent: number | null;
  monthlyTargetCents: Cents | null;
  orderIndex: number;
};

export type Transaction = {
  id: string;
  goalId: string;
  type: TransactionType;
  value: Cents;
  date: string;
  participantId: string | null;
  source: string | null;
  note?: string;
  justification?: string;
  createdAt: string;
};

export type MonthPlanStatus = "completo" | "parcial" | "pendente";

export type MonthPlan = {
  month: MonthKey;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  /** Movimento líquido (aporte + rendimento - retirada) datado nesse mês de competência. */
  aportado: Cents;
  /** Necessidade mensal recalculada no momento da consulta. null para meses passados (histórico não é reescrito). */
  planned: Cents | null;
  remaining: Cents | null;
  status: MonthPlanStatus | null;
};

export type GoalSummary = {
  goal: Goal;
  months: MonthPlan[];
  targetValue: Cents;
  saldoInicial: Cents;
  totalAportes: Cents;
  totalRendimentos: Cents;
  totalRetiradas: Cents;
  /** Dinheiro que a meta realmente tem hoje: saldoInicial + aportes + rendimentos - retiradas. */
  saldoAtual: Cents;
  /** Alias de saldoAtual — nome histórico mantido para os totais agregados do Financeiro/Home. */
  totalAllocated: Cents;
  /** Quanto ainda falta para bater a meta (nunca negativo). */
  totalRemaining: Cents;
  mesesRestantesCount: number;
  /** Quanto precisa entrar por mês, nos meses que restam, para fechar a meta no prazo. */
  necessidadeMensalAtual: Cents;
  /** Quanto era necessário por mês quando a meta foi criada (congelado) — referência, não muda depois. */
  planoOriginalMensal: Cents;
  isReajustado: boolean;
  currentMonthPlan: MonthPlan | null;
  isCompleted: boolean;
  /** Prazo encerrado e ainda falta dinheiro. */
  isOverdue: boolean;
  excedente: Cents;
};

function sumByType(transactions: Transaction[], type: TransactionType): Cents {
  return transactions.reduce((acc, t) => (t.type === type ? acc + t.value : acc), 0);
}

export function goalTransactions(goalId: string, all: Transaction[]): Transaction[] {
  return all.filter((t) => t.goalId === goalId);
}

/** Movimento líquido datado num mês de competência específico (usado tanto para exibição quanto para status do mês). */
function netMovementInMonth(tx: Transaction[], month: MonthKey): Cents {
  return tx
    .filter((t) => dateToMonthKey(t.date) === month && t.type !== "saldo_inicial")
    .reduce((acc, t) => {
      if (t.type === "retirada") return acc - t.value;
      return acc + t.value;
    }, 0);
}

/**
 * Calcula o plano de uma meta pela regra "saldo + prazo": o que já existe (saldo inicial +
 * movimentações) reduz o que falta e reajusta a necessidade mensal dos meses que restam — nunca
 * "preenche" meses futuros automaticamente (sem waterfall/pool entre meses).
 */
export function computeGoalSummary(goal: Goal, allTransactions: Transaction[], today = new Date()): GoalSummary {
  const nowKey = dateToMonthKey(today.toISOString());
  const tx = goalTransactions(goal.id, allTransactions);
  const saldoInicial = sumByType(tx, "saldo_inicial");
  const totalAportes = sumByType(tx, "aporte");
  const totalRendimentos = sumByType(tx, "rendimento");
  const totalRetiradas = sumByType(tx, "retirada");
  const saldoAtual = saldoInicial + totalAportes + totalRendimentos - totalRetiradas;

  const totalRemaining = Math.max(0, goal.targetValue - saldoAtual);
  const excedente = Math.max(0, saldoAtual - goal.targetValue);
  const isCompleted = totalRemaining <= 0;

  const monthKeys = enumerateMonths(goal.startMonth, goal.endMonth);

  const planoOriginalMensal =
    goal.originalMonthlyTargetCents ??
    computeInitialMonthlyTarget(goal.targetValue, goal.startMonth, goal.endMonth, saldoInicial);

  const remainingMonthKeys = monthKeys.filter((m) => compareMonthKeys(m, nowKey) >= 0);
  const mesesRestantesCount = remainingMonthKeys.length;
  const isOverdue = !isCompleted && mesesRestantesCount === 0;

  const necessidadeMensalAtual =
    !isCompleted && mesesRestantesCount > 0 ? Math.round(totalRemaining / mesesRestantesCount) : 0;
  const isReajustado = !isCompleted && Math.abs(necessidadeMensalAtual - planoOriginalMensal) >= 1;

  const plannedDistribution = distributeCents(totalRemaining, Math.max(1, mesesRestantesCount));
  let plannedIdx = 0;

  const months: MonthPlan[] = monthKeys.map((month) => {
    const cmp = compareMonthKeys(month, nowKey);
    const isPast = cmp < 0;
    const isCurrent = cmp === 0;
    const isFuture = cmp > 0;
    const aportado = netMovementInMonth(tx, month);

    if (isPast) {
      return { month, isPast, isCurrent, isFuture, aportado, planned: null, remaining: null, status: null };
    }

    const planned = isCompleted ? 0 : (plannedDistribution[plannedIdx++] ?? 0);
    const remaining = Math.max(0, planned - aportado);
    let status: MonthPlanStatus;
    if (aportado >= planned) status = "completo";
    else if (aportado > 0) status = "parcial";
    else status = "pendente";

    return { month, isPast, isCurrent, isFuture, aportado, planned, remaining, status };
  });

  const currentMonthPlan = months.find((m) => m.isCurrent) ?? null;

  return {
    goal,
    months,
    targetValue: goal.targetValue,
    saldoInicial,
    totalAportes,
    totalRendimentos,
    totalRetiradas,
    saldoAtual,
    totalAllocated: saldoAtual,
    totalRemaining,
    mesesRestantesCount,
    necessidadeMensalAtual,
    planoOriginalMensal,
    isReajustado,
    currentMonthPlan,
    isCompleted,
    isOverdue,
    excedente,
  };
}

/** Necessidade mensal no momento da criação — usada para congelar goal.originalMonthlyTargetCents. */
export function computeInitialMonthlyTarget(
  targetValue: Cents,
  startMonth: MonthKey,
  endMonth: MonthKey,
  initialBalance: Cents
): Cents {
  const totalMonths = enumerateMonths(startMonth, endMonth).length;
  return Math.max(0, Math.round((targetValue - initialBalance) / totalMonths));
}

export type ParticipantContribution = {
  participant: GoalParticipant;
  contributed: Cents;
  personalTarget: Cents | null;
  remaining: Cents | null;
};

/**
 * Contribuição por participante — só aporte e saldo inicial contam (rendimento nunca é atribuído
 * a uma pessoa). Meta pessoal depende do tipo de divisão da meta; em "livre" não há meta pessoal.
 */
export function computeParticipantContributions(
  goal: Goal,
  participants: GoalParticipant[],
  allTransactions: Transaction[]
): ParticipantContribution[] {
  const tx = goalTransactions(goal.id, allTransactions).filter(
    (t) => t.type === "aporte" || t.type === "saldo_inicial"
  );

  return participants.map((p) => {
    const contributed = tx.filter((t) => t.participantId === p.id).reduce((acc, t) => acc + t.value, 0);

    let personalTarget: Cents | null = null;
    if (goal.allocationType === "igual" && participants.length > 0) {
      personalTarget = Math.round(goal.targetValue / participants.length);
    } else if (goal.allocationType === "percentual" && p.sharePercent != null) {
      personalTarget = Math.round((goal.targetValue * p.sharePercent) / 100);
    } else if (goal.allocationType === "valor_mensal" && p.monthlyTargetCents != null) {
      const totalMonths = enumerateMonths(goal.startMonth, goal.endMonth).length;
      personalTarget = p.monthlyTargetCents * totalMonths;
    }

    const remaining = personalTarget != null ? Math.max(0, personalTarget - contributed) : null;
    return { participant: p, contributed, personalTarget, remaining };
  });
}

/** Soma de percentuais dos participantes — o estado válido em "percentual" é exatamente 100%. */
export function sumSharePercent(participants: GoalParticipant[]): number {
  return participants.reduce((acc, p) => acc + (p.sharePercent ?? 0), 0);
}

/**
 * Distribui 100% igualmente entre N participantes (precisão de 0,01%), jogando o resto de
 * centésimos no último — usado para preencher automaticamente ao entrar no modo percentual.
 */
export function distributeEvenPercent(count: number): number[] {
  if (count <= 0) return [];
  const totalHundredths = 10000; // 100,00%
  const base = Math.floor(totalHundredths / count);
  const result = Array.from({ length: count }, () => base);
  result[count - 1] += totalHundredths - base * count;
  return result.map((v) => v / 100);
}

export type ValorMensalProjection = {
  totalProjectedCents: Cents;
  deficit: Cents;
  excess: Cents;
};

/** Projeta se a soma dos valores mensais dos participantes cobre a meta dentro do prazo. */
export function computeValorMensalProjection(goal: Goal, participants: GoalParticipant[]): ValorMensalProjection {
  const totalMonths = enumerateMonths(goal.startMonth, goal.endMonth).length;
  const totalProjectedCents = participants.reduce((acc, p) => acc + (p.monthlyTargetCents ?? 0), 0) * totalMonths;
  return {
    totalProjectedCents,
    deficit: Math.max(0, goal.targetValue - totalProjectedCents),
    excess: Math.max(0, totalProjectedCents - goal.targetValue),
  };
}

export type MovementImpact = {
  saldoBefore: Cents;
  saldoAfter: Cents;
  remainingBefore: Cents;
  remainingAfter: Cents;
  necessidadeMensalBefore: Cents;
  necessidadeMensalAfter: Cents;
};

/** Simula o impacto de um lançamento (de qualquer tipo) antes de confirmá-lo. */
export function previewMovementImpact(
  goal: Goal,
  allTransactions: Transaction[],
  type: TransactionType,
  value: Cents
): MovementImpact {
  const before = computeGoalSummary(goal, allTransactions);
  const hypothetical: Transaction = {
    id: "__preview__",
    goalId: goal.id,
    type,
    value,
    date: new Date().toISOString(),
    participantId: null,
    source: null,
    createdAt: new Date().toISOString(),
  };
  const after = computeGoalSummary(goal, [...allTransactions, hypothetical]);

  return {
    saldoBefore: before.saldoAtual,
    saldoAfter: after.saldoAtual,
    remainingBefore: before.totalRemaining,
    remainingAfter: after.totalRemaining,
    necessidadeMensalBefore: before.necessidadeMensalAtual,
    necessidadeMensalAfter: after.necessidadeMensalAtual,
  };
}
