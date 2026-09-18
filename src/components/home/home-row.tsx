"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export function HomeRow({
  href,
  icon: Icon,
  title,
  subtitle,
  extra,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  extra?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-text-faint"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-muted">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium text-text">{title}</p>
        <p className="truncate text-[13px] text-text-muted">{subtitle}</p>
        {extra}
      </div>
      <ChevronRight size={16} className="shrink-0 text-text-faint" />
    </Link>
  );
}
