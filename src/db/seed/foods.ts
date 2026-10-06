/**
 * Base de alimentos inicial. Valores nutricionales aproximados cada 100 g
 * de porción comestible (fuentes: USDA FoodData Central y tablas argentinas).
 * Se pueden editar libremente desde la app.
 */

export type FoodSeed = {
  slug: string;
  name: string;
  category: string;
  store: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  unitName?: string;
  unitGrams?: number;
  buyUnit: string;
  buyUnitGrams: number;
  isPantry?: boolean;
  allergen?: string;
  babyFromMonths?: number;
};

type Extra = Partial<Omit<FoodSeed, "slug" | "name" | "category" | "store">> & {
  unit?: [string, number];
  buy?: [string, number];
  baby?: number;
};

function f(
  slug: string,
  name: string,
  category: string,
  store: string,
  [kcal, protein, carbs, fat, fiber = 0]: [number, number, number, number, number?],
  extra: Extra = {},
): FoodSeed {
  const { unit, buy, baby, ...rest } = extra;
  return {
    slug,
    name,
    category,
    store,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    unitName: unit?.[0],
    unitGrams: unit?.[1],
    buyUnit: buy?.[0] ?? "kg",
    buyUnitGrams: buy?.[1] ?? 1000,
    babyFromMonths: baby,
    ...rest,
  };
}

const V = "verduleria";
const C = "carniceria";
const P = "pescaderia";
const S = "supermercado";
const D = "dietetica";
const PAN = "panaderia";

