const intFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function fmtInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "–";
  return intFmt.format(Math.round(n));
}

export function fmtDec(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "–";
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(n);
}

export function fmtKcal(n: number | null | undefined): string {
  return `${fmtInt(n)} kcal`;
}

export function fmtGrams(n: number | null | undefined): string {
  if (n == null) return "–";
  if (n >= 1000) return `${fmtDec(n / 1000, 2)} kg`;
  return `${fmtDec(n, n < 10 ? 1 : 0)} g`;
}

export function fmtUSD(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "–";
  return `US$ ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)}`;
}

export function fmtARS(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "–";
  return `$ ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)}`;
}

/** 7.5 → "7 h 30 min" */
export function fmtHours(h: number | null | undefined): string {
  if (h == null || Number.isNaN(h)) return "–";
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  if (hh === 0) return `${mm} min`;
  return mm ? `${hh} h ${mm} min` : `${hh} h`;
}

export function fmtHoursShort(h: number | null | undefined): string {
  if (h == null || Number.isNaN(h)) return "–";
  return `${fmtDec(h, 1)} h`;
}

export function fmtPct(n: number, digits = 0): string {
  return `${fmtDec(n * 100, digits)}%`;
}

export function plural(n: number, one: string, many: string) {
  return `${fmtInt(n)} ${Math.round(n) === 1 ? one : many}`;
}

/** Parsea números escritos con coma o punto decimal. */
export function parseNum(v: FormDataEntryValue | string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
