import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { babies, settings, weightLogs, type Settings } from "@/db/schema";
import { DEFAULT_MEAL_SPLIT } from "@/lib/constants";
import { computeTargets, type Targets } from "@/lib/nutrition";

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return { ...row, mealSplit: row.mealSplit ?? DEFAULT_MEAL_SPLIT };
}

export async function getLatestWeight() {
  const db = await getDb();
  const [row] = await db.select().from(weightLogs).orderBy(desc(weightLogs.date)).limit(1);
  return row ?? null;
}

export async function getCurrentWeightKg(s?: Settings): Promise<number | null> {
  const latest = await getLatestWeight();
  if (latest) return latest.weightKg;
  return (s ?? (await getSettings())).startWeightKg ?? null;
}

export type ProfileContext = { settings: Settings; weightKg: number | null; targets: Targets };

export async function getProfileContext(): Promise<ProfileContext> {
  const s = await getSettings();
  const weightKg = await getCurrentWeightKg(s);
  const targets = computeTargets(
    {
      sex: s.sex ?? null,
      birthDate: s.birthDate ?? null,
      heightCm: s.heightCm ?? null,
      activityLevel: s.activityLevel,
      deficitKcal: s.deficitKcal,
      targetKcalOverride: s.targetKcalOverride ?? null,
      proteinPerKg: s.proteinPerKg,
      fatPct: s.fatPct,
    },
    weightKg,
  );
  return { settings: s, weightKg, targets };
}

export async function getBaby() {
  const db = await getDb();
  const [row] = await db.select().from(babies).orderBy(babies.id).limit(1);
  return row ?? null;
}
