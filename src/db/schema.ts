import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Configuración general (una sola fila, id = 1)                       */
/* ------------------------------------------------------------------ */

export type MealSplit = Record<string, number>;

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  name: text("name"),
  sex: text("sex").$type<"male" | "female">(),
  birthDate: date("birth_date"),
  heightCm: doublePrecision("height_cm"),
  startWeightKg: doublePrecision("start_weight_kg"),
  goalWeightKg: doublePrecision("goal_weight_kg"),
  activityLevel: text("activity_level").notNull().default("light"),
  deficitKcal: integer("deficit_kcal").notNull().default(500),
  targetKcalOverride: integer("target_kcal_override"),
  proteinPerKg: doublePrecision("protein_per_kg").notNull().default(1.8),
  fatPct: integer("fat_pct").notNull().default(28),
  exerciseEatBackPct: integer("exercise_eat_back_pct").notNull().default(50),
  waterGoalMl: integer("water_goal_ml").notNull().default(2500),
  mealSplit: jsonb("meal_split").$type<MealSplit>(),
  gymDaysPerWeek: integer("gym_days_per_week").notNull().default(4),
  weighInDay: integer("weigh_in_day").notNull().default(1),
  hourlyRateUsd: doublePrecision("hourly_rate_usd").notNull().default(6),
  workHoursGoalWeek: doublePrecision("work_hours_goal_week").notNull().default(40),
  workDaysGoalWeek: integer("work_days_goal_week").notNull().default(5),
  rateSource: text("rate_source").notNull().default("wallbit"),
  rateSide: text("rate_side").notNull().default("compra"),
  manualRate: doublePrecision("manual_rate"),
  onboarded: boolean("onboarded").notNull().default(false),
  seedVersion: integer("seed_version").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Nutrición                                                           */
/* ------------------------------------------------------------------ */

export const foods = pgTable(
  "foods",
  {
    id: serial("id").primaryKey(),
    slug: text("slug"),
    name: text("name").notNull(),
    category: text("category").notNull().default("otros"),
    store: text("store").notNull().default("supermercado"),
    // Valores cada 100 g
    kcal: doublePrecision("kcal").notNull().default(0),
    protein: doublePrecision("protein").notNull().default(0),
    carbs: doublePrecision("carbs").notNull().default(0),
    fat: doublePrecision("fat").notNull().default(0),
    fiber: doublePrecision("fiber").notNull().default(0),
    // Unidad casera (ej: 1 unidad = 120 g)
    unitName: text("unit_name"),
    unitGrams: doublePrecision("unit_grams"),
    // Unidad de compra (ej: paquete de 500 g)
    buyUnit: text("buy_unit").notNull().default("kg"),
    buyUnitGrams: doublePrecision("buy_unit_grams").notNull().default(1000),
    priceArs: doublePrecision("price_ars"),
    isPantry: boolean("is_pantry").notNull().default(false),
    allergen: text("allergen"),
    babyFromMonths: integer("baby_from_months"),
    isCustom: boolean("is_custom").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("foods_slug_idx").on(t.slug)],
);

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    slug: text("slug"),
    name: text("name").notNull(),
    description: text("description"),
    audience: text("audience").notNull().default("adult"), // adult | baby
    mealTypes: jsonb("meal_types").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    servings: doublePrecision("servings").notNull().default(1),
    prepMinutes: integer("prep_minutes"),
    cookMinutes: integer("cook_minutes"),
    difficulty: text("difficulty").default("fácil"),
    steps: jsonb("steps").$type<string[]>().notNull().default([]),
    tips: text("tips"),
    storage: text("storage"),
    emoji: text("emoji"),
    babyMinMonths: integer("baby_min_months"),
    babyTexture: text("baby_texture"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    // Valores cacheados por porción (se recalculan al guardar)
    kcal: doublePrecision("kcal").notNull().default(0),
    protein: doublePrecision("protein").notNull().default(0),
    carbs: doublePrecision("carbs").notNull().default(0),
    fat: doublePrecision("fat").notNull().default(0),
    fiber: doublePrecision("fiber").notNull().default(0),
    isCustom: boolean("is_custom").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("recipes_slug_idx").on(t.slug)],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    foodId: integer("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "restrict" }),
    grams: doublePrecision("grams").notNull(),
    note: text("note"),
    optional: boolean("optional").notNull().default(false),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("recipe_ingredients_recipe_idx").on(t.recipeId)],
);

