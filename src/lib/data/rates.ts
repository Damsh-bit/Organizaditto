import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { exchangeRates, type Settings } from "@/db/schema";

export type Quote = { source: string; buy: number | null; sell: number | null; fetchedAt: Date };

const MAX_AGE_MS = 15 * 60 * 1000;
const RETRY_AFTER_FAIL_MS = 5 * 60 * 1000;

// Si las APIs fallan (sin internet), no reintentar en cada request durante unos minutos.
const g = globalThis as unknown as { __orgRatesFailedAt?: number };
const FALLBACK_RATE = 1600;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(7000), headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Trae cotizaciones en vivo: Wallbit (ComparaDólar) + blue/oficial/MEP/CCL/cripto (DolarAPI). */
async function fetchLiveQuotes(): Promise<Omit<Quote, "fetchedAt">[]> {
  const [compara, dolarapi] = await Promise.all([
    fetchJson<{ slug: string; bid: number; ask: number }[]>("https://api.comparadolar.ar/usd"),
    fetchJson<{ casa: string; compra: number; venta: number }[]>("https://dolarapi.com/v1/dolares"),
  ]);
  const out: Omit<Quote, "fetchedAt">[] = [];
  const wallbit = compara?.find((x) => x.slug === "wallbit");
  // bid = lo que Wallbit te paga por tus dólares (compra); ask = lo que cobra al venderte (venta)
  if (wallbit) out.push({ source: "wallbit", buy: wallbit.bid, sell: wallbit.ask });
  for (const d of dolarapi ?? []) {
    const source = d.casa === "contadoconliqui" ? "ccl" : d.casa;
    if (["blue", "oficial", "bolsa", "cripto", "ccl", "tarjeta"].includes(source)) out.push({ source, buy: d.compra, sell: d.venta });
  }
  return out;
}

async function latestStored(): Promise<Quote[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinctOn([exchangeRates.source], {
      source: exchangeRates.source,
      buy: exchangeRates.buy,
      sell: exchangeRates.sell,
      fetchedAt: exchangeRates.fetchedAt,
    })
    .from(exchangeRates)
    .orderBy(exchangeRates.source, desc(exchangeRates.fetchedAt));
  return rows;
}

/** Cotizaciones actuales (cacheadas en la base hasta 15 minutos). */
export async function getQuotes(force = false): Promise<{ quotes: Record<string, Quote>; updatedAt: Date | null; live: boolean }> {
  let stored = await latestStored();
  const newest = stored.reduce<Date | null>((a, q) => (!a || q.fetchedAt > a ? q.fetchedAt : a), null);
  let live = false;
  const coolingDown = !force && g.__orgRatesFailedAt != null && Date.now() - g.__orgRatesFailedAt < RETRY_AFTER_FAIL_MS;
  if (!coolingDown && (force || !newest || Date.now() - newest.getTime() > MAX_AGE_MS)) {
    const fresh = await fetchLiveQuotes();
    if (!fresh.length) g.__orgRatesFailedAt = Date.now();
    else g.__orgRatesFailedAt = undefined;
    if (fresh.length) {
      const db = await getDb();
      const now = new Date();
      await db.insert(exchangeRates).values(fresh.map((q) => ({ ...q, fetchedAt: now })));
      stored = await latestStored();
      live = true;
    }
  }
  const quotes = Object.fromEntries(stored.map((q) => [q.source, q]));
  const updatedAt = stored.reduce<Date | null>((a, q) => (!a || q.fetchedAt > a ? q.fetchedAt : a), null);
  return { quotes, updatedAt, live };
}

export type EffectiveRate = { value: number; source: string; side: "compra" | "venta"; label: string; fallback: boolean; fetchedAt: Date | null };

const LABELS: Record<string, string> = {
  wallbit: "Wallbit",
  blue: "Dólar blue",
  cripto: "Dólar cripto",
  bolsa: "Dólar MEP",
  oficial: "Dólar oficial",
  ccl: "CCL",
  manual: "Manual",
};

/** Cotización que usa la app para convertir tus USD a pesos, según tus preferencias. */
export function effectiveRate(settings: Pick<Settings, "rateSource" | "rateSide" | "manualRate">, quotes: Record<string, Quote>): EffectiveRate {
  const side = settings.rateSide === "venta" ? "venta" : "compra";
  const pick = (q?: Quote) => (q ? (side === "compra" ? q.buy : q.sell) ?? q.buy ?? q.sell : null);
  if (settings.rateSource === "manual" && settings.manualRate) {
    return { value: settings.manualRate, source: "manual", side, label: "Manual", fallback: false, fetchedAt: null };
  }
  const order = [settings.rateSource, "wallbit", "blue", "cripto", "bolsa"];
  for (const src of order) {
    const v = pick(quotes[src]);
    if (v) return { value: v, source: src, side, label: LABELS[src] ?? src, fallback: src !== settings.rateSource, fetchedAt: quotes[src].fetchedAt };
  }
  return {
    value: settings.manualRate ?? FALLBACK_RATE,
    source: "manual",
    side,
    label: "Valor de respaldo",
    fallback: true,
    fetchedAt: null,
  };
}

export async function getEffectiveRate(settings: Settings) {
  const { quotes, updatedAt } = await getQuotes();
  return { rate: effectiveRate(settings, quotes), quotes, updatedAt };
}

/** Histórico diario (blue / cripto / oficial…) desde ArgentinaDatos. */
export async function getRateHistory(casa: "blue" | "cripto" | "oficial" | "bolsa", days = 90) {
  try {
    const res = await fetch(`https://api.argentinadatos.com/v1/cotizaciones/dolares/${casa}`, {
      next: { revalidate: 60 * 60 * 6 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { compra: number; venta: number; fecha: string }[];
    return data.slice(-days);
  } catch {
    return [];
  }
}

/** Histórico propio (snapshots guardados) para una fuente, un valor por día. */
export async function getStoredRateHistory(source: string, sinceISO: string) {
  const db = await getDb();
  return db
    .select({
      date: sql<string>`to_char(${exchangeRates.fetchedAt} at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD')`,
      buy: sql<number>`avg(${exchangeRates.buy})`.mapWith(Number),
      sell: sql<number>`avg(${exchangeRates.sell})`.mapWith(Number),
    })
    .from(exchangeRates)
    .where(and(eq(exchangeRates.source, source), gte(exchangeRates.fetchedAt, new Date(sinceISO + "T00:00:00-03:00"))))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
}
