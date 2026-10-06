"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import {
  babies,
  babyFoodLogs,
  dailyMetrics,
  foodLogs,
  foods,
  mealPlanItems,
  menuTemplates,
  recipeIngredients,
  recipes,
  shoppingListItems,
  shoppingLists,
  type Food,
} from "@/db/schema";
import { errorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { addDaysISO, endOfMonthISO, fmtDate, fmtMonth, isISODate, startOfMonthISO, weekDates, weekdayMon } from "@/lib/dates";
import { parseNum } from "@/lib/format";
import { macrosFor, recipePerServing, roundMacros, scaleMacros } from "@/lib/nutrition";
import { generateWeek, scaleTemplateDays } from "@/lib/planner";
import { buyQuantity } from "@/lib/shopping";
import { getProfileContext } from "@/lib/data/settings";
import { createBabyLog } from "@/lib/server/baby-log";
import { STORES } from "@/lib/constants";
import { offSearch, parseQuantityGrams, type OffProduct } from "@/lib/server/off";

function refresh() {
  revalidatePath("/", "layout");
}

const dateSchema = z.string().refine(isISODate, "Fecha inválida");
const mealSchema = z.enum(["desayuno", "almuerzo", "merienda", "cena", "snack"]);

/* ================================ Diario ================================ */

const logSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("food"), date: dateSchema, meal: mealSchema, foodId: z.number().int(), grams: z.number().positive().max(5000) }),
  z.object({ kind: z.literal("recipe"), date: dateSchema, meal: mealSchema, recipeId: z.number().int(), servings: z.number().positive().max(20) }),
  z.object({
    kind: z.literal("quick"),
    date: dateSchema,
    meal: mealSchema,
    name: z.string().trim().min(1).max(120),
    kcal: z.number().min(0).max(10000),
    protein: z.number().min(0).max(1000).optional(),
    carbs: z.number().min(0).max(1000).optional(),
    fat: z.number().min(0).max(1000).optional(),
  }),
]);

export type AddLogInput = z.input<typeof logSchema>;

export async function addFoodLog(input: AddLogInput): Promise<ActionResult> {
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const v = parsed.data;
  const db = await getDb();
  try {
    if (v.kind === "food") {
      const [food] = await db.select().from(foods).where(eq(foods.id, v.foodId));
      if (!food) return fail("Alimento no encontrado");
      const m = roundMacros(macrosFor(food, v.grams));
      await db.insert(foodLogs).values({ date: v.date, meal: v.meal, foodId: food.id, grams: v.grams, name: food.name, ...m });
    } else if (v.kind === "recipe") {
      const [r] = await db.select().from(recipes).where(eq(recipes.id, v.recipeId));
      if (!r) return fail("Receta no encontrada");
      const m = roundMacros(scaleMacros({ kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber }, v.servings));
      await db.insert(foodLogs).values({ date: v.date, meal: v.meal, recipeId: r.id, servings: v.servings, name: r.name, ...m });
    } else {
      await db.insert(foodLogs).values({
        date: v.date,
        meal: v.meal,
        name: v.name,
        kcal: Math.round(v.kcal),
        protein: v.protein ?? 0,
        carbs: v.carbs ?? 0,
        fat: v.fat ?? 0,
      });
    }
  } catch (e) {
    return fail(errorMessage(e));
  }
  refresh();
  return ok("Agregado al diario");
}

export async function deleteFoodLog(id: number): Promise<ActionResult> {
  const db = await getDb();
  const [log] = await db.delete(foodLogs).where(eq(foodLogs.id, id)).returning();
  if (log?.planItemId) {
    await db.update(mealPlanItems).set({ done: false, logId: null }).where(eq(mealPlanItems.id, log.planItemId));
  }
  refresh();
  return ok("Eliminado");
}

