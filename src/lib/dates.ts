import { format as dfFormat, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";

export const TZ = "America/Argentina/Buenos_Aires";

/** Fecha de hoy (YYYY-MM-DD) en hora argentina, sin importar dónde corra el server. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

/** Hora actual (HH:mm) en Argentina. */
export function nowTimeAR(): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(),
  );
}

/** Convierte "YYYY-MM-DD" en Date al mediodía local (evita corrimientos por zona horaria). */
export function parseISO(s: string): Date {
  return new Date(`${s}T12:00:00`);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime());
}

export function addDaysISO(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** 0 = lunes … 6 = domingo */
export function weekdayMon(s: string): number {
  return (parseISO(s).getDay() + 6) % 7;
}

export function startOfWeekISO(s: string): string {
  return addDaysISO(s, -weekdayMon(s));
}

export function weekDates(startISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(startISO, i));
}

export function startOfMonthISO(s: string): string {
  return s.slice(0, 8) + "01";
}

export function endOfMonthISO(s: string): string {
  const d = parseISO(startOfMonthISO(s));
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toISO(d);
}

export function addMonthsISO(s: string, n: number): string {
  const d = parseISO(startOfMonthISO(s));
  d.setMonth(d.getMonth() + n);
  return toISO(d);
}

export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a));
}

export function rangeISO(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) out.push(d);
  return out;
}

export function fmtDate(s: string, pattern = "d 'de' MMMM"): string {
  return dfFormat(parseISO(s), pattern, { locale: es });
}

export function fmtDateLong(s: string): string {
  const txt = dfFormat(parseISO(s), "EEEE d 'de' MMMM", { locale: es });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function fmtDateShort(s: string): string {
  return dfFormat(parseISO(s), "EEE d/M", { locale: es });
}

export function fmtMonth(s: string): string {
  const txt = dfFormat(parseISO(s), "MMMM yyyy", { locale: es });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function relativeDayLabel(s: string, today = todayISO()): string {
  const diff = daysBetween(today, s);
  if (diff === 0) return "Hoy";
  if (diff === -1) return "Ayer";
  if (diff === 1) return "Mañana";
  return fmtDateLong(s);
}

/** Edad en meses cumplidos (para el bebé). */
export function monthsBetween(birthISO: string, onISO: string): number {
  const b = parseISO(birthISO);
  const d = parseISO(onISO);
  let months = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
  if (d.getDate() < b.getDate()) months--;
  return months;
}

export function ageLabel(birthISO: string, onISO = todayISO()): string {
  const months = monthsBetween(birthISO, onISO);
  if (months < 0) return "Aún no nació";
  const anchor = parseISO(birthISO);
  anchor.setMonth(anchor.getMonth() + months);
  const days = daysBetween(toISO(anchor), onISO);
  if (months < 24) return `${months} ${months === 1 ? "mes" : "meses"}${days > 0 ? ` y ${days} ${days === 1 ? "día" : "días"}` : ""}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} años${rest ? ` y ${rest} meses` : ""}`;
}
