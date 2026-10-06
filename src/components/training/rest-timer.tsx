"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { beep } from "@/lib/beep";
import { cn } from "@/lib/utils";

/** Temporizador de descanso entre series. */
export function RestTimer() {
  const [t, setT] = useState<{ total: number; left: number; running: boolean } | null>(null);

  useEffect(() => {
    if (!t?.running) return;
    const id = setInterval(() => {
      setT((cur) => {
        if (!cur) return cur;
        if (cur.left <= 1) {
          beep();
          return { ...cur, left: 0, running: false };
        }
        return { ...cur, left: cur.left - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [t?.running]);

  if (!t) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Timer className="size-3.5" /> Descanso:
        </span>
        {[60, 90, 120, 180].map((s) => (
          <Button key={s} type="button" size="xs" variant="outline" onClick={() => setT({ total: s, left: s, running: true })}>
            {s < 120 ? `${s} s` : `${s / 60} min`}
          </Button>
        ))}
      </div>
    );
  }

  const pct = (t.left / t.total) * 100;
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-2", t.left === 0 && "animate-pulse border-gym bg-gym/10")}>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 bg-gym transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right text-lg font-semibold tabular">
        {Math.floor(t.left / 60)}:{String(t.left % 60).padStart(2, "0")}
      </span>
      {t.left > 0 && (
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => setT({ ...t, running: !t.running })} aria-label="Pausar">
          {t.running ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
      )}
      <Button type="button" size="icon-sm" variant="ghost" onClick={() => setT(null)} aria-label="Cerrar">
        <X className="size-4" />
      </Button>
    </div>
  );
}