export async function copyMealFromDate(fromDate: string, toDate: string, meal: string): Promise<ActionResult> {
  if (!isISODate(fromDate) || !isISODate(toDate)) return fail("Fecha inválida");
  const db = await getDb();
  const rows = await db.select().from(foodLogs).where(and(eq(foodLogs.date, fromDate), eq(foodLogs.meal, meal)));
  if (!rows.length) return fail("No hay nada registrado en esa comida");
  await db.insert(foodLogs).values(
    rows.map((r) => ({
      date: toDate,
      meal: r.meal,
      foodId: r.foodId,
      recipeId: r.recipeId,
      grams: r.grams,
      servings: r.servings,
      name: r.name,
      kcal: r.kcal,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
    })),
  );
  refresh();
  return ok(`Copiado (${rows.length} ${rows.length === 1 ? "ítem" : "ítems"})`);
}

export async function addWater(date: string, deltaMl: number): Promise<ActionResult> {
  if (!isISODate(date)) return fail("Fecha inválida");
  const db = await getDb();
  const [row] = await db.select().from(dailyMetrics).where(eq(dailyMetrics.date, date));
  const next = Math.max(0, (row?.waterMl ?? 0) + deltaMl);
  if (row) await db.update(dailyMetrics).set({ waterMl: next }).where(eq(dailyMetrics.date, date));
  else await db.insert(dailyMetrics).values({ date, waterMl: next });
  refresh();
  return ok();
}

/* ================================ Plan semanal ================================ */

const planItemSchema = z.object({
  date: dateSchema,
  meal: mealSchema,
  recipeId: z.number().int(),
  servings: z.number().positive().max(20),
  audience: z.enum(["adult", "baby"]).default("adult"),
});

export async function addPlanItem(input: z.input<typeof planItemSchema>): Promise<ActionResult> {
  const parsed = planItemSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const db = await getDb();
  await db.insert(mealPlanItems).values(parsed.data);
  refresh();
  return ok("Agregado al plan");
}

export async function updatePlanServings(id: number, servings: number): Promise<ActionResult> {
  if (!(servings > 0 && servings <= 20)) return fail("Porciones inválidas");
  const db = await getDb();
  await db.update(mealPlanItems).set({ servings }).where(eq(mealPlanItems.id, id));
  refresh();
  return ok();
}

export async function removePlanItem(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(mealPlanItems).where(eq(mealPlanItems.id, id));
  refresh();
  return ok("Quitado del plan");
}

/** Marca una comida del plan como comida (la registra en el diario) o la desmarca. */
export async function togglePlanItemDone(id: number): Promise<ActionResult> {
  const db = await getDb();
  const item = await db.query.mealPlanItems.findFirst({ where: eq(mealPlanItems.id, id), with: { recipe: true } });
  if (!item) return fail("No encontrado");

  if (item.done) {
    if (item.audience === "adult" && item.logId) await db.delete(foodLogs).where(eq(foodLogs.id, item.logId));
    if (item.audience === "baby" && item.logId) await db.delete(babyFoodLogs).where(eq(babyFoodLogs.id, item.logId));
    await db.update(mealPlanItems).set({ done: false, logId: null }).where(eq(mealPlanItems.id, id));
    refresh();
    return ok("Desmarcado");
  }

  let logId: number | null = null;
  if (item.audience === "adult") {
    const r = item.recipe;
    const m = roundMacros(scaleMacros({ kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber }, item.servings));
    const [log] = await db
      .insert(foodLogs)
      .values({ date: item.date, meal: item.meal, recipeId: r.id, servings: item.servings, name: r.name, planItemId: item.id, ...m })
      .returning({ id: foodLogs.id });
    logId = log.id;
  } else {
    const [baby] = await db.select().from(babies).limit(1);
    if (!baby) return fail("Primero cargá los datos del bebé en Ajustes");
    logId = await createBabyLog(db, { babyId: baby.id, date: item.date, meal: item.meal, recipeId: item.recipeId, name: item.recipe.name });
  }
  await db.update(mealPlanItems).set({ done: true, logId }).where(eq(mealPlanItems.id, id));
  refresh();
  return ok(item.audience === "adult" ? "¡Registrado en tu diario!" : "Registrado en el diario del bebé");
}

