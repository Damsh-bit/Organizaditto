import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Stat } from "@/components/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteWorkout } from "@/app/actions/training";
import { fmtDateLong } from "@/lib/dates";
import { fmtDec, fmtInt } from "@/lib/format";
import { INTENSITIES, WORKOUT_TYPES } from "@/lib/training";
import { getWorkout } from "@/lib/data/training";

export const metadata: Metadata = { title: "Entreno" };

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const w = await getWorkout(Number((await params).id));
  if (!w) notFound();
  const t = WORKOUT_TYPES[w.type] ?? WORKOUT_TYPES.otro;
  const groups: { name: string; kind: string; sets: typeof w.sets }[] = [];
  for (const s of w.sets) {
    const g = groups.find((x) => x.name === s.exercise.name);
    if (g) g.sets.push(s);
    else groups.push({ name: s.exercise.name, kind: s.exercise.kind, sets: [s] });
  }
  const volume = w.sets.reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0);

  return (
    <div className="space-y-5">
      <Link href="/entrenamiento/historial" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Historial
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-14 place-items-center rounded-2xl bg-gym/12 text-3xl">{t.emoji}</div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{w.title || w.routine?.name || t.label}</h1>
            <p className="text-sm text-muted-foreground">
              {fmtDateLong(w.date)} · {t.label}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/entrenamiento/${w.id}/editar`}>
              <Pencil className="size-4" /> Editar
            </Link>
          </Button>
          <ActionButton
            variant="ghost"
            className="text-destructive"
            action={deleteWorkout.bind(null, w.id)}
            confirm="¿Eliminar este entreno?"
            redirectTo="/entrenamiento"
          >
            <Trash2 className="size-4" />
          </ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Duración" value={`${w.durationMin} min`} />
        <Stat label="Calorías" value={`${fmtInt(w.kcalBurned)} kcal`} hint={w.kcalManual ? "cargadas a mano" : "estimadas"} />
        <Stat label="Intensidad" value={INTENSITIES[w.intensity]?.label ?? w.intensity} hint={w.rpe ? `RPE ${w.rpe}/10` : undefined} />
        <Stat label="Volumen" value={volume ? `${fmtInt(volume)} kg` : "—"} hint={`${w.sets.length} series`} />
      </div>

      {groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ejercicios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groups.map((g) => (
              <div key={g.name}>
                <div className="mb-1 text-sm font-medium">{g.name}</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.sets.map((s) => (
                    <span key={s.id} className="rounded-lg bg-muted px-2 py-1 text-xs tabular">
                      {g.kind === "cardio"
                        ? `${s.durationSec ? Math.round(s.durationSec / 60) + " min" : ""}${s.distanceKm ? ` · ${fmtDec(s.distanceKm)} km` : ""}`
                        : `${s.reps ?? "–"} × ${s.weightKg ? fmtDec(s.weightKg) + " kg" : "peso corporal"}`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {w.notes && (
        <Card>
          <CardContent className="text-sm whitespace-pre-wrap">{w.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
