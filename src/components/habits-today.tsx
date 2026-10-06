"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleHabit } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

type Habit = { id: number; name: string; emoji: string | null; targetPerWeek: number; doneToday: boolean; weekCount: number };

export function HabitsToday({ habits, today }: { habits: Habit[]; today: string }) {
  const [state, setState] = useOptimistic(habits);
  const [, start] = useTransition();
  return (
    <ul className="space-y-1.5">
      {state.map((h) => (
        <li key={h.id}>
          <button
            type="button"
            onClick={() =>
              start(async () => {
                setState(state.map((x) => (x.id === h.id ? { ...x, doneToday: !x.doneToday, weekCount: x.weekCount + (x.doneToday ? -1 : 1) } : x)));
                await toggleHabit(h.id, today);
              })
            }
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
              h.doneToday ? "border-primary/40 bg-primary/10" : "hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                h.doneToday ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
              )}
            >
              {h.doneToday && <Check className="size-3.5" />}
            </span>
            <span className="text-lg leading-none">{h.emoji}</span>
            <span className={cn("min-w-0 flex-1 truncate text-sm", h.doneToday && "font-medium")}>{h.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular">
              {h.weekCount}/{h.targetPerWeek}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
