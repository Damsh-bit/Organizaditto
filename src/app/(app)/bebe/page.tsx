import type { Metadata } from "next";
import Link from "next/link";
import { CalendarHeart, Ruler, Sparkles, Syringe, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { BabyLogDialog } from "@/components/baby/baby-log-dialog";
import { PlanItemRow } from "@/components/nutrition/plan-client";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { EmptyState, Stat } from "@/components/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteBabyLog } from "@/app/actions/baby";
import { ACCEPTANCE, ALLERGENS, MEAL_LABEL, REACTIONS } from "@/lib/constants";
import { KEY_ALLERGENS, READINESS_SIGNS, stageFor } from "@/lib/baby-guide";
import { addDaysISO, ageLabel, daysBetween, fmtDate, parseISO, startOfWeekISO, toISO } from "@/lib/dates";
import {
  getBabyContext,
  getBabyFoodOptions,
  getBabyLogs,
  getExposureSummary,
  getFoodsToTry,
  getMeasurements,
  getVaccines,
  worseReaction,
} from "@/lib/data/baby";
import { vaccineRows } from "@/lib/baby-vaccines";
import { ageInMonths, assess, fmtPercentile } from "@/lib/growth";
import { fmtDec } from "@/lib/format";
import { getPlanItems, getRecipeOptions } from "@/lib/data/nutrition";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Bebé" };

const FACES = ["", "😖", "😕", "😐", "😊", "😍"];

export default async function BebePage() {
  const { baby, months, today } = await getBabyContext();
  if (!baby) {
    return (
      <EmptyState
        emoji="👶"
        title="Cargá los datos de tu bebé"
        description="Con su fecha de nacimiento adapto las recetas, texturas y la guía a su edad."
        action={
          <Button asChild className="bg-baby text-white dark:text-neutral-950 hover:bg-baby/90">
            <Link href="/ajustes#bebe">Ir a Ajustes</Link>
          </Button>
        }
      />
    );
  }

  const [logs, exposures, toTry, recipes, foods, plan, measurements, vaccines] = await Promise.all([
    getBabyLogs(baby.id, addDaysISO(today, -6), today),
    getExposureSummary(baby.id),
    getFoodsToTry(baby.id, months ?? 6),
    getRecipeOptions("baby"),
    getBabyFoodOptions(),
    getPlanItems(today, today, "baby"),
    getMeasurements(baby.id),
    getVaccines(baby.id),
  ]);
  const stage = stageFor(months);
  const lastWeight = [...measurements].reverse().find((m) => m.weightKg != null);
  const weightPct =
    lastWeight && baby.birthDate
      ? assess("weight", baby.sex === "male" ? "male" : "female", ageInMonths(baby.birthDate, lastWeight.date), lastWeight.weightKg!)
      : null;
  const vRows = baby.birthDate ? vaccineRows(baby.birthDate, today, vaccines) : [];
  const vLate = vRows.filter((v) => v.status === "atrasada");
  const vNext = vRows.find((v) => !v.optional && v.status !== "aplicada" && v.status !== "atrasada");
  const todayLogs = logs.filter((l) => l.date === today);
  const weekStart = startOfWeekISO(today);
  const newThisWeek = exposures.filter((e) => e.firstDate >= weekStart).length;
  const sixMonths = baby.birthDate ? (() => {
    const d = parseISO(baby.birthDate);
    d.setMonth(d.getMonth() + 6);
    return toISO(d);
  })() : null;
  const daysToStart = sixMonths ? daysBetween(today, sixMonths) : null;

  const allergenStatus = KEY_ALLERGENS.map((key) => {
    const ex = exposures.filter((e) => e.allergen === key);
    const times = ex.reduce((a, e) => a + e.times, 0);
    const worst = ex.reduce((a, e) => worseReaction(a, e.worstReaction), "ninguna");
    return { key, times, worst, first: ex[0]?.firstDate ?? null };
  });
  const suggestions = [
    ...toTry.filter((f) => f.allergen && allergenStatus.find((a) => a.key === f.allergen)?.times === 0).slice(0, 3),
    ...toTry.filter((f) => !f.allergen && ["carnes", "verduras", "frutas", "legumbres"].includes(f.category)).slice(0, 5),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="👶"
        title={baby.name}
        description={baby.birthDate ? `Tiene ${ageLabel(baby.birthDate, today)}` : "Cargá su fecha de nacimiento en Ajustes"}
        actions={
          <BabyLogDialog
            date={today}
            recipes={recipes}
            foods={foods}
            months={months}
            triedFoodIds={exposures.map((e) => e.foodId)}
          />
        }
      />

      {daysToStart != null && daysToStart > 0 ? (
        <Card className="border-baby/40 bg-baby/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarHeart className="size-4 text-baby" /> Faltan {daysToStart} días para los 6 meses
            </CardTitle>
            <CardDescription>
              El {fmtDate(sixMonths!)} cumple 6 meses: la edad recomendada para empezar la alimentación complementaria. Mientras tanto, leche materna o fórmula
              exclusiva. Señales de que está lista:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {READINESS_SIGNS.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-baby">✓</span> {s}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/bebe/guia">Leer la guía</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/bebe/menus">Ver menú de la primera semana</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        stage && (
          <Card className="border-baby/40 bg-baby/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{stage.emoji}</span> {stage.title}
              </CardTitle>
              <CardDescription>{stage.summary}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Frecuencia</div>
                {stage.meals}
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Cantidad</div>
                {stage.amount}
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Texturas</div>
                {stage.textures}
              </div>
            </CardContent>
          </Card>
        )
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Alimentos probados" value={exposures.length} hint={`${newThisWeek} nuevos esta semana`} />
        <Stat label="Comidas registradas" value={logs.length} hint="últimos 7 días" />
        <Stat label="Alérgenos introducidos" value={`${allergenStatus.filter((a) => a.times > 0).length} de ${KEY_ALLERGENS.length}`} />
        <Stat
          label="Reacciones"
          value={exposures.filter((e) => e.worstReaction !== "ninguna").length}
          hint="alimentos con alguna reacción"
          valueClassName={exposures.some((e) => e.worstReaction !== "ninguna") ? "text-amber-600" : undefined}
        />
      </div>

      {baby.birthDate && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/bebe/crecimiento" className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50">
            <Ruler className="size-5 shrink-0 text-baby" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-medium">Crecimiento</div>
              <div className="text-xs text-muted-foreground">
                {lastWeight
                  ? `${fmtDec(lastWeight.weightKg!, 2)} kg el ${fmtDate(lastWeight.date, "d/M")}${weightPct ? ` · percentil ${fmtPercentile(weightPct.percentile)}` : ""}`
                  : "Cargá las medidas del último control"}
              </div>
            </div>
          </Link>
          <Link
            href="/bebe/vacunas"
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50",
              vLate.length > 0 && vaccines.length > 0 && "border-warning/50",
            )}
          >
            <Syringe className="size-5 shrink-0 text-baby" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-medium">Vacunas</div>
              <div className="text-xs text-muted-foreground">
                {vaccines.length === 0
                  ? "Cargá las de la libreta para que te avise las próximas"
                  : vLate.length > 0
                    ? `${vLate.length} atrasada${vLate.length === 1 ? "" : "s"} · revisá la libreta`
                    : vNext
                      ? `Próxima: ${vNext.name} (${vNext.ageLabel.toLowerCase()}, ${fmtDate(vNext.dueDate, "d/M")})`
                      : "Calendario completo ✓"}
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hoy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.length > 0 && (
              <div className="rounded-lg border p-1">
                <div className="px-1.5 pt-1 text-[11px] font-semibold text-muted-foreground uppercase">Planificado</div>
                {plan.map((p) => (
                  <PlanItemRow key={p.id} item={p} canMarkDone showKcal={false} basePath="/bebe/recetas" />
                ))}
              </div>
            )}
            {todayLogs.length === 0 && plan.length === 0 && <p className="text-sm text-muted-foreground">Todavía no registraste comidas hoy.</p>}
            {todayLogs.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-lg border p-2">
                <span className="text-2xl">{l.acceptance ? FACES[l.acceptance] : (l.recipe?.emoji ?? "🍼")}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {MEAL_LABEL[l.meal]}
                    {l.amount ? ` · ${l.amount}` : ""}
                    {l.acceptance ? ` · ${ACCEPTANCE[l.acceptance]}` : ""}
                    {l.reaction !== "ninguna" && <span className="text-amber-600"> · reacción {l.reaction}</span>}
                  </div>
                </div>
                <ActionButton variant="ghost" size="icon-sm" className="text-muted-foreground" action={deleteBabyLog.bind(null, l.id)} confirm="¿Eliminar?" aria-label="Eliminar">
                  <Trash2 className="size-3.5" />
                </ActionButton>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alérgenos</CardTitle>
            <CardDescription>Introducirlos temprano (desde los 6 meses), de a uno y de día.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {allergenStatus.map((a) => (
              <div
                key={a.key}
                className={cn(
                  "rounded-lg border p-2 text-center",
                  a.times > 0 && a.worst === "ninguna" && "border-success/40 bg-success/10",
                  a.worst !== "ninguna" && "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
                )}
              >
                <div className="text-xl">{ALLERGENS[a.key]?.emoji}</div>
                <div className="text-xs font-medium">{ALLERGENS[a.key]?.label}</div>
                <div className={cn("text-[11px]", a.worst !== "ninguna" ? "text-amber-700" : "text-muted-foreground")}>
                  {a.times === 0 ? "sin probar" : a.worst !== "ninguna" ? `reacción ${REACTIONS[a.worst].label.toLowerCase()}` : `${a.times} ${a.times === 1 ? "vez" : "veces"} ✓`}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {suggestions.length > 0 && (months ?? 0) >= 6 && (
        <section>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-baby" /> Para probar esta semana
            </span>
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((f) => (
              <span key={f.id} className="rounded-full border bg-card px-3 py-1 text-sm">
                {f.name}
                {f.allergen && <span className="ml-1 text-xs text-amber-600">(alérgeno)</span>}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
