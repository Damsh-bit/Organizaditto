import type { Metadata } from "next";
import Link from "next/link";
import { Baby, Briefcase, CheckCircle2, Circle, Dumbbell, Salad, Scale } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DateNav, ProgressBar } from "@/components/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDaysISO, fmtDate, isISODate, startOfWeekISO, todayISO } from "@/lib/dates";
import { fmtARS, fmtDec, fmtHours, fmtInt, fmtUSD } from "@/lib/format";
import { getProfileContext } from "@/lib/data/settings";
import { getExerciseKcal, getIntakeByDay, getWaterByDay } from "@/lib/data/nutrition";
import { getWeightLogs, getWorkoutDays } from "@/lib/data/training";
import { getWorkDays, sumDays } from "@/lib/data/work";
import { getEffectiveRate } from "@/lib/data/rates";
import { getBabyContext, getBabyLogs, getExposureSummary } from "@/lib/data/baby";
import { getHabitsWeek } from "@/lib/data/habits";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Resumen semanal" };

export default async function SemanaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();
  const start = startOfWeekISO(isISODate(sp.semana) ? sp.semana : today);
  const end = addDaysISO(start, 6);
  const ctx = await getProfileContext();
  const s = ctx.settings;

  const [intake, exercise, water, workouts, weights, work, { rate }, babyCtx, habits] = await Promise.all([
    getIntakeByDay(start, end),
    getExerciseKcal(start, end),
    getWaterByDay(start, end),
    getWorkoutDays(start, end),
    getWeightLogs(addDaysISO(start, -14), end),
    getWorkDays(start, end),
    getEffectiveRate(s),
    getBabyContext(),
    getHabitsWeek(start),
  ]);
  const [babyLogs, exposures] = babyCtx.baby
    ? await Promise.all([getBabyLogs(babyCtx.baby.id, start, end), getExposureSummary(babyCtx.baby.id)])
    : [[], []];

  // Nutrición
  const target = ctx.targets.target;
  const eatBack = s.exerciseEatBackPct / 100;
  // Días pasados con algún registro, u hoy si ya cargaste al menos 3 cosas (mismo criterio que Progreso)
  const logged = intake.filter((r) => r.date < today || r.entries >= 3);
  const avgKcal = logged.length ? logged.reduce((a, r) => a + r.kcal, 0) / logged.length : 0;
  const avgProtein = logged.length ? logged.reduce((a, r) => a + r.protein, 0) / logged.length : 0;
  const onTarget = logged.filter((r) => Math.abs(r.kcal - (target + (exercise.get(r.date) ?? 0) * eatBack)) <= target * 0.1).length;
  const deficit = logged.reduce((a, r) => a + (ctx.targets.tdee + (exercise.get(r.date) ?? 0) - r.kcal), 0);
  const waterDays = [...water.values()].filter((ml) => ml >= s.waterGoalMl).length;

  // Entrenamiento
  const gymDays = workouts.size;
  const gymMinutes = [...workouts.values()].reduce((a, w) => a + w.minutes, 0);
  const gymKcal = [...workouts.values()].reduce((a, w) => a + w.kcal, 0);

  // Peso
  const before = weights.filter((w) => w.date < start).at(-1);
  const inWeek = weights.filter((w) => w.date >= start && w.date <= end);
  const lastW = inWeek.at(-1);
  const weightChange = before && lastW ? lastW.weightKg - before.weightKg : null;

  // Trabajo
  const w = sumDays(work, start, end);

  // Bebé
  const newFoods = exposures.filter((e) => e.firstDate >= start && e.firstDate <= end);
  const reactions = babyLogs.filter((l) => l.reaction !== "ninguna");

  const achievements = [
    { ok: gymDays >= s.gymDaysPerWeek, text: `Objetivo de gym: ${gymDays}/${s.gymDaysPerWeek} días` },
    { ok: logged.length >= 5, text: `Registraste tus comidas ${logged.length} de 7 días` },
    { ok: logged.length > 0 && onTarget >= Math.ceil(logged.length * 0.7), text: `${onTarget} días dentro del objetivo calórico (±10%)` },
    { ok: avgProtein >= ctx.targets.protein * 0.9, text: `Proteína promedio ${fmtInt(avgProtein)} g (objetivo ${fmtInt(ctx.targets.protein)} g)` },
    { ok: inWeek.length > 0, text: inWeek.length ? "Te pesaste esta semana" : "No te pesaste esta semana" },
    { ok: w.hours >= s.workHoursGoalWeek, text: `Trabajo: ${fmtHours(w.hours)} de ${fmtDec(s.workHoursGoalWeek)} h` },
    { ok: waterDays >= 5, text: `Llegaste a tu meta de agua ${waterDays} días` },
  ];
  const score = achievements.filter((a) => a.ok).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Resumen semanal" description="Cómo te fue en la semana, todo junto." />
      <DateNav
        label={`Semana del ${fmtDate(start)} al ${fmtDate(end)}`}
        sublabel={`${score} de ${achievements.length} objetivos cumplidos`}
        prevHref={`/semana?semana=${addDaysISO(start, -7)}`}
        nextHref={`/semana?semana=${addDaysISO(start, 7)}`}
        todayHref={start !== startOfWeekISO(today) ? "/semana" : null}
      />

      <Card>
        <CardHeader>
          <CardTitle>Logros de la semana</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProgressBar value={score} max={achievements.length} barClassName="bg-primary" overClassName="bg-primary" height="h-2.5" />
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {achievements.map((a) => (
              <li key={a.text} className={cn("flex items-center gap-2 text-sm", !a.ok && "text-muted-foreground")}>
                {a.ok ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0" />}
                {a.text}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Block icon={<Salad className="size-4 text-nutri" />} title="Nutrición" href="/nutricion/progreso">
          <Row label="Promedio diario" value={logged.length ? `${fmtInt(avgKcal)} kcal` : "—"} hint={`objetivo ${fmtInt(target)}`} />
          <Row label="Días registrados" value={`${logged.length} de 7`} />
          <Row label="Déficit estimado" value={logged.length ? `${fmtInt(deficit)} kcal` : "—"} hint={deficit > 0 ? `≈ ${fmtDec(deficit / 7700, 2)} kg` : undefined} />
          <Row label="Proteína promedio" value={logged.length ? `${fmtInt(avgProtein)} g` : "—"} />
        </Block>
        <Block icon={<Dumbbell className="size-4 text-gym" />} title="Entrenamiento" href="/entrenamiento/historial">
          <Row label="Días entrenados" value={`${gymDays} de ${s.gymDaysPerWeek}`} />
          <Row label="Tiempo" value={`${fmtInt(gymMinutes)} min`} />
          <Row label="Calorías quemadas" value={`${fmtInt(gymKcal)} kcal`} hint={`+${fmtInt(gymKcal * eatBack)} sumadas a tu comida`} />
        </Block>
        <Block icon={<Scale className="size-4 text-gym" />} title="Peso" href="/entrenamiento/peso">
          <Row label="Último pesaje" value={lastW ? `${fmtDec(lastW.weightKg, 1)} kg` : "—"} hint={lastW ? fmtDate(lastW.date) : "sin pesaje esta semana"} />
          <Row
            label="Cambio vs. semana anterior"
            value={weightChange != null ? `${weightChange > 0 ? "+" : ""}${fmtDec(weightChange, 1)} kg` : "—"}
            valueClassName={weightChange == null ? undefined : weightChange <= 0 ? "text-success" : "text-destructive"}
          />
        </Block>
        <Block icon={<Briefcase className="size-4 text-work" />} title="Trabajo" href="/trabajo/registro">
          <Row label="Horas" value={fmtHours(w.hours)} hint={`objetivo ${fmtDec(s.workHoursGoalWeek)} h · ${w.worked} ${w.worked === 1 ? "día" : "días"}`} />
          <Row label="Ganado" value={fmtUSD(w.usd)} hint={fmtARS(w.usd * rate.value)} />
        </Block>
        {babyCtx.baby && (
          <Block icon={<Baby className="size-4 text-baby" />} title={babyCtx.baby.name} href="/bebe/alimentos">
            <Row label="Comidas registradas" value={String(babyLogs.length)} />
            <Row label="Alimentos nuevos" value={String(newFoods.length)} hint={newFoods.map((f) => f.name).slice(0, 4).join(", ") || undefined} />
            <Row label="Reacciones" value={String(reactions.length)} valueClassName={reactions.length ? "text-amber-600" : undefined} />
          </Block>
        )}
        {habits.length > 0 && (
          <Block title="Hábitos" icon={<CheckCircle2 className="size-4 text-primary" />} href="/ajustes#habitos">
            {habits.map((h) => (
              <Row key={h.id} label={`${h.emoji ?? ""} ${h.name}`} value={`${h.weekCount}/${h.targetPerWeek}`} valueClassName={h.weekCount >= h.targetPerWeek ? "text-success" : undefined} />
            ))}
          </Block>
        )}
      </div>
    </div>
  );
}

function Block({ icon, title, href, children }: { icon: React.ReactNode; title: string; href: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {icon} {title}
        </CardTitle>
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground">
          Ver detalle →
        </Link>
      </CardHeader>
      <CardContent className="divide-y">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value, hint, valueClassName }: { label: string; value: string; hint?: string; valueClassName?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className={cn("font-medium tabular", valueClassName)}>{value}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
    </div>
  );
}
