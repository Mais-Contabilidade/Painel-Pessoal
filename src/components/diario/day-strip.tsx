"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO, todayISO } from "@/lib/journal";

const WINDOW = 3;

export function DayStrip({
  selected,
  hasEntry,
  onSelect,
}: {
  selected: string;
  hasEntry: (iso: string) => boolean;
  onSelect: (iso: string) => void;
}) {
  const today = todayISO();
  const days = Array.from({ length: WINDOW * 2 + 1 }, (_, i) => addDaysISO(selected, i - WINDOW));

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onSelect(addDaysISO(selected, -1))}
        aria-label="Dia anterior"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex flex-1 justify-between gap-1 overflow-x-auto">
        {days.map((iso) => {
          const d = new Date(`${iso}T00:00:00`);
          const isSelected = iso === selected;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`flex w-11 shrink-0 flex-col items-center gap-1 rounded-xl py-2 transition-colors ${
                isSelected ? "bg-accent text-white" : "text-text-muted hover:bg-surface-2"
              }`}
            >
              <span className="text-[10.5px] leading-none">
                {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][d.getDay()]}
              </span>
              <span className={`text-[14px] font-medium leading-none ${isToday && !isSelected ? "text-accent" : ""}`}>
                {d.getDate()}
              </span>
              <span
                className={`h-1 w-1 rounded-full ${
                  hasEntry(iso) ? (isSelected ? "bg-white" : "bg-accent") : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect(addDaysISO(selected, 1))}
        aria-label="Próximo dia"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
