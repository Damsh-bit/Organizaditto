import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { exercises, routineExercises, routines, weightLogs, workoutSets, workouts } from "@/db/schema";

export async function getWeightLogs(from?: string, to?: string) {
  const db = await getDb();
  const conds = [];
  if (from) conds.push(gte(weightLogs.date, from));
  if (to) conds.push(lte(weightLogs.date, to));
  return db
    .select()
    .from(weightLogs)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(weightLogs.date));
}

export async function getWorkouts(from: string, to: string) {
  const db = await getDb();
  return db.query.workouts.findMany({
    where: and(gte(workouts.date, from), lte(workouts.date, to)),
    with: { sets: { with: { exercise: true }, orderBy: [asc(workoutSets.sort), asc(workoutSets.setNumber)] }, routine: true },
    orderBy: [desc(workouts.date), desc(workouts.id)],
  });
}

export async function getRecentWorkouts(limit = 30) {
  const db = await getDb();
  return db.query.workouts.findMany({
    with: { sets: { with: { exercise: true } }, routine: true },
    orderBy: [desc(workouts.date), desc(workouts.id)],
    limit,
  });
}

export async function getWorkout(id: number) {
  const db = await getDb();
  const w = await db.query.workouts.findFirst({
    where: eq(workouts.id, id),
    with: { sets: { with: { exercise: true }, orderBy: [asc(workoutSets.sort), asc(workoutSets.setNumber)] }, routine: true },
  });
  return w ?? null;
}

export type WorkoutFull = NonNullable<Awaited<ReturnType<typeof getWorkout>>>;

/** Resumen por día: cantidad de sesiones, minutos y kcal. */
export async function getWorkoutDays(from: string, to: string) {
  const db = await getDb();
  const rows = await db
    .select({
      date: workouts.date,
      count: sql<number>`count(*)`.mapWith(Number),
      minutes: sql<number>`sum(${workouts.durationMin})`.mapWith(Number),
      kcal: sql<number>`sum(${workouts.kcalBurned})`.mapWith(Number),
      types: sql<string>`string_agg(distinct ${workouts.type}, ',')`,
    })
    .from(workouts)
    .where(and(gte(workouts.date, from), lte(workouts.date, to)))
    .groupBy(workouts.date);
  return new Map(rows.map((r) => [r.date, { ...r, types: r.types ? r.types.split(",") : [] }]));
}

export async function listRoutines() {
  const db = await getDb();
  return db.query.routines.findMany({
    where: eq(routines.archived, false),
    with: { exercises: { with: { exercise: true }, orderBy: [asc(routineExercises.sort)] } },
    orderBy: [asc(routines.id)],
  });
}

export async function getRoutine(id: number) {
  const db = await getDb();
  const r = await db.query.routines.findFirst({
    where: eq(routines.id, id),
    with: { exercises: { with: { exercise: true }, orderBy: [asc(routineExercises.sort)] } },
  });
  return r ?? null;
}

export type RoutineFull = NonNullable<Awaited<ReturnType<typeof getRoutine>>>;

export async function listExercises() {
  const db = await getDb();
  return db.select().from(exercises).orderBy(asc(exercises.muscleGroup), asc(exercises.name));
}

/** Último registro de cada ejercicio (para sugerir pesos y ver progresión). */
export async function getLastSetsByExercise() {
  const db = await getDb();
  const rows = await db
    .select({
      exerciseId: workoutSets.exerciseId,
      date: workouts.date,
      reps: workoutSets.reps,
      weightKg: workoutSets.weightKg,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .orderBy(desc(workouts.date), desc(workoutSets.id))
    .limit(600);
  const map = new Map<number, { date: string; reps: number | null; weightKg: number | null }>();
  for (const r of rows) if (!map.has(r.exerciseId)) map.set(r.exerciseId, r);
  return map;
}

/** Mejor marca (peso máximo) por ejercicio a lo largo del tiempo. */
export async function getExerciseHistory(exerciseId: number) {
  const db = await getDb();
  return db
    .select({
      date: workouts.date,
      maxWeight: sql<number>`max(${workoutSets.weightKg})`.mapWith(Number),
      volume: sql<number>`sum(coalesce(${workoutSets.weightKg},0) * coalesce(${workoutSets.reps},0))`.mapWith(Number),
      sets: sql<number>`count(*)`.mapWith(Number),
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(eq(workoutSets.exerciseId, exerciseId))
    .groupBy(workouts.date)
    .orderBy(asc(workouts.date));
}
