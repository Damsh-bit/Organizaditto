/** Factores MET por tipo de entrenamiento e intensidad (baja/media/alta). */
export const WORKOUT_TYPES: Record<string, { label: string; emoji: string; met: [number, number, number] }> = {
  fuerza: { label: "Fuerza / pesas", emoji: "🏋️", met: [3.5, 5, 6] },
  cardio: { label: "Cardio en máquina", emoji: "🫀", met: [5, 7, 9] },
  caminata: { label: "Caminata", emoji: "🚶", met: [3, 3.8, 5] },
  correr: { label: "Correr", emoji: "🏃", met: [7, 9.8, 11.5] },
  bici: { label: "Bicicleta", emoji: "🚴", met: [5.5, 7.5, 10] },
  hiit: { label: "HIIT", emoji: "⚡", met: [6, 8, 10] },
  funcional: { label: "Funcional / crossfit", emoji: "🤸", met: [4, 6, 8] },
  natacion: { label: "Natación", emoji: "🏊", met: [6, 8, 10] },
  deporte: { label: "Deporte (fútbol, pádel…)", emoji: "⚽", met: [5, 7, 9] },
  movilidad: { label: "Yoga / movilidad", emoji: "🧘", met: [2.5, 3, 4] },
  otro: { label: "Otro", emoji: "✨", met: [3.5, 5, 7] },
};

export const INTENSITIES: Record<string, { label: string; idx: 0 | 1 | 2 }> = {
  baja: { label: "Baja", idx: 0 },
  media: { label: "Media", idx: 1 },
  alta: { label: "Alta", idx: 2 },
};

export function metFor(type: string, intensity: string): number {
  const t = WORKOUT_TYPES[type] ?? WORKOUT_TYPES.otro;
  return t.met[INTENSITIES[intensity]?.idx ?? 1];
}

/** Calorías estimadas de una sesión: MET × peso (kg) × horas. */
export function estimateWorkoutKcal(type: string, intensity: string, weightKg: number, minutes: number) {
  return Math.round(metFor(type, intensity) * weightKg * (minutes / 60));
}

export const MUSCLE_GROUPS = [
  "piernas", "glúteos", "cuádriceps", "isquiotibiales", "pantorrillas", "espalda baja / piernas",
  "pecho", "espalda", "hombros", "hombros / espalda alta", "bíceps", "tríceps", "tríceps / pecho",
  "core", "cadena posterior", "full body", "cardio", "movilidad", "general",
];
