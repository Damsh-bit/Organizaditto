CREATE TABLE "babies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"birth_date" date,
	"sex" text,
	"solids_start_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "baby_food_exposures" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"log_id" integer NOT NULL,
	"food_id" integer NOT NULL,
	"date" date NOT NULL,
	"reaction" text DEFAULT 'ninguna' NOT NULL,
	"acceptance" integer
);
--> statement-breakpoint
CREATE TABLE "baby_food_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"date" date NOT NULL,
	"meal" text DEFAULT 'almuerzo' NOT NULL,
	"recipe_id" integer,
	"food_id" integer,
	"name" text NOT NULL,
	"amount" text,
	"acceptance" integer,
	"reaction" text DEFAULT 'ninguna' NOT NULL,
	"reaction_notes" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_metrics" (
	"date" date PRIMARY KEY NOT NULL,
	"water_ml" integer DEFAULT 0 NOT NULL,
	"steps" integer,
	"sleep_hours" double precision,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"buy" double precision,
	"sell" double precision,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"muscle_group" text DEFAULT 'general' NOT NULL,
	"equipment" text,
	"kind" text DEFAULT 'fuerza' NOT NULL,
	"description" text,
	"is_custom" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"meal" text NOT NULL,
	"food_id" integer,
	"recipe_id" integer,
	"grams" double precision,
	"servings" double precision,
	"name" text NOT NULL,
	"kcal" double precision DEFAULT 0 NOT NULL,
	"protein" double precision DEFAULT 0 NOT NULL,
	"carbs" double precision DEFAULT 0 NOT NULL,
	"fat" double precision DEFAULT 0 NOT NULL,
	"plan_item_id" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"category" text DEFAULT 'otros' NOT NULL,
	"store" text DEFAULT 'supermercado' NOT NULL,
	"kcal" double precision DEFAULT 0 NOT NULL,
	"protein" double precision DEFAULT 0 NOT NULL,
	"carbs" double precision DEFAULT 0 NOT NULL,
	"fat" double precision DEFAULT 0 NOT NULL,
	"fiber" double precision DEFAULT 0 NOT NULL,
	"unit_name" text,
	"unit_grams" double precision,
	"buy_unit" text DEFAULT 'kg' NOT NULL,
	"buy_unit_grams" double precision DEFAULT 1000 NOT NULL,
	"price_ars" double precision,
	"is_pantry" boolean DEFAULT false NOT NULL,
	"allergen" text,
	"baby_from_months" integer,
	"is_custom" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "habit_checks" (
	"habit_id" integer NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "habit_checks_habit_id_date_pk" PRIMARY KEY("habit_id","date")
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text,
	"target_per_week" integer DEFAULT 7 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meal_plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"meal" text NOT NULL,
	"recipe_id" integer NOT NULL,
	"servings" double precision DEFAULT 1 NOT NULL,
	"audience" text DEFAULT 'adult' NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"log_id" integer,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"description" text,
	"emoji" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prep_guide" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"amount_usd" double precision NOT NULL,
	"ars_rate" double precision,
	"amount_ars" double precision,
	"method" text DEFAULT 'wallbit' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"food_id" integer NOT NULL,
	"grams" double precision NOT NULL,
	"note" text,
	"optional" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"description" text,
	"audience" text DEFAULT 'adult' NOT NULL,
	"meal_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"servings" double precision DEFAULT 1 NOT NULL,
	"prep_minutes" integer,
	"cook_minutes" integer,
	"difficulty" text DEFAULT 'fácil',
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tips" text,
	"storage" text,
	"emoji" text,
	"baby_min_months" integer,
	"baby_texture" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"kcal" double precision DEFAULT 0 NOT NULL,
	"protein" double precision DEFAULT 0 NOT NULL,
	"carbs" double precision DEFAULT 0 NOT NULL,
	"fat" double precision DEFAULT 0 NOT NULL,
	"fiber" double precision DEFAULT 0 NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "routine_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"routine_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"sets" integer DEFAULT 3 NOT NULL,
	"reps" text DEFAULT '10' NOT NULL,
	"rest_sec" integer DEFAULT 90,
	"notes" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"description" text,
	"workout_type" text DEFAULT 'fuerza' NOT NULL,
	"est_minutes" integer,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text,
	"sex" text,
	"birth_date" date,
	"height_cm" double precision,
	"start_weight_kg" double precision,
	"goal_weight_kg" double precision,
	"activity_level" text DEFAULT 'light' NOT NULL,
	"deficit_kcal" integer DEFAULT 500 NOT NULL,
	"target_kcal_override" integer,
	"protein_per_kg" double precision DEFAULT 1.8 NOT NULL,
	"fat_pct" integer DEFAULT 28 NOT NULL,
	"exercise_eat_back_pct" integer DEFAULT 50 NOT NULL,
	"water_goal_ml" integer DEFAULT 2500 NOT NULL,
	"meal_split" jsonb,
	"gym_days_per_week" integer DEFAULT 4 NOT NULL,
	"weigh_in_day" integer DEFAULT 1 NOT NULL,
	"hourly_rate_usd" double precision DEFAULT 6 NOT NULL,
	"work_hours_goal_week" double precision DEFAULT 40 NOT NULL,
	"work_days_goal_week" integer DEFAULT 5 NOT NULL,
	"rate_source" text DEFAULT 'wallbit' NOT NULL,
	"rate_side" text DEFAULT 'compra' NOT NULL,
	"manual_rate" double precision,
	"onboarded" boolean DEFAULT false NOT NULL,
	"seed_version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shopping_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"food_id" integer,
	"name" text NOT NULL,
	"store" text DEFAULT 'supermercado' NOT NULL,
	"category" text,
	"grams" double precision,
	"quantity" double precision,
	"unit" text,
	"price_ars" double precision,
	"checked" boolean DEFAULT false NOT NULL,
	"is_manual" boolean DEFAULT false NOT NULL,
	"is_pantry" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'semanal' NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "weight_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"weight_kg" double precision NOT NULL,
	"body_fat_pct" double precision,
	"waist_cm" double precision,
	"hip_cm" double precision,
	"chest_cm" double precision,
	"arm_cm" double precision,
	"thigh_cm" double precision,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"hours" double precision DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"running" boolean DEFAULT false NOT NULL,
	"project" text,
	"description" text,
	"rate_usd" double precision DEFAULT 6 NOT NULL,
	"ars_rate" double precision,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"set_number" integer DEFAULT 1 NOT NULL,
	"reps" integer,
	"weight_kg" double precision,
	"duration_sec" integer,
	"distance_km" double precision,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"type" text DEFAULT 'fuerza' NOT NULL,
	"title" text,
	"routine_id" integer,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"intensity" text DEFAULT 'media' NOT NULL,
	"kcal_burned" double precision DEFAULT 0 NOT NULL,
	"kcal_manual" boolean DEFAULT false NOT NULL,
	"rpe" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "baby_food_exposures" ADD CONSTRAINT "baby_food_exposures_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_food_exposures" ADD CONSTRAINT "baby_food_exposures_log_id_baby_food_logs_id_fk" FOREIGN KEY ("log_id") REFERENCES "public"."baby_food_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_food_exposures" ADD CONSTRAINT "baby_food_exposures_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_food_logs" ADD CONSTRAINT "baby_food_logs_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_food_logs" ADD CONSTRAINT "baby_food_logs_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_food_logs" ADD CONSTRAINT "baby_food_logs_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_checks" ADD CONSTRAINT "habit_checks_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_list_id_shopping_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "baby_food_exposures_idx" ON "baby_food_exposures" USING btree ("baby_id","food_id");--> statement-breakpoint
CREATE INDEX "baby_food_logs_date_idx" ON "baby_food_logs" USING btree ("baby_id","date");--> statement-breakpoint
CREATE INDEX "exchange_rates_source_idx" ON "exchange_rates" USING btree ("source","fetched_at");--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_slug_idx" ON "exercises" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "food_logs_date_idx" ON "food_logs" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_slug_idx" ON "foods" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "meal_plan_items_date_idx" ON "meal_plan_items" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_templates_slug_idx" ON "menu_templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_slug_idx" ON "recipes" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "routines_slug_idx" ON "routines" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "shopping_list_items_list_idx" ON "shopping_list_items" USING btree ("list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weight_logs_date_idx" ON "weight_logs" USING btree ("date");--> statement-breakpoint
CREATE INDEX "work_logs_date_idx" ON "work_logs" USING btree ("date");--> statement-breakpoint
CREATE INDEX "workout_sets_workout_idx" ON "workout_sets" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "workouts_date_idx" ON "workouts" USING btree ("date");