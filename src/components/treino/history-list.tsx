import { CalendarX2 } from "lucide-react";
import type { WorkoutHistoryEntry } from "@/store/workout-store";
import { formatDateWeekday, formatDurationShort } from "@/lib/format";

export function HistoryList({ history }: { history: WorkoutHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <CalendarX2 size={28} className="text-text-faint" />
        <p className="text-[13.5px] text-text-muted">Nenhum treino concluído ainda.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {history.map((h) => (
        <li
          key={h.id}
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5"
        >
          <div>
            <p className="text-[14.5px] font-medium text-text">{h.dayName}</p>
            <p className="mt-0.5 text-[13px] text-text-muted">
              {formatDateWeekday(h.date)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[14px] font-medium text-text">{formatDurationShort(h.durationMs)}</p>
            <p className="mt-0.5 text-[12.5px] text-text-muted">
              {h.completedSets}/{h.totalSets} séries
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
