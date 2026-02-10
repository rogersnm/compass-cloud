CREATE TABLE IF NOT EXISTS "task_positions" (
	"task_id" text PRIMARY KEY NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
-- Backfill existing tasks with position = row_number * 1000
INSERT INTO "task_positions" ("task_id", "position")
SELECT "task_id", ROW_NUMBER() OVER (ORDER BY "created_at" ASC) * 1000
FROM "tasks"
WHERE "is_current" = true AND "deleted_at" IS NULL AND "type" = 'task';
