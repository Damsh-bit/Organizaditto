import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Play, Plus, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { archiveRoutine } from "@/app/actions/training";
import { WORKOUT_TYPES } from "@/lib/training";
import { listRoutines } from "@/lib/data/training";

export const metadata: Metadata = { title: "Rutinas" };

export default async function RutinasPage() {
  const routines = await listRoutines();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Rutinas"
        description="Plantillas de entrenamiento. Al empezar una, se carga con los pesos que usaste la última vez."
        actions={
          <Button asChild>
            <Link href="/entrenamiento/rutinas/nueva">
              <Plus className="size-4" /> Nueva rutina
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {routines.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{WORKOUT_TYPES[r.workoutType]?.emoji ?? "🏋️"}</span> {r.name}
              </CardTitle>
              {r.description && <CardDescription>{r.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="space-y-1 text-sm">
                {r.exercises.map((e, i) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      <span className="mr-2 text-muted-foreground tabular">{i + 1}.</span>
                      {e.exercise.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular">
                      {e.exercise.kind === "cardio" ? e.reps : `${e.sets} × ${e.reps}`}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" className="bg-gym text-white dark:text-neutral-950 hover:bg-gym/90">
                  <Link href={`/entrenamiento/nuevo?rutina=${r.id}`}>
                    <Play className="size-3.5" /> Empezar
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/entrenamiento/rutinas/${r.id}`}>
                    <Pencil className="size-3.5" /> Editar
                  </Link>
                </Button>
                {r.estMinutes && <span className="text-xs text-muted-foreground">≈ {r.estMinutes} min</span>}
                <ActionButton
                  size="icon-sm"
                  variant="ghost"
                  className="ml-auto text-muted-foreground"
                  action={archiveRoutine.bind(null, r.id)}
                  confirm={`¿Eliminar la rutina "${r.name}"?`}
                  aria-label="Eliminar"
                >
                  <Trash2 className="size-3.5" />
                </ActionButton>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
