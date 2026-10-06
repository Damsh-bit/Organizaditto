import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Check, Copy, Plus, Sparkles, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { AddFoodDialog } from "@/components/nutrition/add-food-dialog";
import { CalorieSummary } from "@/components/nutrition/calorie-summary";
import { EditLogAmount } from "@/components/nutrition/edit-log-amount";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { PageHeader } from "@/components/page-header";
import { DateNav } from "@/components/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addFoodLog, copyMealFromDate, deleteFoodLog, togglePlanItemDone } from "@/app/actions/nutrition";
import { MEAL_LABEL, MEALS } from "@/lib/constants";
import { addDaysISO, fmtDateLong, isISODate, relativeDayLabel, startOfWeekISO, todayISO, TZ, weekdayMon } from "@/lib/dates";
import { nextMealByHour, suggestRecipes } from "@/lib/suggest";
import { fmtDec, fmtGrams, fmtInt } from "@/lib/format";
import { getProfileContext } from "@/lib/data/settings";
import { getDaySummary, getExerciseKcal, getFoodOptions, getFrequentLogItems, getIntakeByDay, getPlanItems, getRecipeOptions } from "@/lib/data/nutrition";

export const metadata: Metadata = { title: "Diario de comidas" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DiarioPage({ searchParams }: Props) {
  const sp = await searchParams;
  const today = todayISO();
  const date = isISODate(sp.fecha) ? sp.fecha : today;
  const ctx = await getProfileContext();
  if (!ctx.settings.onboarded) redirect("/bienvenida");

  const weekStart = startOfWeekISO(date);
  const [summary, foods, recipes, frequent, plan, weekIntake, weekExercise] = await Promise.all([
    getDaySummary(date, ctx),
    getFoodOptions(),
    getRecipeOptions("adult"),
    getFrequentLogItems(10),
    getPlanItems(date, date, "adult"),
    date > weekStart ? getIntakeByDay(weekStart, addDaysISO(date, -1)) : Promise.resolve([]),
    date > weekStart ? getExerciseKcal(weekStart, addDaysISO(date, -1)) : Promise.resolve(new Map<string, number>()),
  ]);
  // Balance semanal: compara lo comido los días ya registrados de la semana con lo previsto para esos días.
  const eatBack = ctx.settings.exerciseEatBackPct / 100;
  const pastExpected = weekIntake.reduce((a, r) => a + ctx.targets.target + (weekExercise.get(r.date) ?? 0) * eatBack, 0);
  const pastEaten = weekIntake.reduce((a, r) => a + r.kcal, 0);
  const weekBalance = pastExpected - pastEaten; // > 0: vas por debajo (bien para el déficit)
  const daysLeft = 7 - weekdayMon(date);
  const adjustedDaily = Math.round(ctx.targets.target + weekBalance / daysLeft);
  const pendingPlan = plan.filter((p) => !p.done);
  const yesterday = addDaysISO(date, -1);
  const hour = Number(new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()));
  const nextMeal = nextMealByHour(hour);
  const suggestions =
    date === today
      ? suggestRecipes({
          recipes,
          meal: nextMeal,
          remainingKcal: summary.remaining,
          slotTarget: ctx.targets.target * (ctx.settings.mealSplit?.[nextMeal] ?? 0.25),
          proteinLeft: ctx.targets.protein - summary.totals.protein,
        })
      : [];

  return (
    <div className="space-y-5">
      <PageHeader title="Diario" description="Registrá lo que comés y mirá cuánto te queda para el déficit." />

      <DateNav
        label={relativeDayLabel(date, today)}
        sublabel={date !== today ? undefined : fmtDateLong(date)}
        prevHref={`/nutricion?fecha=${addDaysISO(date, -1)}`}
        nextHref={`/nutricion?fecha=${addDaysISO(date, 1)}`}
        todayHref={date !== today ? "/nutricion" : null}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Card>
            <CardContent>
              <CalorieSummary summary={summary} targets={ctx.targets} compact />
            </CardContent>
          </Card>
          {weekIntake.length > 0 && Math.abs(weekBalance) >= 100 && (
            <Card size="sm">
              <CardContent className="text-sm">
                {weekBalance > 0 ? (
                  <>
                    📉 En la semana vas <b>{fmtInt(weekBalance)} kcal por debajo</b> de lo previsto ({weekIntake.length}{" "}
                    {weekIntake.length === 1 ? "día registrado" : "días registrados"}). ¡Buen ritmo de déficit!
                  </>
                ) : (
                  <>
                    📈 En la semana vas <b>{fmtInt(-weekBalance)} kcal por encima</b> de lo previsto. Para compensar sin pasar hambre, apuntá a
                    unas <b>{fmtInt(Math.max(ctx.targets.minSafe, adjustedDaily))} kcal por día</b> lo que queda de la semana.
                  </>
                )}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <WaterTracker date={date} ml={summary.waterMl} goal={ctx.settings.waterGoalMl} />
            </CardContent>
          </Card>

          {suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500" /> ¿Qué como ahora?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Ideas para {summary.remaining < 250 ? "una colación" : `${nextMeal === "cena" || nextMeal === "merienda" ? "la" : "el"} ${MEAL_LABEL[nextMeal].toLowerCase()}`} que entran en tus {fmtInt(summary.remaining)} kcal
                  restantes{ctx.targets.protein - summary.totals.protein > 25 ? ` y suman proteína (te faltan ${fmtInt(ctx.targets.protein - summary.totals.protein)} g)` : ""}.
                </p>
                {suggestions.map((s) => (
                  <div key={s.recipe.id} className="flex items-center gap-3 rounded-lg border p-2">
                    <span className="text-xl">{s.recipe.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/nutricion/recetas/${s.recipe.id}`} className="line-clamp-2 text-sm leading-tight font-medium hover:underline">
                        {s.recipe.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {fmtDec(s.servings, 2)} porc. · {fmtInt(s.kcal)} kcal · P {fmtInt(s.protein)} g
                      </div>
                    </div>
                    <ActionButton
                      size="sm"
                      variant="outline"
                      action={addFoodLog.bind(null, {
                        kind: "recipe",
                        date,
                        meal: summary.remaining < 250 ? "snack" : nextMeal,
                        recipeId: s.recipe.id,
                        servings: s.servings,
                      })}
                    >
                      <Plus className="size-3.5" /> Lo comí
                    </ActionButton>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {pendingPlan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-nutri" /> Planificado para este día
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingPlan.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border p-2">
                    <span className="text-xl">{p.recipe.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/nutricion/recetas/${p.recipe.id}`} className="block truncate text-sm font-medium hover:underline">
                        {p.recipe.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {MEALS.find((m) => m.key === p.meal)?.label} · {fmtDec(p.servings, 2)} porc. · {fmtInt(p.recipe.kcal * p.servings)} kcal
                      </div>
                    </div>
                    <ActionButton size="sm" variant="secondary" action={togglePlanItemDone.bind(null, p.id)}>
                      <Check className="size-3.5" /> Comí esto
                    </ActionButton>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          {MEALS.map((m) => {
            const logs = summary.logs.filter((l) => l.meal === m.key);
            const total = summary.byMeal[m.key];
            return (
              <Card key={m.key} size="sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span>{m.emoji}</span> {m.label}
                    {total.kcal > 0 && <span className="text-xs font-normal text-muted-foreground tabular">{fmtInt(total.kcal)} kcal</span>}
                  </CardTitle>
                  <AddFoodDialog
                    date={date}
                    meal={m.key}
                    foods={foods}
                    recipes={recipes}
                    frequent={frequent}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-nutri">
                        <Plus className="size-4" /> Agregar
                      </Button>
                    }
                  />
                </CardHeader>
                {logs.length > 0 ? (
                  <CardContent className="divide-y">
                    {logs.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                        <EditLogAmount
                          id={l.id}
                          name={l.name}
                          kind={l.grams && l.foodId ? "grams" : l.servings ? "servings" : "kcal"}
                          amount={l.grams && l.foodId ? l.grams : (l.servings ?? l.kcal)}
                          kcal={l.kcal}
                        >
                          <div className="truncate text-sm">{l.name}</div>
                          <div className="text-xs text-muted-foreground tabular">
                            {l.grams ? fmtGrams(l.grams) : l.servings ? `${fmtDec(l.servings, 2)} porc.` : "registro rápido"} · P {fmtDec(l.protein)} · C{" "}
                            {fmtDec(l.carbs)} · G {fmtDec(l.fat)}
                          </div>
                        </EditLogAmount>
                        <div className="text-sm font-medium tabular">{fmtInt(l.kcal)}</div>
                        <ActionButton
                          variant="ghost"
                          size="icon-sm"
                          action={deleteFoodLog.bind(null, l.id)}
                          aria-label="Eliminar"
                          className="text-muted-foreground"
                        >
                          <Trash2 className="size-3.5" />
                        </ActionButton>
                      </div>
                    ))}
                  </CardContent>
                ) : (
                  <CardContent className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Sin registros</span>
                    <ActionButton variant="ghost" size="xs" action={copyMealFromDate.bind(null, yesterday, date, m.key)}>
                      <Copy className="size-3" /> Copiar del día anterior
                    </ActionButton>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
