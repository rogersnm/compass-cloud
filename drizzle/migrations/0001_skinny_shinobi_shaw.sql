ALTER TABLE "tasks" DROP CONSTRAINT "tasks_status_check";--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
UPDATE "tasks" SET "status" = NULL WHERE "type" = 'epic';--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_check" CHECK (("tasks"."type" = 'epic' AND "tasks"."status" IS NULL) OR ("tasks"."type" = 'task' AND "tasks"."status" IN ('open', 'in_progress', 'closed')));
