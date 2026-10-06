import { fmtDec, fmtGrams, fmtInt } from "./format";

type FoodForShopping = {
  buyUnit: string;
  buyUnitGrams: number;
  unitName: string | null;
  unitGrams: number | null;
  priceArs: number | null;
};

export type BuyQuantity = { quantity: number; unit: string; grams: number; cost: number | null };

function pluralizeUnit(unit: string, n: number) {
  if (n <= 1) return unit;
  const [first, ...rest] = unit.split(" ");
  const last = first.at(-1) ?? "";
  const plural = "aeiouk".includes(last) ? first + "s" : first.endsWith("z") ? first.slice(0, -1) + "ces" : first + "es";
  return [plural, ...rest].join(" ");
}

/** Convierte gramos necesarios en una cantidad comprable (redondeando hacia arriba). */
export function buyQuantity(food: FoodForShopping, grams: number): BuyQuantity {
  const g = Math.max(0, grams);
  if (food.buyUnit === "kg") {
    const step = g < 1000 ? 50 : 100;
    const rounded = Math.max(step, Math.ceil(g / step) * step);
    return {
      quantity: rounded / 1000,
      unit: "kg",
      grams: g,
      cost: food.priceArs != null ? (food.priceArs * rounded) / 1000 : null,
    };
  }
  if (food.buyUnit.startsWith("docena") && food.unitGrams) {
    const n = Math.max(1, Math.ceil(g / food.unitGrams - 0.05));
    return { quantity: n, unit: n === 1 ? "unidad" : "unidades", grams: g, cost: food.priceArs != null ? (food.priceArs * n) / 12 : null };
  }
  const n = Math.max(1, Math.ceil(g / Math.max(1, food.buyUnitGrams) - 0.03));
  return { quantity: n, unit: pluralizeUnit(food.buyUnit, n), grams: g, cost: food.priceArs != null ? food.priceArs * n : null };
}

/** Texto de cantidad para mostrar: "450 g", "1,2 kg", "2 paquetes". */
export function quantityLabel(item: { quantity: number | null; unit: string | null; grams?: number | null }) {
  if (item.quantity == null) return item.grams ? fmtGrams(item.grams) : "";
  if (item.unit === "kg") return fmtGrams(item.quantity * 1000);
  return `${fmtDec(item.quantity, 2)} ${item.unit ?? ""}`.trim();
}

/** Pista extra: unidades aproximadas o gramos necesarios. */
export function quantityHint(
  item: { quantity: number | null; unit: string | null; grams: number | null },
  food?: { unitName: string | null; unitGrams: number | null; buyUnit: string; buyUnitGrams: number } | null,
) {
  if (!food || !item.grams) return null;
  if (item.unit === "kg") {
    if (food.unitName && food.unitGrams && ["unidad", "planta", "filet"].includes(food.unitName)) {
      const n = Math.max(1, Math.round(item.grams / food.unitGrams));
      return `≈ ${fmtInt(n)} ${n === 1 ? food.unitName : pluralizeUnit(food.unitName, n)}`;
    }
    return null;
  }
  if (item.unit?.startsWith("unidad")) {
    return item.quantity && item.quantity >= 6 ? `≈ ${fmtDec(item.quantity / 12, 1)} docena` : null;
  }
  if (food.buyUnit !== "kg") return `usás ${fmtGrams(item.grams)} de ${fmtGrams((item.quantity ?? 1) * food.buyUnitGrams)}`;
  return null;
}
