import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
  getTestDB,
} from "../helpers/db";
import { users } from "@/lib/db/schema";
import { hashPassword, comparePassword } from "@/lib/auth/passwords";
import { eq } from "drizzle-orm";

describe("user registration", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  it("creates a user with hashed password", async () => {
    const db = getTestDB();
    const password_hash = await hashPassword("testpassword");

    const [user] = await db
      .insert(users)
      .values({
        email: "alice@example.com",
        name: "Alice",
        password_hash,
      })
      .returning();

    expect(user.user_id).toBeDefined();
    expect(user.email).toBe("alice@example.com");
    expect(user.name).toBe("Alice");

    const valid = await comparePassword("testpassword", user.password_hash);
    expect(valid).toBe(true);

    const invalid = await comparePassword("wrongpassword", user.password_hash);
    expect(invalid).toBe(false);
  });

  it("rejects duplicate email", async () => {
    const db = getTestDB();
    const password_hash = await hashPassword("testpassword");

    await db.insert(users).values({
      email: "dupe@example.com",
      name: "First",
      password_hash,
    });

    await expect(
      db.insert(users).values({
        email: "dupe@example.com",
        name: "Second",
        password_hash,
      })
    ).rejects.toThrow();
  });

  it("stores email in original case", async () => {
    const db = getTestDB();
    const password_hash = await hashPassword("testpassword");

    await db
      .insert(users)
      .values({
        email: "Bob@Example.COM",
        name: "Bob",
        password_hash,
      })
      .returning();

    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.email, "Bob@Example.COM"));
    expect(found).toBeDefined();
  });
});
