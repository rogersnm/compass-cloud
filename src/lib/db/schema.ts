import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Organizations ──────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  organization_id: text("organization_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 63 }).notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});

// ── Users ──────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  user_id: text("user_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});

// ── Org Members ────────────────────────────────────────────────────────

export const orgMembers = pgTable(
  "org_members",
  {
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.organization_id),
    user_id: text("user_id")
      .notNull()
      .references(() => users.user_id),
    role: varchar("role", { length: 10 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.organization_id, table.user_id] }),
    check("org_members_role_check", sql`${table.role} IN ('admin', 'member')`),
  ]
);

// ── Invitations ────────────────────────────────────────────────────────

export const invitations = pgTable("invitations", {
  invitation_id: text("invitation_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organization_id: text("organization_id")
    .notNull()
    .references(() => organizations.organization_id),
  email: varchar("email", { length: 320 }).notNull(),
  role: varchar("role", { length: 10 }).notNull(),
  invited_by_user_id: text("invited_by_user_id")
    .notNull()
    .references(() => users.user_id),
  token: varchar("token", { length: 64 }).notNull().unique(),
  accepted_at: timestamp("accepted_at", { withTimezone: true }),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});

// ── Refresh Tokens ─────────────────────────────────────────────────────

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    refresh_token_id: text("refresh_token_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id")
      .notNull()
      .references(() => users.user_id),
    token_hash: varchar("token_hash", { length: 64 }).notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("refresh_tokens_token_hash_idx").on(table.token_hash)]
);

// ── Device Codes ───────────────────────────────────────────────────────

export const deviceCodes = pgTable(
  "device_codes",
  {
    device_code_id: text("device_code_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    device_code: varchar("device_code", { length: 64 }).notNull().unique(),
    user_code: varchar("user_code", { length: 10 }).notNull().unique(),
    user_id: text("user_id").references(() => users.user_id),
    organization_id: text("organization_id").references(
      () => organizations.organization_id
    ),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "device_codes_status_check",
      sql`${table.status} IN ('pending', 'authorized', 'expired')`
    ),
  ]
);

// ── API Keys ───────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    api_key_id: text("api_key_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id")
      .notNull()
      .references(() => users.user_id),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.organization_id),
    key_hash: varchar("key_hash", { length: 64 }).notNull(),
    key_prefix: varchar("key_prefix", { length: 12 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    last_used: timestamp("last_used", { withTimezone: true }),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("api_keys_key_hash_idx").on(table.key_hash)]
);

// ── Projects (versioned) ───────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    project_id: text("project_id")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    version: integer("version").notNull().default(1),
    organization_id: text("organization_id").notNull(),
    key: varchar("key", { length: 5 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    body: text("body").notNull().default(""),
    is_current: boolean("is_current").notNull().default(true),
    created_by_user_id: text("created_by_user_id").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.project_id, table.version] }),
    uniqueIndex("projects_org_key_unique")
      .on(table.organization_id, table.key)
      .where(
        sql`${table.is_current} = true AND ${table.deleted_at} IS NULL`
      ),
    index("projects_current_idx")
      .on(table.project_id)
      .where(
        sql`${table.is_current} = true AND ${table.deleted_at} IS NULL`
      ),
  ]
);

// ── Tasks (versioned) ──────────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    task_id: text("task_id")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    version: integer("version").notNull().default(1),
    organization_id: text("organization_id").notNull(),
    project_id: text("project_id").notNull(),
    key: varchar("key", { length: 12 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    type: varchar("type", { length: 10 }).notNull().default("task"),
    status: varchar("status", { length: 20 }),
    priority: integer("priority"),
    epic_key: text("epic_key"),
    body: text("body").notNull().default(""),
    is_current: boolean("is_current").notNull().default(true),
    created_by_user_id: text("created_by_user_id").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.task_id, table.version] }),
    check(
      "tasks_type_check",
      sql`${table.type} IN ('task', 'epic')`
    ),
    check(
      "tasks_status_check",
      sql`(${table.type} = 'epic' AND ${table.status} IS NULL) OR (${table.type} = 'task' AND ${table.status} IN ('open', 'in_progress', 'closed'))`
    ),
    check(
      "tasks_priority_check",
      sql`${table.priority} IS NULL OR (${table.priority} >= 0 AND ${table.priority} <= 3)`
    ),
    uniqueIndex("tasks_org_key_unique")
      .on(table.organization_id, table.key)
      .where(
        sql`${table.is_current} = true AND ${table.deleted_at} IS NULL`
      ),
    index("tasks_project_status_idx")
      .on(table.project_id, table.status)
      .where(
        sql`${table.is_current} = true AND ${table.deleted_at} IS NULL`
      ),
    index("tasks_epic_idx")
      .on(table.epic_key)
      .where(
        sql`${table.is_current} = true AND ${table.deleted_at} IS NULL`
      ),
  ]
);

// ── Task Dependencies ──────────────────────────────────────────────────

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    task_id: text("task_id").notNull(),
    depends_on_task_id: text("depends_on_task_id").notNull(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.task_id, table.depends_on_task_id] }),
    check(
      "task_deps_no_self_ref",
      sql`${table.task_id} != ${table.depends_on_task_id}`
    ),
  ]
);

// ── Task Positions ────────────────────────────────────────────────────

export const taskPositions = pgTable("task_positions", {
  task_id: text("task_id").primaryKey(),
  position: doublePrecision("position").notNull().default(0),
});

// ── Documents (versioned) ──────────────────────────────────────────────

export const documents = pgTable(
  "documents",
  {
    document_id: text("document_id")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    version: integer("version").notNull().default(1),
    organization_id: text("organization_id").notNull(),
    project_id: text("project_id").notNull(),
    key: varchar("key", { length: 12 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    body: text("body").notNull().default(""),
    is_current: boolean("is_current").notNull().default(true),
    created_by_user_id: text("created_by_user_id").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.document_id, table.version] }),
    uniqueIndex("documents_org_key_unique")
      .on(table.organization_id, table.key)
      .where(
        sql`${table.is_current} = true AND ${table.deleted_at} IS NULL`
      ),
    index("documents_project_idx")
      .on(table.project_id)
      .where(
        sql`${table.is_current} = true AND ${table.deleted_at} IS NULL`
      ),
  ]
);