async function clearWeekItems(weekStart: string, audience: "adult" | "baby", onlyPending = true) {
  const db = await getDb();
  const end = addDaysISO(weekStart, 6);
  const conds = [gte(mealPlanItems.date, weekStart), lte(mealPlanItems.date, end), eq(mealPlanItems.audience, audience)];
  if (onlyPending) conds.push(eq(mealPlanItems.done, false));
  await db.delete(mealPlanItems).where(and(...conds));
}

export async function clearWeekPlan(weekStart: string, audience: "adult" | "baby" = "adult"): Promise<ActionResult> {
  if (!isISODate(weekStart)) return fail("Fecha inválida");
  await clearWeekItems(weekStart, audience);
  refresh();
  return ok("Semana vaciada (se conservaron las comidas ya registradas)");
}

export async function generateWeekPlan(opts: { weekStart: string; mealPrep: boolean; replace: boolean }): Promise<ActionResult> {
  if (!isISODate(opts.weekStart)) return fail("Fecha inválida");
  const db = await getDb();
  const ctx = await getProfileContext();
  const pool = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.archived, false), eq(recipes.audience, "adult")));
  if (!pool.length) return fail("No hay recetas cargadas");
  if (opts.replace) await clearWeekItems(opts.weekStart, "adult");

  const slots = generateWeek({
    recipes: pool.map((r) => ({ id: r.id, name: r.name, kcal: r.kcal, servings: r.servings, mealTypes: r.mealTypes, isFavorite: r.isFavorite })),
    split: ctx.settings.mealSplit ?? {},
    target: ctx.targets.target,
    mealPrep: opts.mealPrep,
  });
  const dates = weekDates(opts.weekStart);
  await db.insert(mealPlanItems).values(
    slots.map((s, i) => ({ date: dates[s.day], meal: s.meal, recipeId: s.recipeId, servings: s.servings, audience: "adult", sort: i })),
  );
  refresh();
  return ok("¡Semana generada! Revisala y cambiá lo que quieras.");
}

