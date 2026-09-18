"use client";

import { Star } from "lucide-react";
import type { Insight } from "@/store/insights-store";
import { formatRelative } from "@/lib/format";

export function InsightCard({ insight, onOpen }: { insight: Insight; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-text-faint"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14.5px] font-medium text-text line-clamp-1">
          {insight.title || insight.content}
        </p>
        {insight.favorite && (
          <Star size={14} className="mt-0.5 shrink-0 text-warning" fill="currentColor" />
        )}
      </div>
      {insight.title && (
        <p className="mt-1 text-[13.5px] text-text-muted line-clamp-2">{insight.content}</p>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {insight.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] text-text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="shrink-0 text-[11.5px] text-text-faint">
          {formatRelative(insight.updatedAt)}
        </span>
      </div>
    </button>
  );
}
