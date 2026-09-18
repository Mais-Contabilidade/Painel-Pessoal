"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { useInsightsStore } from "@/store/insights-store";

export function HomeInsightCard() {
  const insights = useInsightsStore((s) => s.insights);

  const insight = useMemo(() => {
    const favorites = insights.filter((i) => i.favorite);
    const pool = favorites.length > 0 ? favorites : insights;
    return [...pool].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null;
  }, [insights]);

  return (
    <Link
      href="/insights"
      className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-text-faint"
    >
      <div className="flex items-center gap-2">
        <Lightbulb size={16} className="text-text-faint" />
        <p className="text-[12.5px] font-medium text-text-muted">Insight</p>
      </div>
      {insight ? (
        <>
          <p className="mt-1 line-clamp-1 text-[15px] font-medium text-text">
            {insight.title || insight.content}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-text-muted">
            {insight.title ? insight.content : (insight.tags[0] ?? "Toque para ver mais")}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[14px] text-text-muted">Guarde uma ideia ou aprendizado.</p>
      )}
    </Link>
  );
}
