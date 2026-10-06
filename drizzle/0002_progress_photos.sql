CREATE TABLE "progress_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"pose" text DEFAULT 'frente' NOT NULL,
	"mime" text DEFAULT 'image/jpeg' NOT NULL,
	"data" text NOT NULL,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "progress_photos_date_idx" ON "progress_photos" USING btree ("date");