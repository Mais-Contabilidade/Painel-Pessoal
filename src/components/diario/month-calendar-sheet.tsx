"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { buildMonthGrid, addMonthsISO, todayISO } from "@/lib/journal";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function MonthCalendarSheet({
  selected,
  hasEntry,
  onSelect,
  onClose,
}: {
  selected: string;
  hasEntry: (iso: string) => boolean;
  onSelect: (iso: string) => void;
  onClose: () => void;
}) {
  const [monthIso, setMonthIso] = useState(`${selected.slice(0, 7)}-01`);
  const weeks = buildMonthGrid(monthIso);
  const monthDate = new Date(`${monthIso}T00:00:00`);
  const today = todayISO();

  return (
    <Sheet onClose={onClose} title="Calendário">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthIso(addMonthsISO(monthIso, -1))}
          aria-label="Mês anterior"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-[14px] font-medium text-text">
          {MONTH_LABELS[monthDate.getMonth()]} {monthDate.getFullYear()}
        </p>
        <button
          type="button"
          onClick={() => setMonthIso(addMonthsISO(monthIso, 1))}
          aria-label="Próximo mês"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i} className="text-[11px] font-medium text-text-faint">
            {w}
          </span>
        ))}
        {weeks.flat().map((cell) => (
          <button
            key={cell.iso}
            type="button"
            onClick={() => {
              onSelect(cell.iso);
              onClose();
            }}
            className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[13px] transition-colors ${
              cell.iso === selected
                ? "bg-accent text-white"
                : cell.inMonth
                  ? "text-text hover:bg-surface-2"
                  : "text-text-faint hover:bg-surface-2"
            } ${cell.isToday && cell.iso !== selected ? "font-semibold text-accent" : ""}`}
          >
            {new Date(`${cell.iso}T00:00:00`).getDate()}
            <span
              className={`h-1 w-1 rounded-full ${
                hasEntry(cell.iso) ? (cell.iso === selected ? "bg-white" : "bg-accent") : "bg-transparent"
              }`}
            />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setMonthIso(`${today.slice(0, 7)}-01`);
          onSelect(today);
        }}
        className="mt-3 text-[12.5px] font-medium text-accent"
      >
        Ir para hoje
      </button>
    </Sheet>
  );
}
