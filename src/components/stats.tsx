import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtInt } from "@/lib/format";

export function ProgressBar({
  value,
  max,
  className,
  barClassName = "bg-primary",
  overClassName = "bg-destructive",
  height = "h-2",
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
  overClassName?: string;
  height?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max * 1.02;
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-muted", height, className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", over ? overClassName : barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 132,
  stroke = 12,
  color = "var(--primary)",
  children,
  className,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const over = max > 0 && value > max * 1.02;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "var(--destructive)" : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
  valueClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("tabular mt-0.5 text-lg font-semibold tracking-tight", valueClassName)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function MacroBar({
  label,
  value,
  target,
  color,
  unit = "g",
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular text-muted-foreground">
          {fmtInt(value)} / {fmtInt(target)} {unit}
        </span>
      </div>
      <ProgressBar value={value} max={target} barClassName={color} overClassName={color + " opacity-70"} />
    </div>
  );
}

export function EmptyState({
  emoji = "✨",
  title,
  description,
  action,
  className,
}: {
  emoji?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center", className)}>
      <div className="text-4xl">{emoji}</div>
      <div className="mt-3 font-medium">{title}</div>
      {description && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DateNav({
  label,
  sublabel,
  prevHref,
  nextHref,
  todayHref,
}: {
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  prevHref: string;
  nextHref: string;
  todayHref?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border bg-card p-1.5">
      <Link href={prevHref} className="grid size-9 place-items-center rounded-lg hover:bg-muted" aria-label="Anterior" scroll={false}>
        <ChevronLeft className="size-4" />
      </Link>
      <div className="min-w-0 text-center">
        <div className="truncate text-sm font-semibold">{label}</div>
        {sublabel && <div className="truncate text-xs text-muted-foreground">{sublabel}</div>}
        {todayHref && (
          <Link href={todayHref} className="text-xs font-medium text-primary hover:underline" scroll={false}>
            Volver a hoy
          </Link>
        )}
      </div>
      <Link href={nextHref} className="grid size-9 place-items-center rounded-lg hover:bg-muted" aria-label="Siguiente" scroll={false}>
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground", className)}>
      {children}
    </span>
  );
}
