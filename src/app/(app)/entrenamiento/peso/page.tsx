import type { Metadata } from "next";
import { Pencil, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { TrendLineChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ProgressBar, Stat } from "@/components/stats";
import { WeightDialog } from "@/components/training/weight-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteWeight } from "@/app/actions/training";
import { WEEKDAYS } from "@/lib/constants";
import { fmtDate, fmtDateShort, todayISO } from "@/lib/dates";
import { fmtDec, fmtInt } from "@/lib/format";
import { bmi, bmiLabel } from "@/lib/nutrition";
import { weightInsights } from "@/lib/weight";
import { getProfileContext } from "@/lib/data/settings";
import { getProgressPhotos, getWeightLogs } from "@/lib/data/training";
import { ProgressPhotos } from "@/components/training/progress-photos";

export const metadata: Metadata = { title: "Peso" };

export default async function PesoPage() {
  const [ctx, logs, photos] = await Promise.all([getProfileContext(), getWeightLogs(), getProgressPhotos()]);
  const today = todayISO();
  const s = ctx.settings;
  const ins = weightInsights(logs, s.startWeightKg, s.goalWeightKg);
  const currentBmi = ins.latest && s.heightCm ? bmi(ins.latest.weightKg, s.heightCm) : null;
  const goalBmi = s.goalWeightKg && s.heightCm ? bmi(s.goalWeightKg, s.heightCm) : null;
  const weighDayLabel = WEEKDAYS[(s.weighInDay + 6) % 7];
  const hasMeasures = logs.some((l) => l.waistCm || l.hipCm || l.chestCm || l.armCm || l.thighCm || l.bodyFatPct);
  const reversed = [...logs].reverse();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Peso y medidas"
        description={`Pesaje semanal: los ${weighDayLabel.toLowerCase()} (lo cambiás en Ajustes). El peso fluctúa día a día: mirá la tendencia.`}
        actions={<WeightDialog defaults={{ date: today, weightKg: ins.latest?.weightKg }} />}
      />

      {!logs.length ? (
        <EmptyState emoji="⚖️" title="Todavía no hay pesajes" description="Registrá tu primer peso para empezar a ver tu progreso." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Actual" value={`${fmtDec(ins.latest!.weightKg, 1)} kg`} hint={fmtDate(ins.latest!.date)} />
            <Stat
              label="Desde el inicio"
              value={ins.change != null ? `${ins.change > 0 ? "+" : ""}${fmtDec(ins.change, 1)} kg` : "—"}
              hint={ins.start != null ? `empezaste en ${fmtDec(ins.start, 1)} kg` : undefined}
            />
            <Stat
              label="Ritmo actual"
              value={ins.rate != null ? `${ins.rate > 0 ? "+" : ""}${fmtDec(ins.rate, 2)} kg/sem` : "—"}
              hint={`esperado por déficit: −${fmtDec(ctx.targets.weeklyLossKg, 2)}`}
            />
            <Stat
              label="IMC"
              value={currentBmi ? fmtDec(currentBmi, 1) : "—"}
              hint={currentBmi ? `${bmiLabel(currentBmi)}${goalBmi ? ` · meta ${fmtDec(goalBmi, 1)}` : ""}` : "cargá tu altura en Ajustes"}
            />
          </div>

          {s.goalWeightKg && ins.progressPct != null && (
            <Card>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {fmtInt(ins.progressPct * 100)}% hacia tu meta de {fmtDec(s.goalWeightKg, 1)} kg
                  </span>
                  <span className="text-muted-foreground">
                    {ins.toGoal != null && ins.toGoal > 0 ? `faltan ${fmtDec(ins.toGoal, 1)} kg` : "¡meta alcanzada!"}
                    {ins.etaDate && ` · al ritmo actual llegás ≈ ${fmtDate(ins.etaDate, "d 'de' MMMM yyyy")}`}
                  </span>
                </div>
                <ProgressBar value={ins.progressPct} max={1} barClassName="bg-gym" overClassName="bg-gym" height="h-3" />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Evolución del peso</CardTitle>
              <CardDescription>La línea horizontal es tu peso meta.</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendLineChart data={logs.map((l) => ({ date: l.date, value: l.weightKg }))} goal={s.goalWeightKg} unit="kg" color="var(--gym)" label="Peso" height={260} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registros</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Fecha</th>
                    <th className="py-2 text-right font-medium">Peso</th>
                    <th className="py-2 text-right font-medium">Cambio</th>
                    {hasMeasures && <th className="py-2 text-right font-medium">Cintura</th>}
                    {hasMeasures && <th className="py-2 text-right font-medium">% grasa</th>}
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y tabular">
                  {reversed.map((l, i) => {
                    const prev = reversed[i + 1];
                    const diff = prev ? l.weightKg - prev.weightKg : null;
                    return (
                      <tr key={l.id}>
                        <td className="py-1.5 capitalize">{fmtDateShort(l.date)}</td>
                        <td className="py-1.5 text-right font-medium">{fmtDec(l.weightKg, 1)} kg</td>
                        <td className={`py-1.5 text-right ${diff == null ? "" : diff <= 0 ? "text-success" : "text-destructive"}`}>
                          {diff == null ? "—" : `${diff > 0 ? "+" : ""}${fmtDec(diff, 1)}`}
                        </td>
                        {hasMeasures && <td className="py-1.5 text-right text-muted-foreground">{l.waistCm ? `${fmtDec(l.waistCm)} cm` : "—"}</td>}
                        {hasMeasures && <td className="py-1.5 text-right text-muted-foreground">{l.bodyFatPct ? `${fmtDec(l.bodyFatPct)}%` : "—"}</td>}
                        <td className="py-1.5 text-right">
                          <div className="flex justify-end gap-0.5">
                            <WeightDialog
                              title="Editar pesaje"
                              defaults={l}
                              trigger={
                                <Button variant="ghost" size="icon-sm" aria-label="Editar">
                                  <Pencil className="size-3.5" />
                                </Button>
                              }
                            />
                            <ActionButton
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              action={deleteWeight.bind(null, l.id)}
                              confirm="¿Eliminar este pesaje?"
                              aria-label="Eliminar"
                            >
                              <Trash2 className="size-3.5" />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <Card id="fotos">
        <CardHeader>
          <CardTitle>Fotos de progreso</CardTitle>
          <CardDescription>De frente, perfil y espalda cada 2 a 4 semanas. Compará dos fechas lado a lado.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressPhotos photos={photos} weights={logs.map((l) => ({ date: l.date, weightKg: l.weightKg }))} today={today} />
        </CardContent>
      </Card>
    </div>
  );
}
