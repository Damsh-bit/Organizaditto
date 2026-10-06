"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/form-fields";
import { saveRoutine } from "@/app/actions/training";
import { parseNum } from "@/lib/format";
import { WORKOUT_TYPES } from "@/lib/training";
import { ExercisePicker, type ExerciseOpt } from "./exercise-picker";

type Row = { key: number; exercise: ExerciseOpt; sets: string; reps: string; restSec: string; notes: string };
let seq = 1;

export function RoutineEditor({
  exercises,
  initial,
}: {
  exercises: ExerciseOpt[];
  initial?: {
    id: number;
    name: string;
    description: string | null;
    workoutType: string;
    estMinutes: number | null;
    exercises: { exerciseId: number; sets: number; reps: string; restSec: number | null; notes: string | null }[];
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState(initial?.workoutType ?? "fuerza");
  const [minutes, setMinutes] = useState(initial?.estMinutes?.toString() ?? "60");
  const [rows, setRows] = useState<Row[]>(
    (initial?.exercises ?? [])
      .filter((e) => exById.has(e.exerciseId))
      .map((e) => ({
        key: seq++,
        exercise: exById.get(e.exerciseId)!,
        sets: String(e.sets),
        reps: e.reps,
        restSec: e.restSec?.toString() ?? "90",
        notes: e.notes ?? "",
      })),
  );
  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, d: number) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  function submit() {
    start(async () => {
      const res = await saveRoutine({
        id: initial?.id,
        name,
        description: description || null,
        workoutType: type,
        estMinutes: parseNum(minutes),
        exercises: rows.map((r) => ({
          exerciseId: r.exercise.id,
          sets: Math.max(1, Math.round(parseNum(r.sets) ?? 3)),
          reps: r.reps || "10",
          restSec: parseNum(r.restSec),
          notes: r.notes || null,
        })),
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.push("/entrenamiento/rutinas");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <Field label="Nombre" className="sm:col-span-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Empuje (pecho/hombro/tríceps)" />
          </Field>
          <Field label="Tipo">
            <NativeSelect value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(WORKOUT_TYPES).map(([k, t]) => (
                <option key={k} value={k}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Duración estimada (min)">
            <Input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
          <Field label="Descripción" className="sm:col-span-4">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ejercicios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.key} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_4rem_6rem_5rem_auto]">
              <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
                <div className="flex flex-col">
                  <button type="button" onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground" aria-label="Subir">
                    <ArrowUp className="size-3" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground" aria-label="Bajar">
                    <ArrowDown className="size-3" />
                  </button>
                </div>
                <span className="truncate text-sm font-medium">{r.exercise.name}</span>
              </div>
              <Field label="Series" className="col-span-1">
                <Input inputMode="numeric" value={r.sets} onChange={(e) => update(r.key, { sets: e.target.value })} />
              </Field>
              <Field label="Reps / tiempo">
                <Input value={r.reps} onChange={(e) => update(r.key, { reps: e.target.value })} />
              </Field>
              <Field label="Descanso (s)" className="hidden sm:flex">
                <Input inputMode="numeric" value={r.restSec} onChange={(e) => update(r.key, { restSec: e.target.value })} />
              </Field>
              <div className="flex items-end">
                <Button variant="ghost" size="icon-sm" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Quitar">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <ExercisePicker
            exercises={exercises}
            onPick={(ex) =>
              setRows((rs) => [
                ...rs,
                { key: seq++, exercise: ex, sets: ex.kind === "cardio" ? "1" : "3", reps: ex.kind === "cardio" ? "30 min" : "10-12", restSec: "90", notes: "" },
              ])
            }
          />
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={pending} className="bg-gym text-white hover:bg-gym/90">
          {pending && <Loader2 className="size-4 animate-spin" />} Guardar rutina
        </Button>
      </div>
    </div>
  );
}
