import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { DailyBarChart, TrendLineChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { EmptyState, Stat } from "@/components/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { exercises, workoutSets } from "@/db/schema";
import { fmtDate } from "@/lib/dates";
import { fmtDec, fmtInt } from "@/lib/format";
import { getExerciseHistory } from "@/lib/data/training";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progresión" };

async function exercisesWithHistory() {
  const db = await getDb();
  return db
    .select({ id: exercises.id, name: exercises.name, kind: exercises.kind, sessions: sql<number>`count(distinct ${workoutSets.workoutId})`.mapWith(Number) })
    .from(workoutSets)
    .innerJoin(exercises, sql`${exercises.id} = ${workoutSets.exerciseId}`)
    .groupBy(exercises.id, exercises.name, exercises.kind)
    .orderBy(sql`count(distinct ${workoutSets.workoutId}) desc`);
}

export default async function ProgresionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const list = await exercisesWithHistory();
  const selected = list.find((e) => e.id === Number(sp.ejercicio)) ?? list.find((e) => e.kind !== "cardio") ?? list[0];
  const history = selected ? await getExerciseHistory(selected.id) : [];
  const best = history.reduce<(typeof history)[number] | null>((a, h) => (!a || h.maxWeight > a.maxWeight ? h : a), null);
  const first = history[0];
  const last = history.at(-1);

  return (
    <div className="space-y-5">
      <PageHeader title="Progresión" description="Cómo evolucionan tus pesos en cada ejercicio. Mantener o subir la fuerza en déficit = estás cuidando el músculo." />
      {!list.length ? (
        <EmptyState emoji="📈" title="Todavía no hay series registradas" description="Registrá entrenos con ejercicios y pesos para ver tu progresión." />
      ) : (
        <>
          <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {list.map((e) => (
              <Link
                key={e.id}
                href={`/entrenamiento/progresion?ejercicio=${e.id}`}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
                  e.id === selected?.id ? "border-gym bg-gym/10 text-gym" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {e.name} <span className="opacity-60">· {e.sessions}</span>
              </Link>
            ))}
          </div>
          {selected && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Mejor marca" value={best?.maxWeight ? `${fmtDec(best.maxWeight)} kg` : "—"} hint={best ? fmtDate(best.date) : undefined} />
                <Stat label="Sesiones" value={fmtInt(history.length)} />
                <Stat
                  label="Desde la primera vez"
                  value={first && last && first.maxWeight ? `${last.maxWeight - first.maxWeight >= 0 ? "+" : ""}${fmtDec(last.maxWeight - first.maxWeight)} kg` : "—"}
                />
                <Stat label="Último volumen" value={last?.volume ? `${fmtInt(last.volume)} kg` : "—"} hint="series × reps × kg" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Peso máximo por sesión · {selected.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length >= 2 ? (
                    <TrendLineChart data={history.map((h) => ({ date: h.date, value: h.maxWeight || null }))} unit="kg" color="var(--gym)" label="Peso máximo" />
                  ) : (
                    <p className="text-sm text-muted-foreground">Con dos sesiones o más vas a ver la curva.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Volumen por sesión</CardTitle>
                  <CardDescription>Suma de series × repeticiones × kg.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyBarChart data={history.map((h) => ({ date: h.date, value: h.volume }))} unit="kg" color="var(--gym)" label="Volumen" height={180} />
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