export async function applyMenuTemplate(opts: {
  templateId: number;
  weekStart: string;
  scale: boolean;
  replace: boolean;
}): Promise<ActionResult> {
  if (!isISODate(opts.weekStart)) return fail("Fecha inválida");
  const db = await getDb();
  const [tpl] = await db.select().from(menuTemplates).where(eq(menuTemplates.id, opts.templateId));
  if (!tpl) return fail("Menú no encontrado");

  const slugs = tpl.items.map((i) => i.recipeSlug).filter(Boolean) as string[];
  const ids = tpl.items.map((i) => i.recipeId).filter(Boolean) as number[];
  const found = [
    ...(slugs.length ? await db.select().from(recipes).where(inArray(recipes.slug, slugs)) : []),
    ...(ids.length ? await db.select().from(recipes).where(inArray(recipes.id, ids)) : []),
  ];
  const bySlug = new Map(found.map((r) => [r.slug, r]));
  const byId = new Map(found.map((r) => [r.id, r]));
  let items = tpl.items
    .map((i) => {
      const r = i.recipeId ? byId.get(i.recipeId) : bySlug.get(i.recipeSlug ?? "");
      return r ? { day: i.day, meal: i.meal, recipeId: r.id, servings: i.servings, audience: r.audience } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (!items.length) return fail("El menú no tiene recetas válidas");

  const audience = items[0].audience === "baby" ? "baby" : "adult";
  if (opts.scale && audience === "adult") {
    const ctx = await getProfileContext();
    const scaled = scaleTemplateDays(items, new Map(found.map((r) => [r.id, r.kcal])), ctx.targets.target);
    items = scaled.map((s) => ({ ...s, audience }));
  }
  if (opts.replace) await clearWeekItems(opts.weekStart, audience);
  const dates = weekDates(opts.weekStart);
  await db.insert(mealPlanItems).values(
    items.map((it, i) => ({ date: dates[it.day], meal: it.meal, recipeId: it.recipeId, servings: it.servings, audience, sort: i })),
  );
  refresh();
  return ok(`Menú "${tpl.name}" aplicado`);
}

export async function copyWeekPlan(fromWeekStart: string, toWeekStart: string, audience: "adult" | "baby" = "adult"): Promise<ActionResult> {
  if (!isISODate(fromWeekStart) || !isISODate(toWeekStart)) return fail("Fecha inválida");
  const db = await getDb();
  const src = await db
    .select()
    .from(mealPlanItems)
    .where(
      and(gte(mealPlanItems.date, fromWeekStart), lte(mealPlanItems.date, addDaysISO(fromWeekStart, 6)), eq(mealPlanItems.audience, audience)),
    );
  if (!src.length) return fail("La semana de origen está vacía");
  await clearWeekItems(toWeekStart, audience);
  await db.insert(mealPlanItems).values(
    src.map((s) => ({
      date: addDaysISO(toWeekStart, weekdayMon(s.date)),
      meal: s.meal,
      recipeId: s.recipeId,
      servings: s.servings,
      audience: s.audience,
      sort: s.sort,
    })),
  );
  refresh();
  return ok("Semana copiada");
}

export async function saveWeekAsTemplate(weekStart: string, name: string, audience: "adult" | "baby" = "adult"): Promise<ActionResult> {
  if (!isISODate(weekStart)) return fail("Fecha inválida");
  const title = name.trim();
  if (!title) return fail("Poné un nombre para el menú");
  const db = await getDb();
  const items = await db
    .select()
    .from(mealPlanItems)
    .where(and(gte(mealPlanItems.date, weekStart), lte(mealPlanItems.date, addDaysISO(weekStart, 6)), eq(mealPlanItems.audience, audience)));
  if (!items.length) return fail("La semana está vacía");
  await db.insert(menuTemplates).values({
    name: title,
    emoji: audience === "baby" ? "👶" : "⭐",
    description: `Guardado desde la semana del ${fmtDate(weekStart)}`,
    items: items.map((i) => ({ day: weekdayMon(i.date), meal: i.meal, recipeId: i.recipeId, servings: i.servings })),
    isCustom: true,
  });
  refresh();
  return ok("Menú guardado");
}

export async function deleteMenuTemplate(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(menuTemplates).where(and(eq(menuTemplates.id, id), eq(menuTemplates.isCustom, true)));
  refresh();
  return ok("Menú eliminado");
}

/* ================================ Recetas ================================ */

const recipeSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(2, "Poné un nombre").max(120),
  emoji: z.string().trim().max(8).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  audience: z.enum(["adult", "baby"]),
  mealTypes: z.array(mealSchema).min(1, "Elegí al menos un momento del día"),
  tags: z.array(z.string().trim().min(1).max(40)).max(15),
  servings: z.number().positive().max(50),
  prepMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  cookMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  difficulty: z.enum(["fácil", "media", "difícil"]).optional(),
  steps: z.array(z.string().trim().min(1)).max(40),
  tips: z.string().trim().max(1000).optional().nullable(),
  storage: z.string().trim().max(500).optional().nullable(),
  babyMinMonths: z.number().int().min(4).max(36).optional().nullable(),
  babyTexture: z.string().trim().max(60).optional().nullable(),
  ingredients: z
    .array(
      z.object({
        foodId: z.number().int(),
        grams: z.number().positive().max(20000),
        note: z.string().trim().max(80).optional().nullable(),
        optional: z.boolean().optional(),
      }),
    )
    .min(1, "Agregá al menos un ingrediente"),
});

export type RecipeInput = z.input<typeof recipeSchema>;

