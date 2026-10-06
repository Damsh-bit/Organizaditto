"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Flame, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/form-fields";
import { saveWorkout } from "@/app/actions/training";
import { fmtDec, fmtInt, parseNum } from "@/lib/format";
import { estimateWorkoutKcal, INTENSITIES, WORKOUT_TYPES } from "@/lib/training";
import { cn } from "@/lib/utils";
import { ExercisePicker, type ExerciseOpt } from "./exercise-picker";
import { RestTimer } from "./rest-timer";

type SetRow = { reps: string; weightKg: string; durationMin: string; distanceKm: string };
type Block = { key: number; exercise: ExerciseOpt; sets: SetRow[]; hint?: string };

export type WorkoutFormInitial = {
  id?: number;
  date: string;
  type: string;
  title: string;
  routineId: number | null;
  durationMin: number;
  intensity: "baja" | "media" | "alta";
  rpe: number | null;
  kcalBurned: number | null;
  kcalManual: boolean;
  notes: string;
  blocks: { exerciseId: number; sets: { reps: number | null; weightKg: number | null; durationSec: number | null; distanceKm: number | null }[] }[];
};

export type RoutineOpt = {
  id: number;
  name: string;
  workoutType: string;
  estMinutes: number | null;
  exercises: { exerciseId: number; sets: number; reps: string }[];
};

let seq = 1;
const emptySet = (): SetRow => ({ reps: "", weightKg: "", durationMin: "", distanceKm: "" });

function firstNumber(s: string) {
  const m = s.match(/\d+(?:[.,]\d+)?/);
  return m ? m[0].replace(",", ".") : "";
}

