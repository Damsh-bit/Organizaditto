import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { DateNav, EmptyState } from "@/components/stats";
import { QuickHours, WorkLogDialog } from "@/components/work/work-client";
import { Button } from "@/components/ui/button";
import { deleteWorkLog } from "@/app/actions/work";
import { addMonthsISO, endOfMonthISO, fmtDateLong, fmtDateShort, fmtMonth, isISODate, startOfMonthISO, todayISO } from "@/lib/dates";
import { fmtARS, fmtDec, fmtHours, fmtUSD } from "@/lib/format";
import { getSettings } from "@/lib/data/settings";
import { getEffectiveRate } from "@/lib/data/rates";
import { getProjects, getWorkLogs } from "@/lib/data/work";

export const metadata: Metadata = { title: "Registro de horas" };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();
  const s = await getSettings();
  const [{ rate }, projects] = await Promise.all([getEffectiveRate(s), getProjects()]);
  const day = isISODate(sp.fecha) ? sp.fecha : null;
  const month = day ? startOfMonthISO(day) : isISODate(sp.mes) ? startOfMonthISO(sp.mes) : startOfMonthISO(today);
  const logs = (await getWorkLogs(day ?? month, day ?? endOfMonthISO(month))).filter((l) => !l.running);

  const byDay = new Map<string, typeof logs>();
  for (const l of logs) byDay.set(l.date, [...(byDay.get(l.date) ?? []), l]);
  const totalHours = logs.reduce((a, l) => a + l.hours, 0);
  const totalUsd = logs.reduce((a, l) => a + l.hours * l.rateUsd, 0);
  const totalArsHist = logs.reduce((a, l) => a + l.hours * l.rateUsd * (l.arsRate ?? rate.value), 0);

  const summary = [
    `Horas trabajadas – ${day ? fmtDateLong(day) : fmtMonth(month)}`,
    "",
    ...[...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([d, ls]) => `${fmtDateShort(d)}: ${fmtDec(ls.reduce((a, l) => a + l.hours, 0), 2)} h${ls.some((l) => l.project) ? ` (${[...new Set(ls.map((l) => l.project).filter(Boolean))].join(", ")})` : ""}`),
    "",
    `Total: ${fmtDec(totalHours, 2)} h × ${fmtUSD(s.hourlyRateUsd)} = ${fmtUSD(totalUsd)}`,
  ].join("\n");

  return (
    <div className="space-y-4">
      <PageHeader
        title={day ? fmtDateLong(day) : "Registro de horas"}
        description={day ? "Horas trabajadas en el día" : "Todas tus horas del mes, día por día."}
        actions={
          <>
            {logs.length > 0 && <CopyButton text={summary} label="Copiar resumen" message="Resumen copiado (ideal para facturar)" />}
            <WorkLogDialog defaults={{ date: day ?? today }} projects={projects} />
          </>
        }
      />
      {day ? (
        <div className="flex flex-wrap items-center gap-2">
          {day <= today && <QuickHours date={day} />}
          <Link href={`/trabajo/registro?mes=${month}`} className="ml-auto text-sm text-muted-foreground hover:text-foreground">
            Ver mes completo →
          </Link>
        </div>
      ) : (
        <DateNav
          label={fmtMonth(month)}
          sublabel={`${fmtHours(totalHours)} · ${fmtUSD(totalUsd)} · ${fmtARS(totalUsd * rate.value)}`}
          prevHref={`/trabajo/registro?mes=${addMonthsISO(month, -1)}`}
          nextHref={`/trabajo/registro?mes=${addMonthsISO(month, 1)}`}
          todayHref={month !== startOfMonthISO(today) ? "/trabajo/registro" : null}
        />
      )}

      {logs.length === 0 ? (
        <EmptyState emoji="🗓️" title="Sin horas registradas" description="Cargá horas con el cronómetro de Resumen o con “Cargar horas”." />
      ) : (
        <div className="space-y-3">
          {[...byDay.entries()].map(([d, ls]) => {
            const h = ls.reduce((a, l) => a + l.hours, 0);
            const usd = ls.reduce((a, l) => a + l.hours * l.rateUsd, 0);
            return (
              <div key={d} className="rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
                  <Link href={`/trabajo/registro?fecha=${d}`} className="font-medium capitalize hover:underline">
                    {fmtDateShort(d)}
                  </Link>
                  <span className="text-muted-foreground tabular">
                    {fmtHours(h)} · {fmtUSD(usd)}
                  </span>
                </div>
                <div className="divide-y">
                  {ls.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1 text-sm">
                        <span className="font-medium">{fmtHours(l.hours)}</span>
                        {l.startedAt && l.endedAt && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({l.startedAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" })}–
                            {l.endedAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" })})
                          </span>
                        )}
                        {l.project && <span className="text-muted-foreground"> · {l.project}</span>}
                        {l.description && <div className="truncate text-xs text-muted-foreground">{l.description}</div>}
                      </div>
                      <div className="text-right text-xs tabular">
                        <div className="text-sm">{fmtUSD(l.hours * l.rateUsd)}</div>
                        <div className="text-muted-foreground">
                          {fmtARS(l.hours * l.rateUsd * (l.arsRate ?? rate.value))} {l.arsRate ? `@ ${fmtARS(l.arsRate)}` : ""}
                        </div>
                      </div>
                      <WorkLogDialog
                        defaults={l}
                        projects={projects}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Editar">
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <ActionButton variant="ghost" size="icon-sm" className="text-muted-foreground" action={deleteWorkLog.bind(null, l.id)} confirm="¿Eliminar?" aria-label="Eliminar">
                        <Trash2 className="size-3.5" />
                      </ActionButton>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="rounded-xl bg-work/10 p-3 text-sm">
            Total: <span className="font-semibold">{fmtHours(totalHours)}</span> → <span className="font-semibold">{fmtUSD(totalUsd)}</span> ·{" "}
            {fmtARS(totalUsd * rate.value)} a la cotización de hoy · {fmtARS(totalArsHist)} con la cotización de cada día
          </div>
        </div>
      )}
    </div>
  );
}
