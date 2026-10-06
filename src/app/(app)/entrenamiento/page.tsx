import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Dumbbell, Flame, Plus, TrendingDown, Trophy, Zap } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { TrendLineChart } from "@/components/charts";
import { MonthHeatmap } from "@/components/month-heatmap";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { ProgressBar, Stat } from "@/components/stats";
import { WeightDialog } from "@/components/training/weight-dialog";
import { WorkoutListItem } from "@/components/training/workout-list-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { quickWorkout } from "@/app/actions/training";
import { WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/constants";
import { addDaysISO, endOfMonthISO, fmtDate, isISODate, startOfMonthISO, todayISO, weekdayMon } from "@/lib/dates";
import { fmtDec, fmtInt } from "@/lib/format";
import { WORKOUT_TYPES } from "@/lib/training";
import { weightInsights } from "@/lib/weight";
import { getProfileContext } from "@/lib/data/settings";
import { getRecentWorkouts, getTrainingSummary, getWeightLogs, getWorkoutDays } from "@/lib/data/training";
import { getDayMetrics, getMetricsByDay } from "@/lib/data/nutrition";
import { StepsSleep } from "@/components/steps-sleep";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Entrenamiento" };

export default async function TrainingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();
  const month = isISODate(sp.mes) ? startOfMonthISO(sp.mes) : startOfMonthISO(today);
  const ctx = await getProfileContext();
  if (!ctx.settings.onboarded) redirect("/bienvenida");
  const goal = ctx.settings.gymDaysPerWeek;

  const [summary, monthDays, recent, weights, dayMetrics, week] = await Promise.all([
    getTrainingSummary(today, goal),
    getWorkoutDays(month, endOfMonthISO(month)),
    getRecentWorkouts(5),
    getWeightLogs(addDaysISO(today, -365)),
    getDayMetrics(today),
    getMetricsByDay(addDaysISO(today, -6), today),
  ]);
  const stepDays = week.filter((m) => m.steps != null);
  const sleepDays = week.filter((m) => m.sleepHours != null);
  const avgSteps = stepDays.length ? stepDays.reduce((a, m) => a + m.steps!, 0) / stepDays.length : null;
  const avgSleep = sleepDays.length ? sleepDays.reduce((a, m) => a + m.sleepHours!, 0) / sleepDays.length : null;
  const trainedToday = summary.days.has(today);
  const insights = weightInsights(weights, ctx.settings.startWeightKg, ctx.settings.goalWeightKg);
  const weightSeries = weights.filter((w) => w.date >= addDaysISO(today, -120)).map((w) => ({ date: w.date, value: w.weightKg }));
  const eatBack = Math.round(summary.kcal * (ctx.settings.exerciseEatBackPct / 100));
  const weighDay = ctx.settings.weighInDay;
  const isWeighDay = (weekdayMon(today) + 1) % 7 === weighDay;
  const weighedThisWeek = weights.some((w) => w.date >= summary.weekStart);

  const values: Record<string, number> = {};
  const titles: Record<string, string> = {};
  for (const [d, v] of monthDays) {
    values[d] = v.minutes;
    titles[d] = `${fmtDate(d)}: ${v.minutes} min · ${fmtInt(v.kcal)} kcal · ${v.types.map((t) => WORKOUT_TYPES[t]?.label ?? t).join(", ")}`;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Entrenamiento"
        description={`Objetivo: ${goal} días por semana. Cada entreno suma calorías a tu presupuesto de comida.`}
        actions={
          <>
            {!trainedToday && (
              <ActionButton variant="outline" action={quickWorkout.bind(null, today, "fuerza", 60)}>
                <Zap className="size-4 text-gym" /> Fui al gym hoy
              </ActionButton>
            )}
            <Button asChild className="bg-gym text-white dark:text-neutral-950 hover:bg-gym/90">
              <Link href="/entrenamiento/nuevo">
                <Plus className="size-4" /> Registrar entreno
              </Link>
            </Button>
          </>
        }
      />

      {/* Semana actual */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS_SHORT.map((label, i) => {
              const d = addDaysISO(summary.weekStart, i);
              const done = summary.days.has(d);
              return (
                <Link
                  key={d}
                  href={done ? `/entrenamiento/historial?fecha=${d}` : `/entrenamiento/nuevo?fecha=${d}`}
                  className="flex flex-col items-center gap-1"
                  title={WEEKDAYS[i]}
                >
                  <span className={cn("text-[11px] text-muted-foreground", d === today && "font-semibold text-foreground")}>{label}</span>
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-full border-2 transition-colors",
                      done ? "border-gym bg-gym text-white dark:text-neutral-950" : d > today ? "border-dashed border-muted" : "border-muted hover:border-gym/50",
                    )}
                  >
                    {done ? <Check className="size-4" /> : <span className="text-xs text-muted-foreground">{Number(d.slice(8))}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {summary.thisWeekDays} de {goal} días esta semana
              </span>
              <span className="text-muted-foreground">
                {summary.thisWeekDays >= goal ? "¡Objetivo cumplido! 🎉" : `te faltan ${goal - summary.thisWeekDays}`}
              </span>
            </div>
            <ProgressBar value={summary.thisWeekDays} max={goal} barClassName="bg-gym" overClassName="bg-gym" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimiento y descanso</CardTitle>
          <CardDescription>
            {avgSteps != null || avgSleep != null
              ? `Últimos 7 días: ${avgSteps != null ? `${fmtInt(avgSteps)} pasos` : "sin pasos"} y ${avgSleep != null ? `${fmtDec(avgSleep, 1)} h de sueño` : "sin sueño"} en promedio.`
              : "Los pasos suman al déficit sin cansarte y dormir bien baja el hambre y mejora el entrenamiento."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StepsSleep
            date={today}
            steps={dayMetrics.steps}
            sleepHours={dayMetrics.sleepHours}
            stepsGoal={ctx.settings.stepsGoal}
            sleepGoal={ctx.settings.sleepGoalHours}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={
            <span className="flex items-center gap-1">
              <Trophy className="size-3.5 text-amber-500" /> Racha
            </span>
          }
          value={`${summary.streakWeeks} ${summary.streakWeeks === 1 ? "semana" : "semanas"}`}
          hint="cumpliendo el objetivo"
        />
        <Stat
          label={
            <span className="flex items-center gap-1">
              <Flame className="size-3.5 text-gym" /> Quemadas esta semana
            </span>
          }
          value={`${fmtInt(summary.kcal)} kcal`}
          hint={`+${fmtInt(eatBack)} kcal sumadas a tu comida`}
        />
        <Stat label="Tiempo entrenando" value={`${fmtInt(summary.minutes)} min`} hint="esta semana" />
        <Stat
          label="Peso actual"
          value={insights.latest ? `${fmtDec(insights.latest.weightKg, 1)} kg` : "—"}
          hint={
            insights.change != null ? `${insights.change > 0 ? "+" : ""}${fmtDec(insights.change, 1)} kg desde el inicio` : "Registrá tu peso"
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="size-4 text-gym" /> Habit tracker
            </CardTitle>
            <CardDescription>Cada cuadradito es un día; más intenso = más minutos entrenados. Tocá un día para ver o cargar.</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthHeatmap
              month={month}
              values={values}
              titles={titles}
              color="var(--gym)"
              today={today}
              max={90}
              linkTemplate="/entrenamiento/historial?fecha={date}"
              monthHrefTemplate="/entrenamiento?mes={month}"
              goalLine={`${monthDays.size} ${monthDays.size === 1 ? "día entrenado" : "días entrenados"} en el mes`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="size-4 text-gym" /> Peso
              </CardTitle>
              <CardDescription>
                {insights.toGoal != null && insights.toGoal > 0
                  ? `Te faltan ${fmtDec(insights.toGoal, 1)} kg para tu meta de ${fmtDec(ctx.settings.goalWeightKg, 1)} kg`
                  : insights.toGoal != null
                    ? "¡Llegaste a tu meta! 🎉"
                    : "Definí tu peso meta en Ajustes"}
              </CardDescription>
            </div>
            <WeightDialog
              defaults={{ date: today, weightKg: insights.latest?.weightKg }}
              trigger={
                <Button size="sm" variant={isWeighDay && !weighedThisWeek ? "default" : "outline"}>
                  Pesarme
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {isWeighDay && !weighedThisWeek && (
              <div className="rounded-lg bg-gym/10 px-3 py-2 text-sm">⚖️ Hoy es tu día de pesaje semanal.</div>
            )}
            {insights.progressPct != null && (
              <div className="space-y-1">
                <ProgressBar value={insights.progressPct} max={1} barClassName="bg-gym" overClassName="bg-gym" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fmtInt(insights.progressPct * 100)}% del camino</span>
                  {insights.etaDate && <span>Llegarías ≈ {fmtDate(insights.etaDate, "d MMM yyyy")}</span>}
                </div>
              </div>
            )}
            {weightSeries.length >= 2 ? (
              <TrendLineChart data={weightSeries} goal={ctx.settings.goalWeightKg} unit="kg" color="var(--gym)" label="Peso" height={200} />
            ) : (
              <p className="text-sm text-muted-foreground">Con dos o más pesajes vas a ver la evolución acá.</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/60 p-2">
                <div className="text-muted-foreground">Ritmo esperado por tu déficit</div>
                <div className="font-semibold">−{fmtDec(ctx.targets.weeklyLossKg, 2)} kg/semana</div>
              </div>
              <div className="rounded-lg bg-muted/60 p-2">
                <div className="text-muted-foreground">Ritmo real (últimas 4 semanas)</div>
                <div className="font-semibold">
                  {insights.rate != null ? `${insights.rate > 0 ? "+" : ""}${fmtDec(insights.rate, 2)} kg/semana` : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section>
        <SectionTitle
          action={
            <Link href="/entrenamiento/historial" className="text-sm text-muted-foreground hover:text-foreground">
              Ver todo
            </Link>
          }
        >
          Últimos entrenos
        </SectionTitle>
        {recent.length ? (
          <div className="space-y-2">
            {recent.map((w) => (
              <WorkoutListItem key={w.id} workout={w} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no registraste entrenamientos.</p>
        )}
      </section>
    </div>
  );
}
