import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RoutineEditor } from "@/components/training/routine-editor";
import { getRoutine, getWorkoutFormContext } from "@/lib/data/training";

export const metadata: Metadata = { title: "Editar rutina" };

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const [routine, { exercises }] = await Promise.all([getRoutine(Number((await params).id)), getWorkoutFormContext()]);
  if (!routine) notFound();
  return (
    <div>
      <PageHeader title="Editar rutina" description={routine.name} />
      <RoutineEditor
        exercises={exercises}
        initial={{
          id: routine.id,
          name: routine.name,
          description: routine.description,
          workoutType: routine.workoutType,
          estMinutes: routine.estMinutes,
          exercises: routine.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, reps: e.reps, restSec: e.restSec, notes: e.notes })),
        }}
      />
    </div>
  );
}