export function WorkoutForm({
  initial,
  exercises,
  routines,
  lastSets,
  weightKg,
}: {
  initial: WorkoutFormInitial;
  exercises: ExerciseOpt[];
  routines: RoutineOpt[];
  lastSets: Record<number, { reps: number | null; weightKg: number | null; date: string }>;
  weightKg: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const hintFor = (id: number) => {
    const l = lastSets[id];
    if (!l) return undefined;
    return `Última vez: ${l.reps ?? "?"} reps${l.weightKg ? ` × ${fmtDec(l.weightKg)} kg` : ""}`;
  };

  const [v, setV] = useState({
    date: initial.date,
    type: initial.type,
    title: initial.title,
    routineId: initial.routineId,
    durationMin: String(initial.durationMin),
    intensity: initial.intensity,
    rpe: initial.rpe ? String(initial.rpe) : "",
    kcalManual: initial.kcalManual,
    kcal: initial.kcalBurned != null ? String(initial.kcalBurned) : "",
    notes: initial.notes,
  });
  const [blocks, setBlocks] = useState<Block[]>(() =>
    initial.blocks
      .filter((b) => exById.has(b.exerciseId))
      .map((b) => ({
        key: seq++,
        exercise: exById.get(b.exerciseId)!,
        hint: hintFor(b.exerciseId),
        sets: b.sets.map((s) => ({
          reps: s.reps?.toString() ?? "",
          weightKg: s.weightKg?.toString() ?? "",
          durationMin: s.durationSec ? String(Math.round(s.durationSec / 60)) : "",
          distanceKm: s.distanceKm?.toString() ?? "",
        })),
      })),
  );

  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));
  const minutes = parseNum(v.durationMin) ?? 0;
  const estimated = estimateWorkoutKcal(v.type, v.intensity, weightKg, minutes);

  function loadRoutine(id: number | null) {
    set("routineId", id);
    const r = routines.find((x) => x.id === id);
    if (!r) return;
    setV((p) => ({ ...p, routineId: id, type: r.workoutType, title: p.title || r.name, durationMin: r.estMinutes ? String(r.estMinutes) : p.durationMin }));
    setBlocks(
      r.exercises
        .filter((e) => exById.has(e.exerciseId))
        .map((e) => {
          const ex = exById.get(e.exerciseId)!;
          const last = lastSets[e.exerciseId];
          const cardio = ex.kind === "cardio";
          return {
            key: seq++,
            exercise: ex,
            hint: hintFor(e.exerciseId),
            sets: Array.from({ length: cardio ? 1 : e.sets }, () => ({
              reps: cardio ? "" : firstNumber(e.reps),
              weightKg: last?.weightKg ? String(last.weightKg) : "",
              durationMin: cardio ? firstNumber(e.reps) : "",
              distanceKm: "",
            })),
          };
        }),
    );
  }

  const updateSet = (key: number, i: number, patch: Partial<SetRow>) =>
    setBlocks((bs) => bs.map((b) => (b.key === key ? { ...b, sets: b.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) } : b)));

  function submit() {
    const sets = blocks.flatMap((b) =>
      b.sets
        .filter((s) => s.reps || s.weightKg || s.durationMin || s.distanceKm)
        .map((s, i) => ({
          exerciseId: b.exercise.id,
          setNumber: i + 1,
          reps: parseNum(s.reps) != null ? Math.round(parseNum(s.reps)!) : null,
          weightKg: parseNum(s.weightKg),
          durationSec: parseNum(s.durationMin) != null ? Math.round(parseNum(s.durationMin)! * 60) : null,
          distanceKm: parseNum(s.distanceKm),
        })),
    );
    start(async () => {
      const res = await saveWorkout({
        id: initial.id,
        date: v.date,
        type: v.type,
        title: v.title || null,
        routineId: v.routineId,
        durationMin: Math.max(1, Math.round(minutes)),
        intensity: v.intensity,
        rpe: parseNum(v.rpe),
        kcalBurned: parseNum(v.kcal),
        kcalManual: v.kcalManual,
        notes: v.notes || null,
        sets,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.push(`/entrenamiento/${res.data!.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Sesión</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-6">
          <Field label="Fecha" className="sm:col-span-2">
            <Input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="Tipo" className="sm:col-span-2">
            <NativeSelect value={v.type} onChange={(e) => set("type", e.target.value)}>
              {Object.entries(WORKOUT_TYPES).map(([k, t]) => (
                <option key={k} value={k}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Rutina" className="sm:col-span-2">
            <NativeSelect value={v.routineId ?? ""} onChange={(e) => loadRoutine(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Sin rutina</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Título (opcional)" className="sm:col-span-3">
            <Input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej: Piernas pesado" />
          </Field>
          <Field label="Duración (min)" className="sm:col-span-1">
            <Input inputMode="numeric" value={v.durationMin} onChange={(e) => set("durationMin", e.target.value)} />
          </Field>
          <Field label="Intensidad" className="sm:col-span-2">
            <div className="flex rounded-lg border p-0.5">
              {Object.entries(INTENSITIES).map(([k, it]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("intensity", k as "baja")}
                  className={cn("flex-1 rounded-md py-1 text-sm", v.intensity === k ? "bg-gym text-white dark:text-neutral-950" : "text-muted-foreground hover:bg-muted")}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Esfuerzo percibido (RPE 1-10)" className="sm:col-span-2">
            <NativeSelect value={v.rpe} onChange={(e) => set("rpe", e.target.value)}>
              <option value="">—</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                  {n === 1 ? " · muy fácil" : n === 5 ? " · moderado" : n === 8 ? " · muy duro" : n === 10 ? " · al máximo" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="flex flex-col justify-end gap-2 rounded-xl bg-gym/10 p-3 sm:col-span-4">
            <div className="flex items-center gap-2 text-sm">
              <Flame className="size-4 text-gym" />
              {v.kcalManual ? (
                <Input inputMode="numeric" value={v.kcal} onChange={(e) => set("kcal", e.target.value)} className="h-8 w-24" placeholder="kcal" />
              ) : (
                <span className="font-semibold">≈ {fmtInt(estimated)} kcal quemadas</span>
              )}
              <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox
                  checked={v.kcalManual}
                  onCheckedChange={(c) => setV((p) => ({ ...p, kcalManual: Boolean(c), kcal: p.kcal || String(estimated) }))}
                />
                Cargar a mano (reloj/app)
              </label>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Estimado con tu peso ({fmtDec(weightKg, 1)} kg), el tipo y la intensidad. Se suma a tu presupuesto de comida del día.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ejercicios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="sticky top-14 z-10 -mx-1 rounded-xl bg-card/95 px-1 py-1 backdrop-blur md:top-2">
            <RestTimer />
          </div>
          {blocks.map((b) => {
            const cardio = b.exercise.kind === "cardio";
            return (
              <div key={b.key} className="rounded-xl border">
                <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.exercise.name}</div>
                    {b.hint && <div className="text-[11px] text-muted-foreground">{b.hint}</div>}
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setBlocks((bs) => bs.filter((x) => x.key !== b.key))} aria-label="Quitar ejercicio">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5 p-3">
                  <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-[11px] font-medium text-muted-foreground">
                    <span>#</span>
                    <span>{cardio ? "Minutos" : "Reps"}</span>
                    <span>{cardio ? "Km" : "Kg"}</span>
                    <span />
                  </div>
                  {b.sets.map((s, i) => (
                    <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2">
                      <span className="text-sm text-muted-foreground tabular">{i + 1}</span>
                      {cardio ? (
                        <>
                          <Input inputMode="decimal" value={s.durationMin} onChange={(e) => updateSet(b.key, i, { durationMin: e.target.value })} />
                          <Input inputMode="decimal" value={s.distanceKm} onChange={(e) => updateSet(b.key, i, { distanceKm: e.target.value })} />
                        </>
                      ) : (
                        <>
                          <Input inputMode="numeric" value={s.reps} onChange={(e) => updateSet(b.key, i, { reps: e.target.value })} />
                          <Input inputMode="decimal" value={s.weightKg} onChange={(e) => updateSet(b.key, i, { weightKg: e.target.value })} placeholder="—" />
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setBlocks((bs) => bs.map((x) => (x.key === b.key ? { ...x, sets: x.sets.filter((_, j) => j !== i) } : x)))}
                        className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted"
                        aria-label="Quitar serie"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setBlocks((bs) => bs.map((x) => (x.key === b.key ? { ...x, sets: [...x.sets, { ...(x.sets.at(-1) ?? emptySet()) }] } : x)))
                    }
                  >
                    <Copy className="size-3.5" /> Agregar serie
                  </Button>
                </div>
              </div>
            );
          })}
          <ExercisePicker
            exercises={exercises}
            onPick={(ex) =>
              setBlocks((bs) => [
                ...bs,
                {
                  key: seq++,
                  exercise: ex,
                  hint: hintFor(ex.id),
                  sets: ex.kind === "cardio" ? [emptySet()] : [emptySet(), emptySet(), emptySet()],
                },
              ])
            }
          />
          <p className="text-xs text-muted-foreground">
            Los ejercicios son opcionales: si solo querés marcar que fuiste, completá la sesión y guardá.
          </p>
        </CardContent>
      </Card>

      <Field label="Notas">
        <Textarea value={v.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="¿Cómo te sentiste? ¿Subiste peso?" />
      </Field>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button size="lg" onClick={submit} disabled={pending} className="bg-gym text-white dark:text-neutral-950 hover:bg-gym/90">
          {pending && <Loader2 className="size-4 animate-spin" />} Guardar entreno
        </Button>
      </div>
    </div>
  );
}
