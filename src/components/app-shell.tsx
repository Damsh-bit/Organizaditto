"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Baby, Briefcase, Dumbbell, Home, Salad, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export const NAV = [
  { href: "/", label: "Inicio", icon: Home, color: "text-primary" },
  { href: "/nutricion", label: "Nutrición", icon: Salad, color: "text-nutri" },
  { href: "/entrenamiento", label: "Entreno", icon: Dumbbell, color: "text-gym" },
  { href: "/trabajo", label: "Trabajo", icon: Briefcase, color: "text-work" },
  { href: "/bebe", label: "Bebé", icon: Baby, color: "text-baby" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-xl bg-primary text-base text-primary-foreground shadow-sm">
        O
      </span>
      <span>Organizaditto</span>
    </Link>
  );
}

export function AppShell({ children, banner }: { children: React.ReactNode; banner?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 md:flex">
        <div className="px-2 pb-6">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className={cn("size-4", active && item.color)} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <Link
            href="/ajustes"
            className={cn(
              "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(pathname, "/ajustes") ? "bg-sidebar-accent" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Settings className="size-4" />
            Ajustes
          </Link>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header móvil */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:hidden">
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/ajustes"
              aria-label="Ajustes"
              className={cn(
                "grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted",
                isActive(pathname, "/ajustes") && "bg-muted text-foreground",
              )}
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </header>

        {banner}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>

      {/* Navegación inferior móvil */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-muted")}>
                  <item.icon className={cn("size-5", active && item.color)} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
