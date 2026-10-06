import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageCircleQuestion, Pencil, Stethoscope, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { GrowthChart, type GrowthPoint } from "@/components/baby/growth-chart";
import { MeasurementDialog } from "@/components/baby/health-dialogs";
import { PageHeader } from "@/components/page-header";
import { EmptyState, Pill } from "@/components/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addQuestion, deleteMeasurement, deleteQuestion, toggleQuestion } from "@/app/actions/baby";
import { daysBetween, fmtDateShort } from "@/lib/dates";
import { fmtDec, fmtInt } from "@/lib/format";
import { GROWTH_INDICATORS, ageInMonths, assess, fmtPercentile, type GrowthIndicator, type GrowthSex } from "@/lib/growth";
import { getBabyContext, getMeasurements, getQuestions } from "@/lib/data/baby";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Crecimiento del bebé" };

const FIELDS: [GrowthIndicator, "weightKg" | "lengthCm" | "headCm"][] = [
  ["weight", "weightKg"],
  ["length", "lengthCm"],
  ["head", "headCm"],
];

const TONE = { ok: "text-success", watch: "text-foreground", consult: "text-warning" } as const;

export default async function CrecimientoPage() {
  const { baby, today } = await getBabyContext();
  if (!baby?.birthDate) {
    return (
      <EmptyState
        emoji="📏"
        title="Cargá la fecha de nacimiento de tu bebé"
        description="La necesito para comparar sus medidas con las curvas de la OMS."
        action={
          <Button asChild variant="outline">
            <Link href="/ajustes#bebe">Ir a Ajustes</Link>
          </Button>
        }
      />
    );
  }
  const sex: GrowthSex = baby.sex === "male" ? "male" : "female";
  const [measurements, questions] = await Promise.all([getMeasurements(baby.id), getQuestions(baby.id)]);
  const ageMonths = ageInMonths(baby.birthDate, today);
  const points: GrowthPoint[] = measurements.map((m) => ({
    date: m.date,
    months: ageInMonths(baby.birthDate!, m.date),
    weightKg: m.weightKg,
    lengthCm: m.lengthCm,
    headCm: m.headCm,
  }));

  // Último valor de cada medida y cómo cambió respecto del anterior
  const latest = FIELDS.map(([ind, field]) => {
    const withValue = points.filter((p) => p[field] != null);
    const last = withValue.at(-1);
    const prev = withValue.at(-2);
    if (!last) return { ind, field, last: null };
    const value = last[field]!;
    const a = assess(ind, sex, last.months, value);
    const days = prev ? daysBetween(prev.date, last.date) : 0;
    const delta = prev && days > 0 ? value - prev[field]! : null;
    return { ind, field, last, value, a, delta, days };
  });
  const lastCheckup = [...measurements].reverse().find((m) => m.isCheckup);
  const pending = questions.filter((q) => !q.done);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Crecimiento"
        description={`Peso, talla y perímetro cefálico de ${baby.name} comparados con los patrones de la OMS.`}
        actions={<MeasurementDialog today={today} />}
      />

      {measurements.length === 0 ? (
        <EmptyState
          emoji="📏"
          title="Todavía no hay mediciones"
          description="Cargá las del último control (están en la libreta) y vas a ver en qué percentil está y cómo viene creciendo."
          action={<MeasurementDialog today={today} />}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {latest.map((l) => {
              const meta = GROWTH_INDICATORS[l.ind];
              if (!l.last) {
                return (
                  <div key={l.ind} className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                    {meta.label}: sin datos
                  </div>
                );
              }
              return (
                <div key={l.ind} className="rounded-xl border bg-card p-3">
                  <div className="text-xs text-muted-foreground">
                    {meta.label} · {fmtDateShort(l.last.date)}
                  </div>
                  <div className="tabular mt-0.5 text-lg font-semibold tracking-tight">
                    {fmtDec(l.value!, meta.digits)} {meta.unit}
                  </div>
                  {l.a && (
                    <div className={cn("text-xs font-medium", TONE[l.a.tone])}>
                      Percentil {fmtPercentile(l.a.percentile)} · {l.a.label}
                    </div>
                  )}
                  {l.delta != null && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {l.ind === "weight"
                        ? `${l.delta >= 0 ? "+" : ""}${fmtInt(l.delta * 1000)} g en ${l.days} días (≈ ${fmtInt((l.delta * 1000 * 7) / l.days!)} g/semana)`
                        : `${l.delta >= 0 ? "+" : ""}${fmtDec(l.delta, 1)} cm en ${l.days} días`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {ageMonths <= 24 ? (
            <Card>
              <CardHeader>
                <CardTitle>Curvas de crecimiento</CardTitle>
                <CardDescription>
                  Lo importante es que siga su propia curva: un valor aislado alto o bajo no dice mucho, un cambio brusco de carril sí vale consultarlo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart points={points} sex={sex} ageMonths={ageMonths} />
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">Las curvas cargadas llegan hasta los 2 años.</p>
          )}
        </>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="size-4 text-baby" /> Para el próximo control
            </CardTitle>
            <CardDescription>
              Anotá las dudas apenas te surgen, así no te olvidás nada en la consulta.
              {lastCheckup && ` Último control: ${fmtDateShort(lastCheckup.date)}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ActionForm action={addQuestion} resetOnSuccess className="flex gap-2">
              <Input name="text" aria-label="Pregunta para el pediatra" placeholder="Ej: ¿Cuándo le doy agua?" maxLength={300} required />
              <SubmitButton variant="outline">Anotar</SubmitButton>
            </ActionForm>
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay preguntas anotadas.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {questions.map((q) => (
                  <li key={q.id} className="flex items-center gap-2 px-2.5 py-1.5">
                    <ActionButton
                      variant="ghost"
                      size="icon-xs"
                      action={toggleQuestion.bind(null, q.id)}
                      aria-label={q.done ? "Marcar como pendiente" : "Marcar como respondida"}
                      className={cn("rounded-full border", q.done && "border-success bg-success/15 text-success")}
                    >
                      {q.done ? <Check className="size-3" /> : null}
                    </ActionButton>
                    <span className={cn("flex-1 text-sm", q.done && "text-muted-foreground line-through")}>{q.text}</span>
                    <ActionButton
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground"
                      action={deleteQuestion.bind(null, q.id)}
                      aria-label="Borrar pregunta"
                    >
                      <Trash2 className="size-3" />
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
            {pending.length > 0 && <p className="text-xs text-muted-foreground">{pending.length} pendientes de preguntar.</p>}
          </CardContent>
        </Card>

        {measurements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="size-4 text-baby" /> Historial
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Fecha</th>
                    <th className="py-2 text-right font-medium">Peso</th>
                    <th className="py-2 text-right font-medium">Talla</th>
                    <th className="py-2 text-right font-medium">PC</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y tabular">
                  {[...measurements].reverse().map((m) => {
                    const months = ageInMonths(baby.birthDate!, m.date);
                    const pct = (ind: GrowthIndicator, v: number | null) => {
                      const a = v != null ? assess(ind, sex, months, v) : null;
                      return a ? <span className={cn("block text-[11px]", TONE[a.tone])}>P{fmtPercentile(a.percentile)}</span> : null;
                    };
                    return (
                      <tr key={m.id} className="align-top">
                        <td className="py-1.5">
                          {fmtDateShort(m.date)}
                          <span className="block text-[11px] text-muted-foreground">{fmtDec(months, 1)} meses</span>
                          {m.isCheckup && <Pill className="mt-0.5 bg-baby/10 text-[10px] text-foreground">control</Pill>}
                          {m.notes && <span className="block max-w-[180px] text-[11px] whitespace-pre-line text-muted-foreground">{m.notes}</span>}
                        </td>
                        <td className="py-1.5 text-right">
                          {m.weightKg != null ? `${fmtDec(m.weightKg, 2)} kg` : "—"}
                          {pct("weight", m.weightKg)}
                        </td>
                        <td className="py-1.5 text-right">
                          {m.lengthCm != null ? `${fmtDec(m.lengthCm, 1)} cm` : "—"}
                          {pct("length", m.lengthCm)}
                        </td>
                        <td className="py-1.5 text-right">
                          {m.headCm != null ? `${fmtDec(m.headCm, 1)} cm` : "—"}
                          {pct("head", m.headCm)}
                        </td>
                        <td className="py-1 text-right whitespace-nowrap">
                          <MeasurementDialog
                            today={today}
                            defaults={m}
                            trigger={
                              <Button variant="ghost" size="icon-xs" aria-label="Editar medición" className="text-muted-foreground">
                                <Pencil className="size-3" />
                              </Button>
                            }
                          />
                          <ActionButton
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground"
                            action={deleteMeasurement.bind(null, m.id)}
                            confirm="¿Eliminar esta medición?"
                            aria-label="Eliminar medición"
                          >
                            <Trash2 className="size-3" />
                          </ActionButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Curvas: Patrones de Crecimiento Infantil de la OMS (los que usa la Sociedad Argentina de Pediatría). Son una referencia para acompañar los
        controles, no reemplazan la evaluación del pediatra.
      </p>
    </div>
  );
}
