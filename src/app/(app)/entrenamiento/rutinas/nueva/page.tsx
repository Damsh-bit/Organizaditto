import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RoutineEditor } from "@/components/training/routine-editor";
import { getWorkoutFormContext } from "@/lib/data/training";

export const metadata: Metadata = { title: "Nueva rutina" };

export default async function NewRoutinePage() {
  const { exercises } = await getWorkoutFormContext();
  return (
    <div>
      <PageHeader title="Nueva rutina" />
      <RoutineEditor exercises={exercises} />
    </div>
  );
}
