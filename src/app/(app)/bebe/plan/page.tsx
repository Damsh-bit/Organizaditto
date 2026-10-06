import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AddToSlotButton, PlanItemRow, PlanToolbar } from "@/components/nutrition/plan-client";
import { DateNav, EmptyState } from "@/components/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEALS } from "@/lib/constants";
import { stageFor } from "@/lib/baby-guide";
import { addDaysISO, fmtDate, fmtDateShort, isISODate, startOfWeekISO, weekDates } from "@/lib/dates";
import { getBabyContext } from "@/lib/data/baby";
import { getMenuTemplates, getPlanItems, getRecipeOptions } from "@/lib/data/nutrition";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plan del bebé" };

export default async function BabyPlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { baby, months, today } = await getBabyContext();
  const weekStart = startOfWeekISO(isISODate(sp.semana) ? sp.semana : today);
  const dates = weekDates(weekStart);
  const [items, recipes, templates] = await Promise.all([getPlanItems(dates[0], dates[6], "baby"), getRecipeOptions("baby"), getMenuTemplates()]);
  const stage = stageFor(months);
  const meals = MEALS.filter((m) => m.key !== "snack");
  const babyTemplates = templates.filter((t) => t.slug?.startsWith("bebe-") || t.items.some((i) => i.recipeSlug?.startsWith("bebe-")) || (t.isCustom && t.emoji === "👶"));
  const thisWeek = startOfWeekISO(today);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Plan de ${baby?.name ?? "bebé"}`}
        description={stage ? `${stage.title}: ${stage.meals}` : "Planificá sus comidas de la semana; los ingredientes se suman a tu lista de compras."}
      />
      <DateNav
        label={`Semana del ${fmtDate(dates[0])} al ${fmtDate(dates[6])}`}
        prevHref={`/bebe/plan?semana=${addDaysISO(weekStart, -7)}`}
        nextHref={`/bebe/plan?semana=${addDaysISO(weekStart, 7)}`}
        todayHref={weekStart !== thisWeek ? "/bebe/plan" : null}
      />
      <PlanToolbar weekStart={weekStart} prevWeekStart={addDaysISO(weekStart, -7)} templates={babyTemplates} audience="baby" hasItems={items.length > 0} />
      {!items.length && (
        <EmptyState
          emoji="🍼"
          title="Semana sin planificar"
          description={
            <>
              Aplicá un menú armado (por ejemplo, la <Link href="/bebe/menus" className="underline">primera semana</Link>) o agregá recetas día por día.
            </>
          }
        />
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dates.map((d) => {
          const dayItems = items.filter((i) => i.date === d);
          return (
            <Card key={d} size="sm" className={cn(d === today && "ring-2 ring-baby/60")}>
              <CardHeader>
                <CardTitle className="capitalize">
                  {fmtDateShort(d)}
                  {d === today && <span className="ml-2 text-xs font-normal text-baby">hoy</span>}
                </CardTitle>
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
                        <PlanItemRow key={it.id} item={it} canMarkDone={d <= today} showKcal={false} basePath="/bebe/recetas" />
                      ))}
                      {mealItems.length === 0 && <AddToSlotButton date={d} meal={m.key} mealLabel={m.label} recipes={recipes} audience="baby" />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Al tildar una comida se registra en el diario del bebé y sus ingredientes quedan como “probados”. Las porciones del plan son de la receta
        (cada receta indica cuánto rinde).
      </p>
    </div>
  );
}
