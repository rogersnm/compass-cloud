import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function buildConnectionString(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "5432";
  const user = process.env.DB_USERNAME;
  const pass = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME || "compass";
  if (!host || !user || !pass) {
    throw new Error(
      "DATABASE_URL or DB_HOST+DB_USERNAME+DB_PASSWORD required"
    );
  }
  const sslmode = process.env.DB_SSLMODE || "";
  const params = sslmode ? `?sslmode=${sslmode}` : "";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${name}${params}`;
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const url = buildConnectionString();
    const client = postgres(url);
    _db = drizzle(client, { schema });
  }
  return _db;
}

// For backwards compatibility and convenience
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
