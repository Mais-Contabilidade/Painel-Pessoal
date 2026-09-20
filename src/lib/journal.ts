export type JournalEntry = {
  id: string;
  entryDate: string;
  daySummary: string;
  gratitude: string;
  reflection: string;
  notes: string | null;
};

function localDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return localDateToISO(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const base = isoToLocalDate(iso);
  base.setDate(base.getDate() + days);
  return localDateToISO(base);
}

export function addMonthsISO(iso: string, months: number): string {
  const base = isoToLocalDate(iso);
  base.setMonth(base.getMonth() + months);
  return localDateToISO(base);
}

export type CalendarCell = { iso: string; inMonth: boolean; isToday: boolean };

/** Grade de semanas (dom-sáb) cobrindo o mês inteiro de `monthIso` (YYYY-MM-01). */
export function buildMonthGrid(monthIso: string): CalendarCell[][] {
  const first = isoToLocalDate(monthIso);
  const year = first.getFullYear();
  const month = first.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const today = todayISO();

  const cells: CalendarCell[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = localDateToISO(d);
    return { iso, inMonth: d.getMonth() === month, isToday: iso === today };
  });

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export type RevisitCandidate = { label: string; iso: string };

/** Datas candidatas a "revisitar" a partir de uma data selecionada — só as que tiverem entrada são mostradas pelo chamador. */
export function revisitCandidates(selectedIso: string): RevisitCandidate[] {
  return [
    { label: "7 dias atrás", iso: addDaysISO(selectedIso, -7) },
    { label: "30 dias atrás", iso: addDaysISO(selectedIso, -30) },
    { label: "1 mês atrás (mesma data)", iso: addMonthsISO(selectedIso, -1) },
    { label: "1 ano atrás (mesma data)", iso: addMonthsISO(selectedIso, -12) },
  ];
}
