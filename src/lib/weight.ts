import { addDaysISO, daysBetween, parseISO, toISO } from "./dates";

export type WeightPoint = { date: string; weightKg: number };

/** Pendiente (kg por semana) por regresión lineal de los registros de los últimos `days` días. */
export function weeklyRate(logs: WeightPoint[], days = 28): number | null {
  if (logs.length < 2) return null;
  const last = logs[logs.length - 1].date;
  const recent = logs.filter((l) => daysBetween(l.date, last) <= days);
  const pts = recent.length >= 2 ? recent : logs.slice(-2);
  const x0 = pts[0].date;
  const xs = pts.map((p) => daysBetween(x0, p.date));
  const ys = pts.map((p) => p.weightKg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  return (num / den) * 7;
}

export type WeightInsights = {
  latest: WeightPoint | null;
  start: number | null;
  change: number | null;
  toGoal: number | null;
  progressPct: number | null;
  rate: number | null;
  etaDate: string | null;
  weeksToGoal: number | null;
};

export function weightInsights(logs: WeightPoint[], startKg: number | null, goalKg: number | null): WeightInsights {
  const latest = logs.at(-1) ?? null;
  const start = startKg ?? logs[0]?.weightKg ?? null;
  const change = latest && start != null ? latest.weightKg - start : null;
  const toGoal = latest && goalKg != null ? latest.weightKg - goalKg : null;
  const progressPct =
    start != null && goalKg != null && latest && start !== goalKg
      ? Math.min(1, Math.max(0, (start - latest.weightKg) / (start - goalKg)))
      : null;
  const rate = weeklyRate(logs);
  let etaDate: string | null = null;
  let weeksToGoal: number | null = null;
  if (latest && goalKg != null && rate != null && toGoal != null && toGoal > 0 && rate < -0.05) {
    weeksToGoal = toGoal / -rate;
    if (weeksToGoal < 520) etaDate = addDaysISO(latest.date, Math.round(weeksToGoal * 7));
  }
  return { latest, start, change, toGoal, progressPct, rate, etaDate, weeksToGoal };
}

/** Media móvil de 7 días (suaviza retención de líquidos). */
export function movingAverage(logs: WeightPoint[], windowDays = 7) {
  return logs.map((l) => {
    const from = toISO(new Date(parseISO(l.date).getTime() - (windowDays - 1) * 86400000));
    const win = logs.filter((x) => x.date >= from && x.date <= l.date);
    return { date: l.date, value: win.reduce((a, b) => a + b.weightKg, 0) / win.length };
  });
}
