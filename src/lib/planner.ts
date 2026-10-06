import { roundServings } from "./nutrition";

export type PlannerRecipe = {
  id: number;
  name: string;
  kcal: number;
  servings: number;
  mealTypes: string[];
  isFavorite: boolean;
};

export type PlannedSlot = { day: number; meal: string; recipeId: number; servings: number };

const MEAL_ORDER = ["desayuno", "almuerzo", "merienda", "cena", "snack"];

function clamp(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}

function weightedPick<T>(items: T[], weight: (t: T) => number, rng: () => number): T | undefined {
  const weights = items.map((i) => Math.max(0.0001, weight(i)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Genera una semana de comidas que se acerca al objetivo calórico diario.
 * - Reparte las calorías según la distribución de comidas (split).
 * - Evita repetir la misma receta en la misma comida dos días seguidos.
 * - Prefiere favoritas y recetas cuya porción ya está cerca del objetivo de esa comida.
 * - Modo meal prep: la cena de un día se repite como almuerzo del día siguiente (vianda).
 */
export function generateWeek(opts: {
  recipes: PlannerRecipe[];
  split: Record<string, number>;
  target: number;
  mealPrep?: boolean;
  rng?: () => number;
}): PlannedSlot[] {
  const rng = opts.rng ?? Math.random;
  const meals = MEAL_ORDER.filter((m) => (opts.split[m] ?? 0) > 0);
  const out: PlannedSlot[] = [];
  const history: Record<string, number[]> = {};
  let leftover: number | null = null;

  for (let day = 0; day < 7; day++) {
    const dayItems: PlannedSlot[] = [];
    const usedToday = new Set<number>();

    for (const meal of meals) {
      const slotTarget = opts.target * opts.split[meal];
      let chosen: PlannerRecipe | undefined;

      if (opts.mealPrep && meal === "almuerzo" && leftover != null) {
        chosen = opts.recipes.find((r) => r.id === leftover);
      }

      if (!chosen) {
        const recent = (history[meal] ?? []).slice(-2);
        let candidates = opts.recipes.filter(
          (r) => r.kcal > 0 && r.mealTypes.includes(meal) && !recent.includes(r.id) && !usedToday.has(r.id),
        );
        if (opts.mealPrep && meal === "cena") {
          const batch = candidates.filter((r) => r.servings >= 2 && r.mealTypes.includes("almuerzo"));
          if (batch.length >= 3) candidates = batch;
        }
        if (!candidates.length) candidates = opts.recipes.filter((r) => r.kcal > 0 && r.mealTypes.includes(meal));
        chosen = weightedPick(
          candidates,
          (r) => {
            const ratio = slotTarget / r.kcal;
            const fit = 1 / (1 + Math.abs(Math.log(ratio)) * 2);
            return (r.isFavorite ? 3 : 1) * fit ** 3;
          },
          rng,
        );
      }
      if (!chosen) continue;

      usedToday.add(chosen.id);
      (history[meal] ??= []).push(chosen.id);
      dayItems.push({
        day,
        meal,
        recipeId: chosen.id,
        servings: clamp(roundServings(slotTarget / chosen.kcal), 0.5, 2),
      });
      if (meal === "almuerzo" && leftover != null) leftover = null;
      if (meal === "cena") leftover = opts.mealPrep && day < 6 ? chosen.id : null;
    }

    // Ajuste fino del día para acercarse al objetivo
    const kcalOf = (s: PlannedSlot) => (opts.recipes.find((r) => r.id === s.recipeId)?.kcal ?? 0) * s.servings;
    const total = dayItems.reduce((a, s) => a + kcalOf(s), 0);
    if (total > 0) {
      const factor = opts.target / total;
      if (Math.abs(factor - 1) > 0.06) {
        for (const s of dayItems) s.servings = clamp(roundServings(s.servings * factor), 0.5, 2);
      }
    }
    out.push(...dayItems);
  }
  return out;
}

/** Escala las porciones de cada día de una plantilla para que el total diario se acerque al objetivo. */
export function scaleTemplateDays(
  items: { day: number; meal: string; recipeId: number; servings: number }[],
  kcalById: Map<number, number>,
  target: number,
) {
  const byDay = new Map<number, typeof items>();
  for (const it of items) byDay.set(it.day, [...(byDay.get(it.day) ?? []), it]);
  const out: typeof items = [];
  for (const [, dayItems] of byDay) {
    const total = dayItems.reduce((a, it) => a + (kcalById.get(it.recipeId) ?? 0) * it.servings, 0);
    const factor = total > 0 ? clamp(target / total, 0.6, 1.8) : 1;
    for (const it of dayItems) out.push({ ...it, servings: clamp(roundServings(it.servings * factor), 0.5, 2.5) });
  }
  return out;
}

export type PrepTask = {
  recipeId: number;
  name: string;
  emoji: string | null;
  totalServings: number;
  recipeServings: number;
  batches: number;
  dates: string[];
  meals: string[];
};

/** Agrupa el plan por receta: cuántas porciones cocinar y para qué días (guía de meal prep). */
export function buildPrepTasks(
  items: { recipeId: number; servings: number; date: string; meal: string; recipe: { name: string; emoji: string | null; servings: number } }[],
): PrepTask[] {
  const map = new Map<number, PrepTask>();
  for (const it of items) {
    const t =
      map.get(it.recipeId) ??
      ({
        recipeId: it.recipeId,
        name: it.recipe.name,
        emoji: it.recipe.emoji,
        totalServings: 0,
        recipeServings: it.recipe.servings,
        batches: 0,
        dates: [],
        meals: [],
      } satisfies PrepTask);
    t.totalServings += it.servings;
    if (!t.dates.includes(it.date)) t.dates.push(it.date);
    if (!t.meals.includes(it.meal)) t.meals.push(it.meal);
    map.set(it.recipeId, t);
  }
  return [...map.values()]
    .map((t) => ({ ...t, batches: Math.max(1, Math.ceil(t.totalServings / Math.max(1, t.recipeServings) - 0.05)) }))
    .sort((a, b) => (a.dates[0] < b.dates[0] ? -1 : a.dates[0] > b.dates[0] ? 1 : b.totalServings - a.totalServings));
}
