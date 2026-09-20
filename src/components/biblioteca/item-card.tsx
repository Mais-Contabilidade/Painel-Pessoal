import { Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { KIND_LABEL, statusLabel, isDone } from "@/lib/library";
import type { LibraryItemRow } from "@/lib/supabase/types";

export function LibraryItemCard({ item, onOpen }: { item: LibraryItemRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-text-faint"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-text">{item.title}</p>
          {item.subtitle && <p className="truncate text-[12.5px] text-text-muted">{item.subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {item.favorite && <Star size={13} className="text-warning" fill="currentColor" />}
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-text-muted">
            {KIND_LABEL[item.kind]}
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-[12px] text-text-faint">{statusLabel(item.kind, item.status)}</p>
      {!isDone(item.status) && item.progress_percent != null && (
        <Progress value={item.progress_percent} className="mt-2" />
      )}
    </button>
  );
}
