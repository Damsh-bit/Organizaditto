import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { babyFoodExposures, babyFoodLogs, babyMeasurements, babyQuestions, babyVaccines, foods } from "@/db/schema";
import { monthsBetween, todayISO } from "@/lib/dates";
import { getBaby } from "./settings";

export async function getBabyLogs(babyId: number, from: string, to: string) {
  const db = await getDb();
  return db.query.babyFoodLogs.findMany({
    where: and(eq(babyFoodLogs.babyId, babyId), gte(babyFoodLogs.date, from), lte(babyFoodLogs.date, to)),
    with: { recipe: true },
    orderBy: [desc(babyFoodLogs.date), asc(babyFoodLogs.createdAt)],
  });
}

const REACTION_RANK: Record<string, number> = { ninguna: 0, leve: 1, moderada: 2, grave: 3 };
export const RANK_REACTION = ["ninguna", "leve", "moderada", "grave"];

export type ExposureSummary = {
  foodId: number;
  name: string;
  category: string;
  allergen: string | null;
  firstDate: string;
  lastDate: string;
  times: number;
  worstReaction: string;
  avgAcceptance: number | null;
};

/** Alimentos que ya probó el bebé, con cantidad de veces, reacción y aceptación. */
export async function getExposureSummary(babyId: number): Promise<ExposureSummary[]> {
  const db = await getDb();
  const rows = await db
    .select({
      foodId: babyFoodExposures.foodId,
      name: foods.name,
      category: foods.category,
      allergen: foods.allergen,
      firstDate: sql<string>`min(${babyFoodExposures.date})`,
      lastDate: sql<string>`max(${babyFoodExposures.date})`,
      times: sql<number>`count(distinct ${babyFoodExposures.date})`.mapWith(Number),
      worst: sql<number>`max(case ${babyFoodExposures.reaction} when 'grave' then 3 when 'moderada' then 2 when 'leve' then 1 else 0 end)`.mapWith(Number),
      avgAcceptance: sql<number | null>`avg(${babyFoodExposures.acceptance})`,
    })
    .from(babyFoodExposures)
    .innerJoin(foods, eq(foods.id, babyFoodExposures.foodId))
    .where(and(eq(babyFoodExposures.babyId, babyId), eq(foods.isPantry, false)))
    .groupBy(babyFoodExposures.foodId, foods.name, foods.category, foods.allergen)
    .orderBy(sql`min(${babyFoodExposures.date})`);
  return rows.map((r) => ({
    foodId: r.foodId,
    name: r.name,
    category: r.category,
    allergen: r.allergen,
    firstDate: r.firstDate,
    lastDate: r.lastDate,
    times: r.times,
    worstReaction: RANK_REACTION[r.worst] ?? "ninguna",
    avgAcceptance: r.avgAcceptance != null ? Number(r.avgAcceptance) : null,
  }));
}

export function worseReaction(a: string, b: string) {
  return (REACTION_RANK[a] ?? 0) >= (REACTION_RANK[b] ?? 0) ? a : b;
}

/** Alimentos aptos para su edad que todavía no probó. */
export async function getFoodsToTry(babyId: number, months: number) {
  const db = await getDb();
  const tried = await db
    .selectDistinct({ foodId: babyFoodExposures.foodId })
    .from(babyFoodExposures)
    .where(eq(babyFoodExposures.babyId, babyId));
  const triedSet = new Set(tried.map((t) => t.foodId));
  const list = await db
    .select({ id: foods.id, name: foods.name, category: foods.category, allergen: foods.allergen, babyFromMonths: foods.babyFromMonths })
    .from(foods)
    .where(and(eq(foods.archived, false), eq(foods.isPantry, false), lte(foods.babyFromMonths, Math.max(6, months))))
    .orderBy(asc(foods.category), asc(foods.name));
  return list.filter((f) => !triedSet.has(f.id));
}

export async function getBabyFoodOptions() {
  const db = await getDb();
  return db
    .select({ id: foods.id, name: foods.name, category: foods.category, allergen: foods.allergen, babyFromMonths: foods.babyFromMonths })
    .from(foods)
    .where(and(eq(foods.archived, false), eq(foods.isPantry, false), sql`${foods.babyFromMonths} is not null`))
    .orderBy(asc(foods.name));
}

export async function getBabyContext() {
  const baby = await getBaby();
  const today = todayISO();
  const months = baby?.birthDate ? monthsBetween(baby.birthDate, today) : null;
  return { baby, months, today };
}

/* ----------------------------- Salud: crecimiento, vacunas y control ----------------------------- */

export async function getMeasurements(babyId: number) {
  const db = await getDb();
  return db.select().from(babyMeasurements).where(eq(babyMeasurements.babyId, babyId)).orderBy(asc(babyMeasurements.date));
}

export async function getVaccines(babyId: number) {
  const db = await getDb();
  return db.select().from(babyVaccines).where(eq(babyVaccines.babyId, babyId)).orderBy(asc(babyVaccines.date), asc(babyVaccines.id));
}

export async function getQuestions(babyId: number) {
  const db = await getDb();
  return db
    .select()
    .from(babyQuestions)
    .where(eq(babyQuestions.babyId, babyId))
    .orderBy(asc(babyQuestions.done), desc(babyQuestions.createdAt));
}
