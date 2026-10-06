"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { exercises, progressPhotos, routineExercises, routines, weightLogs, workoutSets, workouts } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { isISODate } from "@/lib/dates";
import { parseNum } from "@/lib/format";
import { estimateWorkoutKcal } from "@/lib/training";
import { getCurrentWeightKg } from "@/lib/data/settings";

function refresh() {
  revalidatePath("/", "layout");
}

const dateSchema = z.string().refine(isISODate, "Fecha inválida");

/* ================================ Sesiones ================================ */

const setSchema = z.object({
  exerciseId: z.number().int(),
  setNumber: z.number().int().min(1).max(50),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
  durationSec: z.number().int().min(0).max(86400).nullable().optional(),
  distanceKm: z.number().min(0).max(500).nullable().optional(),
});

const workoutSchema = z.object({
  id: z.number().int().optional(),
  date: dateSchema,
  type: z.string().min(1).max(30),
  title: z.string().trim().max(80).nullable().optional(),
  routineId: z.number().int().nullable().optional(),
  durationMin: z.number().int().min(1).max(600),
  intensity: z.enum(["baja", "media", "alta"]),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  kcalBurned: z.number().min(0).max(5000).nullable().optional(),
  kcalManual: z.boolean().default(false),
  notes: z.string().trim().max(1000).nullable().optional(),
  sets: z.array(setSchema).max(300).default([]),
});

export type WorkoutInput = z.input<typeof workoutSchema>;

export async function saveWorkout(input: WorkoutInput): Promise<ActionResult<{ id: number }>> {
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const v = parsed.data;
  const db = await getDb();
  const weight = (await getCurrentWeightKg()) ?? 75;
  const kcal = v.kcalManual && v.kcalBurned != null ? v.kcalBurned : estimateWorkoutKcal(v.type, v.intensity, weight, v.durationMin);
  const row = {
    date: v.date,
    type: v.type,
    title: v.title || null,
    routineId: v.routineId ?? null,
    durationMin: v.durationMin,
    intensity: v.intensity,
    rpe: v.rpe ?? null,
    kcalBurned: Math.round(kcal),
    kcalManual: v.kcalManual,
    notes: v.notes || null,
  };
  let id = v.id;
  if (id) {
    await db.update(workouts).set(row).where(eq(workouts.id, id));
    await db.delete(workoutSets).where(eq(workoutSets.workoutId, id));
  } else {
    const [ins] = await db.insert(workouts).values(row).returning({ id: workouts.id });
    id = ins.id;
  }
  if (v.sets.length) {
    await db.insert(workoutSets).values(v.sets.map((s, i) => ({ ...s, workoutId: id!, sort: i })));
  }
  refresh();
  return ok(`¡Entreno guardado! Quemaste ≈ ${Math.round(kcal)} kcal`, { id });
}

/** Registro en un toque: "fui al gym" (para el habit tracker). */
export async function quickWorkout(date: string, type = "fuerza", durationMin = 60): Promise<ActionResult> {
  if (!isISODate(date)) return fail("Fecha inválida");
  const db = await getDb();
  const weight = (await getCurrentWeightKg()) ?? 75;
  const kcal = estimateWorkoutKcal(type, "media", weight, durationMin);
  await db.insert(workouts).values({ date, type, durationMin, intensity: "media", kcalBurned: kcal, title: "Entreno rápido" });
  refresh();
  return ok(`¡Bien ahí! +${kcal} kcal para comer hoy`);
}

export async function deleteWorkout(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(workouts).where(eq(workouts.id, id));
  refresh();
  return ok("Entreno eliminado");
}

/* ================================ Peso ================================ */

export async function saveWeight(fd: FormData): Promise<ActionResult> {
  const date = String(fd.get("date") ?? "");
  const weightKg = parseNum(fd.get("weightKg"));
  if (!isISODate(date)) return fail("Fecha inválida");
  if (!weightKg || weightKg < 20 || weightKg > 400) return fail("Peso inválido");
  const values = {
    weightKg,
    bodyFatPct: parseNum(fd.get("bodyFatPct")),
    waistCm: parseNum(fd.get("waistCm")),
    hipCm: parseNum(fd.get("hipCm")),
    chestCm: parseNum(fd.get("chestCm")),
    armCm: parseNum(fd.get("armCm")),
    thighCm: parseNum(fd.get("thighCm")),
    notes: String(fd.get("notes") ?? "").trim() || null,
  };
  const db = await getDb();
  await db.insert(weightLogs).values({ date, ...values }).onConflictDoUpdate({ target: weightLogs.date, set: values });
  refresh();
  return ok("Peso registrado");
}