export async function saveRecipe(input: RecipeInput): Promise<ActionResult<{ id: number }>> {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const v = parsed.data;
  const db = await getDb();
  const foodRows = await db.select().from(foods).where(inArray(foods.id, v.ingredients.map((i) => i.foodId)));
  const foodById = new Map(foodRows.map((f) => [f.id, f]));
  const macros = roundMacros(
    recipePerServing(
      v.ingredients.filter((i) => foodById.has(i.foodId)).map((i) => ({ grams: i.grams, optional: i.optional, food: foodById.get(i.foodId)! })),
      v.servings,
    ),
  );
  const row = {
    name: v.name,
    emoji: v.emoji || (v.audience === "baby" ? "👶" : "🍽️"),
    description: v.description || null,
    audience: v.audience,
    mealTypes: v.mealTypes,
    tags: v.tags,
    servings: v.servings,
    prepMinutes: v.prepMinutes ?? null,
    cookMinutes: v.cookMinutes ?? null,
    difficulty: v.difficulty ?? "fácil",
    steps: v.steps,
    tips: v.tips || null,
    storage: v.storage || null,
    babyMinMonths: v.audience === "baby" ? (v.babyMinMonths ?? 6) : null,
    babyTexture: v.audience === "baby" ? v.babyTexture || null : null,
    updatedAt: new Date(),
    ...macros,
  };
  let id = v.id;
  if (id) {
    await db.update(recipes).set(row).where(eq(recipes.id, id));
    await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
  } else {
    const [ins] = await db.insert(recipes).values({ ...row, isCustom: true }).returning({ id: recipes.id });
    id = ins.id;
  }
  await db.insert(recipeIngredients).values(
    v.ingredients.map((i, idx) => ({ recipeId: id!, foodId: i.foodId, grams: i.grams, note: i.note || null, optional: i.optional ?? false, sort: idx })),
  );
  refresh();
  return ok("Receta guardada", { id });
}

export async function toggleFavoriteRecipe(id: number): Promise<ActionResult> {
  const db = await getDb();
  const [r] = await db.select({ fav: recipes.isFavorite }).from(recipes).where(eq(recipes.id, id));
  if (!r) return fail("No encontrada");
  await db.update(recipes).set({ isFavorite: !r.fav }).where(eq(recipes.id, id));
  refresh();
  return ok(r.fav ? "Quitada de favoritas" : "¡Agregada a favoritas!");
}

export async function archiveRecipe(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.update(recipes).set({ archived: true }).where(eq(recipes.id, id));
  refresh();
  return ok("Receta eliminada");
}

export async function duplicateRecipe(id: number): Promise<ActionResult<{ id: number }>> {
  const db = await getDb();
  const r = await db.query.recipes.findFirst({ where: eq(recipes.id, id), with: { ingredients: true } });
  if (!r) return fail("No encontrada");
  const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, ingredients, ...rest } = r;
  void _id;
  void _slug;
  void _c;
  void _u;
  const [ins] = await db
    .insert(recipes)
    .values({ ...rest, name: `${r.name} (copia)`, isCustom: true, isFavorite: false })
    .returning({ id: recipes.id });
  if (ingredients.length) {
    await db.insert(recipeIngredients).values(
      ingredients.map((i) => ({ recipeId: ins.id, foodId: i.foodId, grams: i.grams, note: i.note, optional: i.optional, sort: i.sort })),
    );
  }
  refresh();
  return ok("Receta duplicada", { id: ins.id });
}

/* ================================ Alimentos ================================ */

async function recomputeRecipesUsingFood(foodId: number) {
  const db = await getDb();
  const uses = await db.select({ recipeId: recipeIngredients.recipeId }).from(recipeIngredients).where(eq(recipeIngredients.foodId, foodId));
  const ids = [...new Set(uses.map((u) => u.recipeId))];
  for (const rid of ids) {
    const r = await db.query.recipes.findFirst({ where: eq(recipes.id, rid), with: { ingredients: { with: { food: true } } } });
    if (!r) continue;
    const m = roundMacros(recipePerServing(r.ingredients, r.servings));
    await db.update(recipes).set(m).where(eq(recipes.id, rid));
  }
}

