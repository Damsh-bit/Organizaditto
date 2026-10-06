import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/page-header";
import { DateNav, EmptyState } from "@/components/stats";
import { WorkoutListItem } from "@/components/training/workout-list-item";
import { Button } from "@/components/ui/button";
import { quickWorkout } from "@/app/actions/training";
import { addMonthsISO, endOfMonthISO, fmtDate, fmtDateLong, fmtMonth, isISODate, startOfMonthISO, startOfWeekISO, todayISO } from "@/lib/dates";
import { fmtInt } from "@/lib/format";
import { getWorkouts } from "@/lib/data/training";

export const metadata: Metadata = { title: "Historial de entrenos" };

export default async function HistorialPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();

  if (isISODate(sp.fecha)) {
    const date = sp.fecha;
    const list = await getWorkouts(date, date);
    return (
      <div className="space-y-4">
        <PageHeader
          title={fmtDateLong(date)}
          description="Entrenamientos del día"
          actions={
            <Button asChild className="bg-gym text-white dark:text-neutral-950 hover:bg-gym/90">
              <Link href={`/entrenamiento/nuevo?fecha=${date}`}>
                <Plus className="size-4" /> Registrar
              </Link>
            </Button>
          }
        />
        {list.length ? (
          <div className="space-y-2">
            {list.map((w) => (
              <WorkoutListItem key={w.id} workout={w} />
            ))}
          </div>
        ) : (
          <EmptyState
            emoji="🏋️"
            title="No entrenaste este día"
            description="Si fuiste y te olvidaste de cargarlo, registralo ahora."
            action={
              date <= today && (
                <ActionButton action={quickWorkout.bind(null, date, "fuerza", 60)} className="bg-gym text-white dark:text-neutral-950 hover:bg-gym/90">
                  Marcar que fui (60 min de fuerza)
                </ActionButton>
              )
            }
          />
        )}
        <Link href="/entrenamiento/historial" className="text-sm text-muted-foreground hover:text-foreground">
          ← Ver todo el historial
        </Link>
      </div>
    );
  }

  const month = isISODate(sp.mes) ? startOfMonthISO(sp.mes) : startOfMonthISO(today);
  const list = await getWorkouts(month, endOfMonthISO(month));
  const weeks = new Map<string, typeof list>();
  for (const w of list) {
    const k = startOfWeekISO(w.date);
    weeks.set(k, [...(weeks.get(k) ?? []), w]);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Historial" description="Todos tus entrenamientos, semana por semana." />
      <DateNav
        label={fmtMonth(month)}
        sublabel={`${list.length} entrenos · ${fmtInt(list.reduce((a, w) => a + w.kcalBurned, 0))} kcal`}
        prevHref={`/entrenamiento/historial?mes=${addMonthsISO(month, -1)}`}
        nextHref={`/entrenamiento/historial?mes=${addMonthsISO(month, 1)}`}
        todayHref={month !== startOfMonthISO(today) ? "/entrenamiento/historial" : null}
      />
      {list.length === 0 ? (
        <EmptyState emoji="📅" title="Sin entrenos este mes" />
      ) : (
        [...weeks.entries()].map(([week, ws]) => {
          const days = new Set(ws.map((w) => w.date)).size;
          return (
            <section key={week} className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Semana del {fmtDate(week)}</span>
                <span className="text-xs text-muted-foreground">
                  {days} {days === 1 ? "día" : "días"} · {fmtInt(ws.reduce((a, w) => a + w.durationMin, 0))} min ·{" "}
                  {fmtInt(ws.reduce((a, w) => a + w.kcalBurned, 0))} kcal
                </span>
              </div>
              {ws.map((w) => (
                <WorkoutListItem key={w.id} workout={w} />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
