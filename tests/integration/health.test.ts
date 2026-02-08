import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDB, teardownTestDB, getTestDB } from "../helpers/db";
import { sql } from "drizzle-orm";

describe("health check", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it("can reach the database", async () => {
    const db = getTestDB();
    const result = await db.execute(sql`SELECT 1 as n`);
    expect(result).toBeDefined();
  });
});
