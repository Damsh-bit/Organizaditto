import "server-only";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { habitChecks, habits } from "@/db/schema";
import { addDaysISO, startOfWeekISO } from "@/lib/dates";

export async function getHabitsWeek(today: string) {
  const db = await getDb();
  const weekStart = startOfWeekISO(today);
  const list = await db.select().from(habits).where(eq(habits.archived, false)).orderBy(asc(habits.sort), asc(habits.id));
  const checks = await db
    .select()
    .from(habitChecks)
    .where(and(gte(habitChecks.date, weekStart), lte(habitChecks.date, addDaysISO(weekStart, 6))));
  return list.map((h) => {
    const dates = checks.filter((c) => c.habitId === h.id).map((c) => c.date);
    return { id: h.id, name: h.name, emoji: h.emoji, targetPerWeek: h.targetPerWeek, doneToday: dates.includes(today), weekCount: dates.length, dates };
  });
}

export type HabitWeek = Awaited<ReturnType<typeof getHabitsWeek>>[number];
