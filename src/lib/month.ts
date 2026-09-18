/** Competência mensal representada como string "YYYY-MM". */
export type MonthKey = string;

const MONTH_LABELS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function monthKey(year: number, monthIndex0: number): MonthKey {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: MonthKey): { year: number; monthIndex0: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y, monthIndex0: m - 1 };
}

export function currentMonthKey(): MonthKey {
  const now = new Date();
  return monthKey(now.getFullYear(), now.getMonth());
}

export function dateToMonthKey(iso: string): MonthKey {
  const d = new Date(iso);
  return monthKey(d.getFullYear(), d.getMonth());
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const { year, monthIndex0 } = parseMonthKey(key);
  const total = year * 12 + monthIndex0 + delta;
  return monthKey(Math.floor(total / 12), ((total % 12) + 12) % 12);
}

export function compareMonthKeys(a: MonthKey, b: MonthKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Número de meses entre start e end, inclusive (mínimo 1). */
export function monthsBetweenInclusive(start: MonthKey, end: MonthKey): number {
  const a = parseMonthKey(start);
  const b = parseMonthKey(end);
  const diff = (b.year - a.year) * 12 + (b.monthIndex0 - a.monthIndex0);
  return Math.max(1, diff + 1);
}

export function enumerateMonths(start: MonthKey, end: MonthKey): MonthKey[] {
  const n = monthsBetweenInclusive(start, end);
  return Array.from({ length: n }, (_, i) => addMonths(start, i));
}

export function monthLabel(key: MonthKey): string {
  const { year, monthIndex0 } = parseMonthKey(key);
  return `${MONTH_LABELS_SHORT[monthIndex0]}/${String(year).slice(2)}`;
}

export function monthLabelLong(key: MonthKey): string {
  const { year, monthIndex0 } = parseMonthKey(key);
  const full = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  return `${full[monthIndex0]} de ${year}`;
}
