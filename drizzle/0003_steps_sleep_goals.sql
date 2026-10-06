ALTER TABLE "settings" ADD COLUMN "steps_goal" integer DEFAULT 8000 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "sleep_goal_hours" double precision DEFAULT 7.5 NOT NULL;