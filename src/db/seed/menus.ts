import type { MenuTemplateItem } from "../schema";

type WeekGrid = Partial<Record<"desayuno" | "almuerzo" | "merienda" | "cena" | "snack", (string | null)[]>>;

function week(grid: WeekGrid): MenuTemplateItem[] {
  const items: MenuTemplateItem[] = [];
  for (const [meal, slugs] of Object.entries(grid)) {
    slugs?.forEach((slug, day) => {
      if (slug) items.push({ day, meal, recipeSlug: slug, servings: 1 });
    });
  }
  return items;
}

export type MenuSeed = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  items: MenuTemplateItem[];
  prepGuide: string[];
};

// Orden de días: lunes → domingo
export const MENUS: MenuSeed[] = [
  {
    slug: "semana-clasica",
    name: "Semana clásica argentina",
    emoji: "🇦🇷",
    description:
      "Comidas caseras de siempre, versión déficit. Cocinás 3 veces fuertes y aprovechás sobras para viandas.",
    items: week({
      desayuno: ["avena-cocida-banana", "tostadas-palta-huevo", "avena-cocida-banana", "tostadas-palta-huevo", "avena-cocida-banana", "pancakes-avena-banana", "omelette-espinaca-queso"],
      almuerzo: ["pollo-horno-calabaza-batata", "pollo-horno-calabaza-batata", "guiso-lentejas-light", "guiso-lentejas-light", "bife-nalga-papas-ensalada", "fideos-bolognesa-light", "milanesas-pollo-horno-ensalada"],
      merienda: ["bowl-yogur-frutas-avena", "budin-avena-manzana", "tostadas-ricota-tomate", "budin-avena-manzana", "yogur-griego-frutas", "budin-avena-manzana", "licuado-banana-avena"],
      cena: ["tarta-zapallitos-light", "merluza-horno-pure-mixto", "tarta-zapallitos-light", "revuelto-zapallitos", "pizza-integral-casera", "hamburguesas-caseras-ensalada", "pechuga-plancha-ensalada-mixta"],
    }),
    prepGuide: [
      "Domingo: horneá el budín de avena y manzana (meriendas de lunes a sábado).",
      "Domingo: dejá en remojo las lentejas para el guiso del miércoles.",
      "Lunes: el pollo al horno rinde 4 porciones → almuerzo de lunes y martes (y 2 viandas extra al freezer).",
      "Lunes a la noche: la tarta de zapallitos rinde 4 → cena de lunes y miércoles.",
      "Martes a la noche: cociná el guiso de lentejas (rinde 6) para miércoles y jueves; freezá lo que sobra.",
      "Viernes: amasá la pizza temprano para que leve.",
      "Sábado: hacé de más las hamburguesas y freezalas crudas.",
    ],
  },
  {
    slug: "semana-alta-proteina",
    name: "Semana alta en proteína (días de gym)",
    emoji: "💪",
    description:
      "Más proteína en cada comida para cuidar el músculo mientras bajás de peso. Ideal si entrenás 4-5 veces.",
    items: week({
      desayuno: ["omelette-espinaca-queso", "wrap-desayuno-huevo-jamon", "muffins-huevo-verduras", "omelette-espinaca-queso", "wrap-desayuno-huevo-jamon", "muffins-huevo-verduras", "pancakes-avena-banana"],
      almuerzo: ["wok-pollo-vegetales-arroz", "wok-pollo-vegetales-arroz", "peceto-horno-verduras", "peceto-horno-verduras", "bowl-arroz-pollo-palta", "albondigas-salsa-pure-zapallo", "albondigas-salsa-pure-zapallo"],
      merienda: ["yogur-griego-frutas", "licuado-banana-avena", "yogur-griego-frutas", "galletas-arroz-queso-tomate", "licuado-banana-avena", "yogur-griego-frutas", "bowl-yogur-frutas-avena"],
      cena: ["pechuga-plancha-ensalada-mixta", "merluza-horno-pure-mixto", "ensalada-cesar-light", "zapallitos-rellenos-atun", "hamburguesas-caseras-ensalada", "pollo-mostaza-brocoli-arroz", "pollo-mostaza-brocoli-arroz"],
      snack: ["muffins-huevo-verduras", null, "muffins-huevo-verduras", null, "muffins-huevo-verduras", null, null],
    }),
    prepGuide: [
      "Domingo: horneá los muffins de huevo (rinde 6) para desayunos y colaciones.",
      "Lunes: el wok de pollo rinde 4 → almuerzo de lunes y martes.",
      "Martes a la noche: horneá el peceto con verduras (rinde 4) para miércoles y jueves.",
      "Viernes: preparás albóndigas (rinde 4) para sábado y domingo.",
      "Sábado: pollo a la mostaza para la cena de sábado y domingo.",
    ],
  },
  {
    slug: "semana-meal-prep",
    name: "Semana meal prep económica",
    emoji: "📦",
    description:
      "Cocinás dos veces (domingo y miércoles) y tenés todo resuelto. Menos variedad, más ahorro y orden.",
    items: week({
      desayuno: ["avena-cocida-banana", "avena-cocida-banana", "avena-cocida-banana", "avena-cocida-banana", "avena-cocida-banana", "tostadas-palta-huevo", "tostadas-palta-huevo"],
      almuerzo: ["cazuela-pollo-verduras", "cazuela-pollo-verduras", "cazuela-pollo-verduras", "pastel-papa-light", "pastel-papa-light", "pastel-papa-light", "arroz-con-pollo-light"],
      merienda: ["budin-avena-manzana", "budin-avena-manzana", "budin-avena-manzana", "budin-avena-manzana", "budin-avena-manzana", "bowl-yogur-frutas-avena", "bowl-yogur-frutas-avena"],
      cena: ["tortilla-papa-espinaca-horno", "sopa-crema-calabaza", "tortilla-papa-espinaca-horno", "revuelto-zapallitos", "tortilla-papa-espinaca-horno", "hamburguesas-lentejas", "arroz-con-pollo-light"],
    }),
    prepGuide: [
      "Domingo (2 h): cazuela de pollo (rinde 4), tortilla de papa y espinaca (rinde 4), budín de avena (rinde 8) y sopa crema (rinde 4, freezá 2).",
      "Porcioná todo en táperes rotulados con el día.",
      "Miércoles a la noche (1 h): pastel de papa (rinde 5) y hamburguesas de lentejas (freezá las que sobren).",
      "Sábado: arroz con pollo para sábado noche y domingo.",
      "Tip: comprá las verduras en la verdulería una sola vez por semana con la lista generada.",
    ],
  },
  {
    slug: "semana-liviana",
    name: "Semana liviana y fresca",
    emoji: "🥗",
    description:
      "Más ensaladas y preparaciones frescas, ideal para días de calor o cuando querés un déficit más marcado.",
    items: week({
      desayuno: ["bowl-yogur-frutas-avena", "tostadas-ricota-tomate", "pudding-chia-frutos-rojos", "bowl-yogur-frutas-avena", "tostadas-ricota-tomate", "pudding-chia-frutos-rojos", "tostadas-palta-huevo"],
      almuerzo: ["ensalada-completa-atun", "ensalada-garbanzos", "bowl-arroz-pollo-palta", "ensalada-cesar-light", "ensalada-garbanzos", "wraps-pollo-vegetales", "carre-cerdo-pure-batata"],
      merienda: ["manzana-pasta-mani", "galletas-arroz-queso-tomate", "yogur-griego-frutas", "helado-banana", "galletas-arroz-queso-tomate", "manzana-pasta-mani", "helado-banana"],
      cena: ["revuelto-zapallitos", "berenjenas-rellenas", "pechuga-plancha-ensalada-mixta", "berenjenas-rellenas", "zapallitos-rellenos-atun", "sopa-crema-calabaza", "salteado-carne-chauchas"],
      snack: [null, "hummus-bastones-zanahoria", null, "hummus-bastones-zanahoria", null, null, null],
    }),
    prepGuide: [
      "Domingo: armá los puddings de chía en frascos y el hummus (rinde 4).",
      "Hervé de una vez papas, chauchas y huevos para las ensaladas del lunes y martes.",
      "Martes: las berenjenas rellenas rinden 4 → cena de martes y jueves.",
      "Congelá bananas en rodajas para el helado.",
    ],
  },
];

