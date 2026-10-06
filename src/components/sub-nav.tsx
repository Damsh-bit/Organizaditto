"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SubNavItem = { href: string; label: string; exact?: boolean };

export function SubNav({ items, accent = "bg-primary" }: { items: SubNavItem[]; accent?: string }) {
  const pathname = usePathname();
  return (
    <div className="scrollbar-none -mx-4 mb-5 overflow-x-auto px-4 md:mx-0 md:px-0">
      <nav className="flex w-max gap-1 rounded-xl border bg-muted/40 p-1">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && <span className={cn("absolute inset-x-3 -bottom-px h-0.5 rounded-full", accent)} />}
              {it.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
