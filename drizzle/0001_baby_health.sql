CREATE TABLE "baby_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"date" date NOT NULL,
	"weight_kg" double precision,
	"length_cm" double precision,
	"head_cm" double precision,
	"is_checkup" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "baby_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"text" text NOT NULL,
	"answer" text,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "baby_vaccines" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "baby_measurements" ADD CONSTRAINT "baby_measurements_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_questions" ADD CONSTRAINT "baby_questions_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_vaccines" ADD CONSTRAINT "baby_vaccines_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "baby_measurements_date_idx" ON "baby_measurements" USING btree ("baby_id","date");--> statement-breakpoint
CREATE INDEX "baby_vaccines_baby_idx" ON "baby_vaccines" USING btree ("baby_id");