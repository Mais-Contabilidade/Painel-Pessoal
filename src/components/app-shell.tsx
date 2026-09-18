"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav-items";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <aside className="hidden md:flex md:w-[72px] md:flex-col md:items-center md:border-r md:border-border md:py-5">
        <div className="mb-6 h-8 w-8 rounded-lg bg-accent" aria-hidden />
        <nav className="flex flex-1 flex-col items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex w-14 flex-col items-center gap-1 rounded-xl py-2.5 transition-colors ${
                  active ? "text-accent" : "text-text-faint hover:text-text-muted"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    active ? "bg-accent-soft" : "group-hover:bg-surface-2"
                  }`}
                >
                  <Icon size={19} strokeWidth={2} />
                </span>
                <span className="text-[10.5px] leading-none font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              <Icon
                size={21}
                strokeWidth={2}
                className={active ? "text-accent" : "text-text-faint"}
              />
              <span
                className={`text-[11px] leading-none font-medium ${
                  active ? "text-accent" : "text-text-faint"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