export async function deleteWeight(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(weightLogs).where(eq(weightLogs.id, id));
  refresh();
  return ok("Registro eliminado");
}

/* ================================ Rutinas y ejercicios ================================ */

const routineSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(2, "Poné un nombre").max(80),
  description: z.string().trim().max(500).nullable().optional(),
  workoutType: z.string().min(1).max(30),
  estMinutes: z.number().int().min(5).max(300).nullable().optional(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.number().int(),
        sets: z.number().int().min(1).max(20),
        reps: z.string().trim().min(1).max(40),
        restSec: z.number().int().min(0).max(900).nullable().optional(),
        notes: z.string().trim().max(200).nullable().optional(),
      }),
    )
    .min(1, "Agregá al menos un ejercicio"),
});

export type RoutineInput = z.input<typeof routineSchema>;

export async function saveRoutine(input: RoutineInput): Promise<ActionResult<{ id: number }>> {
  const parsed = routineSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const v = parsed.data;
  const db = await getDb();
  const row = { name: v.name, description: v.description || null, workoutType: v.workoutType, estMinutes: v.estMinutes ?? null };
  let id = v.id;
  if (id) {
    await db.update(routines).set(row).where(eq(routines.id, id));
    await db.delete(routineExercises).where(eq(routineExercises.routineId, id));
  } else {
    const [ins] = await db.insert(routines).values(row).returning({ id: routines.id });
    id = ins.id;
  }
  await db.insert(routineExercises).values(
    v.exercises.map((e, i) => ({ routineId: id!, exerciseId: e.exerciseId, sets: e.sets, reps: e.reps, restSec: e.restSec ?? 90, notes: e.notes || null, sort: i })),
  );
  refresh();
  return ok("Rutina guardada", { id });
}

export async function archiveRoutine(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.update(routines).set({ archived: true }).where(eq(routines.id, id));
  refresh();
  return ok("Rutina eliminada");
}

export async function createExercise(fd: FormData): Promise<ActionResult<{ id: number }>> {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return fail("Poné un nombre");
  const db = await getDb();
  const [dup] = await db.select().from(exercises).where(and(eq(exercises.name, name)));
  if (dup) return ok("Ya existía", { id: dup.id });
  const [ins] = await db
    .insert(exercises)
    .values({
      name,
      muscleGroup: String(fd.get("muscleGroup") ?? "general") || "general",
      equipment: String(fd.get("equipment") ?? "").trim() || null,
      kind: String(fd.get("kind") ?? "fuerza") || "fuerza",
      isCustom: true,
    })
    .returning({ id: exercises.id });
  refresh();
  return ok("Ejercicio creado", { id: ins.id });
}

/* ================================ Fotos de progreso ================================ */

const POSES = ["frente", "perfil", "espalda"] as const;
const MAX_PHOTO_BYTES = 900 * 1024;

export async function uploadProgressPhoto(fd: FormData): Promise<ActionResult> {
  const file = fd.get("photo");
  const date = String(fd.get("date") ?? "");
  const pose = String(fd.get("pose") ?? "frente");
  if (!(file instanceof Blob) || file.size === 0) return fail("Elegí una foto");
  if (!["image/jpeg", "image/webp", "image/png"].includes(file.type)) return fail("Formato de imagen no soportado");
  if (file.size > MAX_PHOTO_BYTES) return fail("La foto es demasiado grande");
  if (!isISODate(date)) return fail("Fecha inválida");
  if (!(POSES as readonly string[]).includes(pose)) return fail("Pose inválida");
  const width = Math.round(parseNum(fd.get("width")) ?? 0) || null;
  const height = Math.round(parseNum(fd.get("height")) ?? 0) || null;
  const db = await getDb();
  await db.insert(progressPhotos).values({
    date,
    pose,
    mime: file.type,
    data: Buffer.from(await file.arrayBuffer()).toString("base64"),
    width,
    height,
    bytes: file.size,
  });
  refresh();
  return ok("Foto guardada");
}

export async function deleteProgressPhoto(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(progressPhotos).where(eq(progressPhotos.id, id));
  refresh();
  return ok("Foto eliminada");
}
