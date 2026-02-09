import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { existsSync } from "fs";

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
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${name}`;
}

function sslOptions(): boolean | object {
  const mode = process.env.DB_SSLMODE;
  if (!mode) return false;
  if (mode === "no-verify") return { rejectUnauthorized: false };
  return mode as unknown as boolean;
}

async function main() {
  const client = postgres(buildConnectionString(), { max: 1, ssl: sslOptions() });
  const db = drizzle(client);

  if (!existsSync("./drizzle/migrations/meta/_journal.json")) {
    console.log("No migrations found. Run `npm run db:generate` first.");
    await client.end();
    return;
  }

  console.log("Acquiring migration lock...");
  await client`SELECT pg_advisory_lock(728379)`;
  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    console.log("Migrations complete.");
  } finally {
    await client`SELECT pg_advisory_unlock(728379)`;
  }

  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
