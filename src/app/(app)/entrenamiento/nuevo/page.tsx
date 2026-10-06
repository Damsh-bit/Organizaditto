import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { WorkoutForm, type WorkoutFormInitial } from "@/components/training/workout-form";
import { isISODate, todayISO } from "@/lib/dates";
import { getCurrentWeightKg } from "@/lib/data/settings";
import { getWorkoutFormContext } from "@/lib/data/training";

export const metadata: Metadata = { title: "Registrar entreno" };

export default async function NewWorkoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [fctx, weightKg] = await Promise.all([getWorkoutFormContext(), getCurrentWeightKg()]);
  const routineId = Number(sp.rutina);
  const routine = fctx.routines.find((r) => r.id === routineId);
  const initial: WorkoutFormInitial = {
    date: isISODate(sp.fecha) ? sp.fecha : todayISO(),
    type: routine?.workoutType ?? "fuerza",
    title: routine?.name ?? "",
    routineId: routine?.id ?? null,
    durationMin: routine?.estMinutes ?? 60,
    intensity: "media",
    rpe: null,
    kcalBurned: null,
    kcalManual: false,
    notes: "",
    blocks: routine
      ? routine.exercises.map((e) => {
          const last = fctx.lastSets[e.exerciseId];
          const reps = Number(e.reps.match(/\d+/)?.[0] ?? 0) || null;
          const cardio = fctx.exercises.find((x) => x.id === e.exerciseId)?.kind === "cardio";
          if (cardio) {
            return { exerciseId: e.exerciseId, sets: [{ reps: null, weightKg: null, durationSec: reps ? reps * 60 : null, distanceKm: null }] };
          }
          return {
            exerciseId: e.exerciseId,
            sets: Array.from({ length: e.sets }, () => ({ reps, weightKg: last?.weightKg ?? null, durationSec: null, distanceKm: null })),
          };
        })
      : [],
  };
  return (
    <div>
      <PageHeader title="Registrar entreno" description="Cargá la sesión; las calorías quemadas se suman a tu presupuesto de comida del día." />
      <WorkoutForm initial={initial} {...fctx} weightKg={weightKg ?? 75} />
    </div>
  );
}
