import "server-only";
import { matches } from "@/lib/search";

/** Producto normalizado de Open Food Facts (valores cada 100 g). */
export type OffProduct = {
  code: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

type Nutriments = Record<string, number | string | undefined>;
type RawProduct = { code?: string; product_name?: string; product_name_es?: string; brands?: string | string[]; quantity?: string; nutriments?: Nutriments };

const UA = "Organizaditto/1.0 (app personal)";

function num(n: Nutriments | undefined, key: string): number | null {
  const v = n?.[key];
  const x = typeof v === "string" ? Number(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function normalize(p: RawProduct): OffProduct | null {
  const n = p.nutriments;
  let kcal = num(n, "energy-kcal_100g");
  if (kcal == null) {
    const kj = num(n, "energy_100g");
    if (kj != null) kcal = kj / 4.184;
  }
  const name = (p.product_name_es || p.product_name || "").trim();
  if (kcal == null || !name) return null;
  const hasMacros = ["proteins_100g", "carbohydrates_100g", "fat_100g"].some((k) => (num(n, k) ?? 0) > 0);
  if (kcal <= 0 && !hasMacros) return null;
  const brands = Array.isArray(p.brands) ? p.brands.join(", ") : p.brands;
  return {
    code: p.code ?? "",
    name,
    brand: brands?.split(",")[0]?.trim() || null,
    quantity: p.quantity?.trim() || null,
    kcal: Math.round(kcal),
    protein: Math.round((num(n, "proteins_100g") ?? 0) * 10) / 10,
    carbs: Math.round((num(n, "carbohydrates_100g") ?? 0) * 10) / 10,
    fat: Math.round((num(n, "fat_100g") ?? 0) * 10) / 10,
    fiber: Math.round((num(n, "fiber_100g") ?? 0) * 10) / 10,
  };
}

export async function offByBarcode(code: string): Promise<OffProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,product_name_es,brands,quantity,nutriments`,
      { headers: { "user-agent": UA }, signal: AbortSignal.timeout(8000), cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; product?: RawProduct; code?: string };
    if (!data.product) return null;
    return normalize({ ...data.product, code: data.product.code ?? data.code });
  } catch {
    return null;
  }
}

export async function offSearch(query: string): Promise<OffProduct[]> {
  const q = query.trim();
  if (!q) return [];
  if (/^\d{8,14}$/.test(q)) {
    const p = await offByBarcode(q);
    return p ? [p] : [];
  }
  // Primero productos de Argentina; si hay pocos, se completa con resultados globales.
  const relevant = (p: OffProduct) => matches(`${p.name} ${p.brand ?? ""}`, q);
  const local = (await searchQuery(`${q} countries_tags:"en:argentina"`)).filter(relevant);
  if (local.length >= 8) return local;
  const global = await searchQuery(q);
  const seen = new Set(local.map((p) => p.code));
  const globalFirst = [...global.filter(relevant), ...global.filter((p) => !relevant(p))];
  return [...local, ...globalFirst.filter((p) => !seen.has(p.code))].slice(0, 25);
}

async function searchQuery(query: string): Promise<OffProduct[]> {
  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=25&fields=code,product_name,product_name_es,brands,quantity,nutriments`;
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(9000), cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { hits?: RawProduct[] };
    return (data.hits ?? []).map(normalize).filter((x): x is OffProduct => x !== null);
  } catch {
    return [];
  }
}

/** "500 g" → 500, "1 kg" → 1000, "1,5 L" → 1500. */
export function parseQuantityGrams(q: string | null): number | null {
  if (!q) return null;
  const m = q.toLowerCase().replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|grs|l|lt|ml|cc)\b/);
  if (!m) return null;
  const v = Number(m[1]);
  const unit = m[2];
  if (unit === "kg" || unit === "l" || unit === "lt") return v * 1000;
  return v;
}
