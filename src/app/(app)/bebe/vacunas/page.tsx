import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Syringe, TriangleAlert, Undo2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ExtraVaccineDialog, MarkVaccineButton } from "@/components/baby/health-dialogs";
import { PageHeader } from "@/components/page-header";
import { EmptyState, Pill, ProgressBar } from "@/components/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteVaccine, markAllDueVaccines } from "@/app/actions/baby";
import { VACCINE_SOURCE_URL, vaccineRows, type VaccineRow } from "@/lib/baby-vaccines";
import { daysBetween, fmtDateShort } from "@/lib/dates";
import { getBabyContext, getVaccines } from "@/lib/data/baby";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Vacunas del bebé" };

function StatusPill({ row, today }: { row: VaccineRow; today: string }) {
  switch (row.status) {
    case "aplicada":
      return <Pill className="bg-success/15 text-success">✓ {fmtDateShort(row.appliedOn!)}</Pill>;
    case "atrasada":
      return <Pill className="bg-warning/15 text-warning">Atrasada</Pill>;
    case "toca":
      return <Pill className="bg-baby/15 text-foreground">{row.optional ? "Disponible" : "Le toca ahora"}</Pill>;
    case "proxima": {
      const d = daysBetween(today, row.dueDate);
      return <Pill className="bg-primary/10 text-primary">{d === 1 ? "Mañana" : `En ${d} días`}</Pill>;
    }
    default:
      return <Pill>{fmtDateShort(row.dueDate)}</Pill>;
  }
}

export default async function VacunasPage() {
  const { baby, today } = await getBabyContext();
  if (!baby?.birthDate) {
    return (
      <EmptyState
        emoji="💉"
        title="Cargá la fecha de nacimiento de tu bebé"
        description="Con ella calculo qué vacunas le tocan y cuándo."
        action={
          <Button asChild variant="outline">
            <Link href="/ajustes#bebe">Ir a Ajustes</Link>
          </Button>
        }
      />
    );
  }
  const applied = await getVaccines(baby.id);
  const rows = vaccineRows(baby.birthDate, today, applied);
  const extras = applied.filter((a) => !a.code);
  const required = rows.filter((r) => !r.optional);
  const done = required.filter((r) => r.status === "aplicada").length;
  const late = rows.filter((r) => r.status === "atrasada");
  const now = rows.filter((r) => r.status === "toca" || r.status === "proxima");
  const groups = new Map<string, VaccineRow[]>();
  for (const r of rows) groups.set(r.ageLabel, [...(groups.get(r.ageLabel) ?? []), r]);
  const nothingRecorded = applied.length === 0 && late.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vacunas"
        description={`Calendario Nacional de Vacunación de Argentina (2026) para ${baby.name}, de 0 a 2 años.`}
        actions={<ExtraVaccineDialog today={today} />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">Dosis del calendario aplicadas</div>
          <div className="tabular mt-0.5 text-lg font-semibold">
            {done} de {required.length}
          </div>
          <ProgressBar value={done} max={required.length} className="mt-2" barClassName="bg-baby" />
        </div>
        <div className="rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">Ahora o en los próximos 30 días</div>
          <div className="tabular mt-0.5 text-lg font-semibold">{now.length}</div>
          <div className="text-xs text-muted-foreground">{now.length ? now.map((r) => r.name).filter((n, i, a) => a.indexOf(n) === i).join(", ") : "Nada pendiente"}</div>
        </div>
        <div className={cn("rounded-xl border bg-card p-3", late.length > 0 && "border-warning/50 bg-warning/5")}>
          <div className="text-xs text-muted-foreground">Atrasadas</div>
          <div className={cn("tabular mt-0.5 text-lg font-semibold", late.length > 0 && "text-warning")}>{late.length}</div>
          <div className="text-xs text-muted-foreground">{late.length ? "Llevá la libreta al vacunatorio" : "Al día ✓"}</div>
        </div>
      </div>

      {nothingRecorded && (
        <Card className="border-baby/40 bg-baby/5">
          <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
            <Syringe className="size-5 shrink-0 text-baby" />
            <p className="flex-1 text-sm">
              Todavía no cargaste ninguna vacuna. Si en la libreta tiene todas las que le tocaban hasta hoy, marcalas de una vez (quedan con la fecha
              recomendada y después podés corregir cualquiera).
            </p>
            <ActionButton
              size="sm"
              className="bg-baby text-white dark:text-neutral-950 hover:bg-baby/90"
              action={markAllDueVaccines}
              confirm="¿Marcar como aplicadas todas las dosis que le tocaban hasta hoy?"
            >
              Tiene todas al día
            </ActionButton>
          </CardContent>
        </Card>
      )}

      {late.length > 0 && !nothingRecorded && (
        <p className="flex gap-2 rounded-xl border border-warning/40 bg-warning/5 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            {late.map((r) => `${r.name} (${r.dose.toLowerCase()})`).join(", ")}: según la fecha de nacimiento ya deberían estar aplicadas. Si ya se las
            dieron, marcalas; si no, el vacunatorio te dice cómo ponerte al día.
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...groups.entries()].map(([age, list]) => {
          const allDone = list.every((r) => r.status === "aplicada");
          return (
            <Card key={age} className={cn(allDone && "opacity-80")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {allDone ? <CircleCheck className="size-4 text-success" /> : <Syringe className="size-4 text-baby" />}
                  {age}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((r) => (
                  <div key={r.code} className="flex items-start gap-2 rounded-lg border p-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {r.name} <span className="font-normal text-muted-foreground">· {r.dose}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{r.protects}</div>
                      {r.note && <div className="mt-0.5 text-xs text-muted-foreground italic">{r.note}</div>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusPill row={r} today={today} />
                      {r.status === "aplicada" ? (
                        <ActionButton
                          size="xs"
                          variant="ghost"
                          className="text-muted-foreground"
                          action={deleteVaccine.bind(null, r.recordId!)}
                          confirm="¿Quitar esta dosis?"
                        >
                          <Undo2 className="size-3" /> Quitar
                        </ActionButton>
                      ) : (
                        r.status !== "futura" && <MarkVaccineButton code={r.code} today={today} defaultDate={r.dueDate} />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Otras vacunas</CardTitle>
          <CardDescription>Las que no están en el calendario oficial (por indicación del pediatra o campañas).</CardDescription>
        </CardHeader>
        <CardContent>
          {extras.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cargaste vacunas extra.</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {extras.map((e) => (
                <li key={e.id} className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="flex-1">
                    {e.name}
                    {e.notes && <span className="block text-xs text-muted-foreground">{e.notes}</span>}
                  </span>
                  <span className="tabular text-xs text-muted-foreground">{fmtDateShort(e.date)}</span>
                  <ActionButton size="xs" variant="ghost" className="text-muted-foreground" action={deleteVaccine.bind(null, e.id)} confirm="¿Quitar?">
                    Quitar
                  </ActionButton>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Fuente:{" "}
        <a href={VACCINE_SOURCE_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Ministerio de Salud de la Nación
        </a>
        . Las vacunas del calendario son gratuitas y se aplican en centros de salud y hospitales públicos sin orden médica. Ante cualquier duda manda la
        libreta y el vacunatorio.
      </p>
    </div>
  );
}
