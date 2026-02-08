import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
  getTestDB,
} from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import { apiKeys } from "@/lib/db/schema";
import { generateApiKey, hashApiKey } from "@/lib/auth/api-keys";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

describe("API key CRUD", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  it("creates an API key with correct hash", async () => {
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
        name: "Test Key",
      })
      .returning();

    expect(created.key_prefix).toBe(prefix);
    expect(created.name).toBe("Test Key");

    // Verify hash lookup works
    const computedHash = hashApiKey(key);
    expect(computedHash).toBe(hash);

    const [found] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key_hash, computedHash));
    expect(found).toBeDefined();
    expect(found.user_id).toBe(user.user_id);
  });

  it("lists keys without exposing full key", async () => {
    const db = getTestDB();
    const user = await createTestUser();
    const org = await createTestOrg();
    await createTestMember({
      organization_id: org.organization_id,
      user_id: user.user_id,
    });

    const { hash, prefix } = generateApiKey();
    await db.insert(apiKeys).values({
      user_id: user.user_id,
      organization_id: org.organization_id,
      key_hash: hash,
      key_prefix: prefix,
      name: "My Key",
    });

    const keys = await db
      .select({
        api_key_id: apiKeys.api_key_id,
        key_prefix: apiKeys.key_prefix,
        name: apiKeys.name,
      })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.user_id, user.user_id),
          isNull(apiKeys.deleted_at)
        )
      );

    expect(keys).toHaveLength(1);
    expect(keys[0].key_prefix).toBe(prefix);
    expect(keys[0].name).toBe("My Key");
  });

  it("soft-deletes an API key", async () => {
    const db = getTestDB();
    const user = await createTestUser();
    const org = await createTestOrg();
    await createTestMember({
      organization_id: org.organization_id,
      user_id: user.user_id,
    });

    const { hash, prefix } = generateApiKey();
    const [created] = await db
      .insert(apiKeys)
      .values({
        user_id: user.user_id,
        organization_id: org.organization_id,
        key_hash: hash,
        key_prefix: prefix,
        name: "Delete Me",
      })
      .returning();

    // Soft-delete
    await db
      .update(apiKeys)
      .set({ deleted_at: new Date() })
      .where(eq(apiKeys.api_key_id, created.api_key_id));

    // Should not appear in active keys
    const active = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.api_key_id, created.api_key_id),
          isNull(apiKeys.deleted_at)
        )
      );
    expect(active).toHaveLength(0);

    // Should still exist in DB
    const [deleted] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.api_key_id, created.api_key_id));
    expect(deleted.deleted_at).not.toBeNull();
  });
});
