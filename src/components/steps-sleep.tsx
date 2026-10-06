"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Footprints, Minus, Moon, Plus } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "@/components/stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setDayMetric } from "@/app/actions/nutrition";
import { fmtDec, fmtInt, parseNum } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Pasos del día y horas dormidas anoche, con su objetivo. */
export function StepsSleep({
  date,
  steps,
  sleepHours,
  stepsGoal,
  sleepGoal,
}: {
  date: string;
  steps: number | null;
  sleepHours: number | null;
  stepsGoal: number;
  sleepGoal: number;
}) {
  const [optSleep, setOptSleep] = useOptimistic(sleepHours);
  const [optSteps, setOptSteps] = useOptimistic(steps);
  const [draft, setDraft] = useState<string | null>(null);
  const [, start] = useTransition();

  const save = (field: "steps" | "sleepHours", value: number | null) =>
    start(async () => {
      if (field === "steps") setOptSteps(value);
      else setOptSleep(value);
      const res = await setDayMetric(date, field, value);
      if (!res.ok) toast.error(res.error);
    });

  const changeSleep = (delta: number) => {
    // Si todavía no cargó nada, el primer toque pone el objetivo como punto de partida.
    const next = optSleep == null ? sleepGoal : optSleep + delta;
    save("sleepHours", Math.min(14, Math.max(0, next)));
  };

  const commitSteps = () => {
    if (draft == null) return;
    const v = draft.trim() === "" ? null : parseNum(draft.replace(/\./g, ""));
    setDraft(null);
    if (v === optSteps || (v != null && !Number.isFinite(v))) return;
    save("steps", v);
  };

  const sleepTone = optSleep == null ? "" : optSleep >= sleepGoal ? "text-success" : optSleep < sleepGoal - 1 ? "text-warning" : "";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`steps-${date}`} className="flex items-center gap-1.5 text-sm font-medium">
            <Footprints className="size-4 text-gym" /> Pasos
          </label>
          <span className="tabular text-xs text-muted-foreground">objetivo {fmtInt(stepsGoal)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id={`steps-${date}`}
            inputMode="numeric"
            placeholder="Del celular o reloj"
            className="h-8 w-36"
            value={draft ?? (optSteps != null ? fmtInt(optSteps) : "")}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitSteps}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <ProgressBar value={optSteps ?? 0} max={stepsGoal} className="flex-1" barClassName="bg-gym" overClassName="bg-gym" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Moon className="size-4 text-indigo-500" /> Dormiste anoche
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon-sm" aria-label="Media hora menos" onClick={() => changeSleep(-0.5)}>
            <Minus className="size-3.5" />
          </Button>
          <span className={cn("tabular w-14 text-center text-sm font-semibold", sleepTone)}>
            {optSleep == null ? "—" : `${fmtDec(optSleep, optSleep % 1 ? 1 : 0)} h`}
          </span>
          <Button variant="outline" size="icon-sm" aria-label="Media hora más" onClick={() => changeSleep(0.5)}>
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>
      {optSleep == null && <p className="text-[11px] text-muted-foreground">Tocá + o − para cargarlo (arranca en tu objetivo de {fmtDec(sleepGoal, 1)} h).</p>}
    </div>
  );
}
