import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDaysISO, ageLabel, monthsBetween, startOfWeekISO, weekDates, weekdayMon } from "../src/lib/dates";
import { parseNum } from "../src/lib/format";
import { bmrMifflin, computeTargets, macrosFor, recipePerServing, roundServings } from "../src/lib/nutrition";
import { buildPrepTasks, generateWeek, scaleTemplateDays } from "../src/lib/planner";
import { buyQuantity, quantityLabel } from "../src/lib/shopping";
import { estimateWorkoutKcal } from "../src/lib/training";
import { weeklyRate, weightInsights } from "../src/lib/weight";
import { suggestRecipes } from "../src/lib/suggest";
import { matches } from "../src/lib/search";

/** RNG determinista (mulberry32) para que los tests sean reproducibles. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("nutrición", () => {
  it("Mifflin-St Jeor da los valores esperados", () => {
    assert.equal(bmrMifflin({ sex: "male", weightKg: 92, heightCm: 178, age: 31 }), 1882.5);
    assert.equal(bmrMifflin({ sex: "female", weightKg: 65, heightCm: 162, age: 30 }), 1351.5);
  });

  it("el objetivo aplica el déficit y respeta el mínimo seguro", () => {
    const base = { sex: "male" as const, birthDate: "1995-05-10", heightCm: 178, activityLevel: "light", targetKcalOverride: null, proteinPerKg: 1.8, fatPct: 28 };
    const t = computeTargets({ ...base, deficitKcal: 500 }, 92);
    assert.ok(t.ready);
    assert.equal(t.target, Math.round((t.tdee - 500) / 10) * 10);
    assert.equal(t.protein, Math.round(1.8 * 92));
    const extreme = computeTargets({ ...base, deficitKcal: 3000 }, 92);
    assert.equal(extreme.target, 1500);
    const manual = computeTargets({ ...base, deficitKcal: 500, targetKcalOverride: 1800 }, 92);
    assert.equal(manual.target, 1800);
  });

  it("macros por porción de una receta ignoran ingredientes opcionales", () => {
    const food = { kcal: 100, protein: 10, carbs: 5, fat: 2 };
    assert.equal(macrosFor(food, 250).kcal, 250);
    const per = recipePerServing(
      [
        { grams: 400, food },
        { grams: 100, optional: true, food },
      ],
      2,
    );
    assert.equal(per.kcal, 200);
  });

  it("redondea porciones a cuartos", () => {
    assert.equal(roundServings(1.13), 1.25);
    assert.equal(roundServings(0.05), 0.25);
  });
});

describe("planificador", () => {
  const recipes = [
    { id: 1, name: "Avena", kcal: 310, servings: 1, mealTypes: ["desayuno", "merienda"], isFavorite: false },
    { id: 2, name: "Tostadas", kcal: 260, servings: 1, mealTypes: ["desayuno", "merienda"], isFavorite: true },
    { id: 3, name: "Pollo al horno", kcal: 400, servings: 4, mealTypes: ["almuerzo", "cena"], isFavorite: false },
    { id: 4, name: "Guiso", kcal: 340, servings: 6, mealTypes: ["almuerzo", "cena"], isFavorite: false },
    { id: 5, name: "Tarta", kcal: 310, servings: 4, mealTypes: ["almuerzo", "cena"], isFavorite: false },
    { id: 6, name: "Merluza", kcal: 290, servings: 4, mealTypes: ["cena", "almuerzo"], isFavorite: false },
    { id: 7, name: "Yogur", kcal: 200, servings: 1, mealTypes: ["merienda"], isFavorite: false },
  ];
  const split = { desayuno: 0.22, almuerzo: 0.33, merienda: 0.15, cena: 0.3 };

  it("genera 7 días con todas las comidas y cerca del objetivo", () => {
    const slots = generateWeek({ recipes, split, target: 2000, rng: rng(42) });
    assert.equal(slots.length, 28);
    for (let d = 0; d < 7; d++) {
      const kcal = slots.filter((s) => s.day === d).reduce((a, s) => a + recipes.find((r) => r.id === s.recipeId)!.kcal * s.servings, 0);
      assert.ok(Math.abs(kcal - 2000) / 2000 < 0.15, `día ${d}: ${kcal} kcal`);
    }
  });

  it("en modo vianda el almuerzo repite la cena del día anterior", () => {
    const slots = generateWeek({ recipes, split, target: 2000, mealPrep: true, rng: rng(7) });
    for (let d = 1; d < 7; d++) {
      const cenaPrev = slots.find((s) => s.day === d - 1 && s.meal === "cena")!.recipeId;
      const almuerzo = slots.find((s) => s.day === d && s.meal === "almuerzo")!.recipeId;
      assert.equal(almuerzo, cenaPrev);
    }
  });

  it("escala las porciones de una plantilla hacia el objetivo", () => {
    const items = [
      { day: 0, meal: "almuerzo", recipeId: 3, servings: 1 },
      { day: 0, meal: "cena", recipeId: 4, servings: 1 },
    ];
    const scaled = scaleTemplateDays(items, new Map([[3, 400], [4, 340]]), 1480);
    const total = scaled.reduce((a, s) => a + (s.recipeId === 3 ? 400 : 340) * s.servings, 0);
    assert.ok(Math.abs(total - 1480) < 200);
  });

  it("agrupa la guía de preparación por receta y calcula tandas", () => {
    const tasks = buildPrepTasks([
      { recipeId: 3, servings: 1.5, date: "2026-10-05", meal: "almuerzo", recipe: { name: "Pollo", emoji: null, servings: 4 } },
      { recipeId: 3, servings: 1.5, date: "2026-10-06", meal: "almuerzo", recipe: { name: "Pollo", emoji: null, servings: 4 } },
      { recipeId: 3, servings: 1.5, date: "2026-10-07", meal: "cena", recipe: { name: "Pollo", emoji: null, servings: 4 } },
    ]);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].totalServings, 4.5);
    assert.equal(tasks[0].batches, 2);
  });
});

describe("lista de compras", () => {
  const kg = { buyUnit: "kg", buyUnitGrams: 1000, unitName: "unidad", unitGrams: 120, priceArs: 2000 };
  it("redondea por kilo hacia arriba en pasos de 50 g / 100 g", () => {
    assert.equal(buyQuantity(kg, 430).quantity, 0.45);
    assert.equal(buyQuantity(kg, 1230).quantity, 1.3);
    assert.equal(buyQuantity(kg, 1230).cost, 2600);
    assert.equal(quantityLabel({ quantity: 0.45, unit: "kg" }), "450 g");
  });
  it("convierte huevos a unidades y paquetes enteros", () => {
    const egg = { buyUnit: "docena", buyUnitGrams: 600, unitName: "unidad", unitGrams: 50, priceArs: 3000 };
    assert.deepEqual([buyQuantity(egg, 360).quantity, buyQuantity(egg, 360).unit], [8, "unidades"]);
    const pkg = { buyUnit: "paquete", buyUnitGrams: 500, unitName: null, unitGrams: null, priceArs: null };
    // tolerancia del 3 %: 510 g → 1 paquete de 500 g; 530 g → 2 paquetes
    assert.deepEqual([buyQuantity(pkg, 510).quantity, buyQuantity(pkg, 510).unit], [1, "paquete"]);
    assert.deepEqual([buyQuantity(pkg, 530).quantity, buyQuantity(pkg, 530).unit], [2, "paquetes"]);
    assert.equal(buyQuantity(pkg, 505).quantity, 1);
  });
});

describe("entrenamiento y peso", () => {
  it("estima calorías con MET × peso × horas", () => {
    assert.equal(estimateWorkoutKcal("fuerza", "media", 92, 60), 460);
    assert.equal(estimateWorkoutKcal("caminata", "baja", 80, 30), 120);
  });
  it("calcula el ritmo semanal y la fecha estimada de meta", () => {
    const logs = [
      { date: "2026-09-07", weightKg: 92 },
      { date: "2026-09-14", weightKg: 91.5 },
      { date: "2026-09-21", weightKg: 91 },
      { date: "2026-09-28", weightKg: 90.5 },
    ];
    assert.equal(weeklyRate(logs), -0.5);
    const ins = weightInsights(logs, 92, 80);
    assert.equal(ins.toGoal, 10.5);
    assert.equal(ins.weeksToGoal, 21);
    assert.equal(ins.etaDate, addDaysISO("2026-09-28", 147));
  });
});

describe("fechas, formato y búsqueda", () => {
  it("semanas empiezan el lunes", () => {
    assert.equal(startOfWeekISO("2026-10-05"), "2026-10-05");
    assert.equal(startOfWeekISO("2026-10-11"), "2026-10-05");
    assert.equal(weekdayMon("2026-10-11"), 6);
    assert.deepEqual(weekDates("2026-10-05").at(-1), "2026-10-11");
  });
  it("edad del bebé en meses", () => {
    assert.equal(monthsBetween("2026-04-20", "2026-10-05"), 5);
    assert.equal(monthsBetween("2026-04-20", "2026-10-20"), 6);
    assert.equal(ageLabel("2026-04-20", "2026-10-05"), "5 meses y 15 días");
  });
  it("parsea números con coma o punto", () => {
    assert.equal(parseNum("7,5"), 7.5);
    assert.equal(parseNum("1.234,5"), 1234.5);
    assert.equal(parseNum("92.3"), 92.3);
    assert.equal(parseNum(""), null);
    assert.equal(parseNum("abc"), null);
  });
  it("busca sin importar tildes ni orden de palabras", () => {
    assert.ok(matches("Pechuga de pollo (sin piel)", "pollo pechuga"));
    assert.ok(matches("Brócoli", "brocoli"));
    assert.ok(!matches("Brócoli", "coliflor"));
  });
  it("sugiere recetas que entran en las calorías restantes", () => {
    const r = [
      { id: 1, name: "Pechuga con ensalada", emoji: null, kcal: 350, protein: 44, mealTypes: ["cena"], isFavorite: false },
      { id: 2, name: "Pizza", emoji: null, kcal: 400, protein: 20, mealTypes: ["cena"], isFavorite: false },
      { id: 3, name: "Fruta", emoji: null, kcal: 80, protein: 1, mealTypes: ["snack"], isFavorite: false },
    ];
    const s = suggestRecipes({ recipes: r, meal: "cena", remainingKcal: 600, slotTarget: 600, proteinLeft: 60 });
    assert.equal(s[0].recipe.id, 1);
    assert.ok(s.every((x) => x.kcal <= 640));
    assert.equal(suggestRecipes({ recipes: r, meal: "cena", remainingKcal: 120, slotTarget: 600, proteinLeft: 10 })[0]?.recipe.id, 3);
  });
});
