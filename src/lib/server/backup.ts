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
  ["progress_photos", s.progressPhotos],
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

/** Exporta todas las tablas (o solo `only`, menos `exclude`). */
export async function exportAll(db: DB, opts: { only?: string[]; exclude?: string[] } = {}) {
  const data: Record<string, unknown[]> = {};
  for (const [name, table] of BACKUP_TABLES) {
    if (opts.only && !opts.only.includes(name)) continue;
    if (opts.exclude?.includes(name)) continue;
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

/**
 * Reemplaza las tablas que vienen en el backup. Las que no vienen (por ejemplo, las fotos en los backups
 * diarios) quedan como están.
 */
export async function importAll(db: DB, payload: unknown) {
  const p = payload as { app?: string; data?: Record<string, Record<string, unknown>[]> };
  if (p?.app !== "organizaditto" || !p.data) throw new Error("El archivo no es un backup de Organizaditto");
  const data = p.data;
  const tables = BACKUP_TABLES.filter(([name]) => Array.isArray(data[name]));

  for (const [, table] of [...tables].reverse()) {
    await db.delete(table);
  }
  let total = 0;
  for (const [name, table] of tables) {
    const rows = data[name].map(revive);
    // Las fotos pesan: de a pocas por consulta.
    const size = name === "progress_photos" ? 5 : 400;
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size);
      if (chunk.length) await db.insert(table).values(chunk as never);
    }
    total += rows.length;
  }
  for (const name of SERIAL_TABLES.filter((n) => Array.isArray(data[n]))) {
    await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('${name}', 'id'), COALESCE((SELECT MAX(id) FROM ${name}), 0) + 1, false)`));
  }
  return total;
}
