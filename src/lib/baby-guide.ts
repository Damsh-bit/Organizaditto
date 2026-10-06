/**
 * Guía general de alimentación complementaria. Basada en recomendaciones de la
 * OMS, el Ministerio de Salud de la Nación (Guías Alimentarias para la Población
 * Infantil) y la Sociedad Argentina de Pediatría. No reemplaza al pediatra.
 */

export type Stage = {
  key: string;
  fromMonths: number;
  toMonths: number;
  title: string;
  emoji: string;
  summary: string;
  meals: string;
  amount: string;
  textures: string;
  foods: string[];
  tips: string[];
};

export const STAGES: Stage[] = [
  {
    key: "6",
    fromMonths: 6,
    toMonths: 6,
    title: "6 meses · Primeros sabores",
    emoji: "🥄",
    summary:
      "La leche (materna o fórmula) sigue siendo el alimento principal. Las primeras comidas son para descubrir sabores y texturas, no para reemplazar la leche.",
    meals: "1 comida al día (por ejemplo, el almuerzo); a las 2-4 semanas se puede sumar una segunda.",
    amount: "Empezá con 1-2 cucharaditas y aumentá según su apetito hasta 2-3 cucharadas soperas o medio platito.",
    textures: "Purés espesos y suaves (que no chorreen de la cuchara) o, si hacen BLW, trozos muy blandos del tamaño de un dedo adulto.",
    foods: [
      "Verduras: calabaza, zanahoria, papa, batata, zapallito, choclo",
      "Frutas: banana, manzana y pera cocidas, palta, durazno",
      "Carnes todos los días: vaca, pollo, cerdo magro (bien cocidas)",
      "Cereales: arroz, polenta, avena, fideos chicos",
      "Huevo entero bien cocido",
      "Aceite de oliva o girasol en crudo para sumar energía",
    ],
    tips: [
      "Ofrecé carne todos los días: a esta edad las reservas de hierro se agotan.",
      "Introducí los alérgenos (huevo, maní, pescado, trigo) temprano y de a uno: no hay que demorarlos.",
      "Ofrecé agua segura en vaso durante las comidas.",
      "Sentada bien erguida, siempre acompañada por un adulto y sin pantallas.",
    ],
  },
  {
    key: "7-8",
    fromMonths: 7,
    toMonths: 8,
    title: "7 a 8 meses · Más texturas",
    emoji: "🍲",
    summary: "Ya maneja mejor la comida: es momento de dejar los purés muy lisos y pasar a texturas pisadas y trocitos blandos.",
    meals: "2 comidas al día (almuerzo y cena) + 1 colación de fruta si tiene hambre.",
    amount: "Alrededor de ½ taza (125 ml) por comida, siempre guiándote por sus señales de hambre y saciedad.",
    textures: "Pisado con tenedor, grumoso, carne picada o desmenuzada, trocitos blandos que pueda agarrar.",
    foods: [
      "Legumbres bien cocidas y pisadas (lentejas, garbanzos)",
      "Pescado blanco sin espinas",
      "Yogur natural entero sin azúcar, ricota, quesos blandos",
      "Hígado (no más de una vez por semana)",
      "Frutas crudas maduras pisadas o en bastones",
    ],
    tips: [
      "Combiná las legumbres con una fruta con vitamina C de postre (mandarina, naranja, kiwi) para absorber mejor el hierro.",
      "Dejá que explore con las manos: ensuciarse es parte del aprendizaje.",
      "Las arcadas son normales y la protegen: no confundirlas con atragantamiento.",
    ],
  },
  {
    key: "9-11",
    fromMonths: 9,
    toMonths: 11,
    title: "9 a 11 meses · Comida familiar adaptada",
    emoji: "🍽️",
    summary: "Puede comer casi todo lo que come la familia, separando su porción antes de agregar sal y cortando los alimentos de forma segura.",
    meals: "3 comidas (desayuno, almuerzo, cena) + 1 o 2 colaciones.",
    amount: "Alrededor de ¾ de taza (180 ml) por comida, según apetito.",
    textures: "Picado fino, trocitos blandos, comida de la mesa familiar sin sal.",
    foods: [
      "Fideos, arroz, guisos y tartas caseras sin sal",
      "Albondiguitas, tortitas de verdura, omelette en tiras",
      "Quesos frescos en pequeñas cantidades",
      "Frutas en trozos blandos (uvas siempre cortadas en cuartos a lo largo)",
    ],
    tips: [
      "Ofrecele cuchara propia y vaso abierto para que practique.",
      "Comer juntos en familia ayuda a que aprenda por imitación.",
      "No la fuerces ni la premies con comida: ella decide cuánto come.",
    ],
  },
  {
    key: "12+",
    fromMonths: 12,
    toMonths: 36,
    title: "12 meses en adelante · A la mesa familiar",
    emoji: "👧",
    summary: "Come de la mesa familiar con algunas adaptaciones. La leche pasa a ser un alimento más y no el principal.",
    meals: "4 comidas (desayuno, almuerzo, merienda, cena) + colaciones saludables.",
    amount: "Porciones pequeñas que puede repetir si tiene hambre.",
    textures: "La de la familia, cortando en trozos seguros.",
    foods: [
      "Leche de vaca entera como bebida (si no toma pecho): hasta ~500 ml por día",
      "Miel (ya está permitida desde el año)",
      "Todo tipo de alimentos de la familia con poca sal",
    ],
    tips: [
      "Seguí evitando ultraprocesados, gaseosas y jugos azucarados.",
      "Frutos secos enteros, maní entero y pochoclo siguen prohibidos hasta los 4-5 años por riesgo de atragantamiento.",
    ],
  },
];

