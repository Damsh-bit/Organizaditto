import { fmtDec, fmtGrams } from "./format";

type RecipeLike = {
  id: number;
  name: string;
  emoji: string | null;
  description: string | null;
  kcal: number;
  protein: number;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  mealTypes: string[];
  tags: string[];
  isFavorite: boolean;
  babyMinMonths: number | null;
  babyTexture: string | null;
};

/** Reduce una receta a lo necesario para mostrarla en tarjetas (menos datos al cliente). */
export function toRecipeCard(r: RecipeLike) {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    description: r.description,
    kcal: r.kcal,
    protein: r.protein,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    mealTypes: r.mealTypes,
    tags: r.tags,
    isFavorite: r.isFavorite,
    babyMinMonths: r.babyMinMonths,
    babyTexture: r.babyTexture,
  };
}

/** "2 unidades (100 g)", "1 cucharada (13 g)" o "350 g". */
export function ingredientAmount(grams: number, food: { unitName: string | null; unitGrams: number | null }) {
  if (food.unitName && food.unitGrams && food.unitGrams > 0) {
    const units = grams / food.unitGrams;
    const nice = Math.round(units * 4) / 4;
    const tiny = ["pizca", "gotas"].includes(food.unitName);
    if (!tiny && nice >= 0.25 && nice <= 24 && Math.abs(nice - units) / units < 0.2) {
      const label = nice === 1 ? food.unitName : pluralEs(food.unitName);
      return `${fmtDec(nice, 2)} ${label} (${fmtGrams(grams)})`;
    }
  }
  return fmtGrams(grams);
}

function pluralEs(w: string) {
  const [first, ...rest] = w.split(" ");
  const last = first.at(-1) ?? "";
  const p = "aeiou".includes(last) ? first + "s" : first + "es";
  return [p, ...rest].join(" ");
}

export type RecipeEditorValue = {
  id?: number;
  name: string;
  emoji: string;
  description: string;
  audience: "adult" | "baby";
  mealTypes: string[];
  tags: string[];
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  difficulty: string;
  steps: string[];
  tips: string;
  storage: string;
  babyMinMonths: number | null;
  babyTexture: string;
  ingredients: { foodId: number; grams: number; note: string | null; optional: boolean }[];
};

export function emptyRecipe(audience: "adult" | "baby"): RecipeEditorValue {
  return {
    name: "",
    emoji: audience === "baby" ? "👶" : "🍽️",
    description: "",
    audience,
    mealTypes: audience === "baby" ? ["almuerzo"] : ["almuerzo", "cena"],
    tags: [],
    servings: audience === "baby" ? 2 : 1,
    prepMinutes: null,
    cookMinutes: null,
    difficulty: "fácil",
    steps: [],
    tips: "",
    storage: "",
    babyMinMonths: audience === "baby" ? 6 : null,
    babyTexture: "",
    ingredients: [],
  };
}

export function recipeToEditor(r: {
  id: number;
  name: string;
  emoji: string | null;
  description: string | null;
  audience: string;
  mealTypes: string[];
  tags: string[];
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  difficulty: string | null;
  steps: string[];
  tips: string | null;
  storage: string | null;
  babyMinMonths: number | null;
  babyTexture: string | null;
  ingredients: { foodId: number; grams: number; note: string | null; optional: boolean }[];
}): RecipeEditorValue {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji ?? "",
    description: r.description ?? "",
    audience: r.audience === "baby" ? "baby" : "adult",
    mealTypes: r.mealTypes,
    tags: r.tags,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    difficulty: r.difficulty ?? "fácil",
    steps: r.steps,
    tips: r.tips ?? "",
    storage: r.storage ?? "",
    babyMinMonths: r.babyMinMonths,
    babyTexture: r.babyTexture ?? "",
    ingredients: r.ingredients.map((i) => ({ foodId: i.foodId, grams: i.grams, note: i.note, optional: i.optional })),
  };
}
