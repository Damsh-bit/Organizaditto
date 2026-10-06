"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { babies, babyFoodLogs, babyMeasurements, babyQuestions, babyVaccines, foods, mealPlanItems, recipes } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { isISODate, todayISO } from "@/lib/dates";
import { parseNum } from "@/lib/format";
import { VACCINE_SCHEDULE, vaccineRows } from "@/lib/baby-vaccines";
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

/* ----------------------------- Salud ----------------------------- */

async function currentBaby() {
  const db = await getDb();
  const [baby] = await db.select().from(babies).orderBy(babies.id).limit(1);
  return { db, baby };
}

function text(fd: FormData, key: string, max = 500) {
  const v = String(fd.get(key) ?? "").trim();
  return v ? v.slice(0, max) : null;
}

/** Acepta el peso en kg ("7,25") o en gramos ("7250"). */
function babyWeightKg(v: number | null) {
  if (v == null || v <= 0) return null;
  return v > 40 ? v / 1000 : v;
}

export async function saveMeasurement(fd: FormData): Promise<ActionResult> {
  const { db, baby } = await currentBaby();
  if (!baby) return fail("Primero cargá los datos del bebé en Ajustes");
  const date = String(fd.get("date") ?? "");
  if (!isISODate(date) || date > todayISO()) return fail("Fecha inválida");
  const weightKg = babyWeightKg(parseNum(fd.get("weightKg")));
  const lengthCm = parseNum(fd.get("lengthCm"));
  const headCm = parseNum(fd.get("headCm"));
  if (!weightKg && !lengthCm && !headCm) return fail("Cargá al menos el peso, la talla o el perímetro cefálico");
  if (weightKg && (weightKg < 1 || weightKg > 25)) return fail("Revisá el peso (en kg, por ejemplo 7,25)");
  if (lengthCm && (lengthCm < 35 || lengthCm > 110)) return fail("Revisá la talla (en cm)");
  if (headCm && (headCm < 25 || headCm > 60)) return fail("Revisá el perímetro cefálico (en cm)");
  const values = {
    weightKg,
    lengthCm: lengthCm || null,
    headCm: headCm || null,
    isCheckup: fd.get("isCheckup") === "on",
    notes: text(fd, "notes"),
  };
  await db
    .insert(babyMeasurements)
    .values({ babyId: baby.id, date, ...values })
    .onConflictDoUpdate({ target: [babyMeasurements.babyId, babyMeasurements.date], set: values });
  refresh();
  return ok("Medición guardada");
}

export async function deleteMeasurement(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(babyMeasurements).where(eq(babyMeasurements.id, id));
  refresh();
  return ok("Medición eliminada");
}

export async function markVaccine(code: string, date: string): Promise<ActionResult> {
  const dose = VACCINE_SCHEDULE.find((v) => v.code === code);
  if (!dose) return fail("Vacuna desconocida");
  if (!isISODate(date) || date > todayISO()) return fail("Fecha inválida");
  const { db, baby } = await currentBaby();
  if (!baby) return fail("Primero cargá los datos del bebé en Ajustes");
  await db.delete(babyVaccines).where(and(eq(babyVaccines.babyId, baby.id), eq(babyVaccines.code, code)));
  await db.insert(babyVaccines).values({ babyId: baby.id, code, name: `${dose.name} (${dose.dose.toLowerCase()})`, date });
  refresh();
  return ok(`${dose.name}: ${dose.dose.toLowerCase()} registrada`);
}

export async function addExtraVaccine(fd: FormData): Promise<ActionResult> {
  const { db, baby } = await currentBaby();
  if (!baby) return fail("Primero cargá los datos del bebé en Ajustes");
  const name = text(fd, "name", 120);
  const date = String(fd.get("date") ?? "");
  if (!name) return fail("Escribí el nombre de la vacuna");
  if (!isISODate(date) || date > todayISO()) return fail("Fecha inválida");
  await db.insert(babyVaccines).values({ babyId: baby.id, code: null, name, date, notes: text(fd, "notes") });
  refresh();
  return ok("Vacuna registrada");
}

export async function deleteVaccine(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(babyVaccines).where(eq(babyVaccines.id, id));
  refresh();
  return ok("Vacuna quitada");
}

export async function addQuestion(fd: FormData): Promise<ActionResult> {
  const { db, baby } = await currentBaby();
  if (!baby) return fail("Primero cargá los datos del bebé en Ajustes");
  const q = text(fd, "text", 300);
  if (!q) return fail("Escribí la pregunta");
  await db.insert(babyQuestions).values({ babyId: baby.id, text: q });
  refresh();
  return ok("Anotada para el próximo control");
}

export async function toggleQuestion(id: number): Promise<ActionResult> {
  const db = await getDb();
  const [q] = await db.select({ done: babyQuestions.done }).from(babyQuestions).where(eq(babyQuestions.id, id));
  if (!q) return fail("No existe");
  await db.update(babyQuestions).set({ done: !q.done }).where(eq(babyQuestions.id, id));
  refresh();
  return ok();
}

export async function deleteQuestion(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(babyQuestions).where(eq(babyQuestions.id, id));
  refresh();
  return ok();
}

/** Carga de una vez las dosis que ya le tocaban (con la fecha recomendada; después se corrigen). */
export async function markAllDueVaccines(): Promise<ActionResult> {
  const { db, baby } = await currentBaby();
  if (!baby?.birthDate) return fail("Cargá la fecha de nacimiento del bebé en Ajustes");
  const today = todayISO();
  const applied = await db.select().from(babyVaccines).where(eq(babyVaccines.babyId, baby.id));
  const due = vaccineRows(baby.birthDate, today, applied).filter((v) => !v.optional && (v.status === "toca" || v.status === "atrasada"));
  if (!due.length) return ok("No hay dosis pendientes");
  await db.insert(babyVaccines).values(
    due.map((v) => ({ babyId: baby.id, code: v.code, name: `${v.name} (${v.dose.toLowerCase()})`, date: v.dueDate < today ? v.dueDate : today })),
  );
  refresh();
  return ok(`${due.length} dosis marcadas como aplicadas`);
}
