import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  "postgresql://compass:compass@localhost:5434/compass_test";

let client: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle<typeof schema>>;

export function getTestDB() {
  if (!db) {
    throw new Error("Test DB not initialized. Call setupTestDB() first.");
  }
  return db;
}

export async function setupTestDB() {
  client = postgres(TEST_DATABASE_URL);
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  return db;
}

export async function teardownTestDB() {
  if (client) {
    await client.end();
  }
}

const TABLES_IN_DELETE_ORDER = [
  schema.taskPositions,
  schema.taskDependencies,
  schema.tasks,
  schema.documents,
  schema.projects,
  schema.apiKeys,
  schema.deviceCodes,
  schema.refreshTokens,
  schema.invitations,
  schema.orgMembers,
  schema.organizations,
  schema.users,
];

export async function truncateAllTables() {
  const d = getTestDB();
  for (const table of TABLES_IN_DELETE_ORDER) {
    await d.delete(table).execute();
  }
}
