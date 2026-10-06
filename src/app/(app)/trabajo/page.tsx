import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Pencil, Trash2, Wallet } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { DailyBarChart } from "@/components/charts";
import { MonthHeatmap } from "@/components/month-heatmap";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { ProgressBar, Stat } from "@/components/stats";
import { RateBadge } from "@/components/work/rate-badge";
import { QuickHours, WorkLogDialog, WorkTimer } from "@/components/work/work-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteWorkLog } from "@/app/actions/work";
import { addDaysISO, endOfMonthISO, fmtDate, fmtDateShort, fmtMonth, isISODate, rangeISO, startOfMonthISO, startOfWeekISO, todayISO } from "@/lib/dates";
import { fmtARS, fmtDec, fmtHours, fmtUSD } from "@/lib/format";
import { getProfileContext } from "@/lib/data/settings";
import { getEffectiveRate } from "@/lib/data/rates";
import { getBalance, getProjects, getRunningSession, getWorkDays, getWorkLogs, sumDays } from "@/lib/data/work";

export const metadata: Metadata = { title: "Trabajo" };

export default async function TrabajoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();
  const month = isISODate(sp.mes) ? startOfMonthISO(sp.mes) : startOfMonthISO(today);
  const ctx = await getProfileContext();
  if (!ctx.settings.onboarded) redirect("/bienvenida");
  const s = ctx.settings;
  const weekStart = startOfWeekISO(today);
  const from = month < weekStart ? month : weekStart;
  const to = endOfMonthISO(month) > addDaysISO(weekStart, 6) ? endOfMonthISO(month) : addDaysISO(weekStart, 6);

  const [{ rate }, running, days, balance, projects, recent] = await Promise.all([
    getEffectiveRate(s),
    getRunningSession(),
    getWorkDays(from < addDaysISO(today, -29) ? from : addDaysISO(today, -29), to),
    getBalance(),
    getProjects(),
    getWorkLogs(addDaysISO(today, -14), today),
  ]);
  const r = rate.value;
  const todayT = sumDays(days, today, today);
  const week = sumDays(days, weekStart, addDaysISO(weekStart, 6));
  const monthT = sumDays(days, month, endOfMonthISO(month));
  const values: Record<string, number> = {};
  const titles: Record<string, string> = {};
  for (const [d, v] of days) {
    values[d] = v.hours;
    titles[d] = `${fmtDate(d)}: ${fmtHours(v.hours)} · ${fmtUSD(v.usd)}`;
  }
  const last30 = rangeISO(addDaysISO(today, -29), today).map((d) => ({ date: d, value: days.get(d)?.hours ?? null }));
  const dailyGoal = s.workHoursGoalWeek / Math.max(1, s.workDaysGoalWeek);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trabajo"
        description={`Tarifa: ${fmtUSD(s.hourlyRateUsd)} por hora. Objetivo: ${fmtDec(s.workHoursGoalWeek, 1)} h en ${s.workDaysGoalWeek} días por semana.`}
        actions={<RateBadge rate={rate} />}
      />

      <Card className="border-work/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="size-4 text-work" /> {running ? "Jornada en curso" : "Fichar jornada"}
          </CardTitle>
          {!running && <CardDescription>Iniciá el cronómetro al empezar y frenalo al terminar: las horas se cargan solas.</CardDescription>}
        </CardHeader>
        <CardContent>
          <WorkTimer
            running={running ? { id: running.id, startedAt: running.startedAt!.toISOString(), project: running.project, rateUsd: running.rateUsd } : null}
            hourlyRate={s.hourlyRateUsd}
            arsRate={r}
            projects={projects}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="space-y-2">
            <div className="text-xs text-muted-foreground">Hoy</div>
            <div className="text-2xl font-semibold tracking-tight">{fmtHours(todayT.hours)}</div>
            <div className="text-sm">
              {fmtUSD(todayT.hours * s.hourlyRateUsd)} <span className="text-muted-foreground">· {fmtARS(todayT.hours * s.hourlyRateUsd * r)}</span>
            </div>
            <ProgressBar value={todayT.hours} max={dailyGoal} barClassName="bg-work" overClassName="bg-work" />
            <QuickHours date={today} />
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="space-y-2">
            <div className="text-xs text-muted-foreground">Esta semana</div>
            <div className="text-2xl font-semibold tracking-tight">{fmtHours(week.hours)}</div>
            <div className="text-sm">
              {fmtUSD(week.usd)} <span className="text-muted-foreground">· {fmtARS(week.usd * r)}</span>
            </div>
            <ProgressBar value={week.hours} max={s.workHoursGoalWeek} barClassName="bg-work" overClassName="bg-work" />
            <div className="text-xs text-muted-foreground">
              {week.worked} de {s.workDaysGoalWeek} días · objetivo {fmtDec(s.workHoursGoalWeek, 1)} h
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="space-y-2">
            <div className="text-xs text-muted-foreground">{fmtMonth(month)}</div>
            <div className="text-2xl font-semibold tracking-tight">{fmtUSD(monthT.usd)}</div>
            <div className="text-sm">
              {fmtARS(monthT.usd * r)} <span className="text-muted-foreground">a la cotización de hoy</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {fmtHours(monthT.hours)} en {monthT.worked} {monthT.worked === 1 ? "día" : "días"} · {fmtARS(monthT.ars)} con la cotización de cada día
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={
            <span className="flex items-center gap-1">
              <Wallet className="size-3.5 text-work" /> Pendiente de cobrar
            </span>
          }
          value={fmtUSD(balance.pendingUsd)}
          hint={fmtARS(balance.pendingUsd * r)}
        />
        <Stat label="Ganado en total" value={fmtUSD(balance.earnedUsd)} hint={`${fmtHours(balance.totalHours)} registradas`} />
        <Stat label="Cobrado" value={fmtUSD(balance.paidUsd)} hint={fmtARS(balance.paidArs)} />
        <Stat label="Valor de 1 hora" value={fmtARS(s.hourlyRateUsd * r)} hint={`${fmtUSD(s.hourlyRateUsd)} × ${fmtARS(r, 2)}`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Habit tracker de trabajo</CardTitle>
            <CardDescription>Más intenso = más horas. Tocá un día para cargarlo o verlo.</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthHeatmap
              month={month}
              values={values}
              titles={titles}
              max={Math.max(8, dailyGoal)}
              color="var(--work)"
              today={today}
              linkTemplate="/trabajo/registro?fecha={date}"
              monthHrefTemplate="/trabajo?mes={month}"
              goalLine={`${monthT.worked} ${monthT.worked === 1 ? "día trabajado" : "días trabajados"} · ${fmtHours(monthT.hours)} en el mes`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Horas por día (últimos 30 días)</CardTitle>
            <CardDescription>La línea marca tu objetivo diario ({fmtDec(dailyGoal, 1)} h).</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyBarChart data={last30} target={dailyGoal} unit="h" digits={1} color="var(--work)" label="Horas" height={260} />
          </CardContent>
        </Card>
      </div>

      <section>
        <SectionTitle action={<WorkLogDialog defaults={{ date: today }} projects={projects} />}>Últimos registros</SectionTitle>
        {recent.filter((l) => !l.running).length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no cargaste horas. Usá el cronómetro, los botones rápidos o “Cargar horas”.</p>
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {recent
              .filter((l) => !l.running)
              .map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      <span className="capitalize">{fmtDateShort(l.date)}</span> · <span className="font-medium">{fmtHours(l.hours)}</span>
                      {l.project && <span className="text-muted-foreground"> · {l.project}</span>}
                    </div>
                    {l.description && <div className="truncate text-xs text-muted-foreground">{l.description}</div>}
                  </div>
                  <div className="text-right text-sm tabular">
                    <div>{fmtUSD(l.hours * l.rateUsd)}</div>
                    <div className="text-xs text-muted-foreground">{fmtARS(l.hours * l.rateUsd * (l.arsRate ?? r))}</div>
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
                  <ActionButton variant="ghost" size="icon-sm" className="text-muted-foreground" action={deleteWorkLog.bind(null, l.id)} confirm="¿Eliminar este registro?" aria-label="Eliminar">
                    <Trash2 className="size-3.5" />
                  </ActionButton>
                </div>
              ))}
          </div>
        )}
        <div className="mt-2 text-right">
          <Link href="/trabajo/registro" className="text-sm text-muted-foreground hover:text-foreground">
            Ver registro completo →
          </Link>
        </div>
      </section>
    </div>
  );
}
