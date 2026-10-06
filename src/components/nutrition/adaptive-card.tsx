import { Gauge, TriangleAlert } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Pill, ProgressBar } from "@/components/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setTargetKcal } from "@/app/actions/settings";
import { ADAPTIVE_MIN_DAYS, ADAPTIVE_MIN_SPAN, ADAPTIVE_MIN_WEIGHINS, type AdaptiveResult } from "@/lib/adaptive";
import { fmtDateShort } from "@/lib/dates";
import { fmtDec, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";

const CONFIDENCE_STYLE = {
  baja: "bg-warning/15 text-warning",
  media: "bg-primary/10 text-primary",
  alta: "bg-success/15 text-success",
} as const;

/** Tarjeta de "gasto real": cuánto quemás de verdad según tus registros y la balanza. */
export function AdaptiveCard({
  result,
  target,
  deficitKcal,
  hasOverride,
}: {
  result: AdaptiveResult;
  target: number;
  deficitKcal: number;
  hasOverride: boolean;
}) {
  if (!result.ready) {
    const p = result.progress;
    return (
      <Card id="metabolismo">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="size-4 text-nutri" /> Tu gasto real
          </CardTitle>
          <CardDescription>
            Tu objetivo hoy sale de una fórmula. Con unas semanas de comidas registradas y pesajes, la app calcula cuánto gastás de verdad y te
            sugiere ajustarlo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Días con todas las comidas registradas</span>
              <span className="tabular text-muted-foreground">
                {Math.min(p.completeDays, ADAPTIVE_MIN_DAYS)} / {ADAPTIVE_MIN_DAYS}
              </span>
            </div>
            <ProgressBar value={p.completeDays} max={ADAPTIVE_MIN_DAYS} barClassName="bg-nutri" overClassName="bg-nutri" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Pesajes en al menos {ADAPTIVE_MIN_SPAN / 7} semanas</span>
              <span className="tabular text-muted-foreground">
                {Math.min(p.weighIns, ADAPTIVE_MIN_WEIGHINS)} / {ADAPTIVE_MIN_WEIGHINS}
              </span>
            </div>
            <ProgressBar value={p.weighIns} max={ADAPTIVE_MIN_WEIGHINS} barClassName="bg-gym" overClassName="bg-gym" />
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: pesate siempre el mismo día, en ayunas y después de ir al baño. Registrá también los días que te salís del plan: si no, el cálculo
            se infla.
          </p>
        </CardContent>
      </Card>
    );
  }

  const r = result;
  const diff = r.tdee - r.formulaTotal;
  const change = r.suggestedTarget - target;
  return (
    <Card id="metabolismo">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Gauge className="size-4 text-nutri" /> Tu gasto real
          <Pill className={CONFIDENCE_STYLE[r.confidence]}>confianza {r.confidence}</Pill>
        </CardTitle>
        <CardDescription>
          Calculado con {r.progress.completeDays} días registrados y {r.progress.weighIns} pesajes ({fmtDateShort(r.from)} – {fmtDateShort(r.to)}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <div className="tabular text-3xl font-semibold tracking-tight">{fmtInt(r.tdee)}</div>
            <div className="text-xs text-muted-foreground">kcal por día (con entrenamientos)</div>
          </div>
          <div className="text-sm text-muted-foreground">
            La fórmula estimaba {fmtInt(r.formulaTotal)} kcal:{" "}
            <span className={cn("font-medium", Math.abs(diff) < 100 ? "text-foreground" : diff > 0 ? "text-success" : "text-warning")}>
              {Math.abs(diff) < 100 ? "coincide bastante" : `gastás ${fmtInt(Math.abs(diff))} kcal ${diff > 0 ? "más" : "menos"}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-muted/60 p-2">
            <div className="tabular text-sm font-semibold">{fmtInt(r.avgIntake)}</div>
            <div className="text-muted-foreground">kcal comidas/día</div>
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <div className="tabular text-sm font-semibold">
              {r.weeklyChangeKg > 0 ? "+" : ""}
              {fmtDec(r.weeklyChangeKg, 2)} kg
            </div>
            <div className="text-muted-foreground">por semana</div>
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <div className="tabular text-sm font-semibold">{fmtInt(r.avgExercise)}</div>
            <div className="text-muted-foreground">kcal gym/día</div>
          </div>
        </div>

        {!r.plausible ? (
          <p className="flex gap-2 rounded-lg bg-warning/10 p-2.5 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            El resultado es poco creíble: seguramente faltan comidas por registrar o hubo mucha variación de líquidos. Seguí registrando y en una
            semana se acomoda.
          </p>
        ) : (
          <div className="space-y-2 rounded-xl border bg-nutri/5 p-3">
            <p className="text-sm">
              Para sostener tu déficit de {fmtInt(deficitKcal)} kcal, tu objetivo base debería ser{" "}
              <strong className="tabular">{fmtInt(r.suggestedTarget)} kcal</strong> (hoy {fmtInt(target)}).
              {r.clampedToMin && " Lo limité al mínimo seguro: mejor bajar el déficit que comer menos."}
            </p>
            <div className="flex flex-wrap gap-2">
              {Math.abs(change) >= 50 ? (
                <ActionButton size="sm" action={setTargetKcal.bind(null, r.suggestedTarget)}>
                  Usar {fmtInt(r.suggestedTarget)} kcal
                </ActionButton>
              ) : (
                <Pill className="bg-success/15 text-success">Tu objetivo ya está bien calibrado</Pill>
              )}
              {hasOverride && (
                <ActionButton size="sm" variant="outline" action={setTargetKcal.bind(null, null)}>
                  Volver a la fórmula
                </ActionButton>
              )}
            </div>
          </div>
        )}

        {r.earlyPhase && (
          <p className="text-xs text-muted-foreground">
            Ojo: en las primeras semanas de déficit se pierde agua y glucógeno, así que el gasto puede salir más alto de lo real. Se vuelve más
            preciso con el tiempo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
