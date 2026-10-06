import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Check, Copy, Plus, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { AddFoodDialog } from "@/components/nutrition/add-food-dialog";
import { CalorieSummary } from "@/components/nutrition/calorie-summary";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { PageHeader } from "@/components/page-header";
import { DateNav } from "@/components/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { copyMealFromDate, deleteFoodLog, togglePlanItemDone } from "@/app/actions/nutrition";
import { MEALS } from "@/lib/constants";
import { addDaysISO, fmtDateLong, isISODate, relativeDayLabel, todayISO } from "@/lib/dates";
import { fmtDec, fmtGrams, fmtInt } from "@/lib/format";
import { getProfileContext } from "@/lib/data/settings";
import { getDaySummary, getFoodOptions, getFrequentLogItems, getPlanItems, getRecipeOptions } from "@/lib/data/nutrition";

export const metadata: Metadata = { title: "Diario de comidas" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DiarioPage({ searchParams }: Props) {
  const sp = await searchParams;
  const today = todayISO();
  const date = isISODate(sp.fecha) ? sp.fecha : today;
  const ctx = await getProfileContext();
  if (!ctx.settings.onboarded) redirect("/bienvenida");

  const [summary, foods, recipes, frequent, plan] = await Promise.all([
    getDaySummary(date, ctx),
    getFoodOptions(),
    getRecipeOptions("adult"),
    getFrequentLogItems(10),
    getPlanItems(date, date, "adult"),
  ]);
  const pendingPlan = plan.filter((p) => !p.done);
  const yesterday = addDaysISO(date, -1);

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

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Card>
            <CardContent>
              <CalorieSummary summary={summary} targets={ctx.targets} compact />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <WaterTracker date={date} ml={summary.waterMl} goal={ctx.settings.waterGoalMl} />
            </CardContent>
          </Card>

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
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{l.name}</div>
                          <div className="text-xs text-muted-foreground tabular">
                            {l.grams ? fmtGrams(l.grams) : l.servings ? `${fmtDec(l.servings, 2)} porc.` : "registro rápido"} · P {fmtDec(l.protein)} · C{" "}
                            {fmtDec(l.carbs)} · G {fmtDec(l.fat)}
                          </div>
                        </div>
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
