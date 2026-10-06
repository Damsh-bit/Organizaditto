import type { MealKey } from "./constants";
import { roundServings } from "./nutrition";

/** Próxima comida según la hora (Argentina). */
export function nextMealByHour(hour: number): MealKey {
  if (hour < 11) return "desayuno";
  if (hour < 15) return "almuerzo";
  if (hour < 19) return "merienda";
  return "cena";
}

type R = { id: number; name: string; emoji: string | null; kcal: number; protein: number; mealTypes: string[]; isFavorite: boolean };

export type Suggestion = { recipe: R; servings: number; kcal: number; protein: number };

/**
 * Recetas que entran en lo que te queda del día, priorizando proteína
 * (clave en déficit para no perder músculo) y que la porción encaje.
 */
export function suggestRecipes(opts: {
  recipes: R[];
  meal: MealKey;
  remainingKcal: number;
  slotTarget: number;
  proteinLeft: number;
  limit?: number;
}): Suggestion[] {
  const { recipes, remainingKcal, slotTarget, proteinLeft } = opts;
  if (remainingKcal < 60) return [];
  const smallBudget = remainingKcal < 250;
  const meal = smallBudget ? "snack" : opts.meal;
  const budget = Math.min(remainingKcal, Math.max(slotTarget, 150) * 1.15);
  const scored: (Suggestion & { score: number })[] = [];
  for (const r of recipes) {
    if (r.kcal <= 0 || !r.mealTypes.includes(meal)) continue;
    const servings = Math.min(2, Math.max(0.5, roundServings(budget / r.kcal)));
    const kcal = r.kcal * servings;
    if (kcal > remainingKcal + 40) continue;
    const density = (r.protein * 4) / r.kcal; // fracción de calorías que vienen de proteína
    const fit = 1 - Math.min(1, Math.abs(kcal - budget) / budget);
    const proteinWeight = proteinLeft > 25 ? 2.5 : 1;
    const score = density * proteinWeight + fit + (r.isFavorite ? 0.3 : 0) + (servings === 1 ? 0.1 : 0);
    scored.push({ recipe: r, servings, kcal, protein: r.protein * servings, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 3)
    .map(({ score: _s, ...rest }) => {
      void _s;
      return rest;
    });
}
