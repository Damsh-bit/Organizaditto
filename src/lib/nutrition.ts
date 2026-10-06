/**
 * Cálculos nutricionales puros (sin acceso a DB), usables en server y cliente.
 */

export type Macros = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

type Per100 = { kcal: number; protein: number; carbs: number; fat: number; fiber?: number | null };

export function macrosFor(food: Per100, grams: number): Macros {
  const k = grams / 100;
  return {
    kcal: food.kcal * k,
    protein: food.protein * k,
    carbs: food.carbs * k,
    fat: food.fat * k,
    fiber: (food.fiber ?? 0) * k,
  };
}

export function addMacros(a: Macros, b: Partial<Macros>): Macros {
  return {
    kcal: a.kcal + (b.kcal ?? 0),
    protein: a.protein + (b.protein ?? 0),
    carbs: a.carbs + (b.carbs ?? 0),
    fat: a.fat + (b.fat ?? 0),
    fiber: a.fiber + (b.fiber ?? 0),
  };
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return {
    kcal: m.kcal * factor,
    protein: m.protein * factor,
    carbs: m.carbs * factor,
    fat: m.fat * factor,
    fiber: m.fiber * factor,
  };
}

export function sumMacros(list: Partial<Macros>[]): Macros {
  return list.reduce<Macros>((acc, m) => addMacros(acc, m), { ...ZERO_MACROS });
}

/** Macros por porción de una receta a partir de sus ingredientes. */
export function recipePerServing(
  ingredients: { grams: number; optional?: boolean; food: Per100 }[],
  servings: number,
): Macros {
  const total = sumMacros(ingredients.filter((i) => !i.optional).map((i) => macrosFor(i.food, i.grams)));
  return scaleMacros(total, 1 / Math.max(servings, 0.1));
}

export function roundMacros(m: Macros): Macros {
  return {
    kcal: Math.round(m.kcal),
    protein: Math.round(m.protein * 10) / 10,
    carbs: Math.round(m.carbs * 10) / 10,
    fat: Math.round(m.fat * 10) / 10,
    fiber: Math.round(m.fiber * 10) / 10,
  };
}

/* ------------------------------------------------------------------ */
/* Gasto energético y objetivos                                         */
/* ------------------------------------------------------------------ */

export const ACTIVITY_LEVELS: Record<string, { label: string; description: string; factor: number }> = {
  sedentary: { label: "Sedentario", description: "Trabajo sentado, casi sin caminar", factor: 1.2 },
  light: { label: "Ligero", description: "Algo de caminata, trabajo sentado", factor: 1.375 },
  moderate: { label: "Moderado", description: "De pie buena parte del día o mucho movimiento", factor: 1.55 },
  active: { label: "Activo", description: "Trabajo físico o muy activo todo el día", factor: 1.725 },
  very_active: { label: "Muy activo", description: "Trabajo físico intenso", factor: 1.9 },
};

/**
 * El nivel de actividad describe el día a día SIN contar el gimnasio:
 * las calorías de los entrenamientos se suman aparte (ver exerciseEatBackPct).
 */
export function bmrMifflin(opts: { sex: "male" | "female"; weightKg: number; heightCm: number; age: number }) {
  const base = 10 * opts.weightKg + 6.25 * opts.heightCm - 5 * opts.age;
  return opts.sex === "male" ? base + 5 : base - 161;
}

export function ageFrom(birthDate: string | null | undefined, today = new Date()): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate + "T12:00:00");
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

export type NutritionProfile = {
  sex: "male" | "female" | null;
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: string;
  deficitKcal: number;
  targetKcalOverride: number | null;
  proteinPerKg: number;
  fatPct: number;
};

export type Targets = {
  ready: boolean;
  bmr: number;
  tdee: number;
  target: number;
  protein: number;
  fat: number;
  carbs: number;
  minSafe: number;
  weeklyLossKg: number;
};

export function computeTargets(profile: NutritionProfile, weightKg: number | null): Targets {
  const age = ageFrom(profile.birthDate) ?? 30;
  const sex = profile.sex ?? "male";
  const ready = Boolean(profile.sex && profile.heightCm && weightKg && profile.birthDate);
  const w = weightKg ?? (sex === "male" ? 80 : 65);
  const h = profile.heightCm ?? (sex === "male" ? 175 : 162);
  const bmr = bmrMifflin({ sex, weightKg: w, heightCm: h, age });
  const factor = ACTIVITY_LEVELS[profile.activityLevel]?.factor ?? 1.375;
  const tdee = bmr * factor;
  const minSafe = sex === "male" ? 1500 : 1200;
  const target = profile.targetKcalOverride ?? Math.max(minSafe, Math.round((tdee - profile.deficitKcal) / 10) * 10);
  const protein = Math.round(profile.proteinPerKg * w);
  const fat = Math.round((target * (profile.fatPct / 100)) / 9);
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));
  const realDeficit = tdee - target;
  return {
    ready,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target,
    protein,
    fat,
    carbs,
    minSafe,
    weeklyLossKg: Math.round(((realDeficit * 7) / 7700) * 100) / 100,
  };
}

/** Calorías quemadas estimadas: MET × peso (kg) × horas. */
export function kcalFromMet(met: number, weightKg: number, minutes: number) {
  return Math.round(met * weightKg * (minutes / 60));
}

export function bmi(weightKg: number, heightCm: number) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiLabel(v: number) {
  if (v < 18.5) return "Bajo peso";
  if (v < 25) return "Normal";
  if (v < 30) return "Sobrepeso";
  if (v < 35) return "Obesidad I";
  if (v < 40) return "Obesidad II";
  return "Obesidad III";
}

/** Redondea porciones a múltiplos de 0.25. */
export function roundServings(x: number) {
  return Math.max(0.25, Math.round(x * 4) / 4);
}
