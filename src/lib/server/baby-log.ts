import "server-only";
import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { babyFoodExposures, babyFoodLogs, recipeIngredients } from "@/db/schema";

export type BabyLogInput = {
  babyId: number;
  date: string;
  meal: string;
  recipeId?: number | null;
  foodId?: number | null;
  name: string;
  amount?: string | null;
  acceptance?: number | null;
  reaction?: string;
  reactionNotes?: string | null;
  notes?: string | null;
};

/**
 * Registra una comida del bebé y marca como "probados" todos los alimentos
 * involucrados (si es una receta, cada uno de sus ingredientes).
 */
export async function createBabyLog(db: DB, input: BabyLogInput) {
  const reaction = input.reaction ?? "ninguna";
  const [log] = await db
    .insert(babyFoodLogs)
    .values({
      babyId: input.babyId,
      date: input.date,
      meal: input.meal,
      recipeId: input.recipeId ?? null,
      foodId: input.foodId ?? null,
      name: input.name,
      amount: input.amount ?? null,
      acceptance: input.acceptance ?? null,
      reaction,
      reactionNotes: input.reactionNotes ?? null,
      notes: input.notes ?? null,
    })
    .returning({ id: babyFoodLogs.id });

  let foodIds: number[] = [];
  if (input.recipeId) {
    const ings = await db
      .select({ foodId: recipeIngredients.foodId })
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, input.recipeId));
    foodIds = ings.map((i) => i.foodId);
  } else if (input.foodId) {
    foodIds = [input.foodId];
  }
  foodIds = [...new Set(foodIds)];
  if (foodIds.length) {
    await db.insert(babyFoodExposures).values(
      foodIds.map((foodId) => ({
        babyId: input.babyId,
        logId: log.id,
        foodId,
        date: input.date,
        reaction,
        acceptance: input.acceptance ?? null,
      })),
    );
  }
  return log.id;
}
