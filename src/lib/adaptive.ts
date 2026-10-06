/**
 * Gasto energético real ("metabolismo adaptativo"): en vez de confiar solo en la fórmula,
 * se calcula con lo que registraste y lo que hizo la balanza.
 *
 *   gasto real = calorías promedio − (cambio de peso por día × 7700)
 *
 * Si comiste 2.000 kcal/día y bajaste 0,5 kg por semana, tu gasto real es ≈ 2.550 kcal/día.
 */
import { addDaysISO, daysBetween, rangeISO } from "./dates";
import type { WeightPoint } from "./weight";

export const KCAL_PER_KG = 7700;
/** Días con registro completo que hacen falta para calcular. */
export const ADAPTIVE_MIN_DAYS = 10;
/** Pesajes y días entre el primero y el último. */
export const ADAPTIVE_MIN_WEIGHINS = 3;
export const ADAPTIVE_MIN_SPAN = 14;
const WINDOWS = [28, 35, 42];

export type IntakeDay = { date: string; kcal: number; entries: number };

/** Un día cuenta si no es hoy y lo registrado es razonable para un día entero. */
export function isCompleteDay(day: IntakeDay, target: number, today: string) {
  return day.date < today && day.kcal >= Math.max(800, target * 0.55);
}

export type AdaptiveInput = {
  today: string;
  intake: IntakeDay[];
  weights: WeightPoint[];
  exercise: Map<string, number>;
  bmr: number;
  /** Gasto por fórmula, sin gimnasio. */
  formulaTdee: number;
  /** Objetivo base vigente. */
  target: number;
  deficitKcal: number;
  eatBackPct: number;
  minSafe: number;
};

export type AdaptiveProgress = { completeDays: number; weighIns: number; spanDays: number };

export type AdaptiveResult =
  | { ready: false; progress: AdaptiveProgress }
  | {
      ready: true;
      progress: AdaptiveProgress;
      from: string;
      to: string;
      /** Gasto real total (incluye entrenamientos). */
      tdee: number;
      /** Lo que estimaba la fórmula para el mismo período (base + entrenamientos). */
      formulaTotal: number;
      avgIntake: number;
      avgExercise: number;
      /** kg por semana según la tendencia de la balanza (negativo = bajando). */
      weeklyChangeKg: number;
      confidence: "baja" | "media" | "alta";
      /** Valor dentro de un rango creíble (si no, probablemente faltan registros). */
      plausible: boolean;
      /** Objetivo base sugerido para mantener tu déficit con el gasto real. */
      suggestedTarget: number;
      /** El sugerido quedó limitado por el mínimo seguro. */
      clampedToMin: boolean;
      /** Las primeras semanas se pierde agua y glucógeno: el gasto sale inflado. */
      earlyPhase: boolean;
    };

/** Pendiente en kg/día por mínimos cuadrados. */
function slopePerDay(points: WeightPoint[]): number {
  const x0 = points[0].date;
  const xs = points.map((p) => daysBetween(x0, p.date));
  const ys = points.map((p) => p.weightKg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

const round10 = (x: number) => Math.round(x / 10) * 10;

export function computeAdaptive(input: AdaptiveInput): AdaptiveResult {
  const { today, target } = input;
  const weights = [...input.weights].sort((a, b) => a.date.localeCompare(b.date));
  const complete = input.intake.filter((d) => isCompleteDay(d, target, today));

  // Ventana más corta que tenga suficientes pesajes (pesándose una vez por semana alcanza con 4 semanas).
  let points: WeightPoint[] = [];
  for (const days of WINDOWS) {
    const from = addDaysISO(today, -(days - 1));
    points = weights.filter((w) => w.date >= from && w.date <= today);
    if (points.length >= ADAPTIVE_MIN_WEIGHINS && daysBetween(points[0].date, points.at(-1)!.date) >= ADAPTIVE_MIN_SPAN) break;
  }

  const first = points[0]?.date;
  const last = points.at(-1)?.date;
  const spanDays = first && last ? daysBetween(first, last) : 0;
  // Lo que se come entre el primer y el último pesaje es lo que explica el cambio de peso.
  const periodDays = first && last && spanDays > 0 ? new Set(rangeISO(first, addDaysISO(last, -1))) : new Set<string>();
  const inPeriod = complete.filter((d) => periodDays.has(d.date));
  const progress: AdaptiveProgress = {
    completeDays: periodDays.size ? inPeriod.length : complete.filter((d) => d.date >= addDaysISO(today, -27)).length,
    weighIns: points.length,
    spanDays,
  };

  const enoughWeights = points.length >= ADAPTIVE_MIN_WEIGHINS && spanDays >= ADAPTIVE_MIN_SPAN;
  // Además de un mínimo, que esté registrada al menos la mitad del período.
  const enoughDays = inPeriod.length >= ADAPTIVE_MIN_DAYS && inPeriod.length >= spanDays * 0.5;
  if (!enoughWeights || !enoughDays) return { ready: false, progress };

  const avgIntake = inPeriod.reduce((a, d) => a + d.kcal, 0) / inPeriod.length;
  let exTotal = 0;
  for (const d of periodDays) exTotal += input.exercise.get(d) ?? 0;
  const avgExercise = exTotal / spanDays;
  const slope = slopePerDay(points);
  const tdee = avgIntake - slope * KCAL_PER_KG;

  const eatBack = input.eatBackPct / 100;
  // Con el gasto real, cuánto comer de base para sostener el déficit elegido,
  // sabiendo que los días de gym se suma una parte de lo quemado.
  const raw = round10(tdee - input.deficitKcal - eatBack * avgExercise);
  const suggestedTarget = Math.max(input.minSafe, raw);

  const confidence: "baja" | "media" | "alta" =
    inPeriod.length >= 21 && points.length >= 5 ? "alta" : inPeriod.length >= 14 && points.length >= 4 ? "media" : "baja";

  return {
    ready: true,
    progress,
    from: first!,
    to: last!,
    tdee: Math.round(tdee),
    formulaTotal: Math.round(input.formulaTdee + avgExercise),
    avgIntake: Math.round(avgIntake),
    avgExercise: Math.round(avgExercise),
    weeklyChangeKg: slope * 7,
    confidence,
    plausible: tdee >= input.bmr * 1.0 && tdee <= input.bmr * 2.5,
    suggestedTarget,
    clampedToMin: raw < input.minSafe,
    earlyPhase: weights.length > 0 && daysBetween(weights[0].date, first!) < 14,
  };
}

/**
 * Gasto base diario (sin gimnasio) para calcular balances: el real si ya es confiable, si no el de la fórmula.
 * Los entrenamientos se suman aparte, día por día.
 */
export function baseTdee(result: AdaptiveResult, formulaTdee: number): { value: number; real: boolean } {
  if (result.ready && result.plausible) return { value: result.tdee - result.avgExercise, real: true };
  return { value: formulaTdee, real: false };
}
