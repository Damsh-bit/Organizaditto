import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  dailyMetrics,
  foodLogs,
  foods,
  mealPlanItems,
  menuTemplates,
  recipeIngredients,
  recipes,
  shoppingListItems,
  shoppingLists,
  workouts,
  type Food,
  type Recipe,
} from "@/db/schema";
import { MEALS } from "@/lib/constants";
import { sumMacros, type Macros } from "@/lib/nutrition";
import type { ProfileContext } from "./settings";

/* ----------------------------- Opciones para pickers ----------------------------- */

export type FoodOption = Pick<
  Food,
  "id" | "name" | "category" | "kcal" | "protein" | "carbs" | "fat" | "fiber" | "unitName" | "unitGrams" | "allergen" | "babyFromMonths" | "store"
>;

export async function getFoodOptions(): Promise<FoodOption[]> {
  const db = await getDb();
  return db
    .select({
      id: foods.id,
      name: foods.name,
      category: foods.category,
      store: foods.store,
      kcal: foods.kcal,
      protein: foods.protein,
      carbs: foods.carbs,
      fat: foods.fat,
      fiber: foods.fiber,
      unitName: foods.unitName,
      unitGrams: foods.unitGrams,
      allergen: foods.allergen,
      babyFromMonths: foods.babyFromMonths,
    })
    .from(foods)
    .where(eq(foods.archived, false))
    .orderBy(asc(foods.name));
}

export type RecipeOption = Pick<
  Recipe,
  "id" | "name" | "emoji" | "kcal" | "protein" | "carbs" | "fat" | "servings" | "mealTypes" | "audience" | "isFavorite" | "babyMinMonths" | "tags"
>;

export async function getRecipeOptions(audience?: "adult" | "baby"): Promise<RecipeOption[]> {
  const db = await getDb();
  return db
    .select({
      id: recipes.id,
      name: recipes.name,
      emoji: recipes.emoji,
      kcal: recipes.kcal,
      protein: recipes.protein,
      carbs: recipes.carbs,
      fat: recipes.fat,
      servings: recipes.servings,
      mealTypes: recipes.mealTypes,
      audience: recipes.audience,
      isFavorite: recipes.isFavorite,
      babyMinMonths: recipes.babyMinMonths,
      tags: recipes.tags,
    })
    .from(recipes)
    .where(audience ? and(eq(recipes.archived, false), eq(recipes.audience, audience)) : eq(recipes.archived, false))
    .orderBy(desc(recipes.isFavorite), asc(recipes.name));
}

/* ----------------------------- Recetas ----------------------------- */

export async function listRecipes(audience: "adult" | "baby") {
  const db = await getDb();
  return db
    .select()
    .from(recipes)
    .where(and(eq(recipes.archived, false), eq(recipes.audience, audience)))
    .orderBy(desc(recipes.isFavorite), asc(recipes.name));
}

export async function getRecipeFull(id: number) {
  const db = await getDb();
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
    with: { ingredients: { with: { food: true }, orderBy: [asc(recipeIngredients.sort)] } },
  });
  return recipe ?? null;
}

export type RecipeFull = NonNullable<Awaited<ReturnType<typeof getRecipeFull>>>;

/* ----------------------------- Diario ----------------------------- */

export async function getDayLogs(date: string) {
  const db = await getDb();
  return db.select().from(foodLogs).where(eq(foodLogs.date, date)).orderBy(asc(foodLogs.createdAt));
}

export async function getExerciseKcal(from: string, to = from) {
  const db = await getDb();
  const rows = await db
    .select({ date: workouts.date, kcal: sql<number>`coalesce(sum(${workouts.kcalBurned}), 0)`.mapWith(Number) })
    .from(workouts)
    .where(and(gte(workouts.date, from), lte(workouts.date, to)))
    .groupBy(workouts.date);
  return new Map(rows.map((r) => [r.date, r.kcal]));
}

export async function getDayMetrics(date: string) {
  const db = await getDb();
  const [row] = await db.select().from(dailyMetrics).where(eq(dailyMetrics.date, date));
  return row ?? { date, waterMl: 0, steps: null, sleepHours: null, notes: null };
}

export type DaySummary = {
  date: string;
  logs: Awaited<ReturnType<typeof getDayLogs>>;
  totals: Macros;
  byMeal: Record<string, Macros>;
  exerciseKcal: number;
  exerciseBonus: number;
  budget: number;
  remaining: number;
  waterMl: number;
};

export async function getDaySummary(date: string, ctx: ProfileContext): Promise<DaySummary> {
  const [logs, exMap, metrics] = await Promise.all([getDayLogs(date), getExerciseKcal(date), getDayMetrics(date)]);
  const totals = sumMacros(logs);
  const byMeal: Record<string, Macros> = {};
  for (const m of MEALS) byMeal[m.key] = sumMacros(logs.filter((l) => l.meal === m.key));
  const exerciseKcal = exMap.get(date) ?? 0;
  const exerciseBonus = Math.round(exerciseKcal * (ctx.settings.exerciseEatBackPct / 100));
  const budget = ctx.targets.target + exerciseBonus;
  return {
    date,
    logs,
    totals,
    byMeal,
    exerciseKcal,
    exerciseBonus,
    budget,
    remaining: budget - totals.kcal,
    waterMl: metrics.waterMl,
  };
}

