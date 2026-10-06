import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/page-header";
import { ApplyMenuButtons } from "@/components/nutrition/apply-menu-buttons";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteMenuTemplate } from "@/app/actions/nutrition";
import { MEAL_LABEL, MEALS, WEEKDAYS } from "@/lib/constants";
import { addDaysISO, startOfWeekISO, todayISO } from "@/lib/dates";
import { fmtInt } from "@/lib/format";
import { getMenuTemplates, getRecipeIndex } from "@/lib/data/nutrition";

export async function MenusView({ audience }: { audience: "adult" | "baby" }) {
  const [templates, index] = await Promise.all([getMenuTemplates(), getRecipeIndex()]);
  const bySlug = new Map(index.map((r) => [r.slug, r]));
  const byId = new Map(index.map((r) => [r.id, r]));
  const thisWeek = startOfWeekISO(todayISO());
  const nextWeek = addDaysISO(thisWeek, 7);

  const resolved = templates
    .map((t) => {
      const items = t.items
        .map((i) => ({ ...i, recipe: i.recipeId ? byId.get(i.recipeId) : bySlug.get(i.recipeSlug ?? "") }))
        .filter((i) => i.recipe);
      const tplAudience = items[0]?.recipe?.audience === "baby" ? "baby" : "adult";
      const days = new Set(items.map((i) => i.day)).size || 1;
      const kcal = items.reduce((a, i) => a + (i.recipe?.kcal ?? 0) * i.servings, 0) / days;
      const distinct = new Set(items.map((i) => i.recipe!.id)).size;
      return { ...t, items, tplAudience, kcal, distinct };
    })
    .filter((t) => t.tplAudience === audience);

  return (
    <div className="space-y-5">
      <PageHeader
        title={audience === "baby" ? "Menús para el bebé" : "Menús semanales"}
        description={
          audience === "baby"
            ? "Semanas armadas para empezar con la alimentación complementaria."
            : "Menús completos para el déficit, con guía de preparación. Al aplicarlos, las porciones se ajustan a tu objetivo calórico."
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {resolved.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-2xl">{t.emoji}</span> {t.name}
              </CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {audience === "adult" && <span className="rounded-full bg-muted px-2 py-0.5">≈ {fmtInt(t.kcal)} kcal/día (base)</span>}
                <span className="rounded-full bg-muted px-2 py-0.5">{t.distinct} recetas distintas</span>
                {t.isCustom && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">tuyo</span>}
              </div>
              <ApplyMenuButtons
                templateId={t.id}
                thisWeek={thisWeek}
                nextWeek={nextWeek}
                planPath={audience === "baby" ? "/bebe/plan" : "/nutricion/plan"}
              />
              <Accordion type="multiple" className="rounded-lg border px-3">
                <AccordionItem value="dias">
                  <AccordionTrigger>Ver la semana</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {WEEKDAYS.map((day, d) => {
                      const dayItems = t.items.filter((i) => i.day === d);
                      if (!dayItems.length) return null;
                      return (
                        <div key={d}>
                          <div className="text-xs font-semibold">{day}</div>
                          <ul className="mt-1 space-y-0.5">
                            {MEALS.filter((m) => dayItems.some((i) => i.meal === m.key)).map((m) =>
                              dayItems
                                .filter((i) => i.meal === m.key)
                                .map((i, k) => (
                                  <li key={`${m.key}${k}`} className="flex gap-2 text-sm">
                                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{MEAL_LABEL[m.key]}</span>
                                    <Link
                                      href={`${audience === "baby" ? "/bebe/recetas" : "/nutricion/recetas"}/${i.recipe!.id}`}
                                      className="truncate hover:underline"
                                    >
                                      {i.recipe!.emoji} {i.recipe!.name}
                                    </Link>
                                  </li>
                                )),
                            )}
                          </ul>
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
                {t.prepGuide.length > 0 && (
                  <AccordionItem value="prep" className="border-b-0">
                    <AccordionTrigger>Guía de preparación</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                        {t.prepGuide.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
              {t.isCustom && (
                <div className="flex justify-end">
                  <ActionButton
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    action={deleteMenuTemplate.bind(null, t.id)}
                    confirm="¿Eliminar este menú?"
                  >
                    <Trash2 className="size-3.5" /> Eliminar
                  </ActionButton>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
