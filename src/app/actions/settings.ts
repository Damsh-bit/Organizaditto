"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { babies, habitChecks, habits, settings, weightLogs } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { isISODate, todayISO } from "@/lib/dates";
import { parseNum } from "@/lib/format";
import { DEFAULT_MEAL_SPLIT } from "@/lib/constants";
import { importAll } from "@/lib/server/backup";
import { parseBackup, readAutoBackup, restorePhotosIfEmpty, writeAutoBackup } from "@/lib/server/auto-backup";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function dateOrNull(fd: FormData, key: string) {
  const v = str(fd, key);
  return v && isISODate(v) ? v : null;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function completeOnboarding(fd: FormData): Promise<ActionResult> {
  const db = await getDb();
  const sex = str(fd, "sex");
  const heightCm = parseNum(fd.get("heightCm"));
  const weight = parseNum(fd.get("weightKg"));
  const birthDate = dateOrNull(fd, "birthDate");
  if (!sex || !heightCm || !weight || !birthDate) return fail("Completá sexo, fecha de nacimiento, altura y peso.");

  await db
    .update(settings)
    .set({
      name: str(fd, "name"),
      sex: sex as "male" | "female",
      birthDate,
      heightCm,
      startWeightKg: weight,
      goalWeightKg: parseNum(fd.get("goalWeightKg")),
      activityLevel: str(fd, "activityLevel") ?? "light",
      deficitKcal: parseNum(fd.get("deficitKcal")) ?? 500,
      hourlyRateUsd: parseNum(fd.get("hourlyRateUsd")) ?? 6,
      onboarded: true,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));

  const today = todayISO();
  await db
    .insert(weightLogs)
    .values({ date: today, weightKg: weight })
    .onConflictDoUpdate({ target: weightLogs.date, set: { weightKg: weight } });

  const babyName = str(fd, "babyName");
  if (babyName) {
    const [existing] = await db.select().from(babies).limit(1);
    const values = {
      name: babyName,
      birthDate: dateOrNull(fd, "babyBirthDate"),
      sex: str(fd, "babySex"),
      solidsStartDate: dateOrNull(fd, "babySolidsDate"),
    };
    if (existing) await db.update(babies).set(values).where(eq(babies.id, existing.id));
    else await db.insert(babies).values(values);
  }
  refresh();
  return ok("¡Listo! Tu perfil quedó configurado.");
}

export async function saveProfile(fd: FormData): Promise<ActionResult> {
  const db = await getDb();
  const sex = str(fd, "sex");
  await db
    .update(settings)
    .set({
      name: str(fd, "name"),
      sex: sex === "male" || sex === "female" ? sex : null,
      birthDate: dateOrNull(fd, "birthDate"),
      heightCm: parseNum(fd.get("heightCm")),
      startWeightKg: parseNum(fd.get("startWeightKg")),
      goalWeightKg: parseNum(fd.get("goalWeightKg")),
      activityLevel: str(fd, "activityLevel") ?? "light",
      onboarded: true,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  refresh();
  return ok("Perfil guardado");
}

export async function saveNutritionSettings(fd: FormData): Promise<ActionResult> {
  const db = await getDb();
  const split: Record<string, number> = {};
  let total = 0;
  for (const meal of ["desayuno", "almuerzo", "merienda", "cena", "snack"]) {
    const v = parseNum(fd.get(`split_${meal}`));
    if (v && v > 0) {
      split[meal] = v;
      total += v;
    }
  }
  const mealSplit = total > 0 ? Object.fromEntries(Object.entries(split).map(([k, v]) => [k, v / total])) : DEFAULT_MEAL_SPLIT;
  const override = parseNum(fd.get("targetKcalOverride"));
  await db
    .update(settings)
    .set({
      deficitKcal: Math.round(parseNum(fd.get("deficitKcal")) ?? 500),
      targetKcalOverride: override && override > 0 ? Math.round(override) : null,
      proteinPerKg: parseNum(fd.get("proteinPerKg")) ?? 1.8,
      fatPct: Math.round(parseNum(fd.get("fatPct")) ?? 28),
      exerciseEatBackPct: Math.round(parseNum(fd.get("exerciseEatBackPct")) ?? 50),
      waterGoalMl: Math.round(parseNum(fd.get("waterGoalMl")) ?? 2500),
      mealSplit,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  refresh();
  return ok("Objetivos de nutrición guardados");
}

/** Fija el objetivo calórico (null = volver al cálculo por fórmula). */
export async function setTargetKcal(kcal: number | null): Promise<ActionResult> {
  if (kcal != null && (!Number.isFinite(kcal) || kcal < 1000 || kcal > 6000)) return fail("Objetivo fuera de rango");
  const db = await getDb();
  await db
    .update(settings)
    .set({ targetKcalOverride: kcal == null ? null : Math.round(kcal), updatedAt: new Date() })
    .where(eq(settings.id, 1));
  refresh();
  return ok(kcal == null ? "Volviste al objetivo por fórmula" : `Nuevo objetivo: ${Math.round(kcal)} kcal`);
}

export async function saveTrainingSettings(fd: FormData): Promise<ActionResult> {
  const db = await getDb();
  await db
    .update(settings)
    .set({
      gymDaysPerWeek: Math.round(parseNum(fd.get("gymDaysPerWeek")) ?? 4),
      weighInDay: Math.round(parseNum(fd.get("weighInDay")) ?? 1),
      stepsGoal: Math.max(1000, Math.round(parseNum(fd.get("stepsGoal")) ?? 8000)),
      sleepGoalHours: Math.min(12, Math.max(5, parseNum(fd.get("sleepGoalHours")) ?? 7.5)),
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  refresh();
  return ok("Preferencias de entrenamiento guardadas");
}

export async function saveWorkSettings(fd: FormData): Promise<ActionResult> {
  const db = await getDb();
  const rate = parseNum(fd.get("hourlyRateUsd"));
  if (!rate || rate <= 0) return fail("La tarifa por hora tiene que ser mayor a 0");
  await db
    .update(settings)
    .set({
      hourlyRateUsd: rate,
      workHoursGoalWeek: parseNum(fd.get("workHoursGoalWeek")) ?? 40,
      workDaysGoalWeek: Math.round(parseNum(fd.get("workDaysGoalWeek")) ?? 5),
      rateSource: str(fd, "rateSource") ?? "wallbit",
      rateSide: str(fd, "rateSide") ?? "compra",
      manualRate: parseNum(fd.get("manualRate")),
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  refresh();
  return ok("Preferencias de trabajo guardadas");
}

export async function saveBaby(fd: FormData): Promise<ActionResult> {
  const db = await getDb();
  const name = str(fd, "name");
  if (!name) return fail("Poné el nombre del bebé");
  const values = {
    name,
    birthDate: dateOrNull(fd, "birthDate"),
    sex: str(fd, "sex"),
    solidsStartDate: dateOrNull(fd, "solidsStartDate"),
    notes: str(fd, "notes"),
  };
  const [existing] = await db.select().from(babies).limit(1);
  if (existing) await db.update(babies).set(values).where(eq(babies.id, existing.id));
  else await db.insert(babies).values(values);
  refresh();
  return ok("Datos del bebé guardados");
}

/* ----------------------------- Hábitos ----------------------------- */

export async function addHabit(fd: FormData): Promise<ActionResult> {
  const db = await getDb();
  const name = str(fd, "name");
  if (!name) return fail("Escribí el hábito");
  await db.insert(habits).values({
    name,
    emoji: str(fd, "emoji") ?? "✅",
    targetPerWeek: Math.min(7, Math.max(1, Math.round(parseNum(fd.get("targetPerWeek")) ?? 7))),
  });
  refresh();
  return ok("Hábito agregado");
}

export async function archiveHabit(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.update(habits).set({ archived: true }).where(eq(habits.id, id));
  refresh();
  return ok("Hábito archivado");
}

export async function toggleHabit(habitId: number, date: string): Promise<ActionResult> {
  if (!isISODate(date)) return fail("Fecha inválida");
  const db = await getDb();
  const deleted = await db
    .delete(habitChecks)
    .where(and(eq(habitChecks.habitId, habitId), eq(habitChecks.date, date)))
    .returning();
  if (!deleted.length) await db.insert(habitChecks).values({ habitId, date }).onConflictDoNothing();
  refresh();
  return ok();
}

/* ----------------------------- Backup ----------------------------- */

export async function importBackup(fd: FormData): Promise<ActionResult> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Elegí un archivo de backup (.json o .json.gz)");
  if (file.size > 50 * 1024 * 1024) return fail("El archivo es demasiado grande");
  try {
    const payload = parseBackup(Buffer.from(await file.arrayBuffer()));
    const db = await getDb();
    const total = await importAll(db, payload);
    refresh();
    return ok(`Backup restaurado (${total} registros)`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "No se pudo importar");
  }
}

export async function backupNow(): Promise<ActionResult> {
  try {
    const f = await writeAutoBackup();
    refresh();
    return ok(`Backup guardado (${Math.max(1, Math.round(f.bytes / 1024))} KB)`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "No se pudo hacer el backup");
  }
}

export async function restoreAutoBackup(name: string): Promise<ActionResult> {
  try {
    const payload = await readAutoBackup(name);
    // Por las dudas, antes de pisar todo se guarda el estado actual como backup de hoy.
    await writeAutoBackup();
    const db = await getDb();
    const total = await importAll(db, payload);
    const photos = await restorePhotosIfEmpty(db);
    refresh();
    return ok(`Backup restaurado (${total} registros${photos ? ` y ${photos} fotos` : ""})`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "No se pudo restaurar");
  }
}
