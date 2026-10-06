import { Flame } from "lucide-react";
import { MacroBar, Ring } from "@/components/stats";
import type { DaySummary } from "@/lib/data/nutrition";
import type { Targets } from "@/lib/nutrition";
import { fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CalorieSummary({ summary, targets, compact = false }: { summary: DaySummary; targets: Targets; compact?: boolean }) {
  const remaining = summary.remaining;
  const over = remaining < 0;
  return (
    <div className={cn("flex flex-col gap-4", !compact && "sm:flex-row sm:items-center")}>
      <div className="flex items-center gap-4">
        <Ring value={summary.totals.kcal} max={summary.budget} size={compact ? 112 : 136} color="var(--nutri)">
          <div>
            <div className={cn("text-2xl font-semibold tracking-tight tabular", over && "text-destructive")}>
              {fmtInt(Math.abs(remaining))}
            </div>
            <div className="text-[11px] leading-tight text-muted-foreground">{over ? "kcal de más" : "kcal restantes"}</div>
          </div>
        </Ring>
        <div className="space-y-1 text-sm">
          <Row label="Objetivo" value={fmtInt(targets.target)} />
          <Row label="Comido" value={`− ${fmtInt(summary.totals.kcal)}`} />
          {summary.exerciseKcal > 0 && (
            <Row
              label={
                <span className="flex items-center gap-1">
                  <Flame className="size-3.5 text-gym" /> Ejercicio
                </span>
              }
              value={`+ ${fmtInt(summary.exerciseBonus)}`}
              hint={`quemaste ${fmtInt(summary.exerciseKcal)}`}
            />
          )}
          <div className="border-t pt-1">
            <Row label="Disponible" value={fmtInt(summary.budget)} strong />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        <MacroBar label="Proteínas" value={summary.totals.protein} target={targets.protein} color="bg-rose-500" />
        <MacroBar label="Carbohidratos" value={summary.totals.carbs} target={targets.carbs} color="bg-amber-500" />
        <MacroBar label="Grasas" value={summary.totals.fat} target={targets.fat} color="bg-sky-500" />
      </div>
    </div>
  );
}

function Row({ label, value, hint, strong }: { label: React.ReactNode; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular", strong && "font-semibold")}>
        {value}
        {hint && <span className="ml-1 text-[11px] text-muted-foreground">({hint})</span>}
      </span>
    </div>
  );
}
