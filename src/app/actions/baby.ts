"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { babies, babyFoodLogs, foods, mealPlanItems, recipes } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { isISODate } from "@/lib/dates";
import { createBabyLog } from "@/lib/server/baby-log";

function refresh() {
  revalidatePath("/", "layout");
}

const schema = z.object({
  date: z.string().refine(isISODate, "Fecha inválida"),
  meal: z.enum(["desayuno", "almuerzo", "merienda", "cena", "snack"]),
  recipeId: z.number().int().nullable().optional(),
  foodId: z.number().int().nullable().optional(),
  amount: z.string().trim().max(60).nullable().optional(),
  acceptance: z.number().int().min(1).max(5).nullable().optional(),
  reaction: z.enum(["ninguna", "leve", "moderada", "grave"]).default("ninguna"),
  reactionNotes: z.string().trim().max(300).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
});

export type BabyLogInput = z.input<typeof schema>;

export async function addBabyLog(input: BabyLogInput): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const v = parsed.data;
  if (!v.recipeId && !v.foodId) return fail("Elegí una receta o un alimento");
  const db = await getDb();
  const [baby] = await db.select().from(babies).limit(1);
  if (!baby) return fail("Primero cargá los datos del bebé en Ajustes");
  let name = "";
  if (v.recipeId) {
    const [r] = await db.select({ name: recipes.name }).from(recipes).where(eq(recipes.id, v.recipeId));
    name = r?.name ?? "Receta";
  } else if (v.foodId) {
    const [f] = await db.select({ name: foods.name }).from(foods).where(eq(foods.id, v.foodId));
    name = f?.name ?? "Alimento";
  }
  await createBabyLog(db, { babyId: baby.id, ...v, name });
  refresh();
  return ok(v.reaction !== "ninguna" ? "Registrado. Si la reacción empeora, consultá al pediatra." : "¡Registrado!");
}

export async function deleteBabyLog(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.update(mealPlanItems).set({ done: false, logId: null }).where(and(eq(mealPlanItems.logId, id), eq(mealPlanItems.audience, "baby")));
  await db.delete(babyFoodLogs).where(eq(babyFoodLogs.id, id));
  refresh();
  return ok("Registro eliminado");
}
