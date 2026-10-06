import { eq } from "drizzle-orm";
import type { DB } from "../client";
import {
  exercises,
  foods,
  habits,
  menuTemplates,
  recipeIngredients,
  recipes,
  routineExercises,
  routines,
  settings,
} from "../schema";
import { recipePerServing, roundMacros } from "@/lib/nutrition";
import { DEFAULT_MEAL_SPLIT } from "@/lib/constants";
import { FOODS } from "./foods";
import { ADULT_RECIPES, type RecipeSeed } from "./recipes";
import { BABY_RECIPES } from "./baby-recipes";
import { EXTRA_RECIPES } from "./recipes-extra";
import { DEFAULT_HABITS, EXERCISES, ROUTINES } from "./training";
import { BABY_MENUS, MENUS } from "./menus";

/** Subir este número cuando se agreguen datos nuevos al seed. */
export const SEED_VERSION = 2;

export async function ensureSeed(db: DB) {
  let [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (!row) {
    await db.insert(settings).values({ id: 1, mealSplit: DEFAULT_MEAL_SPLIT }).onConflictDoNothing();
    [row] = await db.select().from(settings).where(eq(settings.id, 1));
  }
  if (row.seedVersion >= SEED_VERSION) return;
  const firstRun = row.seedVersion === 0;

  // Alimentos (no pisa ediciones del usuario: solo inserta slugs nuevos)
  await db.insert(foods).values(FOODS).onConflictDoNothing({ target: foods.slug });
  const allFoods = await db
    .select({ id: foods.id, slug: foods.slug, kcal: foods.kcal, protein: foods.protein, carbs: foods.carbs, fat: foods.fat, fiber: foods.fiber })
    .from(foods);
  const foodBySlug = new Map(allFoods.filter((f) => f.slug).map((f) => [f.slug!, f]));

  // Recetas
  const existingRecipes = new Set(
    (await db.select({ slug: recipes.slug }).from(recipes)).map((r) => r.slug),
  );
  const newRecipes = [...ADULT_RECIPES, ...EXTRA_RECIPES, ...BABY_RECIPES].filter((r) => !existingRecipes.has(r.slug));
  if (newRecipes.length) {
    const rows = newRecipes.map((r) => recipeRow(r, foodBySlug));
    // onConflictDoNothing + returning: si otra instancia sembró en paralelo, solo seguimos con lo que insertamos nosotros
    const inserted = await db
      .insert(recipes)
      .values(rows)
      .onConflictDoNothing({ target: recipes.slug })
      .returning({ id: recipes.id, slug: recipes.slug });
    const idBySlug = new Map(inserted.map((r) => [r.slug!, r.id]));
    const ingRows = newRecipes.filter((r) => idBySlug.has(r.slug)).flatMap((r) =>
      r.ingredients
        .filter(([slug]) => foodBySlug.has(slug))
        .map(([slug, grams, note], i) => ({
          recipeId: idBySlug.get(r.slug)!,
          foodId: foodBySlug.get(slug)!.id,
          grams,
          note: note ?? null,
          sort: i,
        })),
    );
    if (ingRows.length) await db.insert(recipeIngredients).values(ingRows);
  }

  // Ejercicios y rutinas
  await db.insert(exercises).values(EXERCISES).onConflictDoNothing({ target: exercises.slug });
  const allEx = await db.select({ id: exercises.id, slug: exercises.slug }).from(exercises);
  const exBySlug = new Map(allEx.map((e) => [e.slug, e.id]));
  const existingRoutines = new Set((await db.select({ slug: routines.slug }).from(routines)).map((r) => r.slug));
  for (const r of ROUTINES.filter((r) => !existingRoutines.has(r.slug))) {
    const [ins] = await db
      .insert(routines)
      .values({ slug: r.slug, name: r.name, description: r.description, workoutType: r.workoutType, estMinutes: r.estMinutes })
      .onConflictDoNothing({ target: routines.slug })
      .returning({ id: routines.id });
    if (!ins) continue;
    const exRows = r.exercises
      .filter(([slug]) => exBySlug.has(slug))
      .map(([slug, sets, reps, restSec], i) => ({
        routineId: ins.id,
        exerciseId: exBySlug.get(slug)!,
        sets,
        reps,
        restSec: restSec ?? 90,
        sort: i,
      }));
    if (exRows.length) await db.insert(routineExercises).values(exRows);
  }

  // Menús semanales
  await db
    .insert(menuTemplates)
    .values([...MENUS, ...BABY_MENUS].map((m) => ({ ...m })))
    .onConflictDoNothing({ target: menuTemplates.slug });

  if (firstRun) {
    const [anyHabit] = await db.select({ id: habits.id }).from(habits).limit(1);
    if (!anyHabit) await db.insert(habits).values(DEFAULT_HABITS.map((h, i) => ({ ...h, sort: i })));
  }

  await db.update(settings).set({ seedVersion: SEED_VERSION }).where(eq(settings.id, 1));
}

type FoodMacro = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

function recipeRow(r: RecipeSeed, foodBySlug: Map<string, FoodMacro & { id: number }>) {
  const ingredients = r.ingredients
    .filter(([slug]) => foodBySlug.has(slug))
    .map(([slug, grams]) => ({ grams, food: foodBySlug.get(slug)! }));
  const m = roundMacros(recipePerServing(ingredients, r.servings));
  return {
    slug: r.slug,
    name: r.name,
    description: r.description,
    audience: r.audience ?? "adult",
    mealTypes: r.mealTypes,
    tags: r.tags,
    servings: r.servings,
    prepMinutes: r.prep,
    cookMinutes: r.cook,
    difficulty: r.difficulty ?? "fácil",
    steps: r.steps,
    tips: r.tips ?? null,
    storage: r.storage ?? null,
    emoji: r.emoji,
    babyMinMonths: r.babyMinMonths ?? null,
    babyTexture: r.babyTexture ?? null,
    ...m,
  };
}
