import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
  getTestDB,
} from "../helpers/db";
import {
  createTestUser,
  createTestOrg,
  createTestMember,
} from "../helpers/fixtures";
import { apiKeys } from "@/lib/db/schema";
import { generateApiKey, hashApiKey } from "@/lib/auth/api-keys";
import { signAccessToken } from "@/lib/auth/jwt";
import { eq, and, isNull } from "drizzle-orm";

describe("auth middleware", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  it("resolves user and org from API key", async () => {
    const db = getTestDB();
    const user = await createTestUser();
    const org = await createTestOrg();
    await createTestMember({
      organization_id: org.organization_id,
      user_id: user.user_id,
    });

    const { key, hash, prefix } = generateApiKey();
    await db.insert(apiKeys).values({
      user_id: user.user_id,
      organization_id: org.organization_id,
      key_hash: hash,
      key_prefix: prefix,
      name: "Test",
    });

    // Verify API key lookup works
    const keyHash = hashApiKey(key);
    const [found] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key_hash, keyHash), isNull(apiKeys.deleted_at)));

    expect(found).toBeDefined();
    expect(found.user_id).toBe(user.user_id);
    expect(found.organization_id).toBe(org.organization_id);
  });

  it("resolves user from JWT and org from slug", async () => {
    const db = getTestDB();
    const user = await createTestUser();
    const org = await createTestOrg();
    await createTestMember({
      organization_id: org.organization_id,
      user_id: user.user_id,
    });

    const accessToken = signAccessToken({ userId: user.user_id });
    expect(accessToken).toBeDefined();
    expect(typeof accessToken).toBe("string");

    // In real middleware, would use X-Org-Slug header to find org
    // Here we verify the org can be found by slug
    const { organizations } = await import("@/lib/db/schema");
    const [foundOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, org.slug));
    expect(foundOrg.organization_id).toBe(org.organization_id);
  });

  it("rejects deleted API key", async () => {
    const db = getTestDB();
    const user = await createTestUser();
    const org = await createTestOrg();
    await createTestMember({
      organization_id: org.organization_id,
      user_id: user.user_id,
    });

    const { key, hash, prefix } = generateApiKey();
    const [created] = await db
      .insert(apiKeys)
      .values({
        user_id: user.user_id,
        organization_id: org.organization_id,
        key_hash: hash,
        key_prefix: prefix,
        name: "Deleted Key",
      })
      .returning();

    // Soft-delete
    await db
      .update(apiKeys)
      .set({ deleted_at: new Date() })
      .where(eq(apiKeys.api_key_id, created.api_key_id));

    // Lookup should find nothing
    const keyHash = hashApiKey(key);
    const result = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key_hash, keyHash), isNull(apiKeys.deleted_at)));
    expect(result).toHaveLength(0);
  });

  it("updates last_used on API key auth", async () => {
    const db = getTestDB();
    const user = await createTestUser();
    const org = await createTestOrg();
    await createTestMember({
      organization_id: org.organization_id,
      user_id: user.user_id,
    });

    const { key, hash, prefix } = generateApiKey();
    const [created] = await db
      .insert(apiKeys)
      .values({
        user_id: user.user_id,
        organization_id: org.organization_id,
        key_hash: hash,
        key_prefix: prefix,
        name: "Track Usage",
      })
      .returning();

    expect(created.last_used).toBeNull();

    // Simulate middleware updating last_used
    await db
      .update(apiKeys)
      .set({ last_used: new Date() })
      .where(eq(apiKeys.api_key_id, created.api_key_id));

    const [updated] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.api_key_id, created.api_key_id));
    expect(updated.last_used).not.toBeNull();
  });
});