export async function saveFood(fd: FormData): Promise<ActionResult> {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return fail("Poné un nombre");
  const kcal = parseNum(fd.get("kcal"));
  if (kcal == null || kcal < 0) return fail("Indicá las calorías cada 100 g");
  const id = parseNum(fd.get("id"));
  const buyUnit = String(fd.get("buyUnit") ?? "kg").trim() || "kg";
  const values = {
    name,
    category: String(fd.get("category") ?? "otros"),
    store: String(fd.get("store") ?? "supermercado"),
    kcal,
    protein: parseNum(fd.get("protein")) ?? 0,
    carbs: parseNum(fd.get("carbs")) ?? 0,
    fat: parseNum(fd.get("fat")) ?? 0,
    fiber: parseNum(fd.get("fiber")) ?? 0,
    unitName: String(fd.get("unitName") ?? "").trim() || null,
    unitGrams: parseNum(fd.get("unitGrams")),
    buyUnit,
    buyUnitGrams: buyUnit === "kg" ? 1000 : (parseNum(fd.get("buyUnitGrams")) ?? 1000),
    priceArs: parseNum(fd.get("priceArs")),
    isPantry: fd.get("isPantry") === "on",
    allergen: String(fd.get("allergen") ?? "") || null,
    babyFromMonths: parseNum(fd.get("babyFromMonths")),
  };
  const db = await getDb();
  if (id) {
    await db.update(foods).set(values).where(eq(foods.id, id));
    await recomputeRecipesUsingFood(id);
  } else {
    await db.insert(foods).values({ ...values, isCustom: true });
  }
  refresh();
  return ok(id ? "Alimento actualizado" : "Alimento agregado");
}

export async function archiveFood(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.update(foods).set({ archived: true }).where(eq(foods.id, id));
  refresh();
  return ok("Alimento eliminado");
}

/* ================================ Compras ================================ */

const shoppingSchema = z.object({
  mode: z.enum(["semana", "mes", "proyeccion", "rango"]),
  from: dateSchema,
  to: dateSchema.optional(),
  weeks: z.number().min(1).max(6).optional(),
  name: z.string().trim().max(80).optional(),
  includeBaby: z.boolean().default(true),
  /** Solo súper/dietética: lo fresco (verdulería, carnicería…) se compra semanal. */
  onlyNonPerishable: z.boolean().default(false),
});

export async function createShoppingList(input: z.input<typeof shoppingSchema>): Promise<ActionResult<{ id: number }>> {
  const parsed = shoppingSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const v = parsed.data;
  const db = await getDb();

  let from = v.from;
  let to = v.to ?? addDaysISO(v.from, 6);
  let multiplier = 1;
  let kind = "semanal";
  let name = v.name;
  if (v.mode === "semana") {
    to = addDaysISO(from, 6);
    name ||= `Semana del ${fmtDate(from)}`;
  } else if (v.mode === "mes") {
    from = startOfMonthISO(v.from);
    to = endOfMonthISO(v.from);
    kind = "mensual";
    name ||= `Mes de ${fmtMonth(from)}`;
  } else if (v.mode === "proyeccion") {
    to = addDaysISO(from, 6);
    multiplier = v.weeks ?? 4;
    kind = "mensual";
    name ||= `Proyección ${multiplier} semanas (base: ${fmtDate(from)})`;
  } else {
    kind = "personalizada";
    name ||= `Del ${fmtDate(from)} al ${fmtDate(to)}`;
  }

  const conds = [gte(mealPlanItems.date, from), lte(mealPlanItems.date, to)];
  if (!v.includeBaby) conds.push(eq(mealPlanItems.audience, "adult"));
  const plan = await db.query.mealPlanItems.findMany({
    where: and(...conds),
    with: { recipe: { with: { ingredients: { with: { food: true } } } } },
  });
  if (!plan.length) return fail("No hay comidas planificadas en ese período. Armá el plan semanal primero.");

  const need = new Map<number, { food: Food; grams: number }>();
  for (const item of plan) {
    const factor = item.servings / Math.max(0.1, item.recipe.servings);
    for (const ing of item.recipe.ingredients) {
      if (ing.optional) continue;
      const cur = need.get(ing.foodId) ?? { food: ing.food, grams: 0 };
      cur.grams += ing.grams * factor * multiplier;
      need.set(ing.foodId, cur);
    }
  }

  if (v.onlyNonPerishable) name = `${name} · no perecederos`;
  const [list] = await db
    .insert(shoppingLists)
    .values({ name: name!, kind, startDate: from, endDate: to, notes: multiplier > 1 ? `Cantidades × ${multiplier} semanas` : null })
    .returning({ id: shoppingLists.id });

  const FRESH = ["verduleria", "carniceria", "pescaderia", "panaderia"];
  const rows = [...need.values()]
    .filter((n) => n.grams > 0.5 && (!v.onlyNonPerishable || !FRESH.includes(n.food.store)))
    .map(({ food, grams }) => {
      const q = buyQuantity(food, grams);
      return {
        listId: list.id,
        foodId: food.id,
        name: food.name,
        store: food.isPantry ? food.store : food.store,
        category: food.category,
        grams: Math.round(grams),
        quantity: q.quantity,
        unit: q.unit,
        priceArs: q.cost != null ? Math.round(q.cost) : null,
        isPantry: food.isPantry,
      };
    })
    .sort((a, b) => (STORES[a.store]?.order ?? 9) - (STORES[b.store]?.order ?? 9) || a.category!.localeCompare(b.category!) || a.name.localeCompare(b.name))
    .map((r, i) => ({ ...r, sort: i }));
  if (rows.length) await db.insert(shoppingListItems).values(rows);
  refresh();
  return ok("Lista de compras generada", { id: list.id });
}

