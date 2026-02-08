CREATE TABLE "api_keys" (
	"api_key_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"name" varchar(255) NOT NULL,
	"last_used" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "device_codes" (
	"device_code_id" text PRIMARY KEY NOT NULL,
	"device_code" varchar(64) NOT NULL,
	"user_code" varchar(10) NOT NULL,
	"user_id" text,
	"organization_id" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "device_codes_device_code_unique" UNIQUE("device_code"),
	CONSTRAINT "device_codes_user_code_unique" UNIQUE("user_code"),
	CONSTRAINT "device_codes_status_check" CHECK ("device_codes"."status" IN ('pending', 'authorized', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"document_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"display_id" varchar(12) NOT NULL,
	"title" varchar(500) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "documents_document_id_version_pk" PRIMARY KEY("document_id","version")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"invitation_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" varchar(320) NOT NULL,
	"role" varchar(10) NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"token" varchar(64) NOT NULL,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "org_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id"),
	CONSTRAINT "org_members_role_check" CHECK ("org_members"."role" IN ('admin', 'member'))
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(63) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"project_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"organization_id" text NOT NULL,
	"key" varchar(5) NOT NULL,
	"name" varchar(255) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "projects_project_id_version_pk" PRIMARY KEY("project_id","version")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"refresh_token_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"task_id" text NOT NULL,
	"depends_on_task_id" text NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "task_dependencies_task_id_depends_on_task_id_pk" PRIMARY KEY("task_id","depends_on_task_id"),
	CONSTRAINT "task_deps_no_self_ref" CHECK ("task_dependencies"."task_id" != "task_dependencies"."depends_on_task_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"task_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"display_id" varchar(12) NOT NULL,
	"title" varchar(500) NOT NULL,
	"type" varchar(10) DEFAULT 'task' NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"priority" integer,
	"epic_task_id" text,
	"body" text DEFAULT '' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tasks_task_id_version_pk" PRIMARY KEY("task_id","version"),
	CONSTRAINT "tasks_type_check" CHECK ("tasks"."type" IN ('task', 'epic')),
	CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" IN ('open', 'in_progress', 'closed')),
	CONSTRAINT "tasks_priority_check" CHECK ("tasks"."priority" IS NULL OR ("tasks"."priority" >= 0 AND "tasks"."priority" <= 3))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_codes" ADD CONSTRAINT "device_codes_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_codes" ADD CONSTRAINT "device_codes_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_users_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_org_display_id_unique" ON "documents" USING btree ("organization_id","display_id") WHERE "documents"."is_current" = true AND "documents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "documents_project_idx" ON "documents" USING btree ("project_id") WHERE "documents"."is_current" = true AND "documents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_org_key_unique" ON "projects" USING btree ("organization_id","key") WHERE "projects"."is_current" = true AND "projects"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "projects_current_idx" ON "projects" USING btree ("project_id") WHERE "projects"."is_current" = true AND "projects"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_org_display_id_unique" ON "tasks" USING btree ("organization_id","display_id") WHERE "tasks"."is_current" = true AND "tasks"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "tasks_project_status_idx" ON "tasks" USING btree ("project_id","status") WHERE "tasks"."is_current" = true AND "tasks"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "tasks_epic_idx" ON "tasks" USING btree ("epic_task_id") WHERE "tasks"."is_current" = true AND "tasks"."deleted_at" IS NULL;