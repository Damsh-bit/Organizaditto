/**
 * Calendario Nacional de Vacunación de Argentina (0 a 2 años), versión 2026.
 * Fuente: Ministerio de Salud — argentina.gob.ar/salud/vacunas (recién nacidos, lactantes y niños hasta 2 años)
 * y Resolución 339/2026 (segunda dosis de triple viral a los 15-18 meses).
 * Es una guía para seguir la libreta: ante cualquier duda manda el vacunatorio o el pediatra.
 */
import { addDaysISO, daysBetween } from "./dates";

export type VaccineDose = {
  code: string;
  name: string;
  dose: string;
  /** Edad recomendada en meses (0 = al nacer). */
  months: number;
  /** Hasta qué edad se considera "a tiempo" (para marcar atrasos). */
  untilMonths?: number;
  ageLabel: string;
  protects: string;
  note?: string;
  /** Solo en algunas situaciones (no se marca como atrasada). */
  optional?: boolean;
  /** Dosis que depende de otra (antigripal 2ª: 4 semanas después de la 1ª). */
  afterCode?: string;
  afterDays?: number;
};

export const VACCINE_SCHEDULE: VaccineDose[] = [
  { code: "bcg", name: "BCG", dose: "Única", months: 0, ageLabel: "Al nacer", protects: "Formas graves de tuberculosis", note: "Antes de salir de la maternidad." },
  { code: "hepb-rn", name: "Hepatitis B", dose: "Neonatal", months: 0, ageLabel: "Al nacer", protects: "Hepatitis B", note: "Dentro de las primeras 12 horas de vida." },

  { code: "neumo-1", name: "Neumococo conjugada", dose: "1ª dosis", months: 2, ageLabel: "2 meses", protects: "Neumonía, meningitis y otitis por neumococo" },
  { code: "ipv-1", name: "Poliomielitis (IPV/Salk)", dose: "1ª dosis", months: 2, ageLabel: "2 meses", protects: "Poliomielitis" },
  { code: "quintuple-1", name: "Quíntuple (pentavalente)", dose: "1ª dosis", months: 2, ageLabel: "2 meses", protects: "Difteria, tétanos, tos convulsa, Haemophilus influenzae b y hepatitis B" },
  { code: "rota-1", name: "Rotavirus", dose: "1ª dosis", months: 2, untilMonths: 3.4, ageLabel: "2 meses", protects: "Diarrea grave por rotavirus", note: "Es oral y tiene edad máxima para aplicarse: no la dejes pasar." },

  { code: "mening-1", name: "Meningococo", dose: "1ª dosis", months: 3, ageLabel: "3 meses", protects: "Meningitis y sepsis por meningococo" },

  { code: "neumo-2", name: "Neumococo conjugada", dose: "2ª dosis", months: 4, ageLabel: "4 meses", protects: "Neumonía, meningitis y otitis por neumococo" },
  { code: "ipv-2", name: "Poliomielitis (IPV/Salk)", dose: "2ª dosis", months: 4, ageLabel: "4 meses", protects: "Poliomielitis" },
  { code: "quintuple-2", name: "Quíntuple (pentavalente)", dose: "2ª dosis", months: 4, ageLabel: "4 meses", protects: "Difteria, tétanos, tos convulsa, Hib y hepatitis B" },
  { code: "rota-2", name: "Rotavirus", dose: "2ª dosis", months: 4, untilMonths: 5.5, ageLabel: "4 meses", protects: "Diarrea grave por rotavirus", note: "Tiene edad máxima para aplicarse." },

  { code: "mening-2", name: "Meningococo", dose: "2ª dosis", months: 5, ageLabel: "5 meses", protects: "Meningitis y sepsis por meningococo" },

  { code: "ipv-3", name: "Poliomielitis (IPV/Salk)", dose: "3ª dosis", months: 6, ageLabel: "6 meses", protects: "Poliomielitis" },
  { code: "quintuple-3", name: "Quíntuple (pentavalente)", dose: "3ª dosis", months: 6, ageLabel: "6 meses", protects: "Difteria, tétanos, tos convulsa, Hib y hepatitis B" },
  {
    code: "gripe-1",
    name: "Antigripal",
    dose: "1ª dosis",
    months: 6,
    untilMonths: 24,
    ageLabel: "Desde los 6 meses",
    protects: "Gripe (influenza)",
    note: "Se da en la campaña de otoño-invierno. El primer año van 2 dosis; los años siguientes, 1 por campaña hasta los 2 años.",
    optional: true,
  },
  {
    code: "gripe-2",
    name: "Antigripal",
    dose: "2ª dosis",
    months: 7,
    untilMonths: 24,
    ageLabel: "4 semanas después de la 1ª",
    protects: "Gripe (influenza)",
    afterCode: "gripe-1",
    afterDays: 28,
    optional: true,
  },

  { code: "neumo-ref", name: "Neumococo conjugada", dose: "Refuerzo", months: 12, ageLabel: "12 meses", protects: "Neumonía, meningitis y otitis por neumococo" },
  { code: "hepa", name: "Hepatitis A", dose: "Única", months: 12, ageLabel: "12 meses", protects: "Hepatitis A" },
  { code: "triple-viral-1", name: "Triple viral", dose: "1ª dosis", months: 12, ageLabel: "12 meses", protects: "Sarampión, rubéola y paperas" },

  { code: "mening-ref", name: "Meningococo", dose: "Refuerzo", months: 15, ageLabel: "15 meses", protects: "Meningitis y sepsis por meningococo" },
  { code: "varicela-1", name: "Varicela", dose: "1ª dosis", months: 15, ageLabel: "15 meses", protects: "Varicela" },

  { code: "triple-viral-2", name: "Triple viral", dose: "2ª dosis", months: 15, untilMonths: 18, ageLabel: "15 a 18 meses", protects: "Sarampión, rubéola y paperas", note: "Desde 2026 la 2ª dosis se adelantó a los 15-18 meses." },
  { code: "quintuple-ref", name: "Quíntuple (pentavalente)", dose: "Refuerzo", months: 15, untilMonths: 18, ageLabel: "15 a 18 meses", protects: "Difteria, tétanos, tos convulsa, Hib y hepatitis B" },

  { code: "fiebre-amarilla", name: "Fiebre amarilla", dose: "1ª dosis", months: 18, ageLabel: "18 meses", protects: "Fiebre amarilla", note: "Solo si viven en zonas de riesgo (NEA y NOA).", optional: true },
];