/** Totales diarios de calorías/macros en un rango (solo días con registros). */
export async function getIntakeByDay(from: string, to: string) {
  const db = await getDb();
  const rows = await db
    .select({
      date: foodLogs.date,
      kcal: sql<number>`sum(${foodLogs.kcal})`.mapWith(Number),
      protein: sql<number>`sum(${foodLogs.protein})`.mapWith(Number),
      carbs: sql<number>`sum(${foodLogs.carbs})`.mapWith(Number),
      fat: sql<number>`sum(${foodLogs.fat})`.mapWith(Number),
      entries: sql<number>`count(*)`.mapWith(Number),
    })
    .from(foodLogs)
    .where(and(gte(foodLogs.date, from), lte(foodLogs.date, to)))
    .groupBy(foodLogs.date)
    .orderBy(asc(foodLogs.date));
  return rows;
}

export async function getWaterByDay(from: string, to: string) {
  const db = await getDb();
  const rows = await db
    .select({ date: dailyMetrics.date, waterMl: dailyMetrics.waterMl })
    .from(dailyMetrics)
    .where(and(gte(dailyMetrics.date, from), lte(dailyMetrics.date, to)));
  return new Map(rows.map((r) => [r.date, r.waterMl]));
}

/** Lo que más registraste últimamente (para agregar rápido). */
export async function getFrequentLogItems(limit = 12) {
  const db = await getDb();
  return db
    .select({
      foodId: foodLogs.foodId,
      recipeId: foodLogs.recipeId,
      name: foodLogs.name,
      grams: sql<number>`max(${foodLogs.grams})`.mapWith(Number),
      servings: sql<number>`max(${foodLogs.servings})`.mapWith(Number),
      kcal: sql<number>`max(${foodLogs.kcal})`.mapWith(Number),
      uses: sql<number>`count(*)`.mapWith(Number),
      last: sql<string>`max(${foodLogs.date})`,
    })
    .from(foodLogs)
    .groupBy(foodLogs.foodId, foodLogs.recipeId, foodLogs.name)
    .orderBy(desc(sql`count(*)`), desc(sql`max(${foodLogs.date})`))
    .limit(limit);
}

/* ----------------------------- Plan semanal ----------------------------- */

export async function getPlanItems(from: string, to: string, audience?: "adult" | "baby") {
  const db = await getDb();
  const where = audience
    ? and(gte(mealPlanItems.date, from), lte(mealPlanItems.date, to), eq(mealPlanItems.audience, audience))
    : and(gte(mealPlanItems.date, from), lte(mealPlanItems.date, to));
  return db.query.mealPlanItems.findMany({
    where,
    with: { recipe: true },
    orderBy: [asc(mealPlanItems.date), asc(mealPlanItems.sort), asc(mealPlanItems.id)],
  });
}

export type PlanItemWithRecipe = Awaited<ReturnType<typeof getPlanItems>>[number];

export async function getMenuTemplates() {
  const db = await getDb();
  return db.select().from(menuTemplates).orderBy(asc(menuTemplates.id));
}

export async function getMenuTemplate(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(menuTemplates).where(eq(menuTemplates.id, id));
  return row ?? null;
}

export async function getRecipesByIdsOrSlugs(ids: number[], slugs: string[]) {
  const db = await getDb();
  const out: Recipe[] = [];
  if (ids.length) out.push(...(await db.select().from(recipes).where(inArray(recipes.id, ids))));
  if (slugs.length) out.push(...(await db.select().from(recipes).where(inArray(recipes.slug, slugs))));
  return out;
}

/* ----------------------------- Compras ----------------------------- */

export async function listShoppingLists() {
  const db = await getDb();
  const lists = await db.select().from(shoppingLists).orderBy(desc(shoppingLists.createdAt));
  if (!lists.length) return [];
  const counts = await db
    .select({
      listId: shoppingListItems.listId,
      total: sql<number>`count(*)`.mapWith(Number),
      checked: sql<number>`sum(case when ${shoppingListItems.checked} then 1 else 0 end)`.mapWith(Number),
      cost: sql<number>`coalesce(sum(${shoppingListItems.priceArs}), 0)`.mapWith(Number),
    })
    .from(shoppingListItems)
    .where(inArray(shoppingListItems.listId, lists.map((l) => l.id)))
    .groupBy(shoppingListItems.listId);
  const byId = new Map(counts.map((c) => [c.listId, c]));
  return lists.map((l) => ({ ...l, total: byId.get(l.id)?.total ?? 0, checked: byId.get(l.id)?.checked ?? 0, cost: byId.get(l.id)?.cost ?? 0 }));
}

export async function getShoppingList(id: number) {
  const db = await getDb();
  const list = await db.query.shoppingLists.findFirst({
    where: eq(shoppingLists.id, id),
    with: { items: { with: { food: true }, orderBy: [asc(shoppingListItems.sort), asc(shoppingListItems.name)] } },
  });
  return list ?? null;
}

export async function listFoods() {
  const db = await getDb();
  return db.select().from(foods).where(eq(foods.archived, false)).orderBy(asc(foods.category), asc(foods.name));
}

/** Índice liviano de recetas para resolver menús (por id o slug). */
export async function getRecipeIndex() {
  const db = await getDb();
  return db
    .select({ id: recipes.id, slug: recipes.slug, name: recipes.name, emoji: recipes.emoji, kcal: recipes.kcal, audience: recipes.audience })
    .from(recipes);
}
