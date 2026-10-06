import "server-only";
import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { DB } from "@/db";
import * as s from "@/db/schema";

/** Orden de inserción respetando las claves foráneas. */
export const BACKUP_TABLES: [string, PgTable][] = [
  ["settings", s.settings],
  ["foods", s.foods],
  ["recipes", s.recipes],
  ["recipe_ingredients", s.recipeIngredients],
  ["food_logs", s.foodLogs],
  ["daily_metrics", s.dailyMetrics],
  ["meal_plan_items", s.mealPlanItems],
  ["menu_templates", s.menuTemplates],
  ["shopping_lists", s.shoppingLists],
  ["shopping_list_items", s.shoppingListItems],
  ["exercises", s.exercises],
  ["routines", s.routines],
  ["routine_exercises", s.routineExercises],
  ["workouts", s.workouts],
  ["workout_sets", s.workoutSets],
  ["weight_logs", s.weightLogs],
  ["habits", s.habits],
  ["habit_checks", s.habitChecks],
  ["work_logs", s.workLogs],
  ["payouts", s.payouts],
  ["exchange_rates", s.exchangeRates],
  ["babies", s.babies],
  ["baby_food_logs", s.babyFoodLogs],
  ["baby_food_exposures", s.babyFoodExposures],
  ["baby_measurements", s.babyMeasurements],
  ["baby_vaccines", s.babyVaccines],
  ["baby_questions", s.babyQuestions],
];

const SERIAL_TABLES = BACKUP_TABLES.map(([n]) => n).filter((n) => !["settings", "daily_metrics", "habit_checks"].includes(n));

export async function exportAll(db: DB) {
  const data: Record<string, unknown[]> = {};
  for (const [name, table] of BACKUP_TABLES) {
    data[name] = await db.select().from(table);
  }
  return { app: "organizaditto", version: 1, exportedAt: new Date().toISOString(), data };
}

const DATE_KEYS = /(At)$/;

function revive(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = DATE_KEYS.test(k) && typeof v === "string" ? new Date(v) : v;
  }
  return out;
}

export async function importAll(db: DB, payload: unknown) {
  const p = payload as { app?: string; data?: Record<string, Record<string, unknown>[]> };
  if (p?.app !== "organizaditto" || !p.data) throw new Error("El archivo no es un backup de Organizaditto");

  for (const [, table] of [...BACKUP_TABLES].reverse()) {
    await db.delete(table);
  }
  let total = 0;
  for (const [name, table] of BACKUP_TABLES) {
    const rows = (p.data[name] ?? []).map(revive);
    for (let i = 0; i < rows.length; i += 400) {
      const chunk = rows.slice(i, i + 400);
      if (chunk.length) await db.insert(table).values(chunk as never);
    }
    total += rows.length;
  }
  for (const name of SERIAL_TABLES) {
    await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('${name}', 'id'), COALESCE((SELECT MAX(id) FROM ${name}), 0) + 1, false)`));
  }
  return total;
}
