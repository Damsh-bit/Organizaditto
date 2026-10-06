import type { Metadata } from "next";
import Link from "next/link";
import { ChefHat } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { AddToSlotButton, PlanItemRow, PlanToolbar } from "@/components/nutrition/plan-client";
import { DateNav, EmptyState, ProgressBar } from "@/components/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEALS } from "@/lib/constants";
import { addDaysISO, fmtDate, fmtDateShort, isISODate, startOfWeekISO, todayISO, weekDates } from "@/lib/dates";
import { fmtDec, fmtInt } from "@/lib/format";
import { buildPrepTasks } from "@/lib/planner";
import { getProfileContext } from "@/lib/data/settings";
import { getMenuTemplates, getPlanItems, getRecipeOptions } from "@/lib/data/nutrition";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plan semanal" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PlanPage({ searchParams }: Props) {
  const sp = await searchParams;
  const today = todayISO();
  const weekStart = startOfWeekISO(isISODate(sp.semana) ? sp.semana : today);
  const dates = weekDates(weekStart);
  const [ctx, items, recipes, templates] = await Promise.all([
    getProfileContext(),
    getPlanItems(dates[0], dates[6], "adult"),
    getRecipeOptions("adult"),
    getMenuTemplates(),
  ]);
  const target = ctx.targets.target;
  const split = ctx.settings.mealSplit ?? {};
  const prep = buildPrepTasks(items);
  const plannedDays = dates.filter((d) => items.some((i) => i.date === d));
  const weekKcal = items.reduce((a, i) => a + i.recipe.kcal * i.servings, 0);
  const avg = plannedDays.length ? weekKcal / plannedDays.length : 0;
  const thisWeek = startOfWeekISO(today);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plan semanal"
        description={`Tu objetivo: ${fmtInt(target)} kcal por día. Planificá, cociná y generá la lista del súper.`}
      />
      <DateNav
        label={`Semana del ${fmtDate(dates[0])} al ${fmtDate(dates[6])}`}
        sublabel={plannedDays.length ? `Promedio planificado: ${fmtInt(avg)} kcal/día` : "Semana sin planificar"}
        prevHref={`/nutricion/plan?semana=${addDaysISO(weekStart, -7)}`}
        nextHref={`/nutricion/plan?semana=${addDaysISO(weekStart, 7)}`}
        todayHref={weekStart !== thisWeek ? "/nutricion/plan" : null}
      />
      <PlanToolbar
        weekStart={weekStart}
        prevWeekStart={addDaysISO(weekStart, -7)}
        templates={templates.filter((t) => !t.slug?.startsWith("bebe-") && !t.items.some((i) => i.recipeSlug?.startsWith("bebe-")) && !(t.isCustom && t.emoji === "👶"))}
        hasItems={items.length > 0}
      />

      {!items.length && (
        <EmptyState
          emoji="🗓️"
          title="Esta semana está vacía"
          description="Tocá “Generar semana” para que arme un menú a tu medida, o “Aplicar menú” para usar uno de los menús preparados."
        />
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dates.map((d) => {
          const dayItems = items.filter((i) => i.date === d);
          const kcal = dayItems.reduce((a, i) => a + i.recipe.kcal * i.servings, 0);
          const protein = dayItems.reduce((a, i) => a + i.recipe.protein * i.servings, 0);
          const diff = kcal - target;
          const meals = MEALS.filter((m) => (split[m.key] ?? 0) > 0 || dayItems.some((i) => i.meal === m.key) || m.key === "snack");
          return (
            <Card key={d} size="sm" className={cn(d === today && "ring-2 ring-nutri/60")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <Link href={`/nutricion?fecha=${d}`} className="capitalize hover:underline">
                    {fmtDateShort(d)}
                    {d === today && <span className="ml-2 text-xs font-normal text-nutri">hoy</span>}
                  </Link>
                  {kcal > 0 && (
                    <span className={cn("text-xs font-normal tabular", Math.abs(diff) > target * 0.1 ? "text-amber-600" : "text-muted-foreground")}>
                      {fmtInt(kcal)} kcal · P {fmtInt(protein)} g
                    </span>
                  )}
                </CardTitle>
                {kcal > 0 && <ProgressBar value={kcal} max={target} barClassName="bg-nutri" height="h-1.5" className="mt-1" />}
              </CardHeader>
              <CardContent className="space-y-1">
                {meals.map((m) => {
                  const mealItems = dayItems.filter((i) => i.meal === m.key);
                  return (
                    <div key={m.key}>
                      {mealItems.length > 0 && (
                        <div className="px-1.5 pt-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                          {m.emoji} {m.label}
                        </div>
                      )}
                      {mealItems.map((it) => (
                        <PlanItemRow key={it.id} item={it} canMarkDone={d <= today} />
                      ))}
                      {mealItems.length === 0 && (
                        <AddToSlotButton
                          date={d}
                          meal={m.key}
                          mealLabel={m.label}
                          recipes={recipes}
                          slotTarget={target * (split[m.key] ?? 0.1)}
                        />
                      )}
                    </div>
                  );
                })}
                {dayItems.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 border-t pt-1">
                    {meals
                      .filter((m) => dayItems.some((i) => i.meal === m.key))
                      .map((m) => (
                        <div key={m.key} className="w-auto">
                          <AddToSlotButton date={d} meal={m.key} mealLabel={m.label} recipes={recipes} slotTarget={target * (split[m.key] ?? 0.1)} />
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {prep.length > 0 && (
        <section>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <ChefHat className="size-4 text-nutri" /> Guía de preparación de la semana
            </span>
          </SectionTitle>
          <p className="mb-3 text-sm text-muted-foreground">
            Qué cocinar y cuánto, agrupado por receta. Las recetas que rinden varias porciones se cocinan una vez y alcanzan para varios días.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {prep.map((t) => (
              <Link
                key={t.recipeId}
                href={`/nutricion/recetas/${t.recipeId}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <span className="text-2xl">{t.emoji ?? "🍽️"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDec(t.totalServings, 2)} porciones para {t.dates.map((d) => fmtDateShort(d)).join(", ")}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="font-medium">
                    {t.batches} {t.batches === 1 ? "tanda" : "tandas"}
                  </div>
                  <div className="text-muted-foreground">rinde {fmtDec(t.recipeServings, 1)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
