import type { Metadata } from "next";
import Link from "next/link";
import { DailyBarChart } from "@/components/charts";
import { AdaptiveCard } from "@/components/nutrition/adaptive-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState, Stat } from "@/components/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addDaysISO, fmtDateShort, rangeISO, todayISO } from "@/lib/dates";
import { fmtDec, fmtInt } from "@/lib/format";
import { getProfileContext } from "@/lib/data/settings";
import { baseTdee } from "@/lib/adaptive";
import { getAdaptive, getExerciseKcal, getIntakeByDay, getMetricsByDay } from "@/lib/data/nutrition";
import { sleepVsIntake, SHORT_SLEEP_H, GOOD_SLEEP_H } from "@/lib/sleep";
import { getWeightLogs } from "@/lib/data/training";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progreso nutricional" };

const RANGES = [7, 14, 30, 90];

export default async function ProgresoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.dias)) ? Number(sp.dias) : 14;
  const today = todayISO();
  const from = addDaysISO(today, -(days - 1));
  const ctx = await getProfileContext();
  const sleepFrom = addDaysISO(today, -60);
  const [intake, exercise, weights, adaptive, metrics60, intake60] = await Promise.all([
    getIntakeByDay(from, today),
    getExerciseKcal(from, today),
    getWeightLogs(),
    getAdaptive(ctx),
    getMetricsByDay(sleepFrom, today),
    getIntakeByDay(sleepFrom, today),
  ]);
  const sleep = sleepVsIntake(metrics60, intake60, ctx.targets.target, today);

  const byDate = new Map(intake.map((r) => [r.date, r]));
  const dates = rangeISO(from, today);
  const target = ctx.targets.target;
  const eatBack = ctx.settings.exerciseEatBackPct / 100;
  const logged = intake.filter((r) => r.date < today || r.entries >= 3);

  const avgKcal = logged.length ? logged.reduce((a, r) => a + r.kcal, 0) / logged.length : 0;
  const avgProtein = logged.length ? logged.reduce((a, r) => a + r.protein, 0) / logged.length : 0;
  const onTarget = logged.filter((r) => {
    const budget = target + (exercise.get(r.date) ?? 0) * eatBack;
    return Math.abs(r.kcal - budget) <= target * 0.1;
  }).length;
  const tdee = baseTdee(adaptive, ctx.targets.tdee);
  const totalDeficit = logged.reduce((a, r) => a + (tdee.value + (exercise.get(r.date) ?? 0) - r.kcal), 0);
  const estLossKg = totalDeficit / 7700;

  const before = [...weights].filter((w) => w.date <= from).at(-1) ?? weights.find((w) => w.date >= from);
  const lastW = weights.at(-1);
  const realChange = before && lastW && lastW.date > before.date ? lastW.weightKg - before.weightKg : null;

  const kcalSeries = dates.map((d) => ({ date: d, value: byDate.get(d)?.kcal ?? null }));
  const proteinSeries = dates.map((d) => ({ date: d, value: byDate.get(d)?.protein ?? null }));

  return (
    <div className="space-y-5">
      <PageHeader title="Progreso" description="Cómo venís con el déficit: lo que comiste, lo que quemaste y lo que dice la balanza." />

      <div className="flex gap-1.5">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/nutricion/progreso?dias=${r}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              r === days ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {r} días
          </Link>
        ))}
      </div>

      <AdaptiveCard
        result={adaptive}
        target={target}
        deficitKcal={ctx.settings.deficitKcal}
        hasOverride={ctx.settings.targetKcalOverride != null}
      />

      {sleep && Math.abs(sleep.diff) >= 100 && (
        <Card>
          <CardHeader>
            <CardTitle>Sueño y hambre</CardTitle>
            <CardDescription>
              Últimos 60 días: después de dormir menos de {fmtDec(SHORT_SLEEP_H, 1)} h comiste en promedio {fmtInt(sleep.shortAvg)} kcal; con{" "}
              {fmtInt(GOOD_SLEEP_H)} h o más, {fmtInt(sleep.goodAvg)} kcal.{" "}
              {sleep.diff > 0
                ? `Son ${fmtInt(sleep.diff)} kcal más por día: dormir bien también es parte del déficit.`
                : `Curiosamente comés ${fmtInt(-sleep.diff)} kcal menos cuando dormís poco.`}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!logged.length ? (
        <EmptyState emoji="📈" title="Todavía no hay registros en este período" description="Registrá tus comidas en el Diario y acá vas a ver tu evolución." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Promedio diario" value={`${fmtInt(avgKcal)} kcal`} hint={`objetivo ${fmtInt(target)} kcal`} />
            <Stat label="Días en objetivo (±10%)" value={`${onTarget} de ${logged.length}`} hint={`${fmtInt((onTarget / logged.length) * 100)}% de adherencia`} />
            <Stat
              label="Déficit acumulado"
              value={`${fmtInt(totalDeficit)} kcal`}
              hint={`≈ ${fmtDec(Math.max(0, estLossKg), 2)} kg de grasa (teórico)`}
            />
            <Stat
              label="Cambio real de peso"
              value={realChange == null ? "—" : `${realChange > 0 ? "+" : ""}${fmtDec(realChange, 1)} kg`}
              hint={realChange == null ? "Pesate para comparar" : `desde ${fmtDateShort(before!.date)}`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Calorías por día</CardTitle>
              <CardDescription>La línea marca tu objetivo base. Los días de entrenamiento suman calorías extra.</CardDescription>
            </CardHeader>
            <CardContent>
              <DailyBarChart data={kcalSeries} target={target} unit="kcal" color="var(--nutri)" label="Calorías" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proteína por día</CardTitle>
              <CardDescription>
                Promedio {fmtInt(avgProtein)} g · objetivo {fmtInt(ctx.targets.protein)} g. Comer suficiente proteína ayuda a no perder músculo en el déficit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DailyBarChart data={proteinSeries} target={ctx.targets.protein} unit="g" color="var(--chart-4)" label="Proteína" height={180} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Día</th>
                    <th className="py-2 text-right font-medium">kcal</th>
                    <th className="py-2 text-right font-medium">Prot</th>
                    <th className="py-2 text-right font-medium">Carb</th>
                    <th className="py-2 text-right font-medium">Grasa</th>
                    <th className="py-2 text-right font-medium">Ejercicio</th>
                    <th className="py-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y tabular">
                  {[...logged].reverse().map((r) => {
                    const ex = exercise.get(r.date) ?? 0;
                    const balance = r.kcal - (tdee.value + ex);
                    return (
                      <tr key={r.date}>
                        <td className="py-1.5 capitalize">
                          <Link href={`/nutricion?fecha=${r.date}`} className="hover:underline">
                            {fmtDateShort(r.date)}
                          </Link>
                        </td>
                        <td className="py-1.5 text-right">{fmtInt(r.kcal)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{fmtInt(r.protein)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{fmtInt(r.carbs)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{fmtInt(r.fat)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{ex ? fmtInt(ex) : "—"}</td>
                        <td className={cn("py-1.5 text-right font-medium", balance < 0 ? "text-success" : "text-destructive")}>
                          {balance > 0 ? "+" : ""}
                          {fmtInt(balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                Balance = lo que comiste − (gasto diario {tdee.real ? "real" : "estimado"} {fmtInt(tdee.value)} kcal + ejercicio). Negativo = déficit ✔.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