export const VACCINE_SOURCE_URL = "https://www.argentina.gob.ar/salud/vacunas";

const DAYS_PER_MONTH = 30.4375;

export type VaccineStatus = "aplicada" | "atrasada" | "toca" | "proxima" | "futura";

export type VaccineRow = VaccineDose & {
  status: VaccineStatus;
  dueDate: string;
  appliedOn?: string;
  recordId?: number;
};

/**
 * Estado de cada dosis según la edad del bebé y lo que ya se registró.
 * "toca": ya está en edad (hasta 1 mes de margen); "atrasada": pasó el margen o la edad máxima;
 * "proxima": dentro de los próximos 30 días.
 */
export function vaccineRows(birthISO: string, todayISO: string, applied: { id: number; code: string | null; date: string }[]): VaccineRow[] {
  const byCode = new Map(applied.filter((a) => a.code).map((a) => [a.code!, a]));
  return VACCINE_SCHEDULE.map((v) => {
    const rec = byCode.get(v.code);
    let dueDate = addDaysISO(birthISO, Math.round(v.months * DAYS_PER_MONTH));
    if (v.afterCode && v.afterDays) {
      const prev = byCode.get(v.afterCode);
      if (prev) dueDate = addDaysISO(prev.date, v.afterDays);
    }
    const lateFrom = addDaysISO(birthISO, Math.round((v.untilMonths ?? v.months + 1) * DAYS_PER_MONTH));
    let status: VaccineStatus;
    if (rec) status = "aplicada";
    else if (todayISO >= dueDate) status = !v.optional && todayISO > lateFrom ? "atrasada" : "toca";
    else if (daysBetween(todayISO, dueDate) <= 30) status = "proxima";
    else status = "futura";
    return { ...v, status, dueDate, appliedOn: rec?.date, recordId: rec?.id };
  });
}
