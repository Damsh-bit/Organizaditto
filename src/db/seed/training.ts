export type ExerciseSeed = {
  slug: string;
  name: string;
  muscleGroup: string;
  equipment?: string;
  kind: "fuerza" | "cardio" | "movilidad";
  description?: string;
};

const e = (
  slug: string,
  name: string,
  muscleGroup: string,
  equipment: string,
  kind: ExerciseSeed["kind"] = "fuerza",
  description?: string,
): ExerciseSeed => ({ slug, name, muscleGroup, equipment, kind, description });

export const EXERCISES: ExerciseSeed[] = [
  // Piernas y glúteos
  e("sentadilla-barra", "Sentadilla con barra", "piernas", "barra", "fuerza", "Pies al ancho de hombros, bajá hasta que la cadera quede a la altura de las rodillas manteniendo la espalda neutra."),
  e("sentadilla-goblet", "Sentadilla goblet", "piernas", "mancuerna", "fuerza", "Sostené una mancuerna o pesa rusa pegada al pecho y bajá controlado."),
  e("prensa", "Prensa de piernas", "piernas", "máquina"),
  e("peso-muerto", "Peso muerto", "espalda baja / piernas", "barra", "fuerza", "Bisagra de cadera con la barra pegada a las piernas; espalda recta en todo momento."),
  e("peso-muerto-rumano", "Peso muerto rumano", "isquiotibiales", "barra / mancuernas"),
  e("estocadas", "Estocadas / zancadas", "piernas", "mancuernas"),
  e("bulgaras", "Sentadilla búlgara", "piernas", "mancuernas"),
  e("hip-thrust", "Hip thrust", "glúteos", "barra"),
  e("extension-cuadriceps", "Extensión de cuádriceps", "cuádriceps", "máquina"),
  e("curl-femoral", "Curl femoral", "isquiotibiales", "máquina"),
  e("gemelos", "Elevación de talones (gemelos)", "pantorrillas", "máquina"),
  e("abductores", "Abductores en máquina", "glúteos", "máquina"),
  e("patada-gluteo", "Patada de glúteo en polea", "glúteos", "polea"),
  // Pecho
  e("press-banca", "Press de banca", "pecho", "barra"),
  e("press-inclinado-mancuernas", "Press inclinado con mancuernas", "pecho", "mancuernas"),
  e("aperturas", "Aperturas con mancuernas", "pecho", "mancuernas"),
  e("flexiones", "Flexiones de brazos", "pecho", "peso corporal"),
  e("fondos", "Fondos en paralelas", "tríceps / pecho", "peso corporal"),
  // Espalda
  e("dominadas", "Dominadas", "espalda", "barra fija"),
  e("jalon-pecho", "Jalón al pecho", "espalda", "polea"),
  e("remo-barra", "Remo con barra", "espalda", "barra"),
  e("remo-mancuerna", "Remo con mancuerna a una mano", "espalda", "mancuerna"),
  e("remo-polea-baja", "Remo en polea baja", "espalda", "polea"),
  e("face-pull", "Face pull", "hombros / espalda alta", "polea"),
  // Hombros
  e("press-militar", "Press militar", "hombros", "barra / mancuernas"),
  e("elevaciones-laterales", "Elevaciones laterales", "hombros", "mancuernas"),
  // Brazos
  e("curl-biceps", "Curl de bíceps con barra", "bíceps", "barra"),
  e("curl-martillo", "Curl martillo", "bíceps", "mancuernas"),
  e("extension-triceps-polea", "Extensión de tríceps en polea", "tríceps", "polea"),
  e("press-frances", "Press francés", "tríceps", "barra Z"),
  // Core
  e("plancha", "Plancha abdominal", "core", "peso corporal", "fuerza", "Antebrazos apoyados, cuerpo en línea recta; registrá los segundos."),
  e("crunch", "Crunch abdominal", "core", "peso corporal"),
  e("elevacion-piernas", "Elevación de piernas", "core", "peso corporal"),
  e("russian-twist", "Russian twist", "core", "disco / peso corporal"),
  e("kettlebell-swing", "Kettlebell swing", "cadena posterior", "pesa rusa"),
  e("burpees", "Burpees", "full body", "peso corporal", "cardio"),
  e("mountain-climbers", "Mountain climbers", "core", "peso corporal", "cardio"),
  // Cardio
  e("cinta-caminar", "Cinta – caminata inclinada", "cardio", "cinta", "cardio"),
  e("cinta-correr", "Cinta – correr", "cardio", "cinta", "cardio"),
  e("bici-fija", "Bicicleta fija", "cardio", "bicicleta", "cardio"),
  e("eliptico", "Elíptico", "cardio", "elíptico", "cardio"),
  e("remo-maquina", "Remo (máquina)", "cardio", "remo", "cardio"),
  e("escaladora", "Escaladora", "cardio", "escaladora", "cardio"),
  e("soga", "Saltar la soga", "cardio", "soga", "cardio"),
  // Movilidad
  e("movilidad-general", "Movilidad / estiramientos", "movilidad", "colchoneta", "movilidad"),
];

