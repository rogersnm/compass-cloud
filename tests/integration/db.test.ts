import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDB, teardownTestDB, truncateAllTables } from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { getTestDB } from "../helpers/db";

describe("database integration", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  it("creates and retrieves a user", async () => {
    const user = await createTestUser({ name: "Alice", email: "alice@test.com" });
    expect(user.user_id).toBeDefined();
    expect(user.name).toBe("Alice");
    expect(user.email).toBe("alice@test.com");

    const db = getTestDB();
    const [found] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.user_id, user.user_id));
    expect(found.name).toBe("Alice");
  });

  it("creates org with member", async () => {
    const user = await createTestUser();
    const org = await createTestOrg({ name: "Acme" });
    const member = await createTestMember({
      organization_id: org.organization_id,
      user_id: user.user_id,
      role: "admin",
    });

    expect(member.role).toBe("admin");
    expect(member.organization_id).toBe(org.organization_id);
  });

  it("truncates between tests", async () => {
    const db = getTestDB();
    const users = await db.select().from(schema.users);
    expect(users).toHaveLength(0);
  });
});