export async function toggleShoppingItem(id: number): Promise<ActionResult> {
  const db = await getDb();
  const [it] = await db.select({ checked: shoppingListItems.checked }).from(shoppingListItems).where(eq(shoppingListItems.id, id));
  if (!it) return fail("No encontrado");
  await db.update(shoppingListItems).set({ checked: !it.checked }).where(eq(shoppingListItems.id, id));
  refresh();
  return ok();
}

export async function addShoppingItem(listId: number, fd: FormData): Promise<ActionResult> {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return fail("Escribí qué querés comprar");
  const db = await getDb();
  await db.insert(shoppingListItems).values({
    listId,
    name,
    store: String(fd.get("store") ?? "supermercado"),
    quantity: parseNum(fd.get("quantity")),
    unit: String(fd.get("unit") ?? "").trim() || null,
    priceArs: parseNum(fd.get("priceArs")),
    isManual: true,
    sort: 9999,
  });
  refresh();
  return ok("Agregado a la lista");
}

export async function deleteShoppingItem(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
  refresh();
  return ok();
}

export async function setShoppingItemPrice(id: number, price: number | null, saveToFood: boolean): Promise<ActionResult> {
  const db = await getDb();
  const [it] = await db.select().from(shoppingListItems).where(eq(shoppingListItems.id, id));
  if (!it) return fail("No encontrado");
  await db.update(shoppingListItems).set({ priceArs: price }).where(eq(shoppingListItems.id, id));
  if (saveToFood && it.foodId && price != null && it.quantity) {
    const [food] = await db.select().from(foods).where(eq(foods.id, it.foodId));
    if (food) {
      // precio por unidad de compra (kg, paquete, docena…)
      let perUnit = price / it.quantity;
      if (food.buyUnit.startsWith("docena")) perUnit = (price / it.quantity) * 12;
      await db.update(foods).set({ priceArs: Math.round(perUnit) }).where(eq(foods.id, food.id));
    }
  }
  refresh();
  return ok("Precio guardado");
}

export async function resetShoppingList(listId: number): Promise<ActionResult> {
  const db = await getDb();
  await db.update(shoppingListItems).set({ checked: false }).where(eq(shoppingListItems.listId, listId));
  refresh();
  return ok("Lista reiniciada");
}

export async function completeShoppingList(listId: number): Promise<ActionResult> {
  const db = await getDb();
  await db.update(shoppingLists).set({ completedAt: new Date() }).where(eq(shoppingLists.id, listId));
  refresh();
  return ok("¡Compra terminada!");
}

