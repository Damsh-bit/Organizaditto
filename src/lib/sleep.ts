/**
 * Relación entre sueño y hambre: dormir poco suele subir el apetito al día siguiente.
 * El sueño cargado en el día D es la noche anterior, así que se compara con lo comido ese mismo día D.
 */
import { isCompleteDay, type IntakeDay } from "./adaptive";

export const SHORT_SLEEP_H = 6.5;
export const GOOD_SLEEP_H = 7;

export type SleepIntake = { shortAvg: number; goodAvg: number; diff: number; nShort: number; nGood: number };

export function sleepVsIntake(
  metrics: { date: string; sleepHours: number | null }[],
  intake: IntakeDay[],
  target: number,
  today: string,
): SleepIntake | null {
  const kcal = new Map(intake.filter((d) => isCompleteDay(d, target, today)).map((d) => [d.date, d.kcal]));
  const short: number[] = [];
  const good: number[] = [];
  for (const m of metrics) {
    const k = kcal.get(m.date);
    if (m.sleepHours == null || k == null) continue;
    if (m.sleepHours < SHORT_SLEEP_H) short.push(k);
    else if (m.sleepHours >= GOOD_SLEEP_H) good.push(k);
  }
  if (short.length < 3 || good.length < 3) return null;
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const shortAvg = avg(short);
  const goodAvg = avg(good);
  return { shortAvg, goodAvg, diff: shortAvg - goodAvg, nShort: short.length, nGood: good.length };
}