export const READINESS_SIGNS = [
  "Tiene alrededor de 6 meses (no antes de los 4).",
  "Se sienta con poco o ningún apoyo y sostiene bien la cabeza.",
  "Perdió el reflejo de empujar la comida con la lengua (reflejo de extrusión).",
  "Muestra interés por la comida: mira, abre la boca, intenta agarrar.",
  "Puede llevarse objetos a la boca con la mano.",
];

export const AVOID_BEFORE_1 = [
  { item: "Miel", why: "Riesgo de botulismo del lactante." },
  { item: "Sal y azúcar agregados", why: "Los riñones todavía son inmaduros y se forman hábitos de sabor." },
  { item: "Leche de vaca como bebida principal", why: "Puede usarse en preparaciones; como bebida, desde el año." },
  { item: "Jugos (aunque sean naturales), gaseosas, té, mate, café", why: "Aportan azúcar o sustancias no recomendadas; ofrecé agua." },
  { item: "Fiambres, embutidos, caldos en cubo, snacks y ultraprocesados", why: "Mucha sal, grasas y aditivos." },
  { item: "Acelga, espinaca y remolacha en cantidad", why: "Alto contenido de nitratos; mejor después del año." },
  { item: "Pescados grandes (pez espada, tiburón, atún en exceso)", why: "Contenido de mercurio." },
  { item: "Edulcorantes y alimentos 'light'", why: "No están indicados en bebés." },
];

export const CHOKING_HAZARDS = [
  "Frutos secos y maní enteros (usar pasta o molidos)",
  "Uvas, aceitunas, tomates cherry enteros (cortar en cuartos a lo largo)",
  "Salchichas en rodajas (si se usan, en tiras a lo largo)",
  "Manzana o zanahoria crudas y duras (rallar o cocinar)",
  "Pochoclo, caramelos, chicles, golosinas duras",
  "Pasta de maní espesa sola (siempre diluida o untada finita)",
];

export const GAG_VS_CHOKE = {
  gag: "Arcada: es ruidosa, tose, se pone colorada, saca la lengua. Es un reflejo que la protege: mantené la calma y dejá que lo resuelva sola.",
  choke:
    "Atragantamiento: es silencioso, no puede toser ni llorar, se pone pálida o azulada. Es una emergencia: hacé la maniobra de desobstrucción para lactantes (5 golpes en la espalda + 5 compresiones en el pecho) y llamá al 107 / 911.",
  course: "Muy recomendable hacer un curso de primeros auxilios y RCP pediátrica antes de empezar.",
};

export const ALLERGY_SIGNS = [
  "Ronchas o urticaria, enrojecimiento alrededor de la boca",
  "Hinchazón de labios, ojos o cara",
  "Vómitos repetidos o diarrea",
  "Tos, ronquera o dificultad para respirar (¡emergencia!: 107 / 911)",
  "Decaimiento o palidez",
];

export const ALLERGEN_TIPS = [
  "Introducí cada alérgeno nuevo de a uno, de día, en casa y con el bebé sano.",
  "Empezá con una cantidad pequeña y observá durante 2 horas.",
  "Si lo tolera bien, mantenelo en la dieta varias veces por semana.",
  "Si hay eccema severo o alguna alergia ya conocida, consultá antes con el pediatra.",
];

export const RESPONSIVE_FEEDING = [
  "Ofrecé, no obligues: ella decide cuánto come (y vos qué y cuándo se ofrece).",
  "Señales de hambre: se inclina hacia la comida, abre la boca, se entusiasma.",
  "Señales de saciedad: gira la cabeza, cierra la boca, empuja la cuchara, juega.",
  "Comidas tranquilas, sin pantallas y en familia.",
  "Puede necesitar probar un alimento 8 a 15 veces antes de aceptarlo: ¡paciencia!",
];

export function stageFor(months: number | null): Stage | null {
  if (months == null) return null;
  if (months < 6) return null;
  return STAGES.find((s) => months >= s.fromMonths && months <= s.toMonths) ?? STAGES[STAGES.length - 1];
}

/** Alérgenos principales que conviene introducir en el primer año. */
export const KEY_ALLERGENS = ["huevo", "mani", "pescado", "gluten", "leche", "sesamo", "frutos_secos", "soja"];