export const BABY_MENUS: MenuSeed[] = [
  {
    slug: "bebe-primera-semana",
    name: "Bebé · Primera semana (6 meses)",
    emoji: "👶",
    description: "Una comida al día, sabores simples. Empezá con 1-2 cucharadas y respetá su apetito.",
    items: week({
      almuerzo: ["bebe-pure-calabaza", "bebe-pure-calabaza", "bebe-pure-zapallo-zanahoria", "bebe-pure-papa-zapallo-pollo", "bebe-pure-papa-zapallo-pollo", "bebe-pure-carne-zapallito", "bebe-palta-pisada"],
    }),
    prepGuide: [
      "Cociná el puré de calabaza y congelalo en cubeteras (cada cubito ≈ 2 cucharadas).",
      "Ofrecé la comida cuando esté despierta y de buen humor, no con mucha hambre ni sueño.",
      "Siempre sentada, erguida y con un adulto al lado.",
    ],
  },
  {
    slug: "bebe-segunda-semana",
    name: "Bebé · Semanas 2-4 (alérgenos y hierro)",
    emoji: "🍼",
    description: "Sumamos carne todos los días, huevo, maní, pescado y gluten de a uno.",
    items: week({
      almuerzo: ["bebe-pure-carne-zapallito", "bebe-huevo-palta", "bebe-pure-papa-zapallo-pollo", "bebe-merluza-papa", "bebe-pure-carne-zapallito", "bebe-polenta-calabaza", "bebe-huevo-palta"],
      merienda: ["bebe-banana-pisada", "bebe-manzana-cocida", "bebe-mani-banana", "bebe-pera-pisada", "bebe-papilla-avena-banana", "bebe-mani-banana", "bebe-banana-pisada"],
    }),
    prepGuide: [
      "Introducí cada alérgeno (huevo, maní, pescado, gluten) en días distintos, de mañana o mediodía.",
      "Una vez tolerado, mantenelo varias veces por semana.",
      "Anotá en el registro cada alimento nuevo y cómo reaccionó.",
    ],
  },
];