export const FOODS: FoodSeed[] = [
  // ---------------- Verduras ----------------
  f("acelga", "Acelga", "verduras", V, [19, 1.8, 3.7, 0.2, 1.6], { unit: ["hoja", 30], buy: ["atado", 500], baby: 12 }),
  f("espinaca", "Espinaca", "verduras", V, [23, 2.9, 3.6, 0.4, 2.2], { unit: ["taza", 30], buy: ["atado", 300], baby: 12 }),
  f("lechuga", "Lechuga", "verduras", V, [15, 1.4, 2.9, 0.2, 1.3], { unit: ["planta", 300], buy: ["planta", 300] }),
  f("rucula", "Rúcula", "verduras", V, [25, 2.6, 3.7, 0.7, 1.6], { buy: ["atado", 150] }),
  f("tomate", "Tomate", "verduras", V, [18, 0.9, 3.9, 0.2, 1.2], { unit: ["unidad", 120], baby: 6 }),
  f("cebolla", "Cebolla", "verduras", V, [40, 1.1, 9.3, 0.1, 1.7], { unit: ["unidad", 150], baby: 6 }),
  f("cebolla-morada", "Cebolla morada", "verduras", V, [40, 1.1, 9.3, 0.1, 1.7], { unit: ["unidad", 150] }),
  f("cebolla-verdeo", "Cebolla de verdeo", "verduras", V, [32, 1.8, 7.3, 0.2, 2.6], { unit: ["planta", 25], buy: ["atado", 120], baby: 6 }),
  f("ajo", "Ajo", "verduras", V, [149, 6.4, 33, 0.5, 2.1], { unit: ["diente", 5], buy: ["cabeza", 40], baby: 6 }),
  f("zanahoria", "Zanahoria", "verduras", V, [41, 0.9, 9.6, 0.2, 2.8], { unit: ["unidad", 80], baby: 6 }),
  f("zapallo", "Calabaza / zapallo anco", "verduras", V, [45, 1, 11.7, 0.1, 2], { unit: ["taza", 140], baby: 6 }),
  f("zapallito", "Zapallito / zucchini", "verduras", V, [17, 1.2, 3.1, 0.3, 1], { unit: ["unidad", 200], baby: 6 }),
  f("berenjena", "Berenjena", "verduras", V, [25, 1, 5.9, 0.2, 3], { unit: ["unidad", 300], baby: 6 }),
  f("morron-rojo", "Morrón rojo", "verduras", V, [31, 1, 6, 0.3, 2.1], { unit: ["unidad", 180], baby: 6 }),
  f("morron-verde", "Morrón verde", "verduras", V, [20, 0.9, 4.6, 0.2, 1.7], { unit: ["unidad", 180] }),
  f("brocoli", "Brócoli", "verduras", V, [34, 2.8, 6.6, 0.4, 2.6], { unit: ["planta", 400], buy: ["planta", 400], baby: 6 }),
  f("coliflor", "Coliflor", "verduras", V, [25, 1.9, 5, 0.3, 2], { unit: ["unidad", 600], buy: ["unidad", 600], baby: 6 }),
  f("papa", "Papa", "verduras", V, [77, 2, 17, 0.1, 2.2], { unit: ["unidad", 170], baby: 6 }),
  f("batata", "Batata", "verduras", V, [86, 1.6, 20, 0.1, 3], { unit: ["unidad", 250], baby: 6 }),
  f("choclo", "Choclo (granos de mazorca)", "verduras", V, [86, 3.3, 19, 1.4, 2.7], { unit: ["unidad", 150], buy: ["unidad", 150], baby: 6 }),
  f("champinones", "Champiñones", "verduras", V, [22, 3.1, 3.3, 0.3, 1], { buy: ["bandeja", 250], baby: 9 }),
  f("pepino", "Pepino", "verduras", V, [15, 0.7, 3.6, 0.1, 0.5], { unit: ["unidad", 200] }),
  f("remolacha", "Remolacha", "verduras", V, [43, 1.6, 9.6, 0.2, 2.8], { unit: ["unidad", 150], baby: 12 }),
  f("repollo", "Repollo", "verduras", V, [25, 1.3, 5.8, 0.1, 2.5], { buy: ["unidad", 1000] }),
  f("chaucha", "Chaucha", "verduras", V, [31, 1.8, 7, 0.2, 2.7], { baby: 6 }),
  f("puerro", "Puerro", "verduras", V, [61, 1.5, 14, 0.3, 1.8], { unit: ["unidad", 150], buy: ["unidad", 150], baby: 6 }),
  f("apio", "Apio", "verduras", V, [16, 0.7, 3, 0.2, 1.6], { unit: ["rama", 40], buy: ["planta", 400] }),
  f("perejil", "Perejil", "verduras", V, [36, 3, 6.3, 0.8, 3.3], { unit: ["cucharada", 4], buy: ["atado", 50], baby: 6 }),
  f("albahaca", "Albahaca", "verduras", V, [23, 3.2, 2.7, 0.6, 1.6], { buy: ["atado", 40] }),
  f("palta", "Palta", "verduras", V, [160, 2, 8.5, 14.7, 6.7], { unit: ["unidad", 150], buy: ["unidad", 150], baby: 6 }),
  f("limon", "Limón", "verduras", V, [29, 1.1, 9.3, 0.3, 2.8], { unit: ["unidad", 100] }),

  // ---------------- Frutas ----------------
  f("banana", "Banana", "frutas", V, [89, 1.1, 22.8, 0.3, 2.6], { unit: ["unidad", 120], baby: 6 }),
  f("manzana", "Manzana", "frutas", V, [52, 0.3, 13.8, 0.2, 2.4], { unit: ["unidad", 180], baby: 6 }),
  f("pera", "Pera", "frutas", V, [57, 0.4, 15, 0.1, 3.1], { unit: ["unidad", 180], baby: 6 }),
  f("naranja", "Naranja", "frutas", V, [47, 0.9, 11.8, 0.1, 2.4], { unit: ["unidad", 200], baby: 6 }),
  f("mandarina", "Mandarina", "frutas", V, [53, 0.8, 13.3, 0.3, 1.8], { unit: ["unidad", 90], baby: 6 }),
  f("frutilla", "Frutilla", "frutas", V, [32, 0.7, 7.7, 0.3, 2], { unit: ["taza", 150], baby: 6 }),
  f("kiwi", "Kiwi", "frutas", V, [61, 1.1, 14.7, 0.5, 3], { unit: ["unidad", 75], baby: 6 }),
  f("durazno", "Durazno", "frutas", V, [39, 0.9, 9.5, 0.3, 1.5], { unit: ["unidad", 150], baby: 6 }),
  f("ciruela", "Ciruela", "frutas", V, [46, 0.7, 11.4, 0.3, 1.4], { unit: ["unidad", 65], baby: 6 }),
  f("arandanos", "Arándanos", "frutas", S, [57, 0.7, 14.5, 0.3, 2.4], { unit: ["taza", 140], buy: ["bandeja", 125], baby: 6 }),
  f("mango", "Mango", "frutas", V, [60, 0.8, 15, 0.4, 1.6], { unit: ["unidad", 300], buy: ["unidad", 300], baby: 6 }),
  f("anana", "Ananá", "frutas", V, [50, 0.5, 13, 0.1, 1.4], { buy: ["unidad", 900], baby: 6 }),
  f("melon", "Melón", "frutas", V, [34, 0.8, 8.2, 0.2, 0.9], { buy: ["unidad", 1200], baby: 6 }),
  f("sandia", "Sandía", "frutas", V, [30, 0.6, 7.6, 0.2, 0.4], { baby: 6 }),
  f("uva", "Uva", "frutas", V, [69, 0.7, 18, 0.2, 0.9], { unit: ["taza", 150], baby: 6 }),

  // ---------------- Carnes ----------------
  f("pechuga-pollo", "Pechuga de pollo (sin piel)", "carnes", C, [120, 22.5, 0, 2.6], { unit: ["unidad", 250], baby: 6 }),
  f("muslo-pollo", "Muslo de pollo (sin piel)", "carnes", C, [121, 19.7, 0, 4.1], { unit: ["unidad", 120], baby: 6 }),
  f("pollo-entero", "Pollo entero", "carnes", C, [215, 18.6, 0, 15.1], {}),
  f("higado-pollo", "Hígado de pollo", "carnes", C, [119, 16.9, 0.7, 4.8], { buy: ["bandeja", 500], baby: 6 }),
  f("carne-picada-magra", "Carne picada especial (magra)", "carnes", C, [176, 20, 0, 10], { baby: 6 }),
  f("carne-picada-comun", "Carne picada común", "carnes", C, [254, 17.2, 0, 20], {}),
  f("nalga", "Nalga", "carnes", C, [135, 22, 0, 5], { baby: 6 }),
  f("peceto", "Peceto", "carnes", C, [120, 23, 0, 3], { baby: 6 }),
  f("cuadril", "Cuadril", "carnes", C, [150, 21, 0, 7], {}),
  f("bola-lomo", "Bola de lomo", "carnes", C, [130, 22, 0, 4.5], { baby: 6 }),
  f("lomo", "Lomo", "carnes", C, [150, 21, 0, 7], {}),
  f("vacio", "Vacío", "carnes", C, [230, 18, 0, 17], {}),
  f("asado", "Asado de tira", "carnes", C, [290, 16, 0, 25], {}),
  f("carre-cerdo", "Carré de cerdo", "carnes", C, [143, 21, 0, 6], { baby: 6 }),
  f("bondiola", "Bondiola de cerdo", "carnes", C, [220, 17, 0, 17], {}),
  f("higado-vacuno", "Hígado vacuno", "carnes", C, [135, 20.4, 3.9, 3.6], { baby: 6 }),
  f("jamon-cocido", "Jamón cocido", "carnes", S, [110, 18, 1.5, 3.5], { unit: ["feta", 15] }),
  f("pechuga-pavo-fiambre", "Pechuga de pavo (fiambre)", "carnes", S, [100, 18, 2, 2], { unit: ["feta", 15] }),

  // ---------------- Pescados ----------------
  f("merluza", "Filet de merluza", "pescados", P, [86, 18, 0, 1.3], { unit: ["filet", 150], allergen: "pescado", baby: 6 }),
  f("salmon", "Salmón", "pescados", P, [208, 20, 0, 13], { allergen: "pescado", baby: 6 }),
  f("atun-lata", "Atún al natural (escurrido)", "pescados", S, [116, 25.5, 0, 0.8], { unit: ["lata", 120], buy: ["lata", 120], allergen: "pescado", baby: 12 }),

  // ---------------- Huevos y lácteos ----------------
  f("huevo", "Huevo", "huevos", S, [143, 12.6, 0.7, 9.5], { unit: ["unidad", 50], buy: ["docena", 600], allergen: "huevo", baby: 6 }),
  f("clara-huevo", "Clara de huevo", "huevos", S, [52, 10.9, 0.7, 0.2], { unit: ["unidad", 33], buy: ["docena (claras)", 396], allergen: "huevo" }),
  f("leche-descremada", "Leche descremada", "lacteos", S, [37, 3.4, 5, 0.4], { unit: ["taza", 200], buy: ["litro", 1000], allergen: "leche", baby: 12 }),
  f("leche-entera", "Leche entera", "lacteos", S, [61, 3.2, 4.8, 3.3], { unit: ["taza", 200], buy: ["litro", 1000], allergen: "leche", baby: 12 }),
  f("yogur-descremado", "Yogur natural descremado", "lacteos", S, [45, 4.3, 6.2, 0.2], { unit: ["pote", 190], buy: ["pote", 190], allergen: "leche" }),
  f("yogur-entero", "Yogur natural entero (sin azúcar)", "lacteos", S, [61, 3.5, 4.7, 3.3], { unit: ["pote", 190], buy: ["pote", 190], allergen: "leche", baby: 6 }),
  f("yogur-griego", "Yogur griego natural", "lacteos", S, [97, 9, 4, 5], { unit: ["pote", 160], buy: ["pote", 160], allergen: "leche" }),
  f("queso-untable-light", "Queso untable descremado", "lacteos", S, [100, 11, 4, 4.5], { unit: ["cucharada", 15], buy: ["pote", 300], allergen: "leche" }),
  f("queso-cremoso-light", "Queso cremoso light", "lacteos", S, [225, 22, 2, 14.5], { unit: ["porción", 30], allergen: "leche", baby: 9 }),
  f("queso-rallado", "Queso rallado", "lacteos", S, [390, 33, 3, 28], { unit: ["cucharada", 6], buy: ["paquete", 150], allergen: "leche", baby: 9 }),
  f("ricota", "Ricota magra", "lacteos", S, [110, 11, 5, 5], { unit: ["cucharada", 25], buy: ["pote", 500], allergen: "leche", baby: 6 }),
  f("mozzarella", "Mozzarella", "lacteos", S, [280, 22, 2.2, 20], { allergen: "leche", baby: 9 }),
  f("manteca", "Manteca", "aceites", S, [717, 0.9, 0.1, 81], { unit: ["cucharadita", 5], buy: ["paquete", 200], isPantry: true, allergen: "leche" }),

  // ---------------- Cereales y harinas ----------------
  f("avena", "Avena arrollada", "cereales", S, [389, 16.9, 66.3, 6.9, 10.6], { unit: ["cucharada", 10], buy: ["paquete", 500], allergen: "gluten", baby: 6 }),
  f("arroz-blanco", "Arroz blanco (crudo)", "cereales", S, [360, 6.6, 79, 0.6, 1.3], { unit: ["taza", 185], buy: ["paquete", 1000], baby: 6 }),
  f("arroz-integral", "Arroz integral (crudo)", "cereales", S, [362, 7.5, 76, 2.7, 3.4], { unit: ["taza", 185], buy: ["paquete", 1000], baby: 6 }),
  f("fideos", "Fideos secos (crudos)", "cereales", S, [371, 13, 75, 1.5, 3.2], { unit: ["porción", 80], buy: ["paquete", 500], allergen: "gluten", baby: 6 }),
  f("fideos-integrales", "Fideos integrales (crudos)", "cereales", S, [350, 14, 70, 2.5, 8], { unit: ["porción", 80], buy: ["paquete", 500], allergen: "gluten", baby: 6 }),
  f("polenta", "Polenta (harina de maíz)", "cereales", S, [365, 7.5, 79, 1.4, 4], { unit: ["taza", 160], buy: ["paquete", 500], baby: 6 }),
  f("quinoa", "Quinoa (cruda)", "cereales", D, [368, 14, 64, 6, 7], { buy: ["paquete", 500], baby: 6 }),
  f("harina-trigo", "Harina de trigo 000", "cereales", S, [364, 10.3, 76, 1, 2.7], { unit: ["taza", 120], buy: ["paquete", 1000], allergen: "gluten" }),
  f("harina-integral", "Harina integral", "cereales", S, [340, 13, 72, 2.5, 10.7], { unit: ["taza", 120], buy: ["paquete", 1000], allergen: "gluten" }),
  f("pan-rallado", "Pan rallado", "cereales", S, [395, 13, 72, 5, 4.5], { unit: ["taza", 110], buy: ["paquete", 500], allergen: "gluten" }),
  f("tapa-tarta", "Tapa de tarta light", "panificados", S, [290, 8, 50, 6, 2], { unit: ["tapa", 180], buy: ["paquete x2", 360], allergen: "gluten" }),
  f("tortilla-integral", "Tortillas integrales (rapiditas)", "panificados", S, [300, 8, 51, 7, 6], { unit: ["unidad", 40], buy: ["paquete", 320], allergen: "gluten" }),
  f("galletas-arroz", "Galletas de arroz", "panificados", S, [387, 8, 81, 3, 3], { unit: ["unidad", 9], buy: ["paquete", 100] }),
  f("galletitas-agua", "Galletitas de agua", "panificados", S, [420, 10, 70, 11, 3], { unit: ["unidad", 8], buy: ["paquete", 300], allergen: "gluten" }),
  f("pan-integral", "Pan integral (lactal)", "panificados", S, [250, 12, 41, 3.5, 7], { unit: ["rebanada", 25], buy: ["paquete", 500], allergen: "gluten" }),
  f("pan-frances", "Pan francés", "panificados", PAN, [270, 9, 55, 1.5, 2.5], { unit: ["unidad", 60], allergen: "gluten" }),
  f("medialuna", "Medialuna", "panificados", PAN, [410, 7, 46, 22, 1.5], { unit: ["unidad", 45], buy: ["docena", 540], allergen: "gluten" }),
  f("cereal-infantil", "Cereal infantil fortificado", "infantil", S, [390, 7, 82, 2, 4], { unit: ["cucharada", 5], buy: ["caja", 200], baby: 6 }),

  // ---------------- Legumbres y conservas ----------------
  f("lentejas", "Lentejas secas", "legumbres", S, [352, 24.6, 63, 1.1, 10.7], { unit: ["taza", 190], buy: ["paquete", 500], baby: 6 }),
  f("garbanzos", "Garbanzos secos", "legumbres", S, [364, 19.3, 61, 6, 17], { unit: ["taza", 200], buy: ["paquete", 500], baby: 6 }),
  f("porotos", "Porotos secos", "legumbres", S, [341, 21.6, 62, 1.4, 15.5], { unit: ["taza", 190], buy: ["paquete", 500], baby: 9 }),
  f("garbanzos-lata", "Garbanzos cocidos (lata)", "legumbres", S, [139, 7, 22.5, 2.6, 6], { unit: ["lata", 240], buy: ["lata", 240], baby: 9 }),
  f("lentejas-lata", "Lentejas cocidas (lata)", "legumbres", S, [116, 9, 20, 0.4, 7.9], { unit: ["lata", 240], buy: ["lata", 240], baby: 9 }),
  f("arvejas-lata", "Arvejas (lata)", "legumbres", S, [69, 4.5, 12.5, 0.4, 4.5], { unit: ["lata", 220], buy: ["lata", 220] }),
  f("choclo-lata", "Choclo en granos (lata)", "legumbres", S, [82, 2.4, 17, 1.2, 2], { unit: ["lata", 220], buy: ["lata", 220] }),
  f("tomate-triturado", "Tomate triturado", "legumbres", S, [32, 1.5, 6, 0.2, 1.5], { unit: ["caja", 520], buy: ["caja", 520], baby: 6 }),

  // ---------------- Frutos secos y semillas ----------------
  f("chia", "Semillas de chía", "frutos_secos", D, [486, 17, 42, 31, 34], { unit: ["cucharada", 10], buy: ["paquete", 200], baby: 6 }),
  f("lino", "Semillas de lino", "frutos_secos", D, [534, 18, 29, 42, 27], { unit: ["cucharada", 10], buy: ["paquete", 250] }),
  f("sesamo", "Semillas de sésamo", "frutos_secos", D, [573, 17.7, 23, 49.7, 11.8], { unit: ["cucharada", 9], buy: ["paquete", 200], allergen: "sesamo" }),
  f("mani", "Maní tostado sin sal", "frutos_secos", S, [585, 24, 21, 50, 8], { unit: ["puñado", 25], buy: ["paquete", 200], allergen: "mani" }),
  f("pasta-mani", "Pasta de maní (sin azúcar)", "frutos_secos", S, [600, 25, 20, 50, 6], { unit: ["cucharada", 16], buy: ["frasco", 380], allergen: "mani", baby: 6 }),
  f("nueces", "Nueces", "frutos_secos", D, [654, 15, 14, 65, 6.7], { unit: ["mitad", 4], buy: ["paquete", 250], allergen: "frutos_secos" }),
  f("almendras", "Almendras", "frutos_secos", D, [579, 21, 22, 50, 12.5], { unit: ["unidad", 1.2], buy: ["paquete", 250], allergen: "frutos_secos" }),
  f("pasas", "Pasas de uva", "frutos_secos", D, [299, 3.1, 79, 0.5, 3.7], { unit: ["cucharada", 10], buy: ["paquete", 250] }),
  f("cacao", "Cacao amargo en polvo", "dulces", S, [228, 19.6, 57.9, 13.7, 37], { unit: ["cucharada", 6], buy: ["paquete", 180] }),

  // ---------------- Aceites y condimentos (despensa) ----------------
  f("aceite-oliva", "Aceite de oliva", "aceites", S, [884, 0, 0, 100], { unit: ["cucharada", 13], buy: ["botella 500 ml", 460], isPantry: true, baby: 6 }),
  f("aceite-girasol", "Aceite de girasol", "aceites", S, [884, 0, 0, 100], { unit: ["cucharada", 13], buy: ["botella 900 ml", 830], isPantry: true }),
  f("sal", "Sal", "condimentos", S, [0, 0, 0, 0], { unit: ["pizca", 0.5], buy: ["paquete", 500], isPantry: true, baby: 12 }),
  f("pimienta", "Pimienta", "condimentos", S, [251, 10.4, 64, 3.3], { unit: ["pizca", 0.3], buy: ["frasco", 50], isPantry: true }),
  f("oregano", "Orégano", "condimentos", S, [265, 9, 69, 4.3], { unit: ["cucharadita", 1], buy: ["paquete", 25], isPantry: true, baby: 6 }),
  f("pimenton", "Pimentón dulce", "condimentos", S, [282, 14, 54, 13], { unit: ["cucharadita", 2], buy: ["paquete", 50], isPantry: true }),
  f("comino", "Comino", "condimentos", S, [375, 17.8, 44, 22], { unit: ["cucharadita", 2], buy: ["paquete", 25], isPantry: true }),
  f("canela", "Canela", "condimentos", S, [247, 4, 81, 1.2], { unit: ["cucharadita", 2.5], buy: ["paquete", 25], isPantry: true, baby: 6 }),
  f("curcuma", "Cúrcuma", "condimentos", S, [312, 9.7, 67, 3.3], { unit: ["cucharadita", 3], buy: ["paquete", 25], isPantry: true, baby: 6 }),
  f("aji-molido", "Ají molido", "condimentos", S, [282, 12, 50, 14], { unit: ["cucharadita", 2], buy: ["paquete", 25], isPantry: true }),
  f("nuez-moscada", "Nuez moscada", "condimentos", S, [525, 5.8, 49, 36], { unit: ["pizca", 0.3], buy: ["frasco", 20], isPantry: true }),
  f("laurel", "Laurel", "condimentos", S, [313, 7.6, 75, 8.4], { unit: ["hoja", 0.2], buy: ["paquete", 10], isPantry: true, baby: 6 }),
  f("vinagre", "Vinagre de manzana", "condimentos", S, [21, 0, 0.9, 0], { unit: ["cucharada", 15], buy: ["botella", 500], isPantry: true }),
  f("mostaza", "Mostaza", "condimentos", S, [66, 4, 5.8, 3.3], { unit: ["cucharadita", 5], buy: ["frasco", 250], isPantry: true }),
  f("salsa-soja", "Salsa de soja", "condimentos", S, [53, 8, 4.9, 0.6], { unit: ["cucharada", 16], buy: ["botella", 150], isPantry: true, allergen: "soja" }),
  f("mayonesa-light", "Mayonesa light", "condimentos", S, [265, 1, 9, 25], { unit: ["cucharada", 15], buy: ["doypack", 250], isPantry: true, allergen: "huevo" }),
  f("ketchup", "Ketchup", "condimentos", S, [112, 1.2, 26, 0.1], { unit: ["cucharada", 15], buy: ["doypack", 250], isPantry: true }),
  f("levadura", "Levadura seca", "condimentos", S, [325, 40, 41, 7.6], { unit: ["sobre", 10], buy: ["sobre", 10], isPantry: true }),
  f("polvo-hornear", "Polvo de hornear", "condimentos", S, [53, 0, 28, 0], { unit: ["cucharadita", 4], buy: ["sobre", 50], isPantry: true }),
  f("esencia-vainilla", "Esencia de vainilla", "condimentos", S, [288, 0, 13, 0], { unit: ["cucharadita", 4], buy: ["frasco", 100], isPantry: true }),
  f("edulcorante", "Edulcorante", "condimentos", S, [0, 0, 0, 0], { unit: ["gotas", 0.1], buy: ["frasco", 200], isPantry: true }),
  f("azucar", "Azúcar", "dulces", S, [387, 0, 100, 0], { unit: ["cucharadita", 5], buy: ["paquete", 1000], isPantry: true }),
  f("miel", "Miel", "dulces", S, [304, 0.3, 82, 0], { unit: ["cucharadita", 7], buy: ["frasco", 500], baby: 12 }),
  f("mermelada-light", "Mermelada light", "dulces", S, [110, 0.3, 27, 0.1], { unit: ["cucharada", 15], buy: ["frasco", 390] }),
  f("dulce-leche", "Dulce de leche", "dulces", S, [315, 6.8, 55, 7.5], { unit: ["cucharada", 20], buy: ["pote", 400], allergen: "leche" }),

  // ---------------- Bebidas ----------------
  f("cafe", "Café (sin azúcar)", "bebidas", S, [2, 0.3, 0, 0], { unit: ["taza", 200], buy: ["paquete", 250], isPantry: true }),
  f("te", "Té / mate (sin azúcar)", "bebidas", S, [1, 0, 0.2, 0], { unit: ["taza", 200], buy: ["paquete", 500], isPantry: true }),
  f("gaseosa-light", "Gaseosa light / zero", "bebidas", S, [1, 0, 0, 0], { unit: ["vaso", 250], buy: ["botella", 2250] }),
  f("gaseosa", "Gaseosa común", "bebidas", S, [42, 0, 10.6, 0], { unit: ["vaso", 250], buy: ["botella", 2250] }),
  f("jugo-naranja", "Jugo de naranja exprimido", "bebidas", S, [45, 0.7, 10.4, 0.2], { unit: ["vaso", 250], buy: ["litro", 1000] }),
  f("cerveza", "Cerveza", "bebidas", S, [43, 0.5, 3.6, 0], { unit: ["vaso", 330], buy: ["lata", 473] }),
  f("vino", "Vino tinto", "bebidas", S, [85, 0.1, 2.6, 0], { unit: ["copa", 150], buy: ["botella", 750] }),
  f("fernet-cola", "Fernet con cola", "bebidas", S, [95, 0, 9, 0], { unit: ["vaso", 300], buy: ["vaso", 300] }),

  // ---------------- Comidas comunes (para registrar rápido) ----------------
  f("alfajor", "Alfajor", "snacks", S, [440, 5, 63, 19, 1.5], { unit: ["unidad", 50], buy: ["unidad", 50] }),
  f("empanada-carne", "Empanada de carne (al horno)", "preparados", PAN, [250, 10, 27, 11, 1.5], { unit: ["unidad", 90], buy: ["docena", 1080] }),
  f("pizza-muzza", "Pizza muzzarella", "preparados", PAN, [270, 11, 30, 11.5, 1.5], { unit: ["porción", 120], buy: ["pizza", 960] }),
  f("milanesa-frita", "Milanesa de carne frita", "preparados", C, [280, 18, 15, 17, 0.8], { unit: ["unidad", 150] }),
  f("papas-fritas", "Papas fritas", "preparados", S, [312, 3.4, 41, 15, 3.8], { unit: ["porción", 150] }),
  f("choripan", "Choripán", "preparados", C, [295, 11, 25, 17, 1], { unit: ["unidad", 220], buy: ["unidad", 220] }),
  f("chocolate", "Chocolate con leche", "snacks", S, [535, 7.7, 59, 30, 3.4], { unit: ["cuadradito", 5], buy: ["tableta", 100] }),
  f("helado", "Helado de crema", "snacks", S, [207, 3.5, 24, 11, 0.7], { unit: ["bocha", 70], buy: ["pote 1/4 kg", 250] }),
  f("galletitas-dulces", "Galletitas dulces", "snacks", S, [470, 6, 70, 18, 2], { unit: ["unidad", 10], buy: ["paquete", 300] }),
];