export const foodLogs = pgTable(
  "food_logs",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    meal: text("meal").notNull(),
    foodId: integer("food_id").references(() => foods.id, { onDelete: "set null" }),
    recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
    grams: doublePrecision("grams"),
    servings: doublePrecision("servings"),
    name: text("name").notNull(),
    kcal: doublePrecision("kcal").notNull().default(0),
    protein: doublePrecision("protein").notNull().default(0),
    carbs: doublePrecision("carbs").notNull().default(0),
    fat: doublePrecision("fat").notNull().default(0),
    planItemId: integer("plan_item_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("food_logs_date_idx").on(t.date)],
);

export const dailyMetrics = pgTable("daily_metrics", {
  date: date("date").primaryKey(),
  waterMl: integer("water_ml").notNull().default(0),
  steps: integer("steps"),
  sleepHours: doublePrecision("sleep_hours"),
  notes: text("notes"),
});

export const mealPlanItems = pgTable(
  "meal_plan_items",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    meal: text("meal").notNull(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    servings: doublePrecision("servings").notNull().default(1),
    audience: text("audience").notNull().default("adult"),
    done: boolean("done").notNull().default(false),
    logId: integer("log_id"),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("meal_plan_items_date_idx").on(t.date)],
);

export type MenuTemplateItem = {
  day: number; // 0 = lunes ... 6 = domingo
  meal: string;
  recipeSlug?: string;
  recipeId?: number;
  servings: number;
};

export const menuTemplates = pgTable(
  "menu_templates",
  {
    id: serial("id").primaryKey(),
    slug: text("slug"),
    name: text("name").notNull(),
    description: text("description"),
    emoji: text("emoji"),
    items: jsonb("items").$type<MenuTemplateItem[]>().notNull().default([]),
    prepGuide: jsonb("prep_guide").$type<string[]>().notNull().default([]),
    isCustom: boolean("is_custom").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("menu_templates_slug_idx").on(t.slug)],
);

export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("semanal"), // semanal | mensual | personalizada
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const shoppingListItems = pgTable(
  "shopping_list_items",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    foodId: integer("food_id").references(() => foods.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    store: text("store").notNull().default("supermercado"),
    category: text("category"),
    grams: doublePrecision("grams"),
    quantity: doublePrecision("quantity"),
    unit: text("unit"),
    priceArs: doublePrecision("price_ars"),
    checked: boolean("checked").notNull().default(false),
    isManual: boolean("is_manual").notNull().default(false),
    isPantry: boolean("is_pantry").notNull().default(false),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("shopping_list_items_list_idx").on(t.listId)],
);

/* ------------------------------------------------------------------ */
/* Entrenamiento                                                       */
/* ------------------------------------------------------------------ */

export const exercises = pgTable(
  "exercises",
  {
    id: serial("id").primaryKey(),
    slug: text("slug"),
    name: text("name").notNull(),
    muscleGroup: text("muscle_group").notNull().default("general"),
    equipment: text("equipment"),
    kind: text("kind").notNull().default("fuerza"), // fuerza | cardio | movilidad
    description: text("description"),
    isCustom: boolean("is_custom").notNull().default(false),
  },
  (t) => [uniqueIndex("exercises_slug_idx").on(t.slug)],
);

export const routines = pgTable(
  "routines",
  {
    id: serial("id").primaryKey(),
    slug: text("slug"),
    name: text("name").notNull(),
    description: text("description"),
    workoutType: text("workout_type").notNull().default("fuerza"),
    estMinutes: integer("est_minutes"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("routines_slug_idx").on(t.slug)],
);

export const routineExercises = pgTable("routine_exercises", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  sets: integer("sets").notNull().default(3),
  reps: text("reps").notNull().default("10"),
  restSec: integer("rest_sec").default(90),
  notes: text("notes"),
  sort: integer("sort").notNull().default(0),
});

export const workouts = pgTable(
  "workouts",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    type: text("type").notNull().default("fuerza"),
    title: text("title"),
    routineId: integer("routine_id").references(() => routines.id, { onDelete: "set null" }),
    durationMin: integer("duration_min").notNull().default(60),
    intensity: text("intensity").notNull().default("media"), // baja | media | alta
    kcalBurned: doublePrecision("kcal_burned").notNull().default(0),
    kcalManual: boolean("kcal_manual").notNull().default(false),
    rpe: integer("rpe"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("workouts_date_idx").on(t.date)],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: serial("id").primaryKey(),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull().default(1),
    reps: integer("reps"),
    weightKg: doublePrecision("weight_kg"),
    durationSec: integer("duration_sec"),
    distanceKm: doublePrecision("distance_km"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("workout_sets_workout_idx").on(t.workoutId)],
);

export const weightLogs = pgTable(
  "weight_logs",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    weightKg: doublePrecision("weight_kg").notNull(),
    bodyFatPct: doublePrecision("body_fat_pct"),
    waistCm: doublePrecision("waist_cm"),
    hipCm: doublePrecision("hip_cm"),
    chestCm: doublePrecision("chest_cm"),
    armCm: doublePrecision("arm_cm"),
    thighCm: doublePrecision("thigh_cm"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("weight_logs_date_idx").on(t.date)],
);

/* ------------------------------------------------------------------ */
/* Hábitos generales                                                   */
/* ------------------------------------------------------------------ */

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  targetPerWeek: integer("target_per_week").notNull().default(7),
  archived: boolean("archived").notNull().default(false),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const habitChecks = pgTable(
  "habit_checks",
  {
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
  },
  (t) => [primaryKey({ columns: [t.habitId, t.date] })],
);

/* ------------------------------------------------------------------ */
/* Trabajo                                                             */
/* ------------------------------------------------------------------ */

export const workLogs = pgTable(
  "work_logs",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    hours: doublePrecision("hours").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    running: boolean("running").notNull().default(false),
    project: text("project"),
    description: text("description"),
    rateUsd: doublePrecision("rate_usd").notNull().default(6),
    arsRate: doublePrecision("ars_rate"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("work_logs_date_idx").on(t.date)],
);

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  amountUsd: doublePrecision("amount_usd").notNull(),
  arsRate: doublePrecision("ars_rate"),
  amountArs: doublePrecision("amount_ars"),
  method: text("method").notNull().default("wallbit"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    buy: doublePrecision("buy"),
    sell: doublePrecision("sell"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("exchange_rates_source_idx").on(t.source, t.fetchedAt)],
);

/* ------------------------------------------------------------------ */
/* Bebé                                                                */
/* ------------------------------------------------------------------ */

export const babies = pgTable("babies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  birthDate: date("birth_date"),
  sex: text("sex"),
  solidsStartDate: date("solids_start_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const babyFoodLogs = pgTable(
  "baby_food_logs",
  {
    id: serial("id").primaryKey(),
    babyId: integer("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    meal: text("meal").notNull().default("almuerzo"),
    recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
    foodId: integer("food_id").references(() => foods.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    amount: text("amount"),
    acceptance: integer("acceptance"), // 1..5
    reaction: text("reaction").notNull().default("ninguna"), // ninguna | leve | moderada | grave
    reactionNotes: text("reaction_notes"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("baby_food_logs_date_idx").on(t.babyId, t.date)],
);

export const babyFoodExposures = pgTable(
  "baby_food_exposures",
  {
    id: serial("id").primaryKey(),
    babyId: integer("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    logId: integer("log_id")
      .notNull()
      .references(() => babyFoodLogs.id, { onDelete: "cascade" }),
    foodId: integer("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    reaction: text("reaction").notNull().default("ninguna"),
    acceptance: integer("acceptance"),
  },
  (t) => [index("baby_food_exposures_idx").on(t.babyId, t.foodId)],
);

/** Mediciones (controles pediátricos o en casa) para las curvas de crecimiento. */
export const babyMeasurements = pgTable(
  "baby_measurements",
  {
    id: serial("id").primaryKey(),
    babyId: integer("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    weightKg: doublePrecision("weight_kg"),
    lengthCm: doublePrecision("length_cm"),
    headCm: doublePrecision("head_cm"),
    isCheckup: boolean("is_checkup").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("baby_measurements_date_idx").on(t.babyId, t.date)],
);

/** Vacunas aplicadas (code = dosis del calendario; null = vacuna extra). */
export const babyVaccines = pgTable(
  "baby_vaccines",
  {
    id: serial("id").primaryKey(),
    babyId: integer("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    code: text("code"),
    name: text("name").notNull(),
    date: date("date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("baby_vaccines_baby_idx").on(t.babyId)],
);

/** Dudas para el próximo control con el pediatra. */
export const babyQuestions = pgTable("baby_questions", {
  id: serial("id").primaryKey(),
  babyId: integer("baby_id")
    .notNull()
    .references(() => babies.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  answer: text("answer"),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Relaciones                                                          */
/* ------------------------------------------------------------------ */

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeIngredients.recipeId], references: [recipes.id] }),
  food: one(foods, { fields: [recipeIngredients.foodId], references: [foods.id] }),
}));

export const mealPlanItemsRelations = relations(mealPlanItems, ({ one }) => ({
  recipe: one(recipes, { fields: [mealPlanItems.recipeId], references: [recipes.id] }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ many }) => ({
  items: many(shoppingListItems),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  list: one(shoppingLists, { fields: [shoppingListItems.listId], references: [shoppingLists.id] }),
  food: one(foods, { fields: [shoppingListItems.foodId], references: [foods.id] }),
}));

export const routinesRelations = relations(routines, ({ many }) => ({
  exercises: many(routineExercises),
}));

export const routineExercisesRelations = relations(routineExercises, ({ one }) => ({
  routine: one(routines, { fields: [routineExercises.routineId], references: [routines.id] }),
  exercise: one(exercises, { fields: [routineExercises.exerciseId], references: [exercises.id] }),
}));

export const workoutsRelations = relations(workouts, ({ many, one }) => ({
  sets: many(workoutSets),
  routine: one(routines, { fields: [workouts.routineId], references: [routines.id] }),
}));

export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  workout: one(workouts, { fields: [workoutSets.workoutId], references: [workouts.id] }),
  exercise: one(exercises, { fields: [workoutSets.exerciseId], references: [exercises.id] }),
}));

export const habitsRelations = relations(habits, ({ many }) => ({
  checks: many(habitChecks),
}));

export const habitChecksRelations = relations(habitChecks, ({ one }) => ({
  habit: one(habits, { fields: [habitChecks.habitId], references: [habits.id] }),
}));

export const babyFoodLogsRelations = relations(babyFoodLogs, ({ one, many }) => ({
  baby: one(babies, { fields: [babyFoodLogs.babyId], references: [babies.id] }),
  recipe: one(recipes, { fields: [babyFoodLogs.recipeId], references: [recipes.id] }),
  food: one(foods, { fields: [babyFoodLogs.foodId], references: [foods.id] }),
  exposures: many(babyFoodExposures),
}));

export const babyFoodExposuresRelations = relations(babyFoodExposures, ({ one }) => ({
  log: one(babyFoodLogs, { fields: [babyFoodExposures.logId], references: [babyFoodLogs.id] }),
  food: one(foods, { fields: [babyFoodExposures.foodId], references: [foods.id] }),
}));

export type Settings = typeof settings.$inferSelect;
export type Food = typeof foods.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type FoodLog = typeof foodLogs.$inferSelect;
export type MealPlanItem = typeof mealPlanItems.$inferSelect;
export type MenuTemplate = typeof menuTemplates.$inferSelect;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type WeightLog = typeof weightLogs.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type WorkLog = typeof workLogs.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type Baby = typeof babies.$inferSelect;
export type BabyFoodLog = typeof babyFoodLogs.$inferSelect;
export type BabyMeasurement = typeof babyMeasurements.$inferSelect;
export type BabyVaccine = typeof babyVaccines.$inferSelect;
export type BabyQuestion = typeof babyQuestions.$inferSelect;
