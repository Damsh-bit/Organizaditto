"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pause, Play, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ingredientAmount } from "@/lib/recipes";
import { cn } from "@/lib/utils";

type Ingredient = { id: number; grams: number; note: string | null; food: { name: string; unitName: string | null; unitGrams: number | null } };

/** Detecta "20 minutos", "35-40 minutos", "1 minuto" en el texto del paso. */
function findMinutes(text: string): number | null {
  const m = text.match(/(\d+)(?:\s*-\s*(\d+))?\s*min/i);
  if (!m) return null;
  return Number(m[2] ?? m[1]);
}

function beep() {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.45;
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.start(t);
      o.stop(t + 0.4);
    }
  } catch {
    /* sin audio */
  }
}

export function CookMode({
  name,
  emoji,
  steps,
  ingredients,
  backHref,
}: {
  name: string;
  emoji: string | null;
  steps: string[];
  ingredients: Ingredient[];
  backHref: string;
}) {
  const [step, setStep] = useState(-1); // -1 = mise en place
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [timer, setTimer] = useState<{ total: number; left: number; running: boolean } | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  // Mantener la pantalla encendida mientras cocinás
  useEffect(() => {
    const request = async () => {
      try {
        wakeLock.current = await navigator.wakeLock?.request("screen");
      } catch {
        /* no soportado */
      }
    };
    request();
    const onVis = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      wakeLock.current?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!timer?.running) return;
    const id = setInterval(() => {
      setTimer((t) => {
        if (!t) return t;
        if (t.left <= 1) {
          beep();
          if ("vibrate" in navigator) navigator.vibrate?.([300, 150, 300]);
          return { ...t, left: 0, running: false };
        }
        return { ...t, left: t.left - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timer?.running]);

  const minutes = step >= 0 ? findMinutes(steps[step]) : null;
  const done = step >= steps.length;

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Salir
        </Link>
        <div className="truncate text-sm font-medium">
          {emoji} {name}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mb-6 flex gap-1">
        {[-1, ...steps.map((_, i) => i)].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-nutri" : "bg-muted")}
            aria-label={i < 0 ? "Ingredientes" : `Paso ${i + 1}`}
          />
        ))}
      </div>

      <div className="flex-1">
        {step < 0 ? (
          <div>
            <h2 className="mb-1 text-2xl font-semibold">Antes de empezar</h2>
            <p className="mb-4 text-muted-foreground">Juntá todo y marcá lo que ya tenés a mano.</p>
            <ul className="space-y-1">
              {ingredients.map((ing) => (
                <li key={ing.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted">
                    <Checkbox
                      checked={checked.has(ing.id)}
                      onCheckedChange={(v) => {
                        const n = new Set(checked);
                        if (v) n.add(ing.id);
                        else n.delete(ing.id);
                        setChecked(n);
                      }}
                    />
                    <span className={cn("flex-1 text-base", checked.has(ing.id) && "text-muted-foreground line-through")}>
                      {ing.food.name}
                      {ing.note && <span className="text-muted-foreground"> · {ing.note}</span>}
                    </span>
                    <span className="text-sm text-muted-foreground tabular">{ingredientAmount(ing.grams, ing.food)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : done ? (
          <div className="py-16 text-center">
            <div className="text-6xl">🎉</div>
            <h2 className="mt-4 text-2xl font-semibold">¡Listo! A disfrutar</h2>
            <p className="mt-2 text-muted-foreground">No te olvides de registrarlo en el diario.</p>
            <Button asChild className="mt-6">
              <Link href={backHref}>
                <Check className="size-4" /> Terminar
              </Link>
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-3 text-sm font-medium text-nutri">
              Paso {step + 1} de {steps.length}
            </div>
            <p className="text-2xl leading-relaxed font-medium md:text-3xl">{steps[step]}</p>
            {minutes && (
              <Button variant="outline" className="mt-6" onClick={() => setTimer({ total: minutes * 60, left: minutes * 60, running: true })}>
                <Timer className="size-4" /> Temporizador {minutes} min
              </Button>
            )}
          </div>
        )}
      </div>

      {timer && (
        <div
          className={cn(
            "mt-6 flex items-center gap-3 rounded-xl border p-3",
            timer.left === 0 && "animate-pulse border-nutri bg-nutri/10",
          )}
        >
          <Timer className="size-5 text-nutri" />
          <div className="flex-1 text-2xl font-semibold tabular">
            {String(Math.floor(timer.left / 60)).padStart(2, "0")}:{String(timer.left % 60).padStart(2, "0")}
          </div>
          {timer.left > 0 && (
            <Button variant="ghost" size="icon" onClick={() => setTimer({ ...timer, running: !timer.running })} aria-label="Pausar">
              {timer.running ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setTimer(null)} aria-label="Cerrar temporizador">
            <X className="size-4" />
          </Button>
        </div>
      )}

      {!done && (
        <div className="sticky bottom-20 mt-6 flex gap-2 md:bottom-4">
          <Button variant="outline" size="lg" className="flex-1" disabled={step < 0} onClick={() => setStep(step - 1)}>
            <ChevronLeft className="size-4" /> Anterior
          </Button>
          <Button size="lg" className="flex-1 bg-nutri text-white dark:text-neutral-950 hover:bg-nutri/90" onClick={() => setStep(step + 1)}>
            {step < 0 ? "Empezar" : step === steps.length - 1 ? "Terminar" : "Siguiente"} <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
