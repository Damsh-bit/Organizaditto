import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Baby, Briefcase, CalendarDays, Check, Dumbbell, Lightbulb, Salad, Scale, ShoppingCart, Zap } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { HabitsToday } from "@/components/habits-today";
import { CalorieSummary } from "@/components/nutrition/calorie-summary";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { ProgressBar } from "@/components/stats";
import { WeightDialog } from "@/components/training/weight-dialog";
import { WorkTimer } from "@/components/work/work-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { quickWorkout } from "@/app/actions/training";
import { togglePlanItemDone } from "@/app/actions/nutrition";
import { ALLERGENS, MEAL_LABEL, WEEKDAYS_SHORT } from "@/lib/constants";
import { KEY_ALLERGENS, stageFor } from "@/lib/baby-guide";
import { addDaysISO, ageLabel, fmtDateLong, startOfWeekISO, todayISO, TZ, weekdayMon } from "@/lib/dates";
import { fmtARS, fmtDec, fmtHours, fmtInt, fmtUSD } from "@/lib/format";
import { weightInsights } from "@/lib/weight";
import { getProfileContext } from "@/lib/data/settings";
import { getDaySummary, getIntakeByDay, getPlanItems, listShoppingLists, getExerciseKcal } from "@/lib/data/nutrition";
import { getTrainingSummary, getWeightLogs } from "@/lib/data/training";
import { getEffectiveRate } from "@/lib/data/rates";
import { getProjects, getRunningSession, getWorkDays, sumDays } from "@/lib/data/work";
import { getBabyContext, getExposureSummary } from "@/lib/data/baby";
import { getHabitsWeek } from "@/lib/data/habits";
import { cn } from "@/lib/utils";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()));
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function HomePage() {
  const ctx = await getProfileContext();
  if (!ctx.settings.onboarded) redirect("/bienvenida");
  const s = ctx.settings;
  const today = todayISO();
  const weekStart = startOfWeekISO(today);
  const last7 = addDaysISO(today, -7);

  const [summary, plan, training, weights, rateInfo, running, workDays, projects, babyCtx, habits, lists, intake7, ex7] = await Promise.all([
    getDaySummary(today, ctx),
    getPlanItems(today, today, "adult"),
    getTrainingSummary(today, s.gymDaysPerWeek),
    getWeightLogs(addDaysISO(today, -365)),
    getEffectiveRate(s),
    getRunningSession(),
    getWorkDays(weekStart, addDaysISO(weekStart, 6)),
    getProjects(),
    getBabyContext(),
    getHabitsWeek(today),
    listShoppingLists(),
    getIntakeByDay(last7, addDaysISO(today, -1)),
    getExerciseKcal(last7, addDaysISO(today, -1)),
  ]);
  const exposures = babyCtx.baby ? await getExposureSummary(babyCtx.baby.id) : [];
  const rate = rateInfo.rate.value;
  const ins = weightInsights(weights, s.startWeightKg, s.goalWeightKg);
  const workToday = sumDays(workDays, today, today);
  const workWeek = sumDays(workDays, weekStart, addDaysISO(weekStart, 6));
  const pendingPlan = plan.filter((p) => !p.done);
  const isWeighDay = (weekdayMon(today) + 1) % 7 === s.weighInDay;
  const weighedThisWeek = weights.some((w) => w.date >= weekStart);
  const openList = lists.find((l) => !l.completedAt && l.checked < l.total);
  const babyStage = stageFor(babyCtx.months);
  const nextAllergen = babyCtx.months != null && babyCtx.months >= 6 ? KEY_ALLERGENS.find((a) => !exposures.some((e) => e.allergen === a)) : undefined;

  // Insights que cruzan módulos
  const insights: { icon: React.ReactNode; text: React.ReactNode; href?: string }[] = [];
  if (summary.exerciseKcal > 0) {
    insights.push({
      icon: <Dumbbell className="size-4 text-gym" />,
      text: `Entrenaste hoy (${fmtInt(summary.exerciseKcal)} kcal): sumaste ${fmtInt(summary.exerciseBonus)} kcal a tu presupuesto de comida.`,
      href: "/nutricion",
    });
  }
  if (intake7.length >= 3) {
    const avgDeficit =
      intake7.reduce((a, r) => a + (ctx.targets.tdee + (ex7.get(r.date) ?? 0) - r.kcal), 0) / intake7.length;
    insights.push({
      icon: <Salad className="size-4 text-nutri" />,
      text:
        avgDeficit > 0
          ? `Últimos días: déficit promedio de ${fmtInt(avgDeficit)} kcal/día ≈ ${fmtDec((avgDeficit * 7) / 7700, 2)} kg por semana.${ins.rate != null ? ` La balanza marca ${ins.rate > 0 ? "+" : ""}${fmtDec(ins.rate, 2)} kg/semana.` : ""}`
          : `Últimos días: comiste en promedio ${fmtInt(-avgDeficit)} kcal por encima de tu gasto. ¡A retomar el déficit!`,
      href: "/nutricion/progreso",
    });
  }
  if (isWeighDay && !weighedThisWeek) insights.push({ icon: <Scale className="size-4 text-gym" />, text: "Hoy es tu día de pesaje semanal.", href: "/entrenamiento/peso" });
  const daysLeftInWeek = 6 - weekdayMon(today) + 1;
  if (training.thisWeekDays < s.gymDaysPerWeek) {
    const missing = s.gymDaysPerWeek - training.thisWeekDays;
    insights.push({
      icon: <Dumbbell className="size-4 text-gym" />,
      text: `Te ${missing === 1 ? "falta 1 día" : `faltan ${missing} días`} de gym para tu objetivo semanal (quedan ${daysLeftInWeek} días).`,
      href: "/entrenamiento",
    });
  }
  if (workWeek.hours < s.workHoursGoalWeek) {
    const left = s.workHoursGoalWeek - workWeek.hours;
    insights.push({
      icon: <Briefcase className="size-4 text-work" />,
      text: `Te faltan ${fmtHours(left)} para tu objetivo semanal de trabajo (≈ ${fmtUSD(left * s.hourlyRateUsd)} / ${fmtARS(left * s.hourlyRateUsd * rate)}).`,
      href: "/trabajo",
    });
  }
  if (openList) {
    insights.push({
      icon: <ShoppingCart className="size-4 text-nutri" />,
      text: `Lista de compras pendiente: ${openList.total - openList.checked} ítems por comprar.`,
      href: `/nutricion/compras/${openList.id}`,
    });
  }
  if (nextAllergen && babyCtx.baby) {
    insights.push({
      icon: <Baby className="size-4 text-baby" />,
      text: `${babyCtx.baby.name} todavía no probó ${ALLERGENS[nextAllergen].label.toLowerCase()}: podés introducirlo esta semana.`,
      href: "/bebe/alimentos",
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {greeting()}
          {s.name ? `, ${s.name}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{fmtDateLong(today)}</p>
      </div>

      {insights.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-500" /> Para hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {insights.map((i, k) => {
              const inner = (
                <>
                  <span className="mt-0.5 shrink-0">{i.icon}</span>
                  <span className="flex-1">{i.text}</span>
                  {i.href && <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
                </>
              );
              return i.href ? (
                <Link key={k} href={i.href} className="flex gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60">
                  {inner}
                </Link>
              ) : (
                <div key={k} className="flex gap-2.5 px-2 py-1.5 text-sm">
                  {inner}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Nutrición */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Salad className="size-4 text-nutri" /> Comida de hoy
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/nutricion">
                Diario <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <CalorieSummary summary={summary} targets={ctx.targets} compact />
            {pendingPlan.length > 0 && (
              <div className="space-y-1.5 rounded-xl bg-muted/50 p-2">
                <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="size-3.5" /> Planificado para hoy
                </div>
                {pendingPlan.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5">
                    <span>{p.recipe.emoji}</span>
                    <Link href={`/nutricion/recetas/${p.recipe.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                      {p.recipe.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{MEAL_LABEL[p.meal]}</span>
                    <ActionButton size="xs" variant="secondary" action={togglePlanItemDone.bind(null, p.id)}>
                      <Check className="size-3" /> Comí
                    </ActionButton>
                  </div>
                ))}
              </div>
            )}
            <WaterTracker date={today} ml={summary.waterMl} goal={s.waterGoalMl} />
          </CardContent>
        </Card>

        {/* Entrenamiento + peso */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="size-4 text-gym" /> Entrenamiento
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/entrenamiento">
                Ver <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS_SHORT.map((label, i) => {
                const d = addDaysISO(weekStart, i);
                const done = training.days.has(d);
                return (
                  <div key={d} className="flex flex-col items-center gap-1">
                    <span className={cn("text-[10px] text-muted-foreground", d === today && "font-semibold text-foreground")}>{label}</span>
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-full border-2",
                        done ? "border-gym bg-gym text-white" : d > today ? "border-dashed border-muted" : "border-muted",
                      )}
                    >
                      {done && <Check className="size-3.5" />}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-semibold">
                  {training.thisWeekDays}/{s.gymDaysPerWeek}
                </span>{" "}
                días esta semana · {fmtInt(training.kcal)} kcal quemadas
                {training.streakWeeks > 0 && <span className="text-muted-foreground"> · racha {training.streakWeeks} sem 🔥</span>}
              </span>
              {!training.days.has(today) ? (
                <ActionButton size="sm" className="bg-gym text-white hover:bg-gym/90" action={quickWorkout.bind(null, today, "fuerza", 60)}>
                  <Zap className="size-3.5" /> Fui al gym hoy
                </ActionButton>
              ) : (
                <span className="text-sm font-medium text-gym">¡Hoy entrenaste! 💪</span>
              )}
            </div>
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">Peso actual</div>
                  <div className="text-xl font-semibold">{ins.latest ? `${fmtDec(ins.latest.weightKg, 1)} kg` : "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {ins.change != null && `${ins.change > 0 ? "+" : ""}${fmtDec(ins.change, 1)} kg desde el inicio`}
                    {ins.toGoal != null && ins.toGoal > 0 && ` · faltan ${fmtDec(ins.toGoal, 1)} kg`}
                  </div>
                </div>
                <WeightDialog
                  defaults={{ date: today, weightKg: ins.latest?.weightKg }}
                  trigger={
                    <Button size="sm" variant={isWeighDay && !weighedThisWeek ? "default" : "outline"}>
                      <Scale className="size-3.5" /> Pesarme
                    </Button>
                  }
                />
              </div>
              {ins.progressPct != null && (
                <ProgressBar value={ins.progressPct} max={1} barClassName="bg-gym" overClassName="bg-gym" className="mt-2" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trabajo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="size-4 text-work" /> Trabajo
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/trabajo">
                Ver <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <WorkTimer
              running={running ? { id: running.id, startedAt: running.startedAt!.toISOString(), project: running.project, rateUsd: running.rateUsd } : null}
              hourlyRate={s.hourlyRateUsd}
              arsRate={rate}
              projects={projects}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Hoy</div>
                <div className="text-lg font-semibold">{fmtHours(workToday.hours)}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtUSD(workToday.usd)} · {fmtARS(workToday.usd * rate)}
                </div>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Semana</div>
                <div className="text-lg font-semibold">
                  {fmtHours(workWeek.hours)} <span className="text-xs font-normal text-muted-foreground">/ {fmtDec(s.workHoursGoalWeek)} h</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmtUSD(workWeek.usd)} · {fmtARS(workWeek.usd * rate)}
                </div>
              </div>
            </div>
            <ProgressBar value={workWeek.hours} max={s.workHoursGoalWeek} barClassName="bg-work" overClassName="bg-work" />
            <div className="text-xs text-muted-foreground">
              Cotización {rateInfo.rate.label} ({rateInfo.rate.side}): <span className="font-medium text-foreground">{fmtARS(rate, 2)}</span> · 1 h ={" "}
              {fmtARS(s.hourlyRateUsd * rate)}
            </div>
          </CardContent>
        </Card>

        {/* Bebé + hábitos */}
        <div className="space-y-5">
          {babyCtx.baby && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Baby className="size-4 text-baby" /> {babyCtx.baby.name}
                </CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/bebe">
                    Ver <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {babyCtx.baby.birthDate && <div>Tiene {ageLabel(babyCtx.baby.birthDate, today)}</div>}
                <div className="text-muted-foreground">
                  {babyStage ? babyStage.title : "Todavía en lactancia exclusiva: preparate para los 6 meses."} · {exposures.length} alimentos probados
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Hábitos de hoy</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/ajustes#habitos">Editar</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {habits.length ? (
                <HabitsToday habits={habits} today={today} />
              ) : (
                <p className="text-sm text-muted-foreground">Agregá hábitos en Ajustes.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
