"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useJournalStore } from "@/store/journal-store";
import { useSupabase } from "@/lib/supabase-provider";
import { useMounted } from "@/lib/use-mounted";
import { todayISO, revisitCandidates } from "@/lib/journal";
import { formatDateWeekday, formatDateShort } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { DayStrip } from "@/components/diario/day-strip";
import { MonthCalendarSheet } from "@/components/diario/month-calendar-sheet";
import { EntryForm } from "@/components/diario/entry-form";

export default function DiarioPage() {
  const mounted = useMounted();
  const supabase = useSupabase();
  const status = useJournalStore((s) => s.status);
  const errorMessage = useJournalStore((s) => s.errorMessage);
  const entries = useJournalStore((s) => s.entries);
  const initialize = useJournalStore((s) => s.initialize);

  const [selected, setSelected] = useState(todayISO());
  const [showCalendar, setShowCalendar] = useState(false);

  const entryDates = useMemo(
    () => new Set(entries.map((e) => e.entryDate)),
    [entries]
  );
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (a.entryDate < b.entryDate ? -1 : 1)),
    [entries]
  );

  const current = entries.find((e) => e.entryDate === selected) ?? null;

  if (!mounted) return null;

  const prevEntry = [...sortedEntries].reverse().find((e) => e.entryDate < selected) ?? null;
  const nextEntry = sortedEntries.find((e) => e.entryDate > selected) ?? null;

  const revisit = revisitCandidates(selected)
    .map((c) => ({ ...c, entry: entries.find((e) => e.entryDate === c.iso) ?? null }))
    .filter((c) => c.entry !== null);

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6 pb-10">
      <PageHeader
        title="Diário"
        action={
          <button
            type="button"
            onClick={() => setShowCalendar(true)}
            aria-label="Abrir calendário"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <CalendarDays size={18} />
          </button>
        }
      />

      {status === "error" && (
        <div className="mb-4 rounded-xl border border-danger-soft bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
          {errorMessage ?? "Não foi possível carregar o diário."}{" "}
          <button type="button" className="font-medium underline" onClick={() => supabase && initialize(supabase)}>
            Tentar novamente
          </button>
        </div>
      )}

      <DayStrip selected={selected} hasEntry={(iso) => entryDates.has(iso)} onSelect={setSelected} />

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          disabled={!prevEntry}
          onClick={() => prevEntry && setSelected(prevEntry.entryDate)}
          className="flex items-center gap-1 text-[12.5px] font-medium text-text-muted disabled:opacity-30"
        >
          <ChevronLeft size={14} /> Entrada anterior
        </button>
        <p className="text-[14px] font-medium text-text">{formatDateWeekday(`${selected}T00:00:00`)}</p>
        <button
          type="button"
          disabled={!nextEntry}
          onClick={() => nextEntry && setSelected(nextEntry.entryDate)}
          className="flex items-center gap-1 text-[12.5px] font-medium text-text-muted disabled:opacity-30"
        >
          Entrada seguinte <ChevronRight size={14} />
        </button>
      </div>

      <div className="mt-4">
        <EntryForm key={selected} entryDate={selected} initialEntry={current} />
      </div>

      {revisit.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 px-1 text-[12.5px] font-medium text-text-muted">Revisitar</p>
          <div className="space-y-1.5">
            {revisit.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setSelected(r.iso)}
                className="block w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-left transition-colors hover:border-text-faint"
              >
                <p className="text-[12px] font-medium text-text-muted">
                  {r.label} · {formatDateShort(`${r.iso}T00:00:00`)}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[13px] text-text">{r.entry?.daySummary}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {showCalendar && (
        <MonthCalendarSheet
          selected={selected}
          hasEntry={(iso) => entryDates.has(iso)}
          onSelect={setSelected}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