export async function deleteShoppingList(listId: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(shoppingLists).where(eq(shoppingLists.id, listId));
  refresh();
  return ok("Lista eliminada");
}


/* ================================ Open Food Facts ================================ */

export async function searchProducts(query: string): Promise<ActionResult<OffProduct[]>> {
  if (query.trim().length < 2) return fail("Escribí al menos 2 letras o un código de barras");
  const results = await offSearch(query);
  if (!results.length) return fail("No encontré productos. Probá con otra búsqueda o cargalo a mano.");
  return ok(undefined, results);
}

/** Agrega un producto de Open Food Facts a tus alimentos (o devuelve el existente). */
export async function importProduct(p: OffProduct): Promise<ActionResult<FoodOptionLite>> {
  const db = await getDb();
  const slug = p.code ? `off-${p.code}` : null;
  if (slug) {
    const [existing] = await db.select().from(foods).where(eq(foods.slug, slug));
    if (existing) return ok("Ya estaba en tus alimentos", toOption(existing));
  }
  const grams = parseQuantityGrams(p.quantity);
  const name = p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? `${p.name} (${p.brand})` : p.name;
  const [food] = await db
    .insert(foods)
    .values({
      slug,
      name: name.slice(0, 120),
      category: "otros",
      store: "supermercado",
      kcal: p.kcal,
      protein: p.protein,
      carbs: p.carbs,
      fat: p.fat,
      fiber: p.fiber,
      buyUnit: grams ? "paquete" : "unidad",
      buyUnitGrams: grams ?? 100,
      unitName: grams && grams <= 400 ? "unidad" : null,
      unitGrams: grams && grams <= 400 ? grams : null,
      isCustom: true,
    })
    .returning();
  refresh();
  return ok("Producto agregado a tus alimentos", toOption(food));
}

type FoodOptionLite = {
  id: number;
  name: string;
  category: string;
  store: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  unitName: string | null;
  unitGrams: number | null;
  allergen: string | null;
  babyFromMonths: number | null;
};

function toOption(f: Food): FoodOptionLite {
  return {
    id: f.id,
    name: f.name,
    category: f.category,
    store: f.store,
    kcal: f.kcal,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    fiber: f.fiber,
    unitName: f.unitName,
    unitGrams: f.unitGrams,
    allergen: f.allergen,
    babyFromMonths: f.babyFromMonths,
  };
}

/** Cambia la cantidad de un registro del diario y recalcula sus macros. */
export async function updateFoodLogAmount(id: number, amount: number): Promise<ActionResult> {
  if (!(amount > 0 && amount <= 5000)) return fail("Cantidad inválida");
  const db = await getDb();
  const [log] = await db.select().from(foodLogs).where(eq(foodLogs.id, id));
  if (!log) return fail("Registro no encontrado");
  if (log.foodId && log.grams) {
    const [food] = await db.select().from(foods).where(eq(foods.id, log.foodId));
    if (!food) return fail("El alimento ya no existe");
    const m = roundMacros(macrosFor(food, amount));
    await db.update(foodLogs).set({ grams: amount, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat }).where(eq(foodLogs.id, id));
  } else if (log.servings) {
    const factor = amount / log.servings;
    await db
      .update(foodLogs)
      .set({
        servings: amount,
        kcal: Math.round(log.kcal * factor),
        protein: Math.round(log.protein * factor * 10) / 10,
        carbs: Math.round(log.carbs * factor * 10) / 10,
        fat: Math.round(log.fat * factor * 10) / 10,
      })
      .where(eq(foodLogs.id, id));
  } else {
    // registro rápido: la cantidad son las calorías
    const factor = log.kcal > 0 ? amount / log.kcal : 1;
    await db
      .update(foodLogs)
      .set({ kcal: Math.round(amount), protein: log.protein * factor, carbs: log.carbs * factor, fat: log.fat * factor })
      .where(eq(foodLogs.id, id));
  }
  refresh();
  return ok("Actualizado");
}
