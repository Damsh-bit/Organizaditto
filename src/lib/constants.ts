export const MEALS = [
  { key: "desayuno", label: "Desayuno", emoji: "☕" },
  { key: "almuerzo", label: "Almuerzo", emoji: "🍽️" },
  { key: "merienda", label: "Merienda", emoji: "🧉" },
  { key: "cena", label: "Cena", emoji: "🌙" },
  { key: "snack", label: "Colación", emoji: "🍏" },
] as const;

export type MealKey = (typeof MEALS)[number]["key"];

export const MEAL_LABEL: Record<string, string> = Object.fromEntries(MEALS.map((m) => [m.key, m.label]));
export const MEAL_EMOJI: Record<string, string> = Object.fromEntries(MEALS.map((m) => [m.key, m.emoji]));

export const DEFAULT_MEAL_SPLIT: Record<string, number> = {
  desayuno: 0.22,
  almuerzo: 0.33,
  merienda: 0.15,
  cena: 0.3,
};

export const STORES: Record<string, { label: string; emoji: string; order: number }> = {
  verduleria: { label: "Verdulería", emoji: "🥬", order: 1 },
  carniceria: { label: "Carnicería", emoji: "🥩", order: 2 },
  pescaderia: { label: "Pescadería", emoji: "🐟", order: 3 },
  supermercado: { label: "Supermercado", emoji: "🛒", order: 4 },
  dietetica: { label: "Dietética", emoji: "🌰", order: 5 },
  panaderia: { label: "Panadería", emoji: "🥖", order: 6 },
  farmacia: { label: "Farmacia", emoji: "💊", order: 7 },
  otro: { label: "Otro", emoji: "📦", order: 8 },
};

export const FOOD_CATEGORIES: Record<string, string> = {
  verduras: "Verduras",
  frutas: "Frutas",
  carnes: "Carnes",
  pescados: "Pescados",
  huevos: "Huevos",
  lacteos: "Lácteos",
  cereales: "Cereales y harinas",
  panificados: "Panificados",
  legumbres: "Legumbres y conservas",
  frutos_secos: "Frutos secos y semillas",
  aceites: "Aceites y grasas",
  condimentos: "Condimentos",
  dulces: "Dulces",
  bebidas: "Bebidas",
  snacks: "Snacks",
  preparados: "Comidas preparadas",
  infantil: "Infantil",
  otros: "Otros",
};

export const ALLERGENS: Record<string, { label: string; emoji: string }> = {
  huevo: { label: "Huevo", emoji: "🥚" },
  leche: { label: "Leche de vaca", emoji: "🥛" },
  mani: { label: "Maní", emoji: "🥜" },
  frutos_secos: { label: "Frutos secos", emoji: "🌰" },
  pescado: { label: "Pescado", emoji: "🐟" },
  mariscos: { label: "Mariscos", emoji: "🦐" },
  gluten: { label: "Trigo / gluten", emoji: "🌾" },
  soja: { label: "Soja", emoji: "🫛" },
  sesamo: { label: "Sésamo", emoji: "⚪" },
};

export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const RATE_SOURCES: Record<string, { label: string; description: string }> = {
  wallbit: { label: "Wallbit", description: "Cotización USD → ARS de Wallbit (vía ComparaDólar)" },
  blue: { label: "Dólar blue", description: "Blue informal (vía DolarAPI)" },
  cripto: { label: "Dólar cripto", description: "USDT/USDC promedio (vía DolarAPI)" },
  bolsa: { label: "Dólar MEP", description: "MEP / bolsa (vía DolarAPI)" },
  oficial: { label: "Dólar oficial", description: "Oficial BNA (vía DolarAPI)" },
  manual: { label: "Manual", description: "Valor fijo que cargás vos" },
};

export const REACTIONS: Record<string, { label: string; color: string }> = {
  ninguna: { label: "Sin reacción", color: "text-emerald-600" },
  leve: { label: "Leve", color: "text-amber-600" },
  moderada: { label: "Moderada", color: "text-orange-600" },
  grave: { label: "Grave", color: "text-red-600" },
};

export const ACCEPTANCE = ["", "No le gustó", "Poco", "Normal", "Le gustó", "¡Le encantó!"];
