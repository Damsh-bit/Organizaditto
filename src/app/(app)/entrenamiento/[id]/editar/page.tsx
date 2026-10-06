import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { WorkoutForm } from "@/components/training/workout-form";
import { getCurrentWeightKg } from "@/lib/data/settings";
import { getWorkout, getWorkoutFormContext } from "@/lib/data/training";

export const metadata: Metadata = { title: "Editar entreno" };

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const w = await getWorkout(Number((await params).id));
  if (!w) notFound();
  const [fctx, weightKg] = await Promise.all([getWorkoutFormContext(), getCurrentWeightKg()]);
  const order: number[] = [];
  for (const s of w.sets) if (!order.includes(s.exerciseId)) order.push(s.exerciseId);
  return (
    <div>
      <PageHeader title="Editar entreno" />
      <WorkoutForm
        {...fctx}
        weightKg={weightKg ?? 75}
        initial={{
          id: w.id,
          date: w.date,
          type: w.type,
          title: w.title ?? "",
          routineId: w.routineId,
          durationMin: w.durationMin,
          intensity: (["baja", "media", "alta"].includes(w.intensity) ? w.intensity : "media") as "media",
          rpe: w.rpe,
          kcalBurned: w.kcalBurned,
          kcalManual: w.kcalManual,
          notes: w.notes ?? "",
          blocks: order.map((exerciseId) => ({
            exerciseId,
            sets: w.sets
              .filter((s) => s.exerciseId === exerciseId)
              .map((s) => ({ reps: s.reps, weightKg: s.weightKg, durationSec: s.durationSec, distanceKm: s.distanceKm })),
          })),
        }}
      />
    </div>
  );
}
