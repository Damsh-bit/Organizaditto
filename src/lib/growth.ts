/**
 * Percentiles de crecimiento con los patrones de la OMS (método LMS).
 *   z = ((X / M)^L − 1) / (L · S)      (si L = 0: ln(X / M) / S)
 */
import { daysBetween } from "./dates";
import { WHO_LMS, type GrowthIndicator, type GrowthSex, type LMS } from "./growth-who";

export type { GrowthIndicator, GrowthSex };

export const GROWTH_INDICATORS: Record<GrowthIndicator, { label: string; unit: string; digits: number }> = {
  weight: { label: "Peso", unit: "kg", digits: 2 },
  length: { label: "Talla", unit: "cm", digits: 1 },
  head: { label: "Perímetro cefálico", unit: "cm", digits: 1 },
};

/** Curvas estándar de la OMS. */
export const PERCENTILE_LINES = [
  { p: 3, z: -1.880794 },
  { p: 15, z: -1.036433 },
  { p: 50, z: 0 },
  { p: 85, z: 1.036433 },
  { p: 97, z: 1.880794 },
] as const;

export const MAX_MONTHS = 24;
const DAYS_PER_MONTH = 30.4375;

export function ageInMonths(birthISO: string, onISO: string) {
  return daysBetween(birthISO, onISO) / DAYS_PER_MONTH;
}

/** Parámetros LMS interpolados para una edad en meses (0 a 24). */
export function lmsAt(indicator: GrowthIndicator, sex: GrowthSex, months: number): LMS | null {
  if (!(months >= 0) || months > MAX_MONTHS) return null;
  const table = WHO_LMS[indicator][sex];
  const i = Math.min(Math.floor(months), MAX_MONTHS - 1);
  const t = months - i;
  const [a, b] = [table[i], table[i + 1]];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function zScore(x: number, [L, M, S]: LMS) {
  return Math.abs(L) < 1e-9 ? Math.log(x / M) / S : ((x / M) ** L - 1) / (L * S);
}

export function valueAtZ(z: number, [L, M, S]: LMS) {
  return Math.abs(L) < 1e-9 ? M * Math.exp(S * z) : M * (1 + L * S * z) ** (1 / L);
}

/** Función de distribución normal estándar (aproximación de Abramowitz-Stegun, error < 1e-7). */
export function normalCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

export type GrowthAssessment = { z: number; percentile: number; label: string; tone: "ok" | "watch" | "consult" };

export function assess(indicator: GrowthIndicator, sex: GrowthSex, months: number, value: number): GrowthAssessment | null {
  const lms = lmsAt(indicator, sex, months);
  if (!lms || !(value > 0)) return null;
  const z = zScore(value, lms);
  const percentile = normalCdf(z) * 100;
  if (percentile < 3) return { z, percentile, label: "por debajo del percentil 3", tone: "consult" };
  if (percentile > 97) return { z, percentile, label: "por encima del percentil 97", tone: "consult" };
  if (percentile < 15) return { z, percentile, label: "bajo, dentro de lo normal", tone: "watch" };
  if (percentile > 85) return { z, percentile, label: "alto, dentro de lo normal", tone: "watch" };
  return { z, percentile, label: "normal", tone: "ok" };
}

/** Puntos de las curvas de percentiles cada medio mes, para el gráfico. */
export function percentileCurves(indicator: GrowthIndicator, sex: GrowthSex, maxMonths = MAX_MONTHS) {
  const out: { months: number; p3: number; p15: number; p50: number; p85: number; p97: number }[] = [];
  for (let m = 0; m <= Math.min(maxMonths, MAX_MONTHS) + 1e-9; m += 0.5) {
    const lms = lmsAt(indicator, sex, m)!;
    const [p3, p15, p50, p85, p97] = PERCENTILE_LINES.map((l) => valueAtZ(l.z, lms));
    out.push({ months: m, p3, p15, p50, p85, p97 });
  }
  return out;
}

export function fmtPercentile(p: number) {
  if (p < 1) return "< 1";
  if (p > 99) return "> 99";
  return String(Math.round(p));
}
