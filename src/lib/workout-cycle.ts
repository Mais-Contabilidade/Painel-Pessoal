import { startOfWeek } from "@/lib/week";

export type WeekVariant = "A" | "B";

export type WeekOverride = { weekStartDate: string; variant: WeekVariant };

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Resolve a variante (A/B) da semana que contém `date`. Prioriza um override manual
 * daquela semana; sem override, calcula pela paridade das semanas desde `cycleAnchorDate`
 * (a segunda-feira que marca o início de uma Semana A). Semana par a partir da âncora = A,
 * ímpar = B — funciona também para datas anteriores à âncora (módulo sempre não-negativo).
 */
export function resolveWeekVariant(
  date: Date,
  cycleAnchorDate: string,
  overrides: WeekOverride[]
): WeekVariant {
  const weekStart = startOfWeek(date);
  const weekStartISO = toISODate(weekStart);

  const override = overrides.find((o) => o.weekStartDate === weekStartISO);
  if (override) return override.variant;

  const anchorWeekStart = startOfWeek(new Date(`${cycleAnchorDate}T00:00:00`));
  const diffWeeks = Math.round((weekStart.getTime() - anchorWeekStart.getTime()) / MS_PER_WEEK);
  const parity = ((diffWeeks % 2) + 2) % 2;
  return parity === 0 ? "A" : "B";
}

export function currentWeekStartISO(date: Date = new Date()): string {
  return toISODate(startOfWeek(date));
}
