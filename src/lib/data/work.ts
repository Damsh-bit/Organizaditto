import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { payouts, workLogs } from "@/db/schema";

export async function getWorkLogs(from: string, to: string) {
  const db = await getDb();
  return db
    .select()
    .from(workLogs)
    .where(and(gte(workLogs.date, from), lte(workLogs.date, to)))
    .orderBy(desc(workLogs.date), desc(workLogs.id));
}

export async function getRunningSession() {
  const db = await getDb();
  const [row] = await db.select().from(workLogs).where(eq(workLogs.running, true)).orderBy(desc(workLogs.id)).limit(1);
  return row ?? null;
}

export type WorkDay = { date: string; hours: number; usd: number; ars: number | null; sessions: number };

/** Horas y ganancias por día (sesiones terminadas). ars = convertido con la cotización guardada de cada registro. */
export async function getWorkDays(from: string, to: string) {
  const db = await getDb();
  const rows = await db
    .select({
      date: workLogs.date,
      hours: sql<number>`sum(${workLogs.hours})`.mapWith(Number),
      usd: sql<number>`sum(${workLogs.hours} * ${workLogs.rateUsd})`.mapWith(Number),
      ars: sql<number>`sum(${workLogs.hours} * ${workLogs.rateUsd} * ${workLogs.arsRate})`.mapWith(Number),
      sessions: sql<number>`count(*)`.mapWith(Number),
    })
    .from(workLogs)
    .where(and(gte(workLogs.date, from), lte(workLogs.date, to), eq(workLogs.running, false)))
    .groupBy(workLogs.date)
    .orderBy(asc(workLogs.date));
  return new Map<string, WorkDay>(rows.map((r) => [r.date, r]));
}

export function sumDays(days: Map<string, WorkDay>, from: string, to: string) {
  let hours = 0;
  let usd = 0;
  let ars = 0;
  let worked = 0;
  for (const [d, v] of days) {
    if (d < from || d > to) continue;
    hours += v.hours;
    usd += v.usd;
    ars += v.ars ?? 0;
    if (v.hours > 0) worked++;
  }
  return { hours, usd, ars, worked };
}

export async function getPayouts() {
  const db = await getDb();
  return db.select().from(payouts).orderBy(desc(payouts.date), desc(payouts.id));
}

/** Total ganado vs cobrado (para saber cuánto falta retirar). */
export async function getBalance() {
  const db = await getDb();
  const [earned] = await db
    .select({ usd: sql<number>`coalesce(sum(${workLogs.hours} * ${workLogs.rateUsd}), 0)`.mapWith(Number), hours: sql<number>`coalesce(sum(${workLogs.hours}), 0)`.mapWith(Number) })
    .from(workLogs)
    .where(eq(workLogs.running, false));
  const [paid] = await db
    .select({ usd: sql<number>`coalesce(sum(${payouts.amountUsd}), 0)`.mapWith(Number), ars: sql<number>`coalesce(sum(${payouts.amountArs}), 0)`.mapWith(Number) })
    .from(payouts);
  return { earnedUsd: earned.usd, totalHours: earned.hours, paidUsd: paid.usd, paidArs: paid.ars, pendingUsd: earned.usd - paid.usd };
}

export async function getProjects() {
  const db = await getDb();
  const rows = await db
    .select({ project: workLogs.project, n: sql<number>`count(*)`.mapWith(Number) })
    .from(workLogs)
    .where(sql`${workLogs.project} is not null and ${workLogs.project} <> ''`)
    .groupBy(workLogs.project)
    .orderBy(desc(sql`count(*)`))
    .limit(12);
  return rows.map((r) => r.project!);
}