export type RoutineSeed = {
  slug: string;
  name: string;
  description: string;
  workoutType: string;
  estMinutes: number;
  exercises: [slug: string, sets: number, reps: string, restSec?: number][];
};

export const ROUTINES: RoutineSeed[] = [
  {
    slug: "full-body-a",
    name: "Full Body A",
    description: "Cuerpo completo para 3 días por semana (alternar con B). Ideal para empezar o retomar.",
    workoutType: "fuerza",
    estMinutes: 60,
    exercises: [
      ["sentadilla-goblet", 3, "10-12", 90],
      ["press-banca", 3, "8-10", 120],
      ["remo-mancuerna", 3, "10-12", 90],
      ["peso-muerto-rumano", 3, "10", 120],
      ["press-militar", 3, "10", 90],
      ["plancha", 3, "30-45 s", 60],
    ],
  },
  {
    slug: "full-body-b",
    name: "Full Body B",
    description: "Segunda sesión de cuerpo completo para alternar con la A.",
    workoutType: "fuerza",
    estMinutes: 60,
    exercises: [
      ["prensa", 3, "12", 90],
      ["press-inclinado-mancuernas", 3, "10", 90],
      ["jalon-pecho", 3, "10-12", 90],
      ["hip-thrust", 3, "10", 90],
      ["elevaciones-laterales", 3, "12-15", 60],
      ["crunch", 3, "15", 60],
    ],
  },
  {
    slug: "torso",
    name: "Torso (Upper)",
    description: "Pecho, espalda, hombros y brazos. Para esquema torso/pierna de 4 días.",
    workoutType: "fuerza",
    estMinutes: 65,
    exercises: [
      ["press-banca", 4, "6-8", 150],
      ["remo-barra", 4, "8", 120],
      ["press-militar", 3, "8-10", 90],
      ["jalon-pecho", 3, "10-12", 90],
      ["elevaciones-laterales", 3, "15", 60],
      ["curl-biceps", 3, "10-12", 60],
      ["extension-triceps-polea", 3, "12", 60],
    ],
  },
  {
    slug: "piernas",
    name: "Piernas (Lower)",
    description: "Cuádriceps, isquios, glúteos y pantorrillas + core.",
    workoutType: "fuerza",
    estMinutes: 65,
    exercises: [
      ["sentadilla-barra", 4, "6-8", 150],
      ["peso-muerto-rumano", 3, "8-10", 120],
      ["estocadas", 3, "10 por pierna", 90],
      ["curl-femoral", 3, "12", 60],
      ["gemelos", 4, "15", 60],
      ["plancha", 3, "45 s", 60],
    ],
  },
  {
    slug: "cardio-liss",
    name: "Cardio suave (LISS)",
    description: "30-45 minutos a ritmo constante donde puedas hablar. Gran aliado del déficit.",
    workoutType: "cardio",
    estMinutes: 40,
    exercises: [["cinta-caminar", 1, "40 min", 0]],
  },
  {
    slug: "hiit-bici",
    name: "HIIT en bici",
    description: "10 rondas de 30 s fuerte / 60 s suave + entrada en calor y vuelta a la calma.",
    workoutType: "hiit",
    estMinutes: 25,
    exercises: [["bici-fija", 10, "30 s fuerte / 60 s suave", 0]],
  },
];

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

export const DEFAULT_HABITS = [
  { name: "Dormir 7 horas o más", emoji: "😴", targetPerWeek: 7 },
  { name: "8.000 pasos", emoji: "🚶", targetPerWeek: 5 },
  { name: "Sin picoteo después de cenar", emoji: "🌙", targetPerWeek: 6 },
  { name: "Comer verdura en almuerzo y cena", emoji: "🥦", targetPerWeek: 7 },
];
