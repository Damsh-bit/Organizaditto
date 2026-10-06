"use client";

import { useOptimistic, useTransition } from "react";
import { Droplet, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addWater } from "@/app/actions/nutrition";
import { fmtDec } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WaterTracker({ date, ml, goal }: { date: string; ml: number; goal: number }) {
  const [optimistic, setOptimistic] = useOptimistic(ml);
  const [, start] = useTransition();
  const glasses = Math.max(8, Math.ceil(goal / 250));
  const filled = Math.floor(optimistic / 250);

  const change = (delta: number) =>
    start(async () => {
      setOptimistic(Math.max(0, optimistic + delta));
      await addWater(date, delta);
    });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Droplet className="size-4 text-sky-500" /> Agua
        </div>
        <div className="text-xs text-muted-foreground tabular">
          {fmtDec(optimistic / 1000, 2)} / {fmtDec(goal / 1000, 1)} L
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => change(-250)} aria-label="Quitar un vaso" disabled={optimistic <= 0}>
          <Minus className="size-3.5" />
        </Button>
        <div className="flex flex-1 flex-wrap gap-1">
          {Array.from({ length: glasses }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => change(i < filled ? -250 : 250)}
              className={cn(
                "h-6 flex-1 rounded-md border transition-colors",
                i < filled ? "border-sky-400 bg-sky-400/80" : "border-dashed border-muted-foreground/30 hover:bg-sky-100 dark:hover:bg-sky-950",
              )}
              aria-label={`Vaso ${i + 1}`}
            />
          ))}
        </div>
        <Button variant="outline" size="icon-sm" onClick={() => change(250)} aria-label="Sumar un vaso">
          <Plus className="size-3.5" />
        </Button>
      </div>
      <div className="text-[11px] text-muted-foreground">Cada cuadradito = 1 vaso de 250 ml</div>
    </div>
  );
}
